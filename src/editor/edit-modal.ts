import { App, Modal, Notice } from "obsidian";
import { DefFileUpdater } from "src/core/def-file-updater";
import { PersonMetadata } from "src/core/model";


export class EditDefinitionModal {
	app: App;
	modal: Modal;
	submitting: boolean;

	constructor(app: App) {
		this.app = app;
		this.modal = new Modal(app);
	}

	open(def: PersonMetadata) {
		this.submitting = false;
		const contentEl = this.modal.contentEl;
		contentEl.empty();
		this.modal.setTitle(`Edit '${def.fullName}'`);

		const fullNameText = this.addField("Full name", "people-metadata-edit-modal-aliases", def.fullName);
		const positionText = this.addField("Job title", "people-metadata-edit-modal-aliases", def.position);
		const departmentText = this.addField("Department", "people-metadata-edit-modal-aliases", def.department);
		const notesText = this.addField("Description", "people-metadata-edit-modal-textarea", def.notes);

		const button = contentEl.createEl("button", {
			text: "Save",
			cls: 'people-metadata-edit-modal-save-button',
		});
		button.addEventListener('click', async () => {
			if (this.submitting) {
				return;
			}
			const fullName = fullNameText.value.trim();
			if (!fullName) {
				new Notice("Please enter a full name");
				return;
			}

			this.submitting = true;
			try {
				const updater = new DefFileUpdater(this.app);
				const saved = await updater.updateMetadata(def, {
					...def,
					fullName: fullName,
					position: positionText.value.trim(),
					department: departmentText.value.trim(),
					notes: notesText.value.trim(),
				});
				if (saved) {
					this.modal.close();
				}
			} finally {
				this.submitting = false;
			}
		});

		this.modal.open();
	}

	private addField(label: string, cls: string, value: string): HTMLTextAreaElement {
		this.modal.contentEl.createDiv({
			cls: "people-metadata-edit-modal-section-header",
			text: label,
		});
		const field = this.modal.contentEl.createEl("textarea", { cls: cls });
		field.value = value ?? "";
		return field;
	}
}
