import { App, Modal, Notice, TFile } from "obsidian";
import { getAvailableColorNames, parseColorValue } from "src/core/company-colors";

export interface CompanyConfig {
	name: string;
	color?: string;
	logo?: string;
	url?: string;
	file?: TFile;
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
	private documentClickHandlers: ((e: Event) => void)[] = [];

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

		// Add new company button
		const addNewContainer = companiesContainer.createDiv({ cls: "company-config-add-new" });
		const addNewButton = addNewContainer.createEl("button", {
			text: "➕ Add New Company",
			cls: "company-config-add-new-btn"
		});
		addNewButton.onclick = () => this.showAddNewCompanyForm();

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
			text: company.file?.path || "New Company",
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
		// 1. Company Name Section (for new companies)
		if (!company.file) {
			this.createCompanyNameSection(container, company);
		}

		// 2. Underline Color Section
		this.createColorSection(container, company);

		// 3. Homepage Section
		this.createHomepageSection(container, company);

		// 4. Company Logo Section
		this.createLogoSection(container, company);

		// 5. Save/Cancel buttons
		this.createActionButtons(container, company);
	}

	private createCompanyNameSection(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name);
		if (!state) return;

		const section = container.createDiv({ cls: "company-config-section" });

		section.createEl("h4", { text: "Company Name" });

		const inputContainer = section.createDiv({ cls: "company-config-input-container" });
		inputContainer.createEl("label", { text: "Company Name:" });

		const nameInput = inputContainer.createEl("input", {
			type: "text",
			placeholder: "Enter company name",
			value: company.name === "New Company" ? "" : company.name
		});

		nameInput.oninput = () => {
			const newName = nameInput.value.trim();
			if (newName && newName !== company.name) {
				// Update company name in state
				const oldName = company.name;
				company.name = newName;
				state.currentConfig.name = newName;
				state.hasUnsavedChanges = true;

				// Update the state map with new name
				this.companyStates.delete(oldName);
				this.companyStates.set(newName, state);

				this.updateActionButtons(container, company);
			}
		};
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

		// Color name dropdown with color samples
		const nameContainer = section.createDiv({ cls: "company-config-input-container" });
		nameContainer.createEl("label", { text: "Color Name:" });

		// Create custom dropdown container
		const dropdownContainer = nameContainer.createDiv({ cls: "company-config-color-dropdown" });
		const selectedDisplay = dropdownContainer.createDiv({ cls: "company-config-color-selected" });
		const optionsList = dropdownContainer.createDiv({ cls: "company-config-color-options" });

		// Update selected display
		const updateSelectedDisplay = (colorName: string) => {
			selectedDisplay.empty();
			if (!colorName) {
				selectedDisplay.createSpan({ text: "No Color", cls: "company-config-color-option-text" });
			} else {
				const colorSample = selectedDisplay.createDiv({ cls: "company-config-color-sample-small" });
				colorSample.style.backgroundColor = parseColorValue(colorName);
				selectedDisplay.createSpan({ text: colorName, cls: "company-config-color-option-text" });
			}
			selectedDisplay.createSpan({ text: "▼", cls: "company-config-dropdown-arrow" });
		};

		// Create options
		const createOption = (colorName: string, displayText: string) => {
			const option = optionsList.createDiv({ cls: "company-config-color-option" });
			if (colorName) {
				const colorSample = option.createDiv({ cls: "company-config-color-sample-small" });
				colorSample.style.backgroundColor = parseColorValue(colorName);
			}
			option.createSpan({ text: displayText, cls: "company-config-color-option-text" });

			option.onclick = () => {
				state.currentConfig.color = colorName;
				state.hasUnsavedChanges = true;
				this.updateActionButtons(container, company);
				this.updateColorPreview(section, colorName);
				updateSelectedDisplay(colorName);
				optionsList.style.display = "none";
			};

			return option;
		};

		// Add "No Color" option
		createOption("", "No Color");

		// Add color options
		getAvailableColorNames().forEach(colorName => {
			createOption(colorName, colorName);
		});

		// Initialize display
		updateSelectedDisplay(currentColor);
		optionsList.style.display = "none";

		// Toggle dropdown
		selectedDisplay.onclick = () => {
			const isVisible = optionsList.style.display === "block";
			optionsList.style.display = isVisible ? "none" : "block";
		};

		// Close dropdown when clicking outside
		const outsideClickHandler = (e: Event) => {
			if (!dropdownContainer.contains(e.target as Node)) {
				optionsList.style.display = "none";
			}
		};
		document.addEventListener('click', outsideClickHandler);

		// Store handler for cleanup
		if (!this.documentClickHandlers) {
			this.documentClickHandlers = [];
		}
		this.documentClickHandlers.push(outsideClickHandler);

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
			this.updateColorPreview(section, hexTextInput.value);
		};

		// Add color preview container
		section.createDiv({ cls: "company-config-color-preview" });
		this.updateColorPreview(section, currentColor);
	}

	private createHomepageSection(container: HTMLElement, company: CompanyConfig) {
		const state = this.companyStates.get(company.name)!;
		const section = container.createDiv({ cls: "company-config-section" });

		section.createEl("h4", { text: `${company.name} - Homepage` });

		const inputContainer = section.createDiv({ cls: "company-config-input-container" });
		inputContainer.createEl("label", { text: "Homepage URL" });

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
			: `${parsedColor}`;

		previewDiv.createSpan({
			text: displayText,
			cls: "company-config-color-text"
		});
	}

	private updateFaviconPreview(container: HTMLElement, url: string) {
		// Find the favicon container within the current company's settings
		const faviconContainer = container.querySelector(".company-config-favicon-container") as HTMLElement;
		if (!faviconContainer) {
			console.log("Favicon container not found");
			return;
		}

		faviconContainer.empty();

		if (!url || !this.isValidUrl(url)) {
			console.log("Invalid URL:", url);
			return;
		}

		const faviconUrl = this.generateFaviconUrl(url);
		console.log("Generated favicon URL:", faviconUrl);

		const faviconSection = faviconContainer.createDiv({ cls: "company-config-favicon-section" });
		faviconSection.createEl("span", { text: "🌐 Favicon from website:" });

		const faviconPreview = faviconSection.createEl("img", {
			cls: "company-config-favicon-img"
		});
		faviconPreview.src = faviconUrl;
		faviconPreview.alt = "Favicon";

		// Add error handling for favicon loading
		faviconPreview.onerror = () => {
			console.log("Favicon failed to load:", faviconUrl);
			faviconSection.createDiv({
				text: "⚠️ Favicon not available",
				cls: "company-config-favicon-error"
			});
		};

		faviconPreview.onload = () => {
			console.log("Favicon loaded successfully:", faviconUrl);
		};

		const useFaviconButton = faviconSection.createEl("button", {
			text: "Use Favicon",
			cls: "company-config-favicon-use-btn"
		});

		useFaviconButton.onclick = () => {
			// Find the company name from the closest company item
			const companyItem = container.closest('.company-config-item');
			const companyNameEl = companyItem?.querySelector('.company-config-name');
			const companyName = companyNameEl?.textContent;

			if (companyName && this.companyStates.has(companyName)) {
				const state = this.companyStates.get(companyName)!;
				state.currentConfig.logo = `![Company Logo](${faviconUrl})`;
				state.hasUnsavedChanges = true;
				this.onOpen(); // Refresh to show changes
			} else {
				console.log("Could not find company name or state");
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

					const state = this.companyStates.get(company.name);
					if (state) {
						state.currentConfig.logo = `![Company Logo](${filePath})`;
						state.hasUnsavedChanges = true;
						this.onOpen(); // Refresh to show changes
					}
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
		// Create a simple input modal
		const modal = new Modal(this.app);
		modal.titleEl.setText("Enter Image URL");

		const inputContainer = modal.contentEl.createDiv();
		inputContainer.createEl("label", { text: "Image URL:" });
		const urlInput = inputContainer.createEl("input", {
			type: "text",
			placeholder: "https://example.com/logo.png",
			attr: { style: "width: 100%; margin: 10px 0;" }
		});

		const buttonContainer = modal.contentEl.createDiv({ attr: { style: "text-align: right; margin-top: 15px;" } });

		const cancelBtn = buttonContainer.createEl("button", { text: "Cancel" });
		cancelBtn.style.marginRight = "10px";
		cancelBtn.onclick = () => modal.close();

		const okBtn = buttonContainer.createEl("button", { text: "OK", cls: "mod-cta" });
		okBtn.onclick = () => {
			const url = urlInput.value.trim();
			if (url) {
				const state = this.companyStates.get(company.name);
				if (state) {
					state.currentConfig.logo = `![Company Logo](${url})`;
					state.hasUnsavedChanges = true;
					this.onOpen(); // Refresh to show changes
				}
			}
			modal.close();
		};

		// Focus input and handle Enter key
		urlInput.focus();
		urlInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				okBtn.click();
			}
		});

		modal.open();
	}

	private handleDefaultIcon(company: CompanyConfig) {
		const state = this.companyStates.get(company.name);
		if (!state) return;

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

			// Create preview container
			const previewContainer = container.createDiv({ cls: "company-config-logo-sample" });

			const img = previewContainer.createEl("img", {
				cls: "company-config-logo-img",
				attr: { src: imagePath, alt: "Company Logo Preview" }
			});

			// Add load success handler
			img.onload = () => {
				// Show success indicator
				const infoDiv = container.createDiv({ cls: "company-config-logo-info" });
				infoDiv.createSpan({
					text: "✅ Logo loaded successfully",
					cls: "company-config-logo-success"
				});
			};

			// Add error handling
			img.onerror = () => {
				previewContainer.empty();
				previewContainer.createDiv({
					cls: "company-config-logo-error",
					text: "⚠️ Logo failed to load"
				});

				// Show the path that failed
				previewContainer.createDiv({
					cls: "company-config-logo-path",
					text: `Path: ${imagePath}`
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
			// Ensure URL has protocol
			const urlToProcess = companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`;
			const url = new URL(urlToProcess);
			return `https://www.google.com/s2/favicons?sz=96&domain_url=${encodeURIComponent(url.origin)}`;
		} catch {
			// Fallback: clean the URL and try with https
			const cleanUrl = companyUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
			return `https://www.google.com/s2/favicons?sz=96&domain_url=${encodeURIComponent(`https://${cleanUrl}`)}`;
		}
	}

	private isValidUrl(string: string): boolean {
		if (!string || string.trim() === "") return false;

		try {
			// Try with https:// prefix if no protocol
			const urlToTest = string.startsWith('http') ? string : `https://${string}`;
			new URL(urlToTest);
			return true;
		} catch {
			// Try with just the domain pattern
			const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}\.?)+$/;
			return domainPattern.test(string.replace(/^www\./, ''));
		}
	}

	private async ensureFolder(folderPath: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	private async saveCompany(companyName: string) {
		const state = this.companyStates.get(companyName);
		if (!state) return;

		const company = this.companies.find(c => c.name === companyName);
		if (!company) return;

		try {
			// Update the original company config
			Object.assign(company, state.currentConfig);

			// Check if this is a new company
			if (!company.file) {
				const success = await this.saveNewCompany(company);
				if (!success) return;
			} else {
				// Save existing company to file
				await this.saveCompanyToFile(company);
			}

			// Update state and close drawer
			state.originalConfig = { ...state.currentConfig };
			state.hasUnsavedChanges = false;
			state.isOpen = false; // Close the drawer

			if (company.file) {
				new Notice(`${companyName} settings saved successfully!`);
			}
			this.onOpen(); // Refresh to show closed state
		} catch (error) {
			new Notice(`Error saving ${companyName}: ${error.message}`);
		}
	}

	private cancelCompany(companyName: string) {
		const state = this.companyStates.get(companyName);
		if (!state) return;

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

	private showAddNewCompanyForm() {
		// Create a temporary new company config
		const newCompanyName = "New Company";
		const tempCompany: CompanyConfig = {
			name: newCompanyName,
			color: "",
			logo: "",
			url: "",
			file: undefined // Will be created when saved
		};

		// Add to companies list temporarily
		this.companies.push(tempCompany);

		// Initialize state
		this.companyStates.set(newCompanyName, {
			isOpen: true,
			hasUnsavedChanges: false,
			originalConfig: { ...tempCompany },
			currentConfig: { ...tempCompany }
		});

		// Refresh modal to show new company form
		this.onOpen();
	}

	private async saveNewCompany(company: CompanyConfig): Promise<boolean> {
		try {
			// Validate company name
			if (!company.name || company.name.trim() === "" || company.name === "New Company") {
				new Notice("Please enter a valid company name");
				return false;
			}

			// Check if company already exists
			const existingCompany = this.companies.find(c => c.name === company.name && c.file);
			if (existingCompany) {
				new Notice(`Company "${company.name}" already exists`);
				return false;
			}

			// Find the People folder
			const peopleFolder = this.app.vault.getAbstractFileByPath("People");
			if (!peopleFolder) {
				new Notice("People folder not found. Please create a 'People' folder first.");
				return false;
			}

			// Create company file
			const fileName = `${company.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim()}.md`;
			const filePath = `People/${fileName}`;

			// Create frontmatter
			let frontmatter = "---\ndef-type: consolidated\n";
			if (company.color) {
				frontmatter += `color: "${company.color}"\n`;
			}
			if (company.url) {
				frontmatter += `url: "${company.url}"\n`;
			}
			frontmatter += "---\n\n";

			// Add logo if specified
			let content = frontmatter;
			if (company.logo) {
				content += `${company.logo}\n\n`;
			}

			// Add basic company template
			content += `# ${company.name}\n\n`;
			content += `## People\n\n`;
			content += `<!-- Add people here -->\n\n`;
			content += `## Notes\n\n`;
			content += `<!-- Add company notes here -->\n`;

			// Create the file
			const newFile = await this.app.vault.create(filePath, content);
			company.file = newFile;

			// Show success notification with link
			this.showCompanyCreatedNotification(company.name, newFile);

			// Trigger refresh callback
			this.onSave();

			return true;
		} catch (error) {
			new Notice(`Error creating company: ${error.message}`);
			return false;
		}
	}

	private showCompanyCreatedNotification(companyName: string, file: TFile) {
		const notice = new Notice("", 8000); // 8 second notice

		// Create custom notice content
		const noticeEl = notice.noticeEl;
		noticeEl.empty();

		const container = noticeEl.createDiv({ cls: "company-created-notice" });
		container.createSpan({ text: `Company "${companyName}" created! ` });

		const link = container.createEl("a", {
			text: "Click here to add people",
			cls: "company-created-link"
		});

		link.onclick = (e) => {
			e.preventDefault();
			// Open the company file
			this.app.workspace.openLinkText(file.path, "", false);
			notice.hide();
			this.close(); // Close the modal
		};
	}

	private async saveCompanyToFile(company: CompanyConfig): Promise<void> {
		if (!company.file) {
			throw new Error("Cannot save company without file");
		}
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
		if (company.file) {
			await this.app.vault.modify(company.file, newContent);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();

		// Clean up document event listeners
		this.documentClickHandlers.forEach(handler => {
			document.removeEventListener('click', handler);
		});
		this.documentClickHandlers = [];
	}
}