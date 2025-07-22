import { App, Modal, Notice, TFile } from "obsidian";
import { getAvailableColorNames, parseColorValue } from "src/core/company-colors";

export interface CompanyConfig {
	name: string;
	color?: string;
	logo?: string;
	url?: string;
	file: TFile;
}

interface CompanyState {
	isOpen: boolean;
	hasUnsavedChanges: boolean;
	originalConfig: CompanyConfig;
	currentConfig: CompanyConfig;
}

export class CompanyConfigModal extends Modal {
	companies: CompanyConfig[];
	companyStates: Map<string, CompanyState> = new Map();
	onSave: () => void;

	// Default company icon as base64 SVG
	private readonly DEFAULT_ICON = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gU3ZnIFZlY3RvciBJY29ucyA6IGh0dHA6Ly93d3cub25saW5ld2ViZm9udHMuY29tL2ljb24gLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjU2IDI1NiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8bWV0YWRhdGE+IFN2ZyBWZWN0b3IgSWNvbnMgOiBodHRwOi8vd3d3Lm9ubGluZXdlYmZvbnRzLmNvbS9pY29uIDwvbWV0YWRhdGE+DQo8Zz48Zz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNOTQuOSwxMzYuM3Y5LjFjMy40LTAuNyw3LTEuMywxMC44LTJjNC0wLjcsOC4yLTEuNSwxMi42LTIuNHYtMTAuNmMtNC40LDEuMS04LjYsMi4yLTEyLjYsMy4yQzEwMS45LDEzNC42LDk4LjMsMTM1LjUsOTQuOSwxMzYuM3oiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNOTQuOSwxNjIuN3Y5LjFoMjMuNHYtMTAuNmMtNC40LDAuMy04LjYsMC42LTEyLjYsMC44QzEwMS45LDE2Mi4yLDk4LjMsMTYyLjQsOTQuOSwxNjIuN3oiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNOTQuOSwxNDkuNHY5LjFjMy40LTAuMyw3LTAuNywxMC44LTFjNC0wLjQsOC4yLTAuOCwxMi42LTEuMnYtMTAuNmMtNC40LDAuNy04LjYsMS40LTEyLjYsMkMxMDEuOSwxNDguMyw5OC4zLDE0OC45LDk0LjksMTQ5LjR6Ii8+PHBhdGggZmlsbD0iIzAwMDAwMCIgZD0iTTk0LjksMTIzLjR2OS4xYzMuNC0xLDctMiwxMC44LTNjNC0xLjEsOC4yLTIuMywxMi42LTMuNXYtMTAuNmMtNC40LDEuNS04LjYsMy0xMi42LDQuNEMxMDEuOSwxMjAuOSw5OC4zLDEyMi4yLDk0LjksMTIzLjR6Ii8+PHBhdGggZmlsbD0iIzAwMDAwMCIgZD0iTTEyOCwxMEM2Mi44LDEwLDEwLDYyLjgsMTAsMTI4YzAsNjUuMiw1Mi44LDExOCwxMTgsMTE4YzY1LjIsMCwxMTgtNTIuOCwxMTgtMTE4QzI0Niw2Mi44LDE5My4yLDEwLDEyOCwxMHogTTEyOCwyNDAuNWMtNjIuMSwwLTExMi41LTUwLjQtMTEyLjUtMTEyLjVDMTUuNSw2NS45LDY1LjksMTUuNSwxMjgsMTUuNWM2Mi4xLDAsMTEyLjUsNTAuNCwxMTIuNSwxMTIuNUMyNDAuNSwxOTAuMSwxOTAuMSwyNDAuNSwxMjgsMjQwLjV6Ii8+PHBhdGggZmlsbD0iIzAwMDAwMCIgZD0iTTE2NS40LDgwLjZMMTY1LjQsODAuNmwtMTEuOS03LjlsLTQuMywybC0zNy43LDE3LjZsLTEuNywwLjh2MTRMODcuMywxMTVsLTIsMC43djUwLjdoLTEuOXY2aDhWMTIwbDMxLjYtMTF2NjIuOWgyMi42di02aC00Ljd2LTU4bC0xMS44LTcuM2wtMC40LDAuMWwtMC4xLDBsLTMuNSwxLjJsLTkuMSwzLjJWOTdsMzEuNi0xNC44djg5LjlIMTcwdi02aC00LjZWODAuNnoiLz48L2c+PC9nPg0KPC9zdmc+";

	constructor(app: App, companies: CompanyConfig[], onSave: () => void) {
		super(app);
		this.companies = companies;
		this.onSave = onSave;

		// Initialize company states
		this.companies.forEach(company => {
			this.companyStates.set(company.name, {
				isOpen: false,
				hasUnsavedChanges: false,
				originalConfig: { ...company },
				currentConfig: { ...company }
			});
		});
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Company Configuration" });
		contentEl.createEl("p", {
			text: "Click on a company to configure its settings. Changes are saved automatically."
		});

		// Create scrollable container for companies
		const companiesContainer = contentEl.createDiv({ cls: "company-config-container" });

		this.companies.forEach((company) => {
			this.createCompanyItem(companiesContainer, company);
		});

		// Add close button
		const buttonContainer = contentEl.createDiv({ cls: "company-config-buttons" });

		const closeButton = buttonContainer.createEl("button", {
			text: "Close",
			cls: "mod-cta"
		});
		closeButton.onclick = () => this.handleClose();
	}

	private createCompanyItem(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;

		// Company item container
		const companyItem = container.createDiv({ cls: "company-config-item" });

		// Company header (always visible)
		const header = companyItem.createDiv({ cls: "company-config-header" });
		header.onclick = () => this.toggleCompany(company.name);

		// Company name and expand indicator
		const nameContainer = header.createDiv({ cls: "company-config-name-container" });
		nameContainer.createEl("h3", { text: company.name, cls: "company-config-name" });

		const expandIcon = nameContainer.createSpan({
			cls: `company-config-expand-icon ${state.isOpen ? 'open' : 'closed'}`,
			text: state.isOpen ? "▼" : "▶"
		});

		// File path info
		header.createEl("span", {
			text: company.file.path,
			cls: "company-config-file-path"
		});

		// Settings container (collapsible)
		const settingsContainer = companyItem.createDiv({
			cls: `company-config-settings ${state.isOpen ? 'open' : 'closed'}`
		});

		if (state.isOpen) {
			this.createCompanySettings(settingsContainer, company);
		}
	}

	private toggleCompany(companyName: string) {
		const state = this.companyStates.get(companyName)!;

		// Check for unsaved changes before closing
		if (state.isOpen && state.hasUnsavedChanges) {
			this.showUnsavedChangesDialog(companyName);
			return;
		}

		// Toggle the state
		state.isOpen = !state.isOpen;

		// Refresh the modal
		this.onOpen();
	}

	private showUnsavedChangesDialog(companyName: string) {
		const choice = confirm(`Settings for ${companyName} were not saved. Do you want to save them?`);
		if (choice) {
			// Save and then close
			this.saveCompany(companyName);
		} else {
			// Discard changes and close
			const state = this.companyStates.get(companyName)!;
			state.currentConfig = { ...state.originalConfig };
			state.hasUnsavedChanges = false;
			state.isOpen = false;
			this.onOpen();
		}
	}

	private createCompanySettings(container: HTMLElement, company: CompanyConfig) {
		// 1. Underline Color Section
		this.createColorSection(container, company);

		// 2. Homepage Section
		this.createHomepageSection(container, company);

		// 3. Company Logo Section
		this.createLogoSection(container, company);

		// 4. Save/Cancel buttons
		this.createActionButtons(container, company);
	}

	private createColorSection(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;
		const section = container.createDiv({ cls: "company-config-section" });

		section.createEl("h4", { text: "Underline Color" });

		// Radio buttons for color type
		const colorTypeContainer = section.createDiv({ cls: "company-config-radio-group" });

		const hexRadio = colorTypeContainer.createEl("label", { cls: "company-config-radio-label" });
		const hexInput = hexRadio.createEl("input", { type: "radio", attr: { name: `color-type-${company.name}`, value: "hex" } });
		hexRadio.createSpan({ text: " Hex Color" });

		const nameRadio = colorTypeContainer.createEl("label", { cls: "company-config-radio-label" });
		const nameInput = nameRadio.createEl("input", { type: "radio", attr: { name: `color-type-${company.name}`, value: "name" } });
		nameRadio.createSpan({ text: " Color Name" });

		// Determine current color type
		const currentColor = state.currentConfig.color || "";
		const isHexColor = currentColor.startsWith("#") || (!getAvailableColorNames().includes(currentColor.toLowerCase()) && currentColor !== "");

		if (isHexColor) {
			hexInput.checked = true;
		} else {
			nameInput.checked = true;
		}

		// Hex color input
		const hexContainer = section.createDiv({ cls: "company-config-input-container" });
		hexContainer.createEl("label", { text: "Hex Color:" });
		const hexTextInput = hexContainer.createEl("input", {
			type: "text",
			placeholder: "#ff6b35",
			value: isHexColor ? currentColor : ""
		});

		// Color name dropdown
		const nameContainer = section.createDiv({ cls: "company-config-input-container" });
		nameContainer.createEl("label", { text: "Color Name:" });
		const nameSelect = nameContainer.createEl("select");

		nameSelect.createEl("option", { value: "", text: "No Color" });
		getAvailableColorNames().forEach(colorName => {
			const option = nameSelect.createEl("option", { value: colorName, text: colorName });
			if (colorName === currentColor.toLowerCase()) {
				option.selected = true;
			}
		});

		// Show/hide inputs based on radio selection
		const updateColorInputs = () => {
			if (hexInput.checked) {
				hexContainer.style.display = "block";
				nameContainer.style.display = "none";
			} else {
				hexContainer.style.display = "none";
				nameContainer.style.display = "block";
			}
		};

		updateColorInputs();

		// Event listeners
		hexInput.onchange = updateColorInputs;
		nameInput.onchange = updateColorInputs;

		hexTextInput.oninput = () => {
			state.currentConfig.color = hexTextInput.value;
			state.hasUnsavedChanges = true;
			this.updateActionButtons(container, company);
		};

		nameSelect.onchange = () => {
			state.currentConfig.color = nameSelect.value;
			state.hasUnsavedChanges = true;
			this.updateActionButtons(container, company);
		};
	}

	private createHomepageSection(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;
		const section = container.createDiv({ cls: "company-config-section" });

		section.createEl("h4", { text: `${company.name} - Homepage` });

		const inputContainer = section.createDiv({ cls: "company-config-input-container" });
		inputContainer.createEl("label", { text: "Website (no need for https):" });

		const urlInput = inputContainer.createEl("input", {
			type: "text",
			placeholder: "company.com",
			value: state.currentConfig.url ? state.currentConfig.url.replace(/^https?:\/\//, '') : ""
		});

		urlInput.oninput = () => {
			const value = urlInput.value.trim();
			state.currentConfig.url = value ? (value.startsWith('http') ? value : `https://${value}`) : "";
			state.hasUnsavedChanges = true;
			this.updateActionButtons(container, company);

			// Update favicon preview
			this.updateFaviconPreview(container, state.currentConfig.url || "");
		};
	}

	private createLogoSection(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;
		const section = container.createDiv({ cls: "company-config-section" });

		section.createEl("h4", { text: "Company Logo" });

		// Favicon section (if homepage is entered)
		const faviconContainer = section.createDiv({ cls: "company-config-favicon-container" });
		this.updateFaviconPreview(container, state.currentConfig.url || "");

		// Logo options
		const logoOptionsContainer = section.createDiv({ cls: "company-config-logo-options" });

		// Upload file button
		const uploadButton = logoOptionsContainer.createEl("button", {
			text: "📁 Upload File",
			cls: "company-config-logo-btn"
		});
		uploadButton.onclick = () => this.handleFileUpload(company);

		// Custom URL button
		const urlButton = logoOptionsContainer.createEl("button", {
			text: "🔗 Custom URL",
			cls: "company-config-logo-btn"
		});
		urlButton.onclick = () => this.handleCustomUrl(company);

		// Default icon button
		const defaultButton = logoOptionsContainer.createEl("button", {
			text: "🏢 Default Icon",
			cls: "company-config-logo-btn"
		});
		defaultButton.onclick = () => this.handleDefaultIcon(company);

		// Current logo preview
		const previewContainer = section.createDiv({ cls: "company-config-logo-preview" });
		this.updateLogoPreview(previewContainer, state.currentConfig.logo || "");
	}

	private createActionButtons(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;
		const buttonContainer = container.createDiv({ cls: "company-config-action-buttons" });

		const saveButton = buttonContainer.createEl("button", {
			text: "💾 Save",
			cls: "company-config-save-btn mod-cta"
		});
		saveButton.onclick = () => this.saveCompany(company.name);

		const cancelButton = buttonContainer.createEl("button", {
			text: "❌ Cancel",
			cls: "company-config-cancel-btn"
		});
		cancelButton.onclick = () => this.cancelCompany(company.name);

		// Show buttons only if there are unsaved changes
		buttonContainer.style.display = state.hasUnsavedChanges ? "flex" : "none";
	}

	private updateActionButtons(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;
		const buttonContainer = container.querySelector(".company-config-action-buttons") as HTMLElement;
		if (buttonContainer) {
			buttonContainer.style.display = state.hasUnsavedChanges ? "flex" : "none";
		}
	}

	private updateFaviconPreview(container: HTMLElement, url: string) {
		const faviconContainer = container.querySelector(".company-config-favicon-container") as HTMLElement;
		if (!faviconContainer) return;

		faviconContainer.empty();

		if (!url || !this.isValidUrl(url)) {
			return;
		}

		const faviconUrl = this.generateFaviconUrl(url);

		const faviconSection = faviconContainer.createDiv({ cls: "company-config-favicon-section" });
		faviconSection.createEl("span", { text: "🌐 Favicon from website:" });

		const faviconPreview = faviconSection.createEl("img", {
			cls: "company-config-favicon-img",
			attr: { src: faviconUrl, alt: "Favicon" }
		});

		const useFaviconButton = faviconSection.createEl("button", {
			text: "Use Favicon",
			cls: "company-config-favicon-use-btn"
		});

		useFaviconButton.onclick = () => {
			const companyName = container.closest('.company-config-item')?.querySelector('.company-config-name')?.textContent;
			if (companyName) {
				const state = this.companyStates.get(companyName)!;
				state.currentConfig.logo = `![Company Logo](${faviconUrl})`;
				state.hasUnsavedChanges = true;
				this.onOpen(); // Refresh to show changes
			}
		};
	}

	private async handleFileUpload(company: CompanyConfig) {
		try {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.style.display = 'none';

			input.onchange = async (event) => {
				const file = (event.target as HTMLInputElement).files?.[0];
				if (file) {
					const fileName = `company-logo-${Date.now()}-${file.name}`;
					const assetsPath = 'assets/logos';

					await this.ensureFolder(assetsPath);

					const arrayBuffer = await file.arrayBuffer();
					const uint8Array = new Uint8Array(arrayBuffer);

					const filePath = `${assetsPath}/${fileName}`;
					await this.app.vault.createBinary(filePath, uint8Array);

					const state = this.companyStates.get(company.name)!;
					state.currentConfig.logo = `![Company Logo](${filePath})`;
					state.hasUnsavedChanges = true;
					this.onOpen(); // Refresh to show changes
				}
			};

			document.body.appendChild(input);
			input.click();
			document.body.removeChild(input);
		} catch (error) {
			new Notice("Error uploading file: " + error.message);
		}
	}

	private handleCustomUrl(company: CompanyConfig) {
		const url = prompt("Enter image URL:", "https://example.com/logo.png");
		if (url && url.trim()) {
			const state = this.companyStates.get(company.name)!;
			state.currentConfig.logo = `![Company Logo](${url.trim()})`;
			state.hasUnsavedChanges = true;
			this.onOpen(); // Refresh to show changes
		}
	}

	private handleDefaultIcon(company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;
		state.currentConfig.logo = `![Company Logo](${this.DEFAULT_ICON})`;
		state.hasUnsavedChanges = true;
		this.onOpen(); // Refresh to show changes
	}

	private updateLogoPreview(container: HTMLElement, logoValue: string) {
		container.empty();

		if (!logoValue) {
			container.createSpan({ text: "No logo configured", cls: "company-config-no-logo" });
			return;
		}

		// Try to extract image URL/path from markdown
		const imageMatch = logoValue.match(/!\[.*?\]\(([^)]+)\)/);
		if (imageMatch) {
			const imagePath = imageMatch[1];
			const img = container.createEl("img", {
				cls: "company-config-logo-img",
				attr: { src: imagePath, alt: "Company Logo Preview" }
			});

			img.onerror = () => {
				container.empty();
				container.createDiv({
					cls: "company-config-logo-error",
					text: "⚠️ Logo failed to load"
				});
			};
		} else {
			container.createDiv({
				cls: "company-config-logo-error",
				text: "⚠️ Invalid logo format"
			});
		}
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

	private async saveCompany(companyName: string) {
		const state = this.companyStates.get(companyName)!;
		const company = this.companies.find(c => c.name === companyName)!;

		try {
			// Update the original company config
			Object.assign(company, state.currentConfig);

			// Save to file
			await this.saveCompanyToFile(company);

			// Update state
			state.originalConfig = { ...state.currentConfig };
			state.hasUnsavedChanges = false;

			new Notice(`${companyName} settings saved successfully!`);
			this.onOpen(); // Refresh to hide buttons
		} catch (error) {
			new Notice(`Error saving ${companyName}: ${error.message}`);
		}
	}

	private cancelCompany(companyName: string) {
		const state = this.companyStates.get(companyName)!;

		// Revert changes
		state.currentConfig = { ...state.originalConfig };
		state.hasUnsavedChanges = false;

		this.onOpen(); // Refresh to show reverted values
	}

	private handleClose() {
		// Check for any unsaved changes
		const unsavedCompanies = Array.from(this.companyStates.entries())
			.filter(([_, state]) => state.hasUnsavedChanges)
			.map(([name, _]) => name);

		if (unsavedCompanies.length > 0) {
			const choice = confirm(`You have unsaved changes for: ${unsavedCompanies.join(', ')}. Close anyway?`);
			if (!choice) {
				return;
			}
		}

		this.close();
	}

	private async saveCompanyToFile(company: CompanyConfig): Promise<void> {
		const fileContent = await this.app.vault.read(company.file);

		// Split content into frontmatter and body
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
		const match = fileContent.match(frontmatterRegex);

		let frontmatterContent = "";
		let bodyContent = fileContent;

		if (match) {
			frontmatterContent = match[1];
			bodyContent = match[2];
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

		// Update color
		if (company.color) {
			frontmatterMap.set('color', `"${company.color}"`);
		} else {
			frontmatterMap.delete('color');
		}

		// Update URL
		if (company.url) {
			frontmatterMap.set('url', `"${company.url}"`);
		} else {
			frontmatterMap.delete('url');
		}

		// Ensure def-type is set
		if (!frontmatterMap.has('def-type')) {
			frontmatterMap.set('def-type', 'consolidated');
		}

		// Update logo in body content
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
		}

		// Rebuild frontmatter
		let newFrontmatter = '';
		if (frontmatterMap.size > 0) {
			newFrontmatter = '---\n';
			for (const [key, value] of frontmatterMap) {
				newFrontmatter += `${key}: ${value}\n`;
			}
			newFrontmatter += '---';
		}

		// Combine frontmatter and body
		const newContent = newFrontmatter ? `${newFrontmatter}\n\n${bodyContent}` : bodyContent;
		await this.app.vault.modify(company.file, newContent);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}