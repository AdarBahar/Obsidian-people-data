import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { COMPANY_COLOR_PALETTE, getAvailableColorNames, parseColorValue } from "src/core/company-colors";

export interface CompanyConfig {
	name: string;
	color?: string;
	logo?: string;
	url?: string;
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
			.setDesc("Choose a color name for the double underline decoration")
			.addDropdown(dropdown => {
				// Add "None" option
				dropdown.addOption("", "None");

				// Add predefined colors with emojis for visual appeal
				const colorEmojis: Record<string, string> = {
					blue: "🔵", red: "🔴", green: "🟢", orange: "🟠", purple: "🟣", teal: "🔷",
					navy: "🔹", crimson: "❤️", forest: "🌲", amber: "🟡", violet: "💜", cyan: "🔵",
					slate: "⚫", rose: "🌹", lime: "🟢", indigo: "🔵", pink: "💗", brown: "🤎",
					mint: "🍃", coral: "🪸", lavender: "💜", gold: "🥇", silver: "🥈", bronze: "🥉"
				};

				getAvailableColorNames().forEach(colorName => {
					const emoji = colorEmojis[colorName] || "🎨";
					dropdown.addOption(colorName, `${emoji} ${colorName}`);
				});

				// Add custom option for hex codes
				dropdown.addOption("custom", "🎨 Custom (hex code)");

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
			.setDesc("Enter a hex color code (e.g., #ff6b35) - Note: Color names are recommended!")
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

		// URL/Homepage configuration
		new Setting(section)
			.setName("Company URL/Homepage")
			.setDesc("Company website URL (used for favicon suggestions)")
			.addText(text => {
				text.setPlaceholder("https://company.com");
				text.setValue(company.url || "");
				text.onChange(value => {
					company.url = value;
					this.updateFaviconSuggestion(section, value);
				});
			});

		// Favicon suggestion (initially hidden)
		const faviconSuggestionDiv = section.createDiv({ cls: "company-config-favicon-suggestion" });
		this.updateFaviconSuggestion(section, company.url || "");

		// Logo configuration
		new Setting(section)
			.setName("Company Logo")
			.setDesc("Choose logo source type and provide the logo")
			.addDropdown(dropdown => {
				dropdown.addOption("none", "🚫 No Logo");
				dropdown.addOption("favicon", "🌐 Favicon (from URL)");
				dropdown.addOption("url", "🔗 Custom URL");
				dropdown.addOption("local", "📁 Local File");
				dropdown.addOption("custom", "✏️ Custom Markdown");

				// Determine current logo type
				const currentLogo = company.logo || "";
				let logoType = "none";
				if (currentLogo) {
					if (currentLogo.includes("google.com/s2/favicons")) {
						logoType = "favicon";
					} else if (currentLogo.includes("http://") || currentLogo.includes("https://")) {
						logoType = "url";
					} else if (currentLogo.startsWith("![") && currentLogo.includes("](") && currentLogo.endsWith(")")) {
						if (currentLogo.includes("http://") || currentLogo.includes("https://")) {
							logoType = "url";
						} else {
							logoType = "local";
						}
					} else {
						logoType = "custom";
					}
				}

				dropdown.setValue(logoType);
				dropdown.onChange(value => {
					this.handleLogoTypeChange(section, company, value, index);
				});
			});

		// URL input (initially hidden)
		const urlLogoSetting = new Setting(section)
			.setName("Logo URL")
			.setDesc("Enter the full URL to the logo image (e.g., https://example.com/logo.png)")
			.addText(text => {
				text.setPlaceholder("https://example.com/logo.png");
				// Extract URL from current logo if it's a URL type
				const currentLogo = company.logo || "";
				if (currentLogo.includes("http")) {
					const urlMatch = currentLogo.match(/https?:\/\/[^\s)]+/);
					if (urlMatch) {
						text.setValue(urlMatch[0]);
					}
				}
				text.onChange(value => {
					if (value.trim()) {
						company.logo = `![Company Logo](${value.trim()})`;
					} else {
						company.logo = "";
					}
					this.updateLogoPreview(section, company.logo);
				});
			});

		// Favicon input (initially hidden)
		const faviconLogoSetting = new Setting(section)
			.setName("Use Favicon")
			.setDesc("Automatically use the website's favicon as the company logo")
			.addButton(button => {
				button.setButtonText("Use Favicon from URL");
				button.setDisabled(!company.url);
				button.onClick(() => {
					if (company.url) {
						const faviconUrl = this.generateFaviconUrl(company.url);
						company.logo = `![Company Logo](${faviconUrl})`;
						this.updateLogoPreview(section, company.logo);
					}
				});
			});

		// Local file input (initially hidden)
		const localLogoSetting = new Setting(section)
			.setName("Local File")
			.setDesc("Choose an image file from your vault")
			.addButton(button => {
				button.setButtonText("📁 Choose File");
				button.onClick(async () => {
					try {
						// Create file input element
						const input = document.createElement('input');
						input.type = 'file';
						input.accept = 'image/*';
						input.style.display = 'none';

						input.onchange = async (event) => {
							const file = (event.target as HTMLInputElement).files?.[0];
							if (file) {
								// Copy file to vault's assets folder
								const fileName = `company-logo-${Date.now()}-${file.name}`;
								const assetsPath = 'assets/logos';

								// Ensure assets/logos folder exists
								await this.ensureFolder(assetsPath);

								// Read file as array buffer
								const arrayBuffer = await file.arrayBuffer();
								const uint8Array = new Uint8Array(arrayBuffer);

								// Create file in vault
								const filePath = `${assetsPath}/${fileName}`;
								await this.app.vault.createBinary(filePath, uint8Array);

								// Update company logo
								company.logo = `![Company Logo](${filePath})`;
								this.updateLogoPreview(section, company.logo);

								// Update the text input to show the path
								const textInput = localLogoSetting.settingEl.querySelector('input[type="text"]') as HTMLInputElement;
								if (textInput) {
									textInput.value = filePath;
								}
							}
						};

						document.body.appendChild(input);
						input.click();
						document.body.removeChild(input);
					} catch (error) {
						console.error('Error selecting file:', error);
						// Fallback to text input
					}
				});
			})
			.addText(text => {
				text.setPlaceholder("assets/logos/company.png");
				// Extract local path from current logo if it's a local type
				const currentLogo = company.logo || "";
				if (currentLogo.startsWith("![") && !currentLogo.includes("http")) {
					const pathMatch = currentLogo.match(/\]\(([^)]+)\)/);
					if (pathMatch) {
						text.setValue(pathMatch[1]);
					}
				}
				text.onChange(value => {
					if (value.trim()) {
						company.logo = `![Company Logo](${value.trim()})`;
					} else {
						company.logo = "";
					}
					this.updateLogoPreview(section, company.logo);
				});
			});

		// Custom markdown input (initially hidden)
		const customLogoSetting = new Setting(section)
			.setName("Custom Markdown")
			.setDesc("Enter custom markdown for the logo (advanced users)")
			.addTextArea(text => {
				text.setPlaceholder("![Company Logo](path/to/logo.png)");
				if (company.logo && !company.logo.includes("http") && company.logo.startsWith("![")) {
					text.setValue(company.logo);
				}
				text.onChange(value => {
					company.logo = value;
					this.updateLogoPreview(section, value);
				});
			});

		// Hide all logo inputs initially
		faviconLogoSetting.settingEl.style.display = "none";
		urlLogoSetting.settingEl.style.display = "none";
		localLogoSetting.settingEl.style.display = "none";
		customLogoSetting.settingEl.style.display = "none";

		faviconLogoSetting.settingEl.addClass("company-config-logo-favicon");
		urlLogoSetting.settingEl.addClass("company-config-logo-url");
		localLogoSetting.settingEl.addClass("company-config-logo-local");
		customLogoSetting.settingEl.addClass("company-config-logo-custom");

		// Logo preview
		const logoPreviewDiv = section.createDiv({ cls: "company-config-logo-preview" });
		this.updateLogoPreview(section, company.logo || "");

		// Show appropriate input based on current logo type
		const currentLogo = company.logo || "";
		if (currentLogo) {
			if (currentLogo.includes("google.com/s2/favicons")) {
				faviconLogoSetting.settingEl.style.display = "block";
			} else if (currentLogo.includes("http://") || currentLogo.includes("https://")) {
				urlLogoSetting.settingEl.style.display = "block";
			} else if (currentLogo.startsWith("![") && currentLogo.includes("](") && currentLogo.endsWith(")")) {
				localLogoSetting.settingEl.style.display = "block";
			} else {
				customLogoSetting.settingEl.style.display = "block";
			}
		}

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

	private handleLogoTypeChange(section: HTMLElement, company: CompanyConfig, value: string, index: number) {
		const faviconLogoSetting = section.querySelector(".company-config-logo-favicon") as HTMLElement;
		const urlLogoSetting = section.querySelector(".company-config-logo-url") as HTMLElement;
		const localLogoSetting = section.querySelector(".company-config-logo-local") as HTMLElement;
		const customLogoSetting = section.querySelector(".company-config-logo-custom") as HTMLElement;

		// Hide all logo inputs
		faviconLogoSetting.style.display = "none";
		urlLogoSetting.style.display = "none";
		localLogoSetting.style.display = "none";
		customLogoSetting.style.display = "none";

		// Show appropriate input and clear logo if switching types
		switch (value) {
			case "none":
				company.logo = "";
				break;
			case "favicon":
				faviconLogoSetting.style.display = "block";
				// Update button state based on URL availability
				const button = faviconLogoSetting.querySelector("button") as HTMLButtonElement;
				if (button) {
					button.disabled = !company.url;
				}
				break;
			case "url":
				urlLogoSetting.style.display = "block";
				if (!company.logo || !company.logo.includes("http") || company.logo.includes("google.com/s2/favicons")) {
					company.logo = "";
				}
				break;
			case "local":
				localLogoSetting.style.display = "block";
				if (!company.logo || company.logo.includes("http")) {
					company.logo = "";
				}
				break;
			case "custom":
				customLogoSetting.style.display = "block";
				break;
		}

		this.updateLogoPreview(section, company.logo || "");
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

		// Show color name if it's a predefined color, otherwise show hex
		const isColorName = getAvailableColorNames().includes(colorValue.toLowerCase());
		const displayText = isColorName
			? `${colorValue} (${parsedColor})`
			: `Custom: ${parsedColor}`;

		previewDiv.createSpan({
			text: displayText,
			cls: "company-config-color-text"
		});
	}

	private updateLogoPreview(section: HTMLElement, logoValue: string) {
		const previewDiv = section.querySelector(".company-config-logo-preview") as HTMLElement;
		if (!previewDiv) return;

		previewDiv.empty();

		if (!logoValue) {
			previewDiv.createSpan({ text: "No logo configured", cls: "company-config-no-logo" });
			return;
		}

		// Create preview container
		const previewContainer = previewDiv.createDiv({ cls: "company-config-logo-sample" });

		// Try to extract image URL/path from markdown
		const imageMatch = logoValue.match(/!\[.*?\]\(([^)]+)\)/);
		if (imageMatch) {
			const imagePath = imageMatch[1];
			const img = previewContainer.createEl("img", {
				cls: "company-config-logo-img"
			});

			// Set image source
			img.src = imagePath;
			img.alt = "Company Logo Preview";

			// Add error handling
			img.onerror = () => {
				previewContainer.empty();
				const errorDiv = previewContainer.createDiv({
					cls: "company-config-logo-error",
					text: "⚠️ Logo failed to load"
				});

				// Show the path that failed
				previewContainer.createDiv({
					cls: "company-config-logo-path",
					text: `Path: ${imagePath}`
				});
			};

			// Add load success handler
			img.onload = () => {
				// Show success indicator and path
				const infoDiv = previewDiv.createDiv({ cls: "company-config-logo-info" });
				infoDiv.createSpan({
					text: "✅ Logo loaded successfully",
					cls: "company-config-logo-success"
				});
				infoDiv.createDiv({
					cls: "company-config-logo-path",
					text: `Source: ${imagePath}`
				});
			};
		} else {
			// Invalid markdown format
			previewContainer.createDiv({
				cls: "company-config-logo-error",
				text: "⚠️ Invalid markdown format"
			});
			previewContainer.createDiv({
				cls: "company-config-logo-path",
				text: `Content: ${logoValue}`
			});
		}
	}

	private updateFaviconSuggestion(section: HTMLElement, url: string) {
		const suggestionDiv = section.querySelector(".company-config-favicon-suggestion") as HTMLElement;
		if (!suggestionDiv) return;

		suggestionDiv.empty();

		if (!url || !this.isValidUrl(url)) {
			return;
		}

		const faviconUrl = this.generateFaviconUrl(url);

		// Create suggestion container
		const suggestion = suggestionDiv.createDiv({ cls: "company-config-favicon-suggestion-content" });
		suggestion.createSpan({ text: "💡 Favicon suggestion: ", cls: "company-config-favicon-label" });

		// Create favicon preview
		const faviconImg = suggestion.createEl("img", {
			cls: "company-config-favicon-preview",
			attr: {
				src: faviconUrl,
				alt: "Favicon preview"
			}
		});

		// Add use button
		const useButton = suggestion.createEl("button", {
			text: "Use This",
			cls: "company-config-favicon-use-btn"
		});

		useButton.onclick = () => {
			const company = this.companies.find(c => c.file.path === section.getAttribute('data-company-path'));
			if (company) {
				company.logo = `![Company Logo](${faviconUrl})`;
				this.updateLogoPreview(section, company.logo);

				// Update logo type dropdown to favicon
				const logoDropdown = section.querySelector('.setting-item select') as HTMLSelectElement;
				if (logoDropdown) {
					logoDropdown.value = 'favicon';
					this.handleLogoTypeChange(section, company, 'favicon', 0);
				}
			}
		};
	}

	private generateFaviconUrl(companyUrl: string): string {
		try {
			const url = new URL(companyUrl);
			return `https://www.google.com/s2/favicons?sz=96&domain_url=${encodeURIComponent(url.origin)}`;
		} catch {
			return `https://www.google.com/s2/favicons?sz=96&domain_url=${encodeURIComponent(companyUrl)}`;
		}
	}

	private isValidUrl(string: string): boolean {
		try {
			new URL(string);
			return true;
		} catch {
			return false;
		}
	}

	private async ensureFolder(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
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

		// Update URL if changed
		const currentUrl = frontmatterMap.get('url')?.replace(/['"]/g, '') || '';
		const newUrl = company.url || '';

		if (currentUrl !== newUrl) {
			if (newUrl) {
				frontmatterMap.set('url', `"${newUrl}"`);
			} else {
				frontmatterMap.delete('url');
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
