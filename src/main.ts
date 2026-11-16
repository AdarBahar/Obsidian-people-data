import { debounce, Menu, Notice, Platform, Plugin, TAbstractFile, TFolder, TFile, MarkdownView, getFrontMatterInfo, parseYaml } from 'obsidian';
import { definitionMarker, refreshDecorationsEffect } from './editor/decoration';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { DefManager, initDefFileManager } from './core/def-file-manager';
import { PersonMetadata } from './core/model';
import { getDefinitionPopover, initDefinitionPopover } from './editor/definition-popover';
import { postProcessor } from './editor/md-postprocessor';
import { SettingsTab, getSettings, mergeSettings } from './settings';
import { getMarkedWordUnderCursor } from './util/editor';
import { FileExplorerDecoration, initFileExplorerDecoration } from './ui/file-explorer';
import { EditDefinitionModal } from './editor/edit-modal';
import { AddDefinitionModal } from './editor/add-modal';
import { getDefinitionModal, initDefinitionModal } from './editor/mobile/definition-modal';
import { DefFileType } from './core/file-type';
import { PluginContext } from './core/plugin-context';
import { DefinitionPreviewService } from './core/definition-preview-service';
import { DEF_TYPE_FM } from './core/file-parser';
import { isPathInFolder, renamedFolderPath } from './util/paths';

export default class NoteDefinition extends Plugin {
	activeEditorExtensions: Extension[] = [];
	defManager: DefManager;
	fileExplorerDeco: FileExplorerDecoration;
	context: PluginContext;
	previewService: DefinitionPreviewService;
	// Paths of files that ensureDefFileRegistered() works on now
	private registeringFiles = new Set<string>();
	// Settings that change which people are loaded, from the last load
	private loadedParseKey = "";
	// Redraw names in all open notes, at most one time per burst of changes
	private refreshViewsSoon = debounce(() => this.refreshViews(), 200, true);

	async onload() {
		// Initialize plugin context instead of global variables
		const settings = mergeSettings(await this.loadData());
		this.context = PluginContext.initialize(this.app, this, settings);
		this.previewService = DefinitionPreviewService.getInstance();

		// Open previews from document listeners, also in popout windows
		this.previewService.attach(this, document);
		this.registerEvent(this.app.workspace.on("window-open", (win) => {
			this.previewService.attach(this, win.doc);
		}));

		initDefinitionPopover(this);
		initDefinitionModal(this.app);
		this.defManager = initDefFileManager(this.app);
		this.loadedParseKey = this.getParseKey();
		this.defManager.onChange(() => this.refreshViewsSoon());
		this.fileExplorerDeco = initFileExplorerDecoration(this.app);
		this.registerEditorExtension(this.activeEditorExtensions);
		this.updateEditorExts();

		this.registerCommands();
		this.registerEvents();

		this.addSettingTab(new SettingsTab(this.app, this, this.saveSettings.bind(this)));
		this.registerMarkdownPostProcessor(postProcessor);

		this.fileExplorerDeco.run();
	}

	async saveSettings() {
		await this.saveData(this.context.settings);
		this.context.updateSettings(this.context.settings);

		// Reload people only when a setting that changes parsing was changed.
		// Display settings (sliders, colors, toggles) only redraw the names.
		const parseKey = this.getParseKey();
		if (parseKey !== this.loadedParseKey) {
			this.loadedParseKey = parseKey;
			this.fileExplorerDeco.run();
			await this.refreshDefinitions();
		} else {
			this.refreshViewsSoon();
		}
	}

	private getParseKey(): string {
		const settings = getSettings();
		return JSON.stringify([settings.defFolder, settings.defFileParseConfig]);
	}

	// Redraw the decorations in all open editors and reading views
	private refreshViews() {
		this.app.workspace.iterateAllLeaves(leaf => {
			if (!(leaf.view instanceof MarkdownView)) {
				return;
			}
			// @ts-expect-error, cm is not in the public API
			const cm = leaf.view.editor?.cm as EditorView | undefined;
			cm?.dispatch({ effects: refreshDecorationsEffect.of(null) });
			if (leaf.view.getMode() === "preview") {
				leaf.view.previewMode.rerender(true);
			}
		});
	}

	registerCommands() {
		this.addCommand({
			id: "add-definition",
			name: "Add a person",
			editorCallback: (editor) => {
				const selectedText = editor.getSelection();
				const addModal = new AddDefinitionModal(this.app);
				addModal.open(selectedText);
			}
		});

		this.addCommand({
			id: "preview-person",
			name: "Preview person under cursor",
			editorCheckCallback: (checking, editor) => {
				const def = this.defManager.get(getMarkedWordUnderCursor(editor));
				if (!def) {
					return false;
				}
				if (!checking) {
					if (Platform.isMobile) {
						getDefinitionModal().open(def);
					} else {
						getDefinitionPopover().openAtCursor(def, editor);
					}
				}
				return true;
			}
		});

		this.addCommand({
			id: "refresh-people",
			name: "Refresh people",
			callback: () => {
				this.fileExplorerDeco.run();
				this.refreshDefinitions();
			}
		});
	}

	registerEvents() {
		this.registerEvent(this.app.workspace.on("active-leaf-change", async (leaf) => {
			if (!leaf) return;
			// People files are reloaded by the 'changed' event, not here
			this.updateEditorExts();
			this.defManager.updateActiveFile();

			// Register the opened file if it is in the people folder and has no def-type
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile && this.shouldAutoRegister(activeFile)) {
				await this.ensureDefFileRegistered(activeFile);
			}
		}));

		this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
			const defPopover = getDefinitionPopover();
			if (defPopover) {
				defPopover.close();
			}

			const curWord = getMarkedWordUnderCursor(editor);
			if (!curWord) {
				if (editor.getSelection()) {
					menu.addItem(item => {
						item.setTitle("Add a person")
						item.setIcon("plus")
						.onClick(() => {
								const addModal = new AddDefinitionModal(this.app);
								addModal.open(editor.getSelection());
						});
					});
				}
				return;
			}
			const def = this.defManager.get(curWord);
			if (!def) {
				return;
			}
			this.registerMenuForMarkedWords(menu, def);
		}));

		// Add file menu options
		this.registerEvent(this.app.workspace.on("file-menu", (menu, file, _source) => {
			if (file instanceof TFolder) {
				menu.addItem(item => {
					item.setTitle("Set as people folder")
						.setIcon("book-a")
						.onClick(() => {
							const settings = getSettings();
							settings.defFolder = file.path;
							this.saveSettings();
						});
				});
			}
		}));

		// Creating files under def folder should register file as definition file.
		// Obsidian sends a 'create' event for each file while the vault loads,
		// so listen only after the layout is ready.
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on('create', (file) => {
				if (!(file instanceof TFile) || file.extension !== 'md' ||
					!isPathInFolder(file.path, this.defManager.getGlobalDefFolder())) {
					return;
				}
				if (this.shouldAutoRegister(file)) {
					this.ensureDefFileRegistered(file);
				} else {
					this.fileExplorerDeco.run();
				}
			}));
			this.registerFileEvents();
		});

		this.registerEvent(this.app.metadataCache.on('changed', (file: TFile) => {
			// Reload the people of a changed people file
			if (this.defManager.isDefFile(file)) {
				this.defManager.markDirty(file);
				this.reloadUpdatedDefinitions();
			}

			// The def-context frontmatter of the active note can change
			const currFile = this.app.workspace.getActiveFile();
			if (currFile && currFile.path === file.path) {
				this.defManager.updateActiveFile();
				this.refreshViewsSoon();
			}
		}));
	}

	// Keep the people list correct when files are deleted, renamed or moved
	private registerFileEvents() {
		this.registerEvent(this.app.vault.on('delete', (file) => {
			if (file instanceof TFile) {
				this.defManager.removeFile(file.path);
			} else if (file instanceof TFolder && this.affectsDefFolder(file.path)) {
				this.refreshDefinitions();
			}
		}));

		this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
			const settings = getSettings();
			if (file instanceof TFolder) {
				const newDefFolder = renamedFolderPath(settings.defFolder, oldPath, file.path);
				if (newDefFolder !== null) {
					// The people folder or one of its parent folders was renamed or moved
					settings.defFolder = newDefFolder;
					await this.saveSettings();
				} else if (this.affectsDefFolder(oldPath) || this.affectsDefFolder(file.path)) {
					this.fileExplorerDeco.run();
					await this.refreshDefinitions();
				}
				return;
			}
			if (file instanceof TFile &&
				(isPathInFolder(oldPath, this.defManager.getGlobalDefFolder()) || this.defManager.isDefFile(file))) {
				await this.defManager.renameFile(file, oldPath);
				this.fileExplorerDeco.run();
			}
		}));
	}

	// True if the folder is the people folder, is inside it, or holds it
	private affectsDefFolder(folderPath: string): boolean {
		const defFolder = this.defManager.getGlobalDefFolder();
		return isPathInFolder(folderPath, defFolder) || isPathInFolder(defFolder, folderPath);
	}

	registerMenuForMarkedWords(menu: Menu, def: PersonMetadata) {
		menu.addItem((item) => {
			item.setTitle("Go to definition")
				.setIcon("arrow-left-from-line")
				.onClick(() => {
					this.app.workspace.openLinkText(def.linkText, '');
				});
		})

		menu.addItem(item => {
			item.setTitle("Edit definition")
				.setIcon("pencil")
				.onClick(() => {
					const editModal = new EditDefinitionModal(this.app);
					editModal.open(def);
				});
		});
	}

	// The defManager change listener redraws the names after each load
	async refreshDefinitions() {
		await this.defManager.loadDefinitions();
	}

	async reloadUpdatedDefinitions() {
		await this.defManager.loadUpdatedFiles();
	}

	private shouldAutoRegister(file: TAbstractFile): file is TFile {
		return getSettings().autoRegisterNewFiles &&
			file instanceof TFile &&
			file.extension === 'md' &&
			isPathInFolder(file.path, this.defManager.getGlobalDefFolder());
	}

	// Add the template to an empty file, or add def-type to a file that has none.
	// The decision uses the file text, not the metadata cache, which can be stale.
	// A def-type that already exists is never changed.
	async ensureDefFileRegistered(file: TFile) {
		// The 'create' and 'active-leaf-change' events can both arrive for a new file
		if (this.registeringFiles.has(file.path)) {
			return;
		}
		this.registeringFiles.add(file.path);
		try {
			let addedTemplate = false;
			let addedDefType = false;

			const content = await this.app.vault.read(file);
			if (content.trim().length === 0) {
				await this.app.vault.process(file, data => {
					if (data.trim().length > 0) {
						return data;
					}
					addedTemplate = true;
					return this.buildDefFileTemplate(file.basename);
				});
			} else if (!this.hasDefType(content)) {
				const defaultType = getSettings().defFileParseConfig.defaultFileType ?? DefFileType.Consolidated;
				await this.app.fileManager.processFrontMatter(file, fm => {
					if (!fm[DEF_TYPE_FM]) {
						fm[DEF_TYPE_FM] = defaultType;
						addedDefType = true;
					}
				});
			}

			if (addedTemplate || addedDefType) {
				new Notice(addedTemplate ?
					`Added People template to ${file.basename}` :
					`Registered ${file.basename} as People file`);
				this.fileExplorerDeco.run();
				await this.refreshDefinitions();
			}
		} catch (error) {
			console.error(`Failed to register ${file.path}:`, error);
		} finally {
			this.registeringFiles.delete(file.path);
		}
	}

	// Reads def-type from the frontmatter in the file text
	private hasDefType(content: string): boolean {
		const info = getFrontMatterInfo(content);
		if (!info.exists) {
			return false;
		}
		try {
			const fm = parseYaml(info.frontmatter);
			return !!fm?.[DEF_TYPE_FM];
		} catch (e) {
			// The YAML is not valid. Do not change a file that we cannot read correctly.
			return true;
		}
	}

	private buildDefFileTemplate(companyName: string): string {
		return `---
${DEF_TYPE_FM}: consolidated
color: "blue"
---

![${companyName} Logo](logo.png)

# Person Name
Position: Job Title
Department: Department Name

Notes about this person go here.
You can add multiple lines of notes.

---

# Another Person
Position: Another Job Title
Department: Another Department

Notes about the second person.

---
`;
	}

	updateEditorExts() {
		const currFile = this.app.workspace.getActiveFile();
		if (currFile && this.defManager.isDefFile(currFile)) {
			// TODO: Editor extension for people file
			this.setActiveEditorExtensions([]);
		} else {
			this.setActiveEditorExtensions(definitionMarker);
		}
	}

	private setActiveEditorExtensions(...ext: Extension[]) {
		this.activeEditorExtensions.length = 0;
		this.activeEditorExtensions.push(...ext);
		this.app.workspace.updateOptions();
	}

	onunload() {
		getDefinitionPopover().cleanUp();

		// Clean up context and services
		PluginContext.cleanup();
		DefinitionPreviewService.cleanup();

	}
}
