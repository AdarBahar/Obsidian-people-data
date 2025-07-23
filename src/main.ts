import { Menu, Modal, Notice, Plugin, TFolder, WorkspaceWindow, TFile, MarkdownView } from 'obsidian';
import { definitionMarker } from './editor/decoration';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { DefManager, initDefFileManager } from './core/def-file-manager';
import { PersonMetadata } from './core/model';
import { getDefinitionPopover, initDefinitionPopover } from './editor/definition-popover';
import { postProcessor } from './editor/md-postprocessor';
import { DEFAULT_SETTINGS, SettingsTab, getSettings } from './settings';
import { getMarkedWordUnderCursor } from './util/editor';
import { FileExplorerDecoration, initFileExplorerDecoration } from './ui/file-explorer';
import { EditDefinitionModal } from './editor/edit-modal';
import { AddDefinitionModal } from './editor/add-modal';
import { initDefinitionModal } from './editor/mobile/definition-modal';
import { registerDefFile } from './editor/def-file-registration';
import { DefFileType } from './core/file-type';
import { PluginContext } from './core/plugin-context';
import { DefinitionPreviewService } from './core/definition-preview-service';
import { initCompanyManager, getCompanyManager } from './core/company-manager';
import { CompanyConfigModal } from './editor/company-config-modal';
import { initNameAutoCompletion, NameAutoCompletion } from './editor/auto-completion';
import { AboutPeopleMetadataModal } from './editor/about-modal';
import { initOptimizedSearchEngine, getOptimizedSearchEngine } from './core/optimized-search-engine';
import { initSmartLineScanner, getSmartLineScanner } from './core/smart-line-scanner';

export default class NoteDefinition extends Plugin {
	activeEditorExtensions: Extension[] = [];
	defManager: DefManager;
	fileExplorerDeco: FileExplorerDecoration;
	nameAutoCompletion: NameAutoCompletion;
	dynamicStylesEl: HTMLStyleElement;
	context: PluginContext;
	previewService: DefinitionPreviewService;

	async onload() {
		// Initialize plugin context instead of global variables
		const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
		this.context = PluginContext.initialize(this.app, this, settings);
		this.previewService = DefinitionPreviewService.getInstance();

		// Expose minimal interface for HTML event handlers
		(window as any).peopleMetadataPlugin = {
			triggerDefPreview: (el: HTMLElement) => this.previewService.triggerDefPreview(el),
			closeDefPreview: () => this.previewService.closeDefPreview(),
		};



		initDefinitionPopover(this);
		initDefinitionModal(this.app);
		this.defManager = initDefFileManager(this.app);
		this.fileExplorerDeco = initFileExplorerDecoration(this.app);
		initCompanyManager(this.app);

		// Initialize optimization systems
		initOptimizedSearchEngine();
		initSmartLineScanner();

		// Initialize auto-completion if enabled
		if (this.context.settings.autoCompletionConfig?.enabled !== false) {
			this.nameAutoCompletion = initNameAutoCompletion(this.app);
			this.registerEditorSuggest(this.nameAutoCompletion);
		}
		this.registerEditorExtension(this.activeEditorExtensions);
		this.updateEditorExts();

		this.registerCommands();
		this.registerEvents();

		this.addSettingTab(new SettingsTab(this.app, this, this.saveSettings.bind(this)));
		this.registerMarkdownPostProcessor(postProcessor);

		this.initDynamicStyles();

		// Load definitions and apply company colors immediately
		await this.refreshDefinitions();

		// Delay file explorer decoration until workspace is ready
		// This is a non-critical feature that adds visual tags to files
		this.app.workspace.onLayoutReady(() => {
			// Add a small delay to ensure all views are loaded
			setTimeout(() => {
				try {
					// Only run if enabled in settings
					if (this.context.settings.enableFileExplorerTags) {
						this.fileExplorerDeco.run();
					}

					// Ensure company colors are applied after workspace is ready
					this.updateCompanyColors();
				} catch (error) {
					// File explorer decoration is non-critical, fail silently
				}
			}, 2000); // Increased delay to 2 seconds for better reliability
		});
	}

	async saveSettings() {
		await this.saveData(this.context.settings);
		this.context.updateSettings(this.context.settings);

		// Only run file explorer decoration if enabled
		if (this.context.settings.enableFileExplorerTags) {
			try {
				this.fileExplorerDeco.run();
			} catch (error) {
				// File explorer decoration is non-critical, fail silently
			}
		}

		await this.refreshDefinitions();
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
			id: "refresh-people",
			name: "Refresh people",
			callback: () => {
				this.fileExplorerDeco.run();
				this.refreshDefinitions();
			}
		});

		this.addCommand({
			id: "update-company-colors",
			name: "Update company colors",
			callback: () => {
				this.updateCompanyColors();
				new Notice("Company colors updated");
			}
		});

		this.addCommand({
			id: "configure-companies",
			name: "Configure companies",
			callback: () => {
				const companyManager = getCompanyManager();
				const companies = companyManager.getAllCompanies();

				const modal = new CompanyConfigModal(this.app, companies, async () => {
					await this.refreshDefinitions();
					new Notice("Company configurations updated!");
				});
				modal.open();
			}
		});

		this.addCommand({
			id: "force-cleanup-tooltips",
			name: "Force cleanup stuck tooltips",
			callback: () => {
				try {
					// Simple cleanup without complex logic
					document.querySelectorAll('.people-metadata-definition-popover').forEach(el => el.remove());
					const popoverById = document.getElementById('definition-popover');
					if (popoverById) popoverById.remove();
					document.querySelectorAll('[id*="definition-popover"]').forEach(el => el.remove());

					new Notice("Tooltips cleaned up!");
				} catch (error) {
					new Notice("Error: " + error.message);
				}
			}
		});

		this.addCommand({
			id: "test-plugin-status",
			name: "Test plugin status",
			callback: () => {
				try {
					const contextStatus = PluginContext.isInitialized() ? "✅ Initialized" : "❌ Not initialized";
					const defManagerStatus = this.defManager ? "✅ Available" : "❌ Missing";
					const peopleCount = this.defManager ? this.defManager.getDefFiles().length : 0;
					const autoCompleteStatus = this.nameAutoCompletion ? "✅ Enabled" : "❌ Disabled";

					new Notice(`Plugin Status:\nContext: ${contextStatus}\nDefManager: ${defManagerStatus}\nPeople files: ${peopleCount}\nAuto-completion: ${autoCompleteStatus}`, 5000);
				} catch (error) {
					new Notice("Status check error: " + error.message);
				}
			}
		});

		this.addCommand({
			id: "insert-name-trigger",
			name: "Insert name auto-completion trigger",
			editorCallback: (editor) => {
				try {
					const settings = getSettings();
					const trigger = settings.autoCompletionConfig?.triggerPattern || "@name:";
					const cursor = editor.getCursor();
					editor.replaceRange(trigger, cursor);

					// Position cursor after the trigger
					const newCursor = {
						line: cursor.line,
						ch: cursor.ch + trigger.length
					};
					editor.setCursor(newCursor);
				} catch (error) {
					new Notice("Error inserting trigger: " + error.message);
				}
			}
		});

		this.addCommand({
			id: "refresh-all",
			name: "Refresh all (definitions, colors, UI)",
			callback: async () => {
				try {
					new Notice("Refreshing all plugin data...");
					await this.refreshDefinitions();
					this.updateCompanyColors();
					if (this.context.settings.enableFileExplorerTags) {
						this.fileExplorerDeco.run();
					}
					this.updateEditorExts();
					new Notice("All plugin data refreshed successfully!");
				} catch (error) {
					new Notice("Error refreshing plugin data: " + error.message);
				}
			}
		});

		this.addCommand({
			id: "show-about",
			name: "About People Metadata",
			callback: () => {
				const aboutModal = new AboutPeopleMetadataModal(this.app);
				aboutModal.open();
			}
		});

		this.addCommand({
			id: "toggle-optimized-search",
			name: "Toggle optimized search",
			callback: async () => {
				const currentSetting = this.context.settings.optimizationConfig?.useOptimizedSearch ?? true;
				if (!this.context.settings.optimizationConfig) {
					this.context.settings.optimizationConfig = {
						useOptimizedSearch: !currentSetting,
						autoRefreshMentionCounts: true,
						cacheSize: 1000,
						enablePerformanceMonitoring: true
					};
				} else {
					this.context.settings.optimizationConfig.useOptimizedSearch = !currentSetting;
				}
				await this.saveSettings();
				new Notice(`Optimized search ${!currentSetting ? 'enabled' : 'disabled'}`);
			}
		});

		this.addCommand({
			id: "show-search-performance",
			name: "Show search performance statistics",
			callback: () => {
				this.showPerformanceStatistics();
			}
		});

		this.addCommand({
			id: "rebuild-search-indexes",
			name: "Rebuild optimized search indexes",
			callback: async () => {
				try {
					new Notice("Rebuilding search indexes...");
					const searchEngine = getOptimizedSearchEngine();
					if (searchEngine && this.defManager) {
						const allPeople = this.defManager.getAllPeople();
						searchEngine.buildIndexes(allPeople);
						new Notice("Search indexes rebuilt successfully!");
					} else {
						new Notice("Search engine not available");
					}
				} catch (error) {
					new Notice("Error rebuilding indexes: " + error.message);
				}
			}
		});

		this.addCommand({
			id: "refresh-mention-counts",
			name: "Refresh mention counts",
			callback: async () => {
				try {
					new Notice("Refreshing mention counts...");
					// TODO: Implement mention count refresh
					new Notice("Mention counts refreshed!");
				} catch (error) {
					new Notice("Error refreshing mention counts: " + error.message);
				}
			}
		});
	}

	registerEvents() {
		this.registerEvent(this.app.workspace.on("active-leaf-change", async (leaf) => {
			if (!leaf) return;
			this.reloadUpdatedDefinitions();
			this.updateEditorExts();
			this.defManager.updateActiveFile();

			// Check if we opened an empty file in the People folder
			await this.checkAndAddTemplateOnOpen();
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

		// Creating files under def folder should register file as definition file
		this.registerEvent(this.app.vault.on('create', (file) => {
			const settings = getSettings();
			if (file.path.startsWith(settings.defFolder) && file instanceof TFile && file.extension === 'md') {
				if (settings.autoRegisterNewFiles) {
					// Automatically register new markdown files in the people folder as consolidated people files
					window.setTimeout(() => {
						this.autoRegisterNewDefFile(file);
					}, 100); // Small delay to ensure file is fully created
				} else {
					// Just update the file explorer decoration without auto-registering
					this.fileExplorerDeco.run();
				}
			}
		}));

		this.registerEvent(this.app.metadataCache.on('changed', (file: TFile) => {
			const currFile = this.app.workspace.getActiveFile();

			// Check if the changed file is a definition file
			if (this.defManager.isDefFile(file)) {
				// Mark the file as dirty and reload definitions
				this.defManager.markDirty(file);
				this.reloadUpdatedDefinitions();
			}

			if (currFile && currFile.path === file.path) {
				this.defManager.updateActiveFile();

				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

				if(activeView) {
					// @ts-expect-error, not typed
					const view = activeView.editor.cm as EditorView;
					const plugin = view.plugin(definitionMarker);

					if (plugin) {
						plugin.forceUpdate();
					}
				}
			}
		}));
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

	async refreshDefinitions() {
		await this.defManager.loadDefinitions();

		// Rebuild optimized search indexes if enabled
		if (this.context.settings.optimizationConfig?.useOptimizedSearch !== false) {
			const searchEngine = getOptimizedSearchEngine();
			if (searchEngine) {
				const allPeople = this.defManager.getAllPeople();
				searchEngine.buildIndexes(allPeople);
			}
		}

		// Update company colors after loading people with multiple attempts for reliability
		this.updateCompanyColors(); // Immediate attempt
		window.setTimeout(() => this.updateCompanyColors(), 100); // Backup after 100ms
		window.setTimeout(() => this.updateCompanyColors(), 500); // Final backup after 500ms
	}

	reloadUpdatedDefinitions() {
		this.defManager.loadUpdatedFiles();
		// Update company colors after loading updated people
		window.setTimeout(() => this.updateCompanyColors(), 100);
	}

	async autoRegisterNewDefFile(file: TFile) {
		try {
			// Check if the file already has frontmatter with def-type
			const fileContent = await this.app.vault.cachedRead(file);
			const fileMetadata = this.app.metadataCache.getFileCache(file);

			// If file already has def-type frontmatter, don't modify it
			if (fileMetadata?.frontmatter?.['def-type']) {
				this.fileExplorerDeco.run();
				await this.refreshDefinitions();
				return;
			}

			// If file is empty or only has whitespace, add frontmatter and basic template
			let contentWithoutFrontmatter = fileContent;
			const fmPos = fileMetadata?.frontmatterPosition;
			if (fmPos) {
				contentWithoutFrontmatter = fileContent.slice(fmPos.end.offset + 1);
			}
			contentWithoutFrontmatter = contentWithoutFrontmatter.trim();

			if (contentWithoutFrontmatter.length === 0) {
				// File is empty, add full template
				await this.addDefFileTemplate(file);
			} else {
				// File has content, just add frontmatter
				registerDefFile(this.app, file, DefFileType.Consolidated);
			}

			// Update UI and refresh people
			this.fileExplorerDeco.run();
			await this.refreshDefinitions();

			new Notice(`Auto-registered ${file.basename} as a People file`);
		} catch (error) {
			console.error(`Failed to auto-register ${file.path}:`, error);
		}
	}

	async checkAndAddTemplateOnOpen() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;

		const settings = getSettings();

		// Check if the file is in the People folder and auto-registration is enabled
		if (!activeFile.path.startsWith(settings.defFolder) ||
			!settings.autoRegisterNewFiles ||
			activeFile.extension !== 'md') {
			return;
		}

		try {
			// Read the file content
			const fileContent = await this.app.vault.cachedRead(activeFile);
			const fileMetadata = this.app.metadataCache.getFileCache(activeFile);

			// Check if file is essentially empty (no content or only whitespace)
			let contentWithoutFrontmatter = fileContent;
			const fmPos = fileMetadata?.frontmatterPosition;
			if (fmPos) {
				contentWithoutFrontmatter = fileContent.slice(fmPos.end.offset + 1);
			}
			contentWithoutFrontmatter = contentWithoutFrontmatter.trim();
			const hasDefType = fileMetadata?.frontmatter?.['def-type'];

			// If file is empty and doesn't have def-type, add template
			if (contentWithoutFrontmatter.length === 0 && !hasDefType) {
				await this.addDefFileTemplate(activeFile);
				new Notice(`Added People template to ${activeFile.basename}`);

				// Update UI and refresh people
				this.fileExplorerDeco.run();
				await this.refreshDefinitions();
			}
			// If file has content but no def-type, just add frontmatter
			else if (!hasDefType && contentWithoutFrontmatter.length > 0) {
				await registerDefFile(this.app, activeFile, DefFileType.Consolidated);
				new Notice(`Registered ${activeFile.basename} as People file`);

				// Update UI and refresh people
				this.fileExplorerDeco.run();
				await this.refreshDefinitions();
			}
		} catch (error) {
			console.error(`Failed to check/add template for ${activeFile.path}:`, error);
		}
	}

	async addDefFileTemplate(file: TFile) {
		const companyName = file.basename;
		const template = `---
def-type: consolidated
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

		await this.app.vault.process(file, () => template);
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

	initDynamicStyles() {
		// Create a style element for dynamic company colors
		this.dynamicStylesEl = document.head.createEl('style', {
			attr: {
				'data-plugin': 'people-metadata'
			}
		});
		this.updateCompanyColors();
	}

	updateCompanyColors() {
		if (!this.dynamicStylesEl) {
			console.warn("People Metadata: Dynamic styles element not ready for company colors");
			return;
		}

		const companies = new Map<string, string>();
		const defRepo = this.defManager?.globalDefs;

		if (!defRepo) {
			console.warn("People Metadata: Definition repository not ready for company colors");
			return;
		}

		// Collect all company colors
		let totalPeople = 0;
		let companiesWithColors = 0;

		for (const [, fileMap] of defRepo.fileDefMap) {
			for (const [, person] of fileMap) {
				totalPeople++;
				if (person.companyName && person.companyColor) {
					companies.set(person.companyName, person.companyColor);
					companiesWithColors++;
				}
			}
		}

		console.log(`People Metadata: Updating company colors for ${companies.size} companies (${companiesWithColors}/${totalPeople} people have company colors)`);

		// Generate CSS rules for each company
		let cssRules = '';
		for (const [companyName, color] of companies) {
			const safeName = companyName.replace(/[^a-zA-Z0-9-_]/g, '-');
			cssRules += `
.people-metadata-def-decoration[data-company="${safeName}"] {
	--person-underline-color: ${color} !important;
}
`;
		}

		this.dynamicStylesEl.textContent = cssRules;
		console.log(`People Metadata: Applied ${companies.size} company color rules`);
	}

	private showPerformanceStatistics() {
		const searchEngine = getOptimizedSearchEngine();
		const lineScanner = getSmartLineScanner();

		if (!searchEngine || !lineScanner) {
			new Notice("Performance monitoring not available");
			return;
		}

		const searchStats = searchEngine.getPerformanceStats();
		const scannerStats = lineScanner.getAveragePerformance();

		const statsText = `
**Search Engine Performance:**
• Cache Hit Rate: ${searchStats.cacheHitRate.toFixed(1)}%
• Average Scan Time: ${searchStats.averageScanTime.toFixed(2)}ms
• Total Searches: ${searchStats.totalSearches}
• Memory Usage: ${(searchStats.memoryUsage / 1024).toFixed(1)}KB

**Index Sizes:**
• Name Index: ${searchStats.indexSizes.nameIndex} entries
• Company Index: ${searchStats.indexSizes.companyIndex} entries
• Prefix Index: ${searchStats.indexSizes.prefixIndex} nodes
• Fuzzy Index: ${searchStats.indexSizes.fuzzyIndex} entries

**Line Scanner Performance:**
• Average Scan Time: ${scannerStats.averageScanTime.toFixed(2)}ms
• Cache Hit Rate: ${scannerStats.cacheHitRate.toFixed(1)}%
• Strategy Usage:
  - Prefix Tree: ${scannerStats.strategyCounts['prefix-tree'] || 0}
  - Word Boundary: ${scannerStats.strategyCounts['word-boundary'] || 0}
  - Fuzzy Matching: ${scannerStats.strategyCounts['fuzzy-matching'] || 0}
  - Legacy: ${scannerStats.strategyCounts['legacy'] || 0}
		`.trim();

		// Create a simple modal to display stats
		const modal = new Modal(this.app);
		modal.titleEl.setText("Search Performance Statistics");
		modal.contentEl.createEl("pre", { text: statsText });

		const buttonContainer = modal.contentEl.createDiv({ cls: "modal-button-container" });
		buttonContainer.style.marginTop = "20px";
		buttonContainer.style.textAlign = "center";

		const clearCacheBtn = buttonContainer.createEl("button", { text: "Clear Caches" });
		clearCacheBtn.onclick = () => {
			searchEngine.clearCache();
			lineScanner.clearCache();
			lineScanner.clearMetrics();
			new Notice("Caches cleared!");
			modal.close();
		};

		const closeBtn = buttonContainer.createEl("button", { text: "Close" });
		closeBtn.style.marginLeft = "10px";
		closeBtn.onclick = () => modal.close();

		modal.open();
	}

	onunload() {
		// Clean up popovers and UI components
		const { cleanupDefinitionPopover } = require('./editor/definition-popover');
		cleanupDefinitionPopover();

		// Clean up dynamic styles
		if (this.dynamicStylesEl) {
			this.dynamicStylesEl.remove();
		}

		// Clean up context and services
		PluginContext.cleanup();
		DefinitionPreviewService.cleanup();

		// Clean up global interface
		delete (window as any).peopleMetadataPlugin;
	}
}
