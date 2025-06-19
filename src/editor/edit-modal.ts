import { App, Modal } from "obsidian";
import { DefFileUpdater } from "src/core/def-file-updater";
import { DefFileType } from "src/core/file-type";
import { TFile } from "obsidian";
import { PersonMetadata } from "src/core/model";


export class EditDefinitionModal {
	app: App;
	modal: Modal;
	aliases: string;
	definition: string;
	submitting: boolean;

	constructor(app: App) {
		this.app = app;
		this.modal = new Modal(app);
	}

	open(def: PersonMetadata) {
		this.submitting = false;
		this.modal.setTitle(`Edit metadata for '${def.fullName}'`);
		const aliasText = this.modal.contentEl.createEl('input', { type: 'text', value: def.department });
		const defText = this.modal.contentEl.createEl('textarea', { text: def.notes });
		const button = this.modal.contentEl.createEl("button", {
			text: "Save",
			cls: 'edit-modal-save-button',
		});
		button.addEventListener('click', () => {
			if (this.submitting) {
				return;
			}
			const updater = new DefFileUpdater(this.app);
			const file = this.app.vault.getAbstractFileByPath('path/to/file.md');
			if (!file || !(file instanceof TFile)) {
				throw new Error('File not found or is not a valid TFile');
			}
			updater.updateMetadata({
				fullName: 'Jane Smith',
				position: 'Manager',
				department: 'Management',
				notes: 'Notes about Jane Smith.',
				fileType: DefFileType.Consolidated,
				file: file,
				linkText: 'Jane Smith'
			});
			this.modal.close();
		});

		this.modal.open();
	}
}
