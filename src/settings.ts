import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, setTooltip } from "obsidian";
import { DefFileType } from "./core/file-type";

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
	popoverEvent: PopoverEventSettings;
	defFileParseConfig: DefFileParseConfig;
	defPopoverConfig: DefinitionPopoverConfig;
}

export const DEFAULT_DEF_FOLDER = "people"

export const DEFAULT_SETTINGS: Partial<Settings> = {
	enableInReadingView: true,
	enableSpellcheck: true,
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
		this.settings = window.NoteDefinition.settings;
		this.saveCallback = saveCallback;
	}

	display(): void {
		let { containerEl } = this;

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
	}
}

export function getSettings(): Settings {
	return window.NoteDefinition.settings;
}
