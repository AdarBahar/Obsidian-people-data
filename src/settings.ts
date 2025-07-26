import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, setTooltip } from "obsidian";
import { DefFileType } from "./core/file-type";
import { PluginContext } from "./core/plugin-context";
import { CompanyConfigModal } from "./editor/company-config-modal";
import { AboutPeopleMetadataModal } from "./editor/about-modal";
import { getCompanyManager } from "./core/company-manager";

export enum PopoverEventSettings {
	Hover = "hover",
	Click = "click"
}

export enum PopoverDismissType {
	Click = "click",
	MouseExit = "mouse_exit"
}

export enum MentionCountDisplayType {
	Off = "off",
	All = "all",
	TextOnly = "text_only",
	TasksOnly = "tasks_only"
}

export interface DividerSettings {
	dash: boolean;
	underscore: boolean;
}

export interface DefFileParseConfig {
	defaultFileType: DefFileType;
	divider: DividerSettings;
}

export interface DefinitionPopoverConfig {
	displayDefFileName: boolean;
	enableCustomSize: boolean;
	maxWidth: number;
	maxHeight: number;
	popoverDismissEvent: PopoverDismissType;
	backgroundColour?: string;
}

export interface AutoCompletionConfig {
	enabled: boolean;
	triggerPattern: string;
	minQueryLength: number;
	maxSuggestions: number;
	showMentionCounts: boolean;
	showCompanyInfo: boolean;
	showPositionInfo: boolean;
}

export interface OptimizationConfig {
	useOptimizedSearch: boolean;
	autoRefreshMentionCounts: boolean;
	cacheSize: number;
	enablePerformanceMonitoring: boolean;
}

export interface MentionCountingConfig {
	enabled: boolean;
	autoRefreshOnFileChange: boolean;
	showInTooltips: MentionCountDisplayType;
	includeTaskMentions: boolean;
	includeTextMentions: boolean;
	refreshIntervalMinutes: number;
	maxFilesToScanPerBatch: number;
}

export interface Settings {
	enableInReadingView: boolean;
	enableSpellcheck: boolean;
	defFolder: string;
	autoRegisterNewFiles: boolean;
	popoverEvent: PopoverEventSettings;
	defFileParseConfig: DefFileParseConfig;
	defPopoverConfig: DefinitionPopoverConfig;
	enableFileExplorerTags: boolean;
	autoCompletionConfig: AutoCompletionConfig;
	optimizationConfig: OptimizationConfig;
	mentionCountingConfig: MentionCountingConfig;
}

export const DEFAULT_DEF_FOLDER = "people"

export const DEFAULT_SETTINGS: Partial<Settings> = {
	enableInReadingView: true,
	enableSpellcheck: false,
	enableFileExplorerTags: false, // Disabled by default to prevent errors
	autoCompletionConfig: {
		enabled: true,
		triggerPattern: "@name:",
		minQueryLength: 1,
		maxSuggestions: 10,
		showMentionCounts: true,
		showCompanyInfo: true,
		showPositionInfo: true
	},
	optimizationConfig: {
		useOptimizedSearch: true,
		autoRefreshMentionCounts: true,
		cacheSize: 1000,
		enablePerformanceMonitoring: true
	},
	mentionCountingConfig: {
		enabled: true,
		autoRefreshOnFileChange: true,
		showInTooltips: MentionCountDisplayType.All,
		includeTaskMentions: true,
		includeTextMentions: true,
		refreshIntervalMinutes: 30,
		maxFilesToScanPerBatch: 10
	},
	autoRegisterNewFiles: true,
	popoverEvent: PopoverEventSettings.Hover,
	defFileParseConfig: {
		defaultFileType: DefFileType.Consolidated,
		divider: {
			dash: true,
			underscore: false
		}
	},
	defPopoverConfig: {
		displayDefFileName: false,
		enableCustomSize: false,
		maxWidth: 150,
		maxHeight: 150,
		popoverDismissEvent: PopoverDismissType.MouseExit,
	}
}

export class SettingsTab extends PluginSettingTab {
	plugin: Plugin;
	settings: Settings;
	saveCallback: () => Promise<void>;

	constructor(app: App, plugin: Plugin, saveCallback: () => Promise<void>) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = PluginContext.getInstance().settings;
		this.saveCallback = saveCallback;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		// Add main title
		const titleEl = containerEl.createEl("h2", {
			text: "People Metadata Configuration",
			attr: { style: "text-align: center; font-weight: bold; margin-bottom: 2em;" }
		});

		// Check if People folder exists and show alert if missing
		this.checkPeopleFolderAndShowAlert(containerEl);

		// === CORE SETUP SECTION ===
		new Setting(containerEl)
			.setHeading()
			.setName("📁 Core Setup");

		new Setting(containerEl)
			.setName("People folder")
			.setDesc("The folder containing your people definition files. Right-click any folder in the file explorer and select 'Set as people folder' to change this location.")
			.addText((component) => {
				component.setValue(this.settings.defFolder);
				component.setPlaceholder(DEFAULT_DEF_FOLDER);
				component.setDisabled(true)
				setTooltip(component.inputEl,
					"In the file explorer, right-click on the desired folder and click on 'Set as people folder' to change the people folder",
					{
						delay: 100
					});
			});

		new Setting(containerEl)
			.setClass("setting-item-indent")
			.setName("Auto-register new files")
			.setDesc("Automatically set up new markdown files created in the people folder with the proper template and frontmatter. Recommended for new users.")
			.addToggle((component) => {
				component.setValue(this.settings.autoRegisterNewFiles ?? true);
				component.onChange(async (val) => {
					this.settings.autoRegisterNewFiles = val;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setClass("setting-item-indent")
			.setName("File explorer tags")
			.setDesc("Show 'PEOPLE' badges next to people files in the file explorer. Disable if this causes performance issues or visual clutter.")
			.addToggle((component) => {
				component.setValue(this.settings.enableFileExplorerTags ?? false);
				component.onChange(async value => {
					this.settings.enableFileExplorerTags = value;
					await this.saveCallback();
				});
			});



		// === DISPLAY & INTERACTION SECTION ===
		new Setting(containerEl)
			.setHeading()
			.setName("👁️ Display & Interaction");

		new Setting(containerEl)
			.setName("Enable in reading view")
			.setDesc("Show people metadata tooltips and highlighting when viewing notes in Reading View mode. Disable for a cleaner reading experience.")
			.addToggle((component) => {
				component.setValue(this.settings.enableInReadingView);
				component.onChange(async (val) => {
					this.settings.enableInReadingView = val;
					await this.saveCallback();
				});
			});





		// === TOOLTIP SECTION ===
		new Setting(containerEl)
			.setHeading()
			.setName("👁️ Tooltip");

		new Setting(containerEl)
			.setName("Person's tooltip behavior")
			.setDesc("Configure how tooltips are triggered and dismissed");

		new Setting(containerEl)
			.setClass("setting-item-indent")
			.setName("Show tooltip")
			.setDesc("How to display people information: Hover for quick previews, Click for more deliberate interaction.")
			.addDropdown((component) => {
				component.addOption(PopoverEventSettings.Hover, "Hover (show on mouse over)");
				component.addOption(PopoverEventSettings.Click, "Click (show on click)");
				component.setValue(this.settings.popoverEvent);
				component.onChange(async value => {
					if (value === PopoverEventSettings.Hover || value === PopoverEventSettings.Click) {
						this.settings.popoverEvent = value;
					}
					await this.saveCallback();
					this.display(); // Refresh to show/hide dismiss options
				});
			});

		if (this.settings.popoverEvent === PopoverEventSettings.Hover) {
			new Setting(containerEl)
				.setClass("setting-item-indent")
				.setName("Hide tooltip")
				.setDesc("How to close tooltips when using hover trigger: Mouse exit for quick browsing, Click for persistent viewing.")
				.addDropdown(component => {
					component.addOption(PopoverDismissType.Click, "Click to dismiss");
					component.addOption(PopoverDismissType.MouseExit, "Mouse exit to dismiss")
					if (!this.settings.defPopoverConfig.popoverDismissEvent) {
						this.settings.defPopoverConfig.popoverDismissEvent = PopoverDismissType.Click;
						this.saveCallback();
					}
					component.setValue(this.settings.defPopoverConfig.popoverDismissEvent);
					component.onChange(async value => {
						if (value === PopoverDismissType.MouseExit || value === PopoverDismissType.Click) {
							this.settings.defPopoverConfig.popoverDismissEvent = value;
						}
						await this.saveCallback();
					});
				});
		}

		new Setting(containerEl)
			.setName("Display company file name")
			.setDesc("Show the source file name at the bottom of people tooltips. Useful for debugging or when managing many company files.")
			.addToggle(component => {
				component.setValue(this.settings.defPopoverConfig.displayDefFileName);
				component.onChange(async value => {
					this.settings.defPopoverConfig.displayDefFileName = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Custom tooltip size")
			.setDesc("Override automatic sizing with fixed dimensions. Not recommended as it prevents responsive sizing based on your screen.")
			.addToggle(component => {
				component.setValue(this.settings.defPopoverConfig.enableCustomSize);
				component.onChange(async value => {
					this.settings.defPopoverConfig.enableCustomSize = value;
					await this.saveCallback();
					this.display();
				});
			});

		if (this.settings.defPopoverConfig.enableCustomSize) {
			new Setting(containerEl)
				.setName("Popover width (px)")
				.setDesc("Maximum width of people tooltips")
				.addSlider(component => {
					component.setLimits(150, window.innerWidth, 1);
					component.setValue(this.settings.defPopoverConfig.maxWidth);
					component.setDynamicTooltip()
					component.onChange(async val => {
						this.settings.defPopoverConfig.maxWidth = val;
						await this.saveCallback();
					});
				});

			new Setting(containerEl)
				.setName("Popover height (px)")
				.setDesc("Maximum height of people tooltips")
				.addSlider(component => {
					component.setLimits(150, window.innerHeight, 1);
					component.setValue(this.settings.defPopoverConfig.maxHeight);
					component.setDynamicTooltip();
					component.onChange(async val => {
						this.settings.defPopoverConfig.maxHeight = val;
						await this.saveCallback();
					});
				});
		}

		new Setting(containerEl)
			.setName("Tooltip background color")
			.setDesc("Customize the background color of people tooltips. Leave default to match your current theme.")
			.addExtraButton(component => {
				component.setIcon("rotate-ccw");
				component.setTooltip("Reset to theme default");
				component.onClick(async () => {
					this.settings.defPopoverConfig.backgroundColour = undefined;
					await this.saveCallback();
					this.display();
				});
			})
			.addColorPicker(component => {
				if (this.settings.defPopoverConfig.backgroundColour) {
					component.setValue(this.settings.defPopoverConfig.backgroundColour);
				}
				component.onChange(async val => {
					this.settings.defPopoverConfig.backgroundColour = val;
					await this.saveCallback();
				})
			});

		new Setting(containerEl)
			.setName("Show mention counts")
			.setDesc("Display how many times each person has been mentioned in your vault")
			.addToggle((component) => {
				component.setValue(this.settings.autoCompletionConfig?.showMentionCounts ?? true);
				component.onChange(async value => {
					if (!this.settings.autoCompletionConfig) {
						this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
					}
					this.settings.autoCompletionConfig.showMentionCounts = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Show company information")
			.setDesc("Include company names in tooltip suggestions")
			.addToggle((component) => {
				component.setValue(this.settings.autoCompletionConfig?.showCompanyInfo ?? true);
				component.onChange(async value => {
					if (!this.settings.autoCompletionConfig) {
						this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
					}
					this.settings.autoCompletionConfig.showCompanyInfo = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Show position information")
			.setDesc("Include job titles and positions in tooltip suggestions")
			.addToggle((component) => {
				component.setValue(this.settings.autoCompletionConfig?.showPositionInfo ?? true);
				component.onChange(async value => {
					if (!this.settings.autoCompletionConfig) {
						this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
					}
					this.settings.autoCompletionConfig.showPositionInfo = value;
					await this.saveCallback();
				});
			});

		// === AUTO-COMPLETION SECTION ===
		new Setting(containerEl)
			.setHeading()
			.setName("⚡ Auto-completion");

		new Setting(containerEl)
			.setName("Enable name auto-completion")
			.setDesc("Show suggestions when typing people names. Type the trigger pattern (e.g., '@name:') followed by a person's name to see suggestions.")
			.addToggle((component) => {
				component.setValue(this.settings.autoCompletionConfig?.enabled ?? true);
				component.onChange(async value => {
					if (!this.settings.autoCompletionConfig) {
						this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
					}
					this.settings.autoCompletionConfig.enabled = value;
					await this.saveCallback();
					this.display(); // Refresh to show/hide other settings
				});
			});

		if (this.settings.autoCompletionConfig?.enabled !== false) {
			new Setting(containerEl)
				.setName("Trigger pattern")
				.setDesc("Text pattern that activates auto-completion. Common patterns: '@name:', '@person:', or just '@'")
				.addText((component) => {
					component.setValue(this.settings.autoCompletionConfig?.triggerPattern ?? "@name:");
					component.setPlaceholder("@name:");
					component.onChange(async value => {
						if (!this.settings.autoCompletionConfig) {
							this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
						}
						this.settings.autoCompletionConfig.triggerPattern = value;
						await this.saveCallback();
					});
				});

			new Setting(containerEl)
				.setName("Minimum query length")
				.setDesc("Start showing suggestions after typing this many characters (after the trigger pattern)")
				.addSlider((component) => {
					component.setLimits(1, 5, 1);
					component.setValue(this.settings.autoCompletionConfig?.minQueryLength ?? 1);
					component.setDynamicTooltip();
					component.onChange(async value => {
						if (!this.settings.autoCompletionConfig) {
							this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
						}
						this.settings.autoCompletionConfig.minQueryLength = value;
						await this.saveCallback();
					});
				});

			new Setting(containerEl)
				.setName("Maximum suggestions")
				.setDesc("Limit the number of suggestions shown to avoid overwhelming the interface")
				.addSlider((component) => {
					component.setLimits(3, 20, 1);
					component.setValue(this.settings.autoCompletionConfig?.maxSuggestions ?? 10);
					component.setDynamicTooltip();
					component.onChange(async value => {
						if (!this.settings.autoCompletionConfig) {
							this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
						}
						this.settings.autoCompletionConfig.maxSuggestions = value;
						await this.saveCallback();
					});
				});


		}

		// === COMPANY PAGES MANAGEMENT SECTION ===
		new Setting(containerEl)
			.setHeading()
			.setName("🏢 Company pages management");

		new Setting(containerEl)
			.setName("Configure companies")
			.setDesc("Manage company colors, logos, and other visual settings. Access the visual company configuration interface.")
			.addButton(button => {
				button.setButtonText("Open Company Configuration");
				button.onClick(() => {
					const companyManager = getCompanyManager();
					const companies = companyManager.getAllCompanies();

					const modal = new CompanyConfigModal(this.app, companies, async () => {
						// Refresh definitions and update colors after saving
						await (this.plugin as any).refreshDefinitions();
						new Notice("Company configurations updated!");
					});
					modal.open();
				});
			});



		// === PERFORMANCE SECTION ===
		new Setting(containerEl)
			.setHeading()
			.setName("⚡ Performance & Optimization");

		new Setting(containerEl)
			.setName("Use optimized search")
			.setDesc("Enable advanced search engine with multi-index system and caching for better performance with large vaults")
			.addToggle((component) => {
				component.setValue(this.settings.optimizationConfig?.useOptimizedSearch ?? true);
				component.onChange(async value => {
					if (!this.settings.optimizationConfig) {
						this.settings.optimizationConfig = DEFAULT_SETTINGS.optimizationConfig!;
					}
					this.settings.optimizationConfig.useOptimizedSearch = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Cache size")
			.setDesc("Number of search results to cache in memory. Higher values use more RAM but improve performance.")
			.addSlider((component) => {
				component.setLimits(100, 5000, 100);
				component.setValue(this.settings.optimizationConfig?.cacheSize ?? 1000);
				component.setDynamicTooltip();
				component.onChange(async value => {
					if (!this.settings.optimizationConfig) {
						this.settings.optimizationConfig = DEFAULT_SETTINGS.optimizationConfig!;
					}
					this.settings.optimizationConfig.cacheSize = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Performance monitoring")
			.setDesc("Enable detailed performance tracking and statistics. Useful for debugging performance issues.")
			.addToggle((component) => {
				component.setValue(this.settings.optimizationConfig?.enablePerformanceMonitoring ?? true);
				component.onChange(async value => {
					if (!this.settings.optimizationConfig) {
						this.settings.optimizationConfig = DEFAULT_SETTINGS.optimizationConfig!;
					}
					this.settings.optimizationConfig.enablePerformanceMonitoring = value;
					await this.saveCallback();
				});
			});

		// === MENTION COUNTING SECTION ===
		new Setting(containerEl)
			.setHeading()
			.setName("📊 Mention Counting");

		new Setting(containerEl)
			.setName("Enable mention counting")
			.setDesc("Track and display how many times people are mentioned across your entire vault. Useful for understanding relationship frequency.")
			.addToggle((component) => {
				component.setValue(this.settings.mentionCountingConfig?.enabled ?? true);
				component.onChange(async value => {
					if (!this.settings.mentionCountingConfig) {
						this.settings.mentionCountingConfig = DEFAULT_SETTINGS.mentionCountingConfig!;
					}
					this.settings.mentionCountingConfig.enabled = value;
					await this.saveCallback();
					this.display();
				});
			});

		if (this.settings.mentionCountingConfig?.enabled !== false) {


			new Setting(containerEl)
				.setName("Show mention counts in tooltips")
				.setDesc("Display mention statistics when hovering over people names")
				.addDropdown((component) => {
					component.addOption(MentionCountDisplayType.Off, "Off");
					component.addOption(MentionCountDisplayType.All, "All mention types");
					component.addOption(MentionCountDisplayType.TextOnly, "Only text mentions");
					component.addOption(MentionCountDisplayType.TasksOnly, "Only tasks");
					component.setValue(this.settings.mentionCountingConfig?.showInTooltips ?? MentionCountDisplayType.All);
					component.onChange(async value => {
						if (!this.settings.mentionCountingConfig) {
							this.settings.mentionCountingConfig = DEFAULT_SETTINGS.mentionCountingConfig!;
						}
						this.settings.mentionCountingConfig.showInTooltips = value as MentionCountDisplayType;
						await this.saveCallback();
					});
				});

			const currentRefreshValue = this.settings.mentionCountingConfig?.refreshIntervalMinutes ?? 30;
			const refreshIntervalSetting = new Setting(containerEl)
				.setName("Refresh interval (minutes)")
				.setDesc(`How often to automatically refresh mention counts in the background. Current: ${currentRefreshValue} minutes (Range: 5-120)`)
				.addSlider((component) => {
					component.setLimits(5, 120, 5);
					component.setValue(currentRefreshValue);
					component.setDynamicTooltip();

					component.onChange(async value => {
						if (!this.settings.mentionCountingConfig) {
							this.settings.mentionCountingConfig = DEFAULT_SETTINGS.mentionCountingConfig!;
						}
						this.settings.mentionCountingConfig.refreshIntervalMinutes = value;
						// Update description with new value
						refreshIntervalSetting.setDesc(`How often to automatically refresh mention counts in the background. Current: ${value} minutes (Range: 5-120)`);
						await this.saveCallback();
					});
				});

			const currentMaxFilesValue = this.settings.mentionCountingConfig?.maxFilesToScanPerBatch ?? 10;
			const maxFilesSetting = new Setting(containerEl)
				.setName("Max files per batch")
				.setDesc(`Limit how many files to scan at once to prevent performance issues. Current: ${currentMaxFilesValue} files (Range: 5-50)`)
				.addSlider((component) => {
					component.setLimits(5, 50, 5);
					component.setValue(currentMaxFilesValue);
					component.setDynamicTooltip();

					component.onChange(async value => {
						if (!this.settings.mentionCountingConfig) {
							this.settings.mentionCountingConfig = DEFAULT_SETTINGS.mentionCountingConfig!;
						}
						this.settings.mentionCountingConfig.maxFilesToScanPerBatch = value;
						// Update description with new value
						maxFilesSetting.setDesc(`Limit how many files to scan at once to prevent performance issues. Current: ${value} files (Range: 5-50)`);
						await this.saveCallback();
					});
				});
		}

	// === ABOUT SECTION ===
	new Setting(containerEl)
		.setHeading()
		.setName("ℹ️ About");

	new Setting(containerEl)
		.setName("About People Metadata")
		.setDesc("Learn about the plugin's features, get access to documentation, and find support resources")
		.addButton(button => {
			button
				.setButtonText("Show Plugin Information")
				.setCta()
				.onClick(() => {
					const aboutModal = new AboutPeopleMetadataModal(this.app);
					aboutModal.open();
				});
		});
}

private checkPeopleFolderAndShowAlert(containerEl: HTMLElement): void {
	const folderPath = this.settings.defFolder;
	const folder = this.app.vault.getFolderByPath(folderPath);

	if (!folder) {
		// Create alert container
		const alertContainer = containerEl.createEl("div", {
			attr: {
				style: "background-color: #ff6b6b; color: white; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff5252;"
			}
		});

		// Alert icon and title
		const alertHeader = alertContainer.createEl("div", {
			attr: { style: "display: flex; align-items: center; margin-bottom: 12px;" }
		});

		alertHeader.createEl("span", {
			text: "⚠️",
			attr: { style: "font-size: 20px; margin-right: 8px;" }
		});

		alertHeader.createEl("strong", {
			text: "People Folder Not Found",
			attr: { style: "font-size: 16px;" }
		});

		// Alert message
		alertContainer.createEl("p", {
			text: `The People folder "${folderPath}" doesn't exist in your vault. The plugin needs this folder to store and manage people data.`,
			attr: { style: "margin: 8px 0;" }
		});

		// Action buttons container
		const buttonContainer = alertContainer.createEl("div", {
			attr: { style: "display: flex; gap: 12px; margin-top: 12px;" }
		});

		// Create folder button
		const createButton = buttonContainer.createEl("button", {
			text: "Create People Folder",
			attr: {
				style: "background-color: white; color: #ff6b6b; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;"
			}
		});

		createButton.addEventListener("click", async () => {
			try {
				await this.app.vault.createFolder(folderPath);
				new Notice(`Created People folder at "${folderPath}"`);
				// Refresh the settings display to remove the alert
				this.display();
			} catch (error) {
				new Notice(`Failed to create folder: ${error.message}`);
			}
		});

		// Help button
		const helpButton = buttonContainer.createEl("button", {
			text: "How to Set Up",
			attr: {
				style: "background-color: rgba(255,255,255,0.2); color: white; border: 1px solid white; padding: 8px 16px; border-radius: 4px; cursor: pointer;"
			}
		});

		helpButton.addEventListener("click", () => {
			const helpModal = new Modal(this.app);
			helpModal.setTitle("Setting Up Your People Folder");

			const content = helpModal.contentEl;
			content.createEl("h3", { text: "Option 1: Create the folder automatically" });
			content.createEl("p", { text: "Click the 'Create People Folder' button above to automatically create the folder." });

			content.createEl("h3", { text: "Option 2: Create manually" });
			content.createEl("p", { text: "1. In the file explorer, right-click in your vault" });
			content.createEl("p", { text: "2. Select 'New folder'" });
			content.createEl("p", { text: `3. Name it "${folderPath}"` });

			content.createEl("h3", { text: "Option 3: Use existing folder" });
			content.createEl("p", { text: "1. Right-click on any existing folder in the file explorer" });
			content.createEl("p", { text: "2. Select 'Set as people folder'" });
			content.createEl("p", { text: "3. That folder will become your People folder" });

			content.createEl("h3", { text: "What happens next?" });
			content.createEl("p", { text: "Once you have a People folder, you can:" });
			content.createEl("ul").innerHTML = `
				<li>Create company files to organize people by company</li>
				<li>Add individual people files</li>
				<li>Import people data from CSV files</li>
				<li>Use auto-completion and tooltips for people names</li>
			`;

			helpModal.open();
		});
	}
}
}

export function getSettings(): Settings {
	if (!PluginContext.isInitialized()) {
		// Return default settings if context not initialized
		return DEFAULT_SETTINGS as Settings;
	}
	return PluginContext.getInstance().settings;
}
