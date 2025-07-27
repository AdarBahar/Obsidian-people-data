import { App, DropdownComponent, Modal, Notice, Setting, TFile } from "obsidian";
import { getDefFileManager } from "src/core/def-file-manager";
import { DefFileUpdater } from "src/core/def-file-updater";
import { DefFileType } from "src/core/file-type";
import { registerDefFile } from "./def-file-registration";
import { debugLog, debugInfo, debugError, debugTimer } from "src/util/debug";


export class AddDefinitionModal {
	app: App;
	modal: Modal;
	submitting: boolean;

	defFilePickerSetting: Setting;
	defFilePicker: DropdownComponent;

	constructor(app: App) {
		this.app = app;
		this.modal = new Modal(app);
	}

	open(text?: string) {
		debugLog("Opening Add Person modal", { text });
		this.submitting = false;
		this.modal.setTitle("Add a person");

		// Add error display area at the top
		const errorContainer = this.modal.contentEl.createDiv({
			cls: "people-metadata-error-container",
			attr: { style: "display: none;" }
		});

		// Move "Choose Company" to the top
		const defManager = getDefFileManager();
		this.defFilePickerSetting = new Setting(this.modal.contentEl)
			.setName("Choose company")
			.addDropdown(component => {
				// Add default "Choose one" option
				component.addOption("", "Choose one");

				// Add "Create a new Company" option
				component.addOption("__CREATE_NEW__", "Create a new company");

				// Add existing companies
				const defFiles = defManager.getConsolidatedDefFiles();
				defFiles.forEach(file => {
					const companyName = file.basename;
					component.addOption(file.path, companyName);
				});
				this.defFilePicker = component;
			});

		// Company name field (initially hidden)
		const companyNameHeader = this.modal.contentEl.createDiv({
			cls: "people-metadata-edit-modal-section-header",
			text: "Company name",
			attr: { style: "display: none;" }
		});
		const companyNameText = this.modal.contentEl.createEl("textarea", {
			cls: 'people-metadata-edit-modal-aliases',
			attr: {
				placeholder: "Enter company name",
				style: "display: none;"
			},
		});

		// Company name validation feedback (initially hidden)
		const companyNameValidation = this.modal.contentEl.createDiv({
			cls: "people-metadata-company-validation",
			attr: { style: "display: none; margin-top: 4px; font-size: 0.9em;" }
		});

		// Company name validation functions
		const validateCompanyName = (companyName: string): { isValid: boolean; message: string } => {
			debugLog("Validating company name", { companyName });

			if (!companyName.trim()) {
				return { isValid: false, message: "" }; // Empty is handled by main validation
			}

			const defManager = getDefFileManager();
			const existingFiles = defManager.getConsolidatedDefFiles();
			const normalizedName = companyName.trim().toLowerCase();

			debugLog("Checking against existing companies", {
				normalizedName,
				existingCount: existingFiles.length
			});

			// Check if company name already exists (case-insensitive)
			const exists = existingFiles.some(file =>
				file.basename.toLowerCase() === normalizedName
			);

			if (exists) {
				debugLog("Company name conflict detected", { companyName });
				return {
					isValid: false,
					message: `⚠️ Company "${companyName.trim()}" already exists. Please choose a different name.`
				};
			}

			debugLog("Company name is available", { companyName });
			return { isValid: true, message: `✅ "${companyName.trim()}" is available.` };
		};

		const showCompanyValidation = (message: string, isValid: boolean) => {
			companyNameValidation.textContent = message;
			companyNameValidation.style.display = message ? "block" : "none";
			companyNameValidation.style.color = isValid ? "var(--text-success)" : "var(--text-error)";
		};

		const hideCompanyValidation = () => {
			companyNameValidation.style.display = "none";
		};

		// Add blur event listener for real-time validation
		companyNameText.addEventListener('blur', () => {
			if (companyNameText.style.display !== "none" && companyNameText.value.trim()) {
				const validation = validateCompanyName(companyNameText.value);
				showCompanyValidation(validation.message, validation.isValid);
			}
		});

		// Add input event listener to hide validation while typing
		companyNameText.addEventListener('input', () => {
			hideCompanyValidation();
		});

		// Add change listener to show/hide company name field
		this.defFilePicker.onChange((value) => {
			if (value === "__CREATE_NEW__") {
				companyNameHeader.style.display = "block";
				companyNameText.style.display = "block";
				companyNameValidation.style.display = "none";
				companyNameText.focus();
			} else {
				companyNameHeader.style.display = "none";
				companyNameText.style.display = "none";
				companyNameValidation.style.display = "none";
				companyNameText.value = "";
			}
		});

		this.modal.contentEl.createDiv({
			cls: "people-metadata-edit-modal-section-header",
			text: "Full name"
		})
		const fullNameText = this.modal.contentEl.createEl("textarea", {
			cls: 'people-metadata-edit-modal-aliases',
			attr: {
				placeholder: "John Smith"
			},
			text: text ?? ''
		});
		this.modal.contentEl.createDiv({
			cls: "people-metadata-edit-modal-section-header",
			text: "Job title"
		})
		const jobTitleText = this.modal.contentEl.createEl("textarea", {
			cls: 'people-metadata-edit-modal-aliases',
			attr: {
				placeholder: "Dev Team Leader"
			},
		});
		this.modal.contentEl.createDiv({
			cls: "people-metadata-edit-modal-section-header",
			text: "Department"
		});
		const departmentText = this.modal.contentEl.createEl("textarea", {
			cls: 'people-metadata-edit-modal-aliases',
			attr: {
				placeholder: "Engineering"
			},
		});
		this.modal.contentEl.createDiv({
			cls: "people-metadata-edit-modal-section-header",
			text: "Description (optional)"
		});
		const descriptionText = this.modal.contentEl.createEl("textarea", {
			cls: 'people-metadata-edit-modal-textarea',
			attr: {
				placeholder: "Add description here (optional)"
			},
		});

		// Helper functions for error handling
		const showError = (message: string) => {
			errorContainer.textContent = message;
			errorContainer.style.display = "block";
			errorContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
		};

		const hideError = () => {
			errorContainer.style.display = "none";
		};

		const button = this.modal.contentEl.createEl("button", {
			text: "Save",
			cls: 'people-metadata-edit-modal-save-button',
		});
		button.addEventListener('click', async () => {
			if (this.submitting) {
				return;
			}

			// Hide any previous errors
			hideError();

			// Validate required fields
			if (!fullNameText.value.trim()) {
				showError("⚠️ Please enter a full name");
				return;
			}

			const selectedValue = this.defFilePicker.getValue();
			if (!selectedValue) {
				showError("⚠️ You need to choose a company");
				return;
			}

			if (selectedValue === "__CREATE_NEW__" && !companyNameText.value.trim()) {
				showError("⚠️ Please enter a company name");
				return;
			}

			// Check for company name conflicts when creating new company
			if (selectedValue === "__CREATE_NEW__") {
				const validation = validateCompanyName(companyNameText.value);
				if (!validation.isValid) {
					showError(validation.message);
					return;
				}
			}

			// Check for minimal data confirmation
			const hasMinimalData = !jobTitleText.value.trim() &&
								   !departmentText.value.trim() &&
								   !descriptionText.value.trim();

			if (hasMinimalData) {
				const confirmed = await this.showMinimalDataConfirmation();
				if (!confirmed) {
					return;
				}
			}

			// Check for new company confirmation
			if (selectedValue === "__CREATE_NEW__") {
				const confirmed = await this.showNewCompanyConfirmation(companyNameText.value.trim());
				if (!confirmed) {
					return;
				}
			}

			debugInfo("Starting person creation process", {
				fullName: fullNameText.value.trim(),
				jobTitle: jobTitleText.value.trim(),
				department: departmentText.value.trim(),
				hasDescription: !!descriptionText.value.trim(),
				selectedCompany: selectedValue,
				isNewCompany: selectedValue === "__CREATE_NEW__"
			});

			const timer = debugTimer("Person creation");
			this.submitting = true;
			button.textContent = "Saving...";
			button.disabled = true;

			try {
				let targetFile;

				if (selectedValue === "__CREATE_NEW__") {
					// Create a new company file
					debugLog("Creating new company file", { companyName: companyNameText.value.trim() });
					targetFile = await this.createNewCompanyFile(companyNameText.value.trim());
				} else {
					// Use existing company file
					debugLog("Using existing company file", { selectedValue });
					const defFileManager = getDefFileManager();
					targetFile = defFileManager.globalDefFiles.get(selectedValue);
				}

				if (!targetFile) {
					showError("❌ Failed to get or create company file");
					return;
				}

				const updated = new DefFileUpdater(this.app);
				await updated.addMetadata({
					fullName: fullNameText.value.trim(),
					position: jobTitleText.value.trim() || "",
					department: departmentText.value.trim() || "",
					notes: descriptionText.value.trim() || "",
					file: targetFile,
					fileType: DefFileType.Consolidated
				});

				debugInfo("Person created successfully");
				timer(); // Log timing
				this.modal.close();
			} catch (error) {
				debugError("Error adding person", error);
				showError("❌ Failed to add person. Please try again.");
			} finally {
				this.submitting = false;
				button.textContent = "Save";
				button.disabled = false;
			}
		});

		this.modal.open();
	}

	private async createNewCompanyFile(companyName: string): Promise<TFile> {
		// Use the provided company name directly

		const defManager = getDefFileManager();
		const defFolder = defManager.getGlobalDefFolder();
		const filePath = `${defFolder}/${companyName}.md`;

		// Check if file already exists, if so, add a number suffix
		let finalPath = filePath;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			finalPath = `${defFolder}/${companyName}-${counter}.md`;
			counter++;
		}

		// Create the company file with template
		const template = `---
def-type: consolidated
color: "blue"
---

![${companyName} Logo](logo.png)

`;

		const file = await this.app.vault.create(finalPath, template);

		// Register the file as a definition file
		registerDefFile(this.app, file, DefFileType.Consolidated);

		// Add to def manager
		defManager.addDefFile(file);

		return file;
	}

	private async showMinimalDataConfirmation(): Promise<boolean> {
		return new Promise((resolve) => {
			const confirmModal = new Modal(this.app);
			confirmModal.setTitle("⚠️ Minimal Person Data");

			const content = confirmModal.contentEl;

			// Warning message
			content.createEl("p", {
				text: "You're adding a person with only a name. This will create a very basic entry with minimal information.",
				attr: { style: "margin-bottom: 16px; color: var(--text-muted);" }
			});

			// Suggestion
			content.createEl("p", {
				text: "Consider adding at least a job title or department to make this person easier to find and identify later.",
				attr: { style: "margin-bottom: 20px; font-weight: 500;" }
			});

			// Button container
			const buttonContainer = content.createDiv({
				attr: { style: "display: flex; gap: 12px; justify-content: flex-end;" }
			});

			// Cancel button
			const cancelButton = buttonContainer.createEl("button", {
				text: "Go Back",
				cls: "mod-muted"
			});
			cancelButton.addEventListener("click", () => {
				confirmModal.close();
				resolve(false);
			});

			// Confirm button
			const confirmButton = buttonContainer.createEl("button", {
				text: "Add Anyway",
				cls: "mod-warning"
			});
			confirmButton.addEventListener("click", () => {
				confirmModal.close();
				resolve(true);
			});

			confirmModal.open();
		});
	}

	private async showNewCompanyConfirmation(companyName: string): Promise<boolean> {
		return new Promise((resolve) => {
			const confirmModal = new Modal(this.app);
			confirmModal.setTitle("🏢 Create New Company");

			const content = confirmModal.contentEl;

			// Company name display
			content.createEl("p", {
				text: `Company: "${companyName}"`,
				attr: { style: "margin-bottom: 16px; font-weight: 600; font-size: 1.1em; color: var(--text-accent);" }
			});

			// Main message
			content.createEl("p", {
				text: "You're about to create a new company file. This will:",
				attr: { style: "margin-bottom: 12px; font-weight: 500;" }
			});

			// List of what will happen
			const list = content.createEl("ul", {
				attr: { style: "margin-bottom: 16px; padding-left: 20px;" }
			});

			list.createEl("li", { text: "Create a new company file in your People folder" });
			list.createEl("li", { text: "Use default settings (blue color, no logo)" });
			list.createEl("li", { text: "Add this person to the new company" });

			// Next steps
			content.createEl("p", {
				text: "After creation, you can customize the company by:",
				attr: { style: "margin-bottom: 8px; font-weight: 500;" }
			});

			const nextStepsList = content.createEl("ul", {
				attr: { style: "margin-bottom: 20px; padding-left: 20px; color: var(--text-muted);" }
			});

			nextStepsList.createEl("li", { text: "Going to plugin settings → Company pages management" });
			nextStepsList.createEl("li", { text: "Setting a custom color and uploading a logo" });
			nextStepsList.createEl("li", { text: "Adding company description and details" });

			// Button container
			const buttonContainer = content.createDiv({
				attr: { style: "display: flex; gap: 12px; justify-content: flex-end;" }
			});

			// Cancel button
			const cancelButton = buttonContainer.createEl("button", {
				text: "Cancel",
				cls: "mod-muted"
			});
			cancelButton.addEventListener("click", () => {
				confirmModal.close();
				resolve(false);
			});

			// Confirm button
			const confirmButton = buttonContainer.createEl("button", {
				text: "Create Company",
				cls: "mod-cta"
			});
			confirmButton.addEventListener("click", () => {
				confirmModal.close();
				resolve(true);
			});

			confirmModal.open();
		});
	}
}
