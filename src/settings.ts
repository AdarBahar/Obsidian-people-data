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
}

export const DEFAULT_DEF_FOLDER = "people"

export const DEFAULT_SETTINGS: Partial<Settings> = {
	enableInReadingView: true,
	enableSpellcheck: true,
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
		popoverDismissEvent: PopoverDismissType.Click,
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

		new Setting(containerEl)
			.setName("Enable in reading view")
			.setDesc("Allow people metadata to be shown in reading view")
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
			.setDesc("Files within this folder will be treated as people definition files")
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
			.setDesc("Automatically register new markdown files created in the people folder as people definition files")
			.addToggle((component) => {
				component.setValue(this.settings.autoRegisterNewFiles ?? true);
				component.onChange(async (val) => {
					this.settings.autoRegisterNewFiles = val;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("File explorer tags")
			.setDesc("Show 'PEOPLE' tags in the file explorer for people files (disable if causing errors)")
			.addToggle((component) => {
				component.setValue(this.settings.enableFileExplorerTags ?? false);
				component.onChange(async value => {
					this.settings.enableFileExplorerTags = value;
					await this.saveCallback();
				});
			});
		new Setting(containerEl)
			.setName("People file format settings")
			.setDesc("Customise parsing rules for people files")
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
			.setName("Default people file type")
			.setDesc("When the 'def-type' frontmatter is not specified, the people file will be treated as this configured default file type.")
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
			.setName("Auto-completion settings");

		new Setting(containerEl)
			.setName("Enable name auto-completion")
			.setDesc("Enable auto-completion for people names using trigger patterns")
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
				.setDesc("Pattern that triggers auto-completion (e.g., @name:, @person:, @)")
				.addText((component) => {
					component.setValue(this.settings.autoCompletionConfig?.triggerPattern ?? "@name:");
					component.setPlaceholder("@name:");
					component.onChange(async value => {
						if (!this.settings.autoCompletionConfig) {
							this.settings.autoCompletionConfig = DEFAULT_SETTINGS.autoCompletionConfig!;
						}
						this.settings.autoCompletionConfig.triggerPattern = value || "@name:";
						await this.saveCallback();
					});
				});

			new Setting(containerEl)
				.setName("Maximum suggestions")
				.setDesc("Maximum number of suggestions to show")
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

			new Setting(containerEl)
				.setName("Show mention counts")
				.setDesc("Display how many times each person has been mentioned")
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
				.setDesc("Display company names in suggestions")
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
				.setDesc("Display job positions in suggestions")
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
		}

		new Setting(containerEl)
			.setHeading()
			.setName("Company settings");

		new Setting(containerEl)
			.setName("Configure companies")
			.setDesc("Manage company colors, logos, and other settings")
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

		new Setting(containerEl)
			.setHeading()
			.setName("People popover settings");

		new Setting(containerEl)
			.setName("People popover trigger")
			.setDesc("Choose how to trigger the people popover when hovering over or clicking on people names")
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
				.setDesc("Choose how to close the people popover when using hover trigger")
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
			.setDesc("Show the company file name in the people popover")
			.addToggle(component => {
				component.setValue(this.settings.defPopoverConfig.displayDefFileName);
				component.onChange(async value => {
					this.settings.defPopoverConfig.displayDefFileName = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("Custom popover size")
			.setDesc("Set custom maximum dimensions for the people popover. Not recommended as it prevents dynamic sizing based on your viewport.")
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
				.setDesc("Maximum width of the people popover")
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
				.setDesc("Maximum height of the people popover")
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
			.setDesc("Customize the background colour of the people popover")
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

		// About Section
		new Setting(containerEl)
			.setHeading()
			.setName("About");

		new Setting(containerEl)
			.setName("About People Metadata")
			.setDesc("Learn about the plugin's features, creator, and get access to documentation and support resources")
			.addButton(button => {
				button
					.setButtonText("Show Info")
					.setCta()
					.onClick(() => {
						const aboutModal = new AboutPeopleMetadataModal(this.app);
						aboutModal.open();
					});
			});
	}
}

export function getSettings(): Settings {
	if (!PluginContext.isInitialized()) {
		// Return default settings if context not initialized
		return DEFAULT_SETTINGS as Settings;
	}
	return PluginContext.getInstance().settings;
}
