import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { COMPANY_COLOR_PALETTE, getAvailableColorNames, parseColorValue } from "src/core/company-colors";

export interface CompanyConfig {
	name: string;
	color?: string;
	logo?: string;
	file: TFile;
}

export class CompanyConfigModal extends Modal {
	companies: CompanyConfig[];
	onSave: () => void;

	constructor(app: App, companies: CompanyConfig[], onSave: () => void) {
		super(app);
		this.companies = companies;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Company Configuration" });
		contentEl.createEl("p", { 
			text: "Configure colors and logos for each company. Changes will be saved to the company files' frontmatter." 
		});

		// Create scrollable container for companies
		const companiesContainer = contentEl.createDiv({ cls: "company-config-container" });

		this.companies.forEach((company, index) => {
			this.createCompanySection(companiesContainer, company, index);
		});

		// Add buttons
		const buttonContainer = contentEl.createDiv({ cls: "company-config-buttons" });
		
		const saveButton = buttonContainer.createEl("button", {
			text: "Save All Changes",
			cls: "mod-cta"
		});
		saveButton.onclick = () => this.saveAllChanges();

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel"
		});
		cancelButton.onclick = () => this.close();
	}

	private createCompanySection(container: HTMLElement, company: CompanyConfig, index: number) {
		const section = container.createDiv({ cls: "company-config-section" });
		
		// Company header
		const header = section.createDiv({ cls: "company-config-header" });
		header.createEl("h3", { text: company.name });
		
		// File path info
		header.createEl("span", { 
			text: company.file.path,
			cls: "company-config-file-path"
		});

		// Color configuration
		new Setting(section)
			.setName("Company Color")
			.setDesc("Choose a color for the double underline decoration")
			.addDropdown(dropdown => {
				// Add "None" option
				dropdown.addOption("", "None");
				
				// Add predefined colors
				getAvailableColorNames().forEach(colorName => {
					const hex = COMPANY_COLOR_PALETTE[colorName];
					dropdown.addOption(colorName, `${colorName} (${hex})`);
				});
				
				// Add custom hex option
				dropdown.addOption("custom", "Custom Hex Color");
				
				// Set current value
				const currentColor = company.color || "";
				const isCustom = currentColor && !getAvailableColorNames().includes(currentColor.toLowerCase()) && currentColor !== "";
				dropdown.setValue(isCustom ? "custom" : currentColor.toLowerCase());
				
				dropdown.onChange(value => {
					this.handleColorChange(section, company, value, index);
				});
			});

		// Custom hex input (initially hidden)
		const customColorSetting = new Setting(section)
			.setName("Custom Hex Color")
			.setDesc("Enter a hex color code (e.g., #ff6b35)")
			.addText(text => {
				text.setPlaceholder("#ff6b35");
				if (company.color && !getAvailableColorNames().includes(company.color.toLowerCase())) {
					text.setValue(company.color);
				}
				text.onChange(value => {
					company.color = value;
					this.updateColorPreview(section, value);
				});
			});
		
		customColorSetting.settingEl.style.display = "none";
		customColorSetting.settingEl.addClass("company-config-custom-color");

		// Color preview
		const previewDiv = section.createDiv({ cls: "company-config-color-preview" });
		this.updateColorPreview(section, company.color || "");

		// Logo configuration
		new Setting(section)
			.setName("Company Logo")
			.setDesc("Markdown image syntax for company logo (e.g., ![Logo](logo.png))")
			.addTextArea(text => {
				text.setPlaceholder("![Company Logo](path/to/logo.png)");
				text.setValue(company.logo || "");
				text.onChange(value => {
					company.logo = value;
				});
			});

		// Show/hide custom color input based on selection
		const currentColor = company.color || "";
		const isCustom = currentColor && !getAvailableColorNames().includes(currentColor.toLowerCase()) && currentColor !== "";
		if (isCustom) {
			customColorSetting.settingEl.style.display = "block";
		}
	}

	private handleColorChange(section: HTMLElement, company: CompanyConfig, value: string, index: number) {
		const customColorSetting = section.querySelector(".company-config-custom-color") as HTMLElement;
		
		if (value === "custom") {
			customColorSetting.style.display = "block";
			// Don't change company.color here, let the text input handle it
		} else {
			customColorSetting.style.display = "none";
			company.color = value;
			this.updateColorPreview(section, value);
		}
	}

	private updateColorPreview(section: HTMLElement, colorValue: string) {
		const previewDiv = section.querySelector(".company-config-color-preview") as HTMLElement;
		if (!previewDiv) return;

		previewDiv.empty();

		if (!colorValue) {
			previewDiv.createSpan({ text: "No color selected", cls: "company-config-no-color" });
			return;
		}

		const parsedColor = parseColorValue(colorValue);
		const preview = previewDiv.createDiv({ cls: "company-config-color-sample" });
		preview.style.backgroundColor = parsedColor;
		preview.style.border = `2px solid ${parsedColor}`;
		
		previewDiv.createSpan({ 
			text: `Preview: ${parsedColor}`,
			cls: "company-config-color-text"
		});
	}

	private async saveAllChanges() {
		try {
			let changesMade = false;

			for (const company of this.companies) {
				const changed = await this.saveCompanyConfig(company);
				if (changed) changesMade = true;
			}

			if (changesMade) {
				new Notice("Company configurations saved successfully!");
				this.onSave();
			} else {
				new Notice("No changes to save.");
			}
			
			this.close();
		} catch (error) {
			new Notice("Error saving company configurations: " + error.message);
		}
	}

	private async saveCompanyConfig(company: CompanyConfig): Promise<boolean> {
		const file = company.file;
		const content = await this.app.vault.read(file);
		
		// Parse existing frontmatter
		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const match = content.match(frontmatterRegex);
		
		let frontmatterContent = "";
		let bodyContent = content;
		let hasChanges = false;

		if (match) {
			frontmatterContent = match[1];
			bodyContent = content.slice(match[0].length);
		}

		// Parse frontmatter lines
		const frontmatterLines = frontmatterContent.split('\n').filter(line => line.trim());
		const frontmatterMap = new Map<string, string>();
		
		frontmatterLines.forEach(line => {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.slice(0, colonIndex).trim();
				const value = line.slice(colonIndex + 1).trim();
				frontmatterMap.set(key, value);
			}
		});

		// Update color if changed
		const currentColor = frontmatterMap.get('color')?.replace(/['"]/g, '') || '';
		const newColor = company.color || '';
		
		if (currentColor !== newColor) {
			if (newColor) {
				frontmatterMap.set('color', `"${newColor}"`);
			} else {
				frontmatterMap.delete('color');
			}
			hasChanges = true;
		}

		// Update logo in body content if changed
		const logoRegex = /^!\[.*?\]\(.*?\)/m;
		const currentLogo = bodyContent.match(logoRegex)?.[0] || '';
		const newLogo = company.logo || '';
		
		if (currentLogo !== newLogo) {
			if (currentLogo) {
				// Replace existing logo
				bodyContent = bodyContent.replace(logoRegex, newLogo);
			} else if (newLogo) {
				// Add new logo at the beginning
				bodyContent = newLogo + '\n' + bodyContent.trimStart();
			}
			hasChanges = true;
		}

		if (hasChanges) {
			// Rebuild frontmatter
			let newFrontmatter = '';
			if (frontmatterMap.size > 0) {
				newFrontmatter = '---\n';
				for (const [key, value] of frontmatterMap) {
					newFrontmatter += `${key}: ${value}\n`;
				}
				newFrontmatter += '---';
			}

			const newContent = newFrontmatter + bodyContent;
			await this.app.vault.modify(file, newContent);
		}

		return hasChanges;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
