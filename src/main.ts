import { Menu, Notice, Plugin, TFolder, WorkspaceWindow, TFile, MarkdownView, Modal, App } from 'obsidian';
import { injectGlobals } from './globals';
import { definitionMarker } from './editor/decoration';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { DefManager, initDefFileManager } from './core/def-file-manager';
import { PersonMetadata } from './core/model';
import { getDefinitionPopover, initDefinitionPopover } from './editor/definition-popover';
import { postProcessor } from './editor/md-postprocessor';
import { DEFAULT_SETTINGS, getSettings, SettingsTab } from './settings';
import { getMarkedWordUnderCursor } from './util/editor';
import { FileExplorerDecoration, initFileExplorerDecoration } from './ui/file-explorer';
import { EditDefinitionModal } from './editor/edit-modal';
import { AddDefinitionModal } from './editor/add-modal';
import { initDefinitionModal } from './editor/mobile/definition-modal';
import { registerDefFile } from './editor/def-file-registration';
import { DefFileType } from './core/file-type';
import { importPeopleFromCSV } from './util/csv-importer';
import { initMentionCounter, getMentionCounter } from './core/mention-counter';
import { NameAutocompleteSuggest } from './editor/name-autocomplete';

export default class NoteDefinition extends Plugin {
	activeEditorExtensions: Extension[] = [];
	defManager: DefManager;
	fileExplorerDeco: FileExplorerDecoration;
	dynamicStylesEl: HTMLStyleElement;
	nameAutocompleteSuggest: NameAutocompleteSuggest;

	async onload() {
		// Settings are injected into global object
		const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
		injectGlobals(settings, this.app, window);

		this.registerEvent(this.app.workspace.on('window-open', (_win: WorkspaceWindow, newWindow: Window) => {
			injectGlobals(settings, this.app, newWindow);
		}))



		initDefinitionPopover(this);
		initDefinitionModal(this.app);
		this.defManager = initDefFileManager(this.app);

		// Initialize optimized search based on settings
		if (settings.useOptimizedSearch !== false) {
			this.defManager.setOptimizedSearch(true);
			console.log("Optimized search enabled");
		} else {
			this.defManager.setOptimizedSearch(false);
			console.log("Optimized search disabled");
		}

		initMentionCounter(this.app);
		this.fileExplorerDeco = initFileExplorerDecoration(this.app);

		// Initialize name autocomplete if enabled
		if (settings.enableNameAutocomplete !== false) {
			this.nameAutocompleteSuggest = new NameAutocompleteSuggest(this.app);
			this.registerEditorSuggest(this.nameAutocompleteSuggest);
		}

		this.registerEditorExtension(this.activeEditorExtensions);
		this.updateEditorExts();

		this.registerCommands();
		this.registerEvents();

		this.addSettingTab(new SettingsTab(this.app, this, this.saveSettings.bind(this)));
		this.registerMarkdownPostProcessor(postProcessor);

		this.initDynamicStyles();
		this.fileExplorerDeco.run();
	}

	async saveSettings() {
		await this.saveData(window.NoteDefinition.settings);
		this.fileExplorerDeco.run();
		this.refreshDefinitions();

		// Update name autocomplete trigger pattern if it exists
		if (this.nameAutocompleteSuggest) {
			this.nameAutocompleteSuggest.updateTriggerPattern();
		}
	}

	registerCommands() {
		this.addCommand({
			id: "add-definition",
			name: "Add a Person",
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
			id: "import-people-csv",
			name: "Import People from CSV",
			callback: () => {
				this.showCSVImportModal();
			}
		});

		this.addCommand({
			id: "refresh-mention-counts",
			name: "Refresh mention counts",
			callback: async () => {
				new Notice("Scanning vault for mentions...", 2000);
				await this.updateMentionCounts();
				new Notice("Mention counts updated!");
			}
		});

		this.addCommand({
			id: "toggle-optimized-search",
			name: "Toggle optimized search",
			callback: () => {
				const defManager = this.defManager;
				const currentState = defManager.useOptimizedSearch;
				defManager.setOptimizedSearch(!currentState);
				new Notice(`Optimized search ${!currentState ? 'enabled' : 'disabled'}`);
			}
		});

		this.addCommand({
			id: "show-search-performance",
			name: "Show search performance statistics",
			callback: () => {
				const stats = this.defManager.getPerformanceStats();
				const modal = new Modal(this.app);
				modal.setTitle("Search Performance Statistics");

				const content = modal.contentEl;
				content.createEl("h3", { text: "Legacy Search" });
				content.createEl("p", { text: `Total People: ${stats.legacy.totalPeople}` });
				content.createEl("p", { text: `Total Files: ${stats.legacy.totalFiles}` });
				content.createEl("p", { text: `Prefix Tree Nodes: ${stats.legacy.prefixTreeNodes}` });

				content.createEl("h3", { text: "Optimized Search" });
				content.createEl("p", { text: `Cache Hit Rate: ${(stats.optimized.scanner.cacheHitRate * 100).toFixed(1)}%` });
				content.createEl("p", { text: `Average Scan Time: ${stats.optimized.scanner.averageScanTime.toFixed(2)}ms` });
				content.createEl("p", { text: `Memory Usage: ${stats.comparison.memoryUsage}` });

				content.createEl("h3", { text: "Search Engine Stats" });
				const engineStats = stats.optimized.searchEngine;
				content.createEl("p", { text: `Total People: ${engineStats.totalPeople}` });
				content.createEl("p", { text: `Total Companies: ${engineStats.totalCompanies}` });
				content.createEl("p", { text: `Cache Hit Rate: ${(engineStats.cacheHitRate * 100).toFixed(1)}%` });

				modal.open();
			}
		});

		this.addCommand({
			id: "rebuild-search-indexes",
			name: "Rebuild optimized search indexes",
			callback: async () => {
				new Notice("Rebuilding search indexes...", 2000);
				await this.defManager.rebuildOptimizedIndexes();
				new Notice("Search indexes rebuilt!");
			}
		});

		this.addCommand({
			id: "insert-name-autocomplete-trigger",
			name: "Insert name autocomplete trigger",
			editorCallback: (editor) => {
				const settings = getSettings();
				if (!settings.enableNameAutocomplete) {
					new Notice("Name autocomplete is disabled. Enable it in settings first.");
					return;
				}

				const trigger = settings.nameAutocompleteTrigger || '@name:';
				const cursor = editor.getCursor();
				editor.replaceRange(trigger, cursor);
				editor.setCursor({
					line: cursor.line,
					ch: cursor.ch + trigger.length
				});
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
						item.setTitle("Add a Person")
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
					setTimeout(() => {
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

			// Update mention counts for the changed file (debounced) if auto-refresh is enabled
			try {
				const settings = getSettings();
				if (settings.autoRefreshMentionCounts) {
					const mentionCounter = getMentionCounter();
					mentionCounter.scheduleFileUpdate(file, 2000); // 2 second delay to avoid excessive updates
				}
			} catch (error) {
				// Silently fail if mention counter not initialized
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

		// Listen for file modifications to update mention counts in real-time
		this.registerEvent(this.app.vault.on('modify', (file: TFile) => {
			// Only process markdown files
			if (file.extension !== 'md') {
				return;
			}

			// Update mention counts for the modified file (debounced) if auto-refresh is enabled
			try {
				const settings = getSettings();
				if (settings.autoRefreshMentionCounts) {
					const mentionCounter = getMentionCounter();
					mentionCounter.scheduleFileUpdate(file, 3000); // 3 second delay for typing
				}
			} catch (error) {
				// Silently fail if mention counter not initialized
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

	refreshDefinitions() {
		this.defManager.loadDefinitions();
		// Update company colors after loading people
		setTimeout(() => this.updateCompanyColors(), 100);
		// Update mention counts after loading people
		setTimeout(() => this.updateMentionCounts(), 200);
	}

	async updateMentionCounts() {
		try {
			const mentionCounter = getMentionCounter();
			await mentionCounter.scanVaultForMentions();
		} catch (error) {
			console.error("Failed to update mention counts:", error);
		}
	}

	reloadUpdatedDefinitions() {
		this.defManager.loadUpdatedFiles();
		// Update company colors after loading updated people
		setTimeout(() => this.updateCompanyColors(), 100);
	}

	async autoRegisterNewDefFile(file: TFile) {
		try {
			// Check if the file already has frontmatter with def-type
			const fileContent = await this.app.vault.cachedRead(file);
			const fileMetadata = this.app.metadataCache.getFileCache(file);

			// If file already has def-type frontmatter, don't modify it
			if (fileMetadata?.frontmatter?.['def-type']) {
				this.fileExplorerDeco.run();
				this.refreshDefinitions();
				return;
			}

			// If file is empty or only has whitespace, add frontmatter and basic template
			const contentWithoutFrontmatter = fileContent.replace(/^---[\s\S]*?---\n?/, '').trim();

			if (contentWithoutFrontmatter.length === 0) {
				// File is empty, add full template
				await this.addDefFileTemplate(file);
			} else {
				// File has content, just add frontmatter
				registerDefFile(this.app, file, DefFileType.Consolidated);
			}

			// Update UI and refresh people
			this.fileExplorerDeco.run();
			this.refreshDefinitions();

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
			const contentWithoutFrontmatter = fileContent.replace(/^---[\s\S]*?---\n?/, '').trim();
			const hasDefType = fileMetadata?.frontmatter?.['def-type'];

			// If file is empty and doesn't have def-type, add template
			if (contentWithoutFrontmatter.length === 0 && !hasDefType) {
				await this.addDefFileTemplate(activeFile);
				new Notice(`Added People template to ${activeFile.basename}`);

				// Update UI and refresh people
				this.fileExplorerDeco.run();
				this.refreshDefinitions();
			}
			// If file has content but no def-type, just add frontmatter
			else if (!hasDefType && contentWithoutFrontmatter.length > 0) {
				registerDefFile(this.app, activeFile, DefFileType.Consolidated);
				new Notice(`Registered ${activeFile.basename} as People file`);

				// Update UI and refresh people
				this.fileExplorerDeco.run();
				this.refreshDefinitions();
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

		await this.app.vault.modify(file, template);
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
		this.dynamicStylesEl = document.createElement('style');
		this.dynamicStylesEl.setAttribute('data-plugin', 'people-metadata');
		document.head.appendChild(this.dynamicStylesEl);
		this.updateCompanyColors();
	}

	updateCompanyColors() {
		if (!this.dynamicStylesEl) {
			return;
		}

		const companies = new Map<string, string>();
		const defRepo = this.defManager?.globalDefs;

		if (defRepo) {
			// Collect all company colors
			for (const [, fileMap] of defRepo.fileDefMap) {
				for (const [, person] of fileMap) {
					if (person.companyName && person.companyColor) {
						companies.set(person.companyName, person.companyColor);
					}
				}
			}
		}

		// Generate CSS rules for each company
		let cssRules = '';
		for (const [companyName, color] of companies) {
			const safeName = companyName.replace(/[^a-zA-Z0-9-_]/g, '-');
			cssRules += `
.def-decoration[data-company="${safeName}"] {
	--person-underline-color: ${color} !important;
}
`;
		}

		this.dynamicStylesEl.textContent = cssRules;
	}

	/**
	 * Show CSV import modal for importing people data
	 */
	async showCSVImportModal() {
		// Create a simple modal for CSV input
		const modal = new CSVImportModal(this.app, async (csvContent: string) => {
			try {
				new Notice("Starting CSV import...", 2000);
				const summary = await importPeopleFromCSV(this.app, csvContent);

				// Refresh the UI after import
				this.fileExplorerDeco.run();
				this.refreshDefinitions();

				// Show detailed summary in a new note
				await this.createSummaryNote(summary);

			} catch (error) {
				new Notice(`CSV import failed: ${error.message}`, 5000);
				console.error("CSV import error:", error);
			}
		});
		modal.open();
	}

	/**
	 * Create a summary note with import results
	 */
	private async createSummaryNote(summary: import('./util/csv-importer').ImportSummary) {
		const now = new Date();
		const dateTime = now.toLocaleString('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		}).replace(/[/,]/g, '-').replace(/:/g, '-').replace(/\s/g, '_');

		const fileName = `People-Plugin CSV import ${dateTime}.md`;

		// Get the People folder path
		const peopleFolder = this.defManager.getGlobalDefFolder();
		const filePath = `${peopleFolder}/${fileName}`;

		try {
			// Create the summary note in the People folder
			const summaryContent = this.generateSummaryReport(summary);

			const file = await this.app.vault.create(filePath, summaryContent);

			// Open the summary note
			await this.app.workspace.openLinkText(file.path, '');

			new Notice(`Import summary created: ${fileName}`, 3000);
		} catch (error) {
			console.error("Failed to create summary note:", error);
			new Notice("Import completed, but failed to create summary note", 3000);
		}
	}

	/**
	 * Generate a formatted summary report from import summary
	 */
	private generateSummaryReport(summary: import('./util/csv-importer').ImportSummary): string {
		let report = '# CSV Import Summary\n\n';
		report += `**Import Date:** ${new Date().toLocaleString()}\n`;
		report += `**Total Records Processed:** ${summary.totalProcessed}\n\n`;

		// Companies section
		report += '## Companies\n';
		report += `**New Companies Added:** ${summary.companiesAdded}\n`;
		if (summary.companiesAddedList.length > 0) {
			report += '- ' + summary.companiesAddedList.join('\n- ') + '\n';
		}
		report += '\n';

		// People added section
		report += '## People Added\n';
		if (summary.peopleAdded.size > 0) {
			let totalAdded = 0;
			for (const [company, count] of summary.peopleAdded) {
				report += `**${company}:** ${count} people\n`;
				totalAdded += count;
			}
			report += `\n**Total People Added:** ${totalAdded}\n\n`;
		} else {
			report += 'No new people were added.\n\n';
		}

		// People updated section
		report += '## People Updated\n';
		if (summary.peopleUpdated.size > 0) {
			let totalUpdated = 0;
			for (const [company, count] of summary.peopleUpdated) {
				report += `**${company}:** ${count} people\n`;
				totalUpdated += count;
			}
			report += `\n**Total People Updated:** ${totalUpdated}\n\n`;
		} else {
			report += 'No people were updated.\n\n';
		}

		// Failures section
		report += '## Failures\n';
		if (summary.failures.length > 0) {
			report += `**Total Failures:** ${summary.failures.length}\n\n`;
			for (const failure of summary.failures) {
				report += `**Row ${failure.row}:** ${failure.fullName} (${failure.company})\n`;
				report += `- Reason: ${failure.reason}\n\n`;
			}
		} else {
			report += 'No failures occurred during import.\n\n';
		}

		return report;
	}

	onunload() {
		getDefinitionPopover().cleanUp();

		// Clean up dynamic styles
		if (this.dynamicStylesEl) {
			this.dynamicStylesEl.remove();
		}
	}
}

/**
 * Simple modal for CSV input
 */
class CSVImportModal extends Modal {
	private onSubmit: (csvContent: string) => Promise<void>;

	constructor(app: App, onSubmit: (csvContent: string) => Promise<void>) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Import People from CSV" });

		contentEl.createEl("p", {
			text: "Paste your CSV content below. Required columns: Company, Full Name. Optional: Position, Department, Email, Phone Number"
		});

		const textArea = contentEl.createEl("textarea", {
			attr: {
				rows: "15",
				cols: "80",
				placeholder: "Company,Full Name,Position,Department,Email,Phone Number\nTechCorp,John Doe,Software Engineer,Engineering,john@techcorp.com,555-1234\nTechCorp,Jane Smith,Product Manager,Product,jane@techcorp.com,555-5678"
			}
		});
		textArea.style.width = "100%";
		textArea.style.fontFamily = "monospace";

		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.marginTop = "1rem";
		buttonContainer.style.textAlign = "right";

		const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
		cancelButton.style.marginRight = "0.5rem";
		cancelButton.onclick = () => this.close();

		const importButton = buttonContainer.createEl("button", { text: "Import" });
		importButton.style.backgroundColor = "var(--interactive-accent)";
		importButton.style.color = "var(--text-on-accent)";
		importButton.onclick = async () => {
			const csvContent = textArea.value.trim();
			if (!csvContent) {
				new Notice("Please enter CSV content");
				return;
			}

			this.close();
			await this.onSubmit(csvContent);
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
