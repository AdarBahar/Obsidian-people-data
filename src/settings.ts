import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, setTooltip } from "obsidian";
import { DefFileType } from "./core/file-type";
import { getDefFileManager } from "./core/def-file-manager";

export enum PopoverEventSettings {
	Hover = "hover",
	Click = "click"
}

export enum PopoverDismissType {
	Click = "click",
	MouseExit = "mouse_exit"
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

export interface Settings {
	enableInReadingView: boolean;
	enableSpellcheck: boolean;
	defFolder: string;
	autoRegisterNewFiles: boolean;
	autoRefreshMentionCounts: boolean;
	useOptimizedSearch: boolean;
	popoverEvent: PopoverEventSettings;
	defFileParseConfig: DefFileParseConfig;
	defPopoverConfig: DefinitionPopoverConfig;
	// Name autocomplete settings
	enableNameAutocomplete: boolean;
	nameAutocompleteTrigger: string;
}

export const DEFAULT_DEF_FOLDER = "people"

export const DEFAULT_SETTINGS: Partial<Settings> = {
	enableInReadingView: true,
	enableSpellcheck: true,
	autoRegisterNewFiles: true,
	autoRefreshMentionCounts: true,
	useOptimizedSearch: false, // Temporarily disabled for debugging
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
		popoverDismissEvent: PopoverDismissType.Click,
	},
	// Name autocomplete defaults
	enableNameAutocomplete: true,
	nameAutocompleteTrigger: '@name:'
}

export class SettingsTab extends PluginSettingTab {
	plugin: Plugin;
	settings: Settings;
	saveCallback: () => Promise<void>;

	constructor(app: App, plugin: Plugin, saveCallback: () => Promise<void>) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = window.NoteDefinition.settings;
		this.saveCallback = saveCallback;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable in Reading View")
			.setDesc("Allow People Metadata to be shown in Reading View")
			.addToggle((component) => {
				component.setValue(this.settings.enableInReadingView);
				component.onChange(async (val) => {
					this.settings.enableInReadingView = val;
					await this.saveCallback();
				});
			});
		new Setting(containerEl)
			.setName("Enable spellcheck for people names")
			.setDesc("Allow people names and phrases to be spellchecked")
			.addToggle((component) => {
				component.setValue(this.settings.enableSpellcheck);
				component.onChange(async (val) => {
					this.settings.enableSpellcheck = val;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("People folder")
			.setDesc("Files within this folder will be treated as People definition files")
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
			.setName("Auto-register new files")
			.setDesc("Automatically register new markdown files created in the People folder as People definition files")
			.addToggle((component) => {
				component.setValue(this.settings.autoRegisterNewFiles ?? true);
				component.onChange(async (val) => {
					this.settings.autoRegisterNewFiles = val;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Auto-refresh mention counts")
			.setDesc("Automatically update mention counts when files are modified. Disable this if you experience performance issues with large vaults.")
			.addToggle((component) => {
				component.setValue(this.settings.autoRefreshMentionCounts ?? true);
				component.onChange(async (val) => {
					this.settings.autoRefreshMentionCounts = val;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Use optimized search")
			.setDesc("Enable optimized search engine for better performance with large datasets. Includes advanced caching, fuzzy matching, and compressed prefix trees.")
			.addToggle((component) => {
				component.setValue(this.settings.useOptimizedSearch ?? true);
				component.onChange(async (val) => {
					this.settings.useOptimizedSearch = val;
					// Update the definition manager
					const defManager = getDefFileManager();
					if (defManager) {
						defManager.setOptimizedSearch(val);
						if (val) {
							await defManager.rebuildOptimizedIndexes();
						}
					}
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setHeading()
			.setName("Name Auto-completion");

		new Setting(containerEl)
			.setName("Enable name auto-completion")
			.setDesc("Enable intelligent name suggestions when typing a trigger pattern")
			.addToggle((component) => {
				component.setValue(this.settings.enableNameAutocomplete ?? true);
				component.onChange(async (val) => {
					this.settings.enableNameAutocomplete = val;
					await this.saveCallback();
					this.display();
				});
			});

		if (this.settings.enableNameAutocomplete) {
			new Setting(containerEl)
				.setName("Auto-completion trigger")
				.setDesc("The text pattern that triggers name suggestions (e.g., '@name:' or '@@')")
				.addText((component) => {
					component.setValue(this.settings.nameAutocompleteTrigger ?? '@name:');
					component.setPlaceholder('@name:');
					component.onChange(async (val) => {
						this.settings.nameAutocompleteTrigger = val || '@name:';
						await this.saveCallback();
					});
				});
		}
		new Setting(containerEl)
			.setName("People file format settings")
			.setDesc("Customise parsing rules for People files")
			.addExtraButton(component => {
				component.onClick(() => {
					const modal = new Modal(this.app);
					modal.setTitle("People file format settings")
					new Setting(modal.contentEl)
						.setName("Divider")
						.setHeading()
					new Setting(modal.contentEl)
						.setName("Dash")
						.setDesc("Use triple dash (---) as divider")
						.addToggle((component) => {
							component.setValue(this.settings.defFileParseConfig.divider.dash);
							component.onChange(async value => {
								if (!value && !this.settings.defFileParseConfig.divider.underscore) {
									new Notice("At least one divider must be chosen", 2000);
									component.setValue(this.settings.defFileParseConfig.divider.dash);
									return;
								}
								this.settings.defFileParseConfig.divider.dash = value;
								await this.saveCallback();
							});
						});
					new Setting(modal.contentEl)
						.setName("Underscore")
						.setDesc("Use triple underscore (___) as divider")
						.addToggle((component) => {
							component.setValue(this.settings.defFileParseConfig.divider.underscore);
							component.onChange(async value => {
								if (!value && !this.settings.defFileParseConfig.divider.dash) {
									new Notice("At least one divider must be chosen", 2000);
									component.setValue(this.settings.defFileParseConfig.divider.underscore);
									return;
								}
								this.settings.defFileParseConfig.divider.underscore = value;
								await this.saveCallback();
							});
						});
					modal.open();
				})
			});

		new Setting(containerEl)
			.setName("Default People file type")
			.setDesc("When the 'def-type' frontmatter is not specified, the People file will be treated as this configured default file type.")
			.addDropdown(component => {
				component.addOption(DefFileType.Consolidated, "consolidated");
				component.addOption(DefFileType.Atomic, "atomic");
				component.setValue(this.settings.defFileParseConfig.defaultFileType ?? DefFileType.Consolidated);
				component.onChange(async val => {
					this.settings.defFileParseConfig.defaultFileType = val as DefFileType;
					await this.saveCallback();
				});
			});



		new Setting(containerEl)
			.setHeading()
			.setName("People Popover Settings");

		new Setting(containerEl)
			.setName("People popover trigger")
			.setDesc("Choose how to trigger the People popover when hovering over or clicking on people names")
			.addDropdown((component) => {
				component.addOption(PopoverEventSettings.Hover, "Hover");
				component.addOption(PopoverEventSettings.Click, "Click");
				component.setValue(this.settings.popoverEvent);
				component.onChange(async value => {
					if (value === PopoverEventSettings.Hover || value === PopoverEventSettings.Click) {
						this.settings.popoverEvent = value;
					}
					if (this.settings.popoverEvent === PopoverEventSettings.Click) {
						this.settings.defPopoverConfig.popoverDismissEvent = PopoverDismissType.Click;
					}
					await this.saveCallback();
					this.display();
				});
			});

		if (this.settings.popoverEvent === PopoverEventSettings.Hover) {
			new Setting(containerEl)
				.setName("People popover dismiss")
				.setDesc("Choose how to close the People popover when using hover trigger")
				.addDropdown(component => {
					component.addOption(PopoverDismissType.Click, "Click");
					component.addOption(PopoverDismissType.MouseExit, "Mouse exit")
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
			.setDesc("Show the company file name in the People popover")
			.addToggle(component => {
				component.setValue(this.settings.defPopoverConfig.displayDefFileName);
				component.onChange(async value => {
					this.settings.defPopoverConfig.displayDefFileName = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Custom popover size")
			.setDesc("Set custom maximum dimensions for the People popover. Not recommended as it prevents dynamic sizing based on your viewport.")
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
				.setDesc("Maximum width of the People popover")
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
				.setDesc("Maximum height of the People popover")
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
			.setName("Popover background colour")
			.setDesc("Customize the background colour of the People popover")
			.addExtraButton(component => {
				component.setIcon("rotate-ccw");
				component.setTooltip("Reset to default colour set by theme");
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

		// About section at the bottom
		new Setting(containerEl)
			.setHeading()
			.setName("About");

		new Setting(containerEl)
			.setName("About People Metadata")
			.setDesc("Learn more about this plugin, its features, and creator")
			.addButton(component => {
				component.setButtonText("Show Info");
				component.setTooltip("Open plugin information");
				component.onClick(() => {
					this.showAboutModal();
				});
			});
	}

	private showAboutModal() {
		const modal = new Modal(this.app);
		modal.setTitle("About People Metadata");

		const content = modal.contentEl;
		content.addClass("about-people-metadata-modal");
		// Add class to modal container for CSS targeting
		modal.modalEl.addClass("about-people-metadata-modal-parent");

		// Plugin header
		const header = content.createDiv("about-header");
		// header.createEl("h2", { text: "Obsidian People Metadata" });
		header.createEl("p", {
			text: "A powerful tool for managing and looking up people metadata within your notes.",
			cls: "about-subtitle"
		});

		// Creator info
		const creatorSection = content.createDiv("about-section");
		creatorSection.createEl("h3", { text: "Creator" });
		const creatorInfo = creatorSection.createDiv("creator-info");
		creatorInfo.createEl("p", { text: "Created by Adar Bahar" });
		creatorInfo.createEl("p", {
			text: "Built for the Obsidian community with ❤️",
			cls: "creator-subtitle"
		});

		// Objectives
		const objectivesSection = content.createDiv("about-section");
		objectivesSection.createEl("h3", { text: "Objectives" });
		const objectivesList = objectivesSection.createEl("ul");
		const objectives = [
			"Augment names in your Obsidian pages with rich company and position details",
			"Create comprehensive company profiles with custom colors and logos",
			"Track mention counts and relationships across your entire vault",
			"Provide instant previews and smart tooltips for people information",
			"Optimize performance for large datasets with advanced search capabilities"
		];
		objectives.forEach(objective => {
			objectivesList.createEl("li", { text: objective });
		});

		// Core Features
		const featuresSection = content.createDiv("about-section");
		featuresSection.createEl("h3", { text: "Core Features" });
		const featuresList = featuresSection.createEl("ul");
		const features = [
			"🏢 Company Management - Organize people by company with custom colors and logos",
			"💬 Smart Tooltips - Hover over names to see rich person details with mention counts",
			"➕ Add Person Modal - User-friendly interface for adding new people",
			"⚡ Name Auto-completion - Intelligent name suggestions with trigger patterns",
			"🔄 Auto-Registration - Automatically set up new files in the People folder",
			"📊 Mention Counting - Track how many times people are mentioned across your vault",
			"🎯 Performance Optimization - Optimized search engine for large datasets (1000+ people)",
			"📥 CSV Import - Bulk import people data from CSV files",
			"📱 Mobile Support - Works seamlessly on both desktop and mobile",
			"🎨 Color Coding - Assign colors to companies for visual organization"
		];
		features.forEach(feature => {
			featuresList.createEl("li", { text: feature });
		});

		// Advanced Features
		const advancedSection = content.createDiv("about-section");
		advancedSection.createEl("h3", { text: "Advanced Features" });
		const advancedList = advancedSection.createEl("ul");
		const advancedFeatures = [
			"🔍 Smart Search - Distinguish between task mentions and text mentions",
			"⚡ Performance Monitoring - Real-time statistics and performance metrics",
			"💾 Memory Efficiency - Advanced caching and compressed data structures",
			"🎯 Fuzzy Matching - Find people even with typos or partial names",
			"🔄 Auto-Refresh - Automatically update mention counts when files are modified",
			"📈 Scalability - Handles large datasets without performance degradation"
		];
		advancedFeatures.forEach(feature => {
			advancedList.createEl("li", { text: feature });
		});

		// Links section
		const linksSection = content.createDiv("about-section");
		linksSection.createEl("h3", { text: "Resources" });
		const linksDiv = linksSection.createDiv("about-links");

		const githubLink = linksDiv.createEl("a", {
			text: "📚 Documentation & Source Code",
			href: "https://github.com/AdarBahar/Obsidian-people-data"
		});
		githubLink.setAttr("target", "_blank");

		const issuesLink = linksDiv.createEl("a", {
			text: "🐛 Report Issues & Feature Requests",
			href: "https://github.com/AdarBahar/Obsidian-people-data/issues"
		});
		issuesLink.setAttr("target", "_blank");

		// Version info
		const versionSection = content.createDiv("about-section");
		versionSection.createEl("h3", { text: "Version Information" });
		versionSection.createEl("p", { text: `Plugin Version: 1.1.0` });
		versionSection.createEl("p", { text: `License: MIT` });

		modal.open();
	}
}

export function getSettings(): Settings {
	return window.NoteDefinition.settings;
}
