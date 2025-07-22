import { App, DropdownComponent, Modal, Notice, Setting, TFile } from "obsidian";
import { getDefFileManager } from "src/core/def-file-manager";
import { DefFileUpdater } from "src/core/def-file-updater";
import { DefFileType } from "src/core/file-type";
import { registerDefFile } from "./def-file-registration";


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
		this.submitting = false;
		this.modal.setTitle("Add a person");
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
			text: "Description"
		});
		const descriptionText = this.modal.contentEl.createEl("textarea", {
			cls: 'people-metadata-edit-modal-textarea',
			attr: {
				placeholder: "Add description here"
			},
		});

		const defManager = getDefFileManager();
		this.defFilePickerSetting = new Setting(this.modal.contentEl)
			.setName("Choose company")
			.addDropdown(component => {
				// Add "Create a new Company" option first
				component.addOption("__CREATE_NEW__", "Create a new company");

				// Add existing companies
				const defFiles = defManager.getConsolidatedDefFiles();
				defFiles.forEach(file => {
					const companyName = file.basename;
					component.addOption(file.path, companyName);
				});
				this.defFilePicker = component;
			});

		const button = this.modal.contentEl.createEl("button", {
			text: "Save",
			cls: 'people-metadata-edit-modal-save-button',
		});
		button.addEventListener('click', async () => {
			if (this.submitting) {
				return;
			}

			// Validate required fields
			if (!fullNameText.value.trim()) {
				new Notice("Please enter a full name");
				return;
			}
			if (!descriptionText.value.trim()) {
				new Notice("Please enter a description");
				return;
			}
			if (!this.defFilePicker.getValue()) {
				new Notice("Please choose a company");
				return;
			}

			this.submitting = true;

			try {
				const selectedValue = this.defFilePicker.getValue();
				let targetFile;

				if (selectedValue === "__CREATE_NEW__") {
					// Create a new company file
					targetFile = await this.createNewCompanyFile(fullNameText.value.trim());
				} else {
					// Use existing company file
					const defFileManager = getDefFileManager();
					targetFile = defFileManager.globalDefFiles.get(selectedValue);
				}

				if (!targetFile) {
					new Notice("Failed to get or create company file");
					return;
				}

				const updated = new DefFileUpdater(this.app);
				await updated.addMetadata({
					fullName: fullNameText.value.trim(),
					position: jobTitleText.value.trim() || "",
					department: departmentText.value.trim() || "",
					notes: descriptionText.value.trim(),
					file: targetFile,
					fileType: DefFileType.Consolidated
				});

				this.modal.close();
			} catch (error) {
				console.error("Error adding person:", error);
				new Notice("Failed to add person. Please try again.");
			} finally {
				this.submitting = false;
			}
		});

		this.modal.open();
	}

	private async createNewCompanyFile(personName: string): Promise<TFile> {
		// Extract potential company name from person name or use a generic name
		const words = personName.split(' ');
		const lastName = words[words.length - 1];
		const companyName = `${lastName}-Company`;

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
}
