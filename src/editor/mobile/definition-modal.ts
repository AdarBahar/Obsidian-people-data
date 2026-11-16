import { App, Component, Modal } from "obsidian";
import { PersonMetadata } from "src/core/model";
import { renderPersonCard } from "../person-card";

let defModal: DefinitionModal;

export class DefinitionModal {
	app: App;
	modal: Modal;
	private renderComponent: Component | undefined;

	constructor(app: App) {
		this.app = app;
		this.modal = new Modal(app);
		// Release the rendered markdown when the modal closes
		this.modal.onClose = () => {
			this.renderComponent?.unload();
			this.renderComponent = undefined;
			this.modal.contentEl.empty();
		};
	}

	open(person: PersonMetadata) {
		this.renderComponent?.unload();
		this.modal.contentEl.empty();
		this.renderComponent = new Component();
		this.renderComponent.load();
		renderPersonCard(this.app, person, this.modal.contentEl, this.renderComponent, {
			headingTag: "h1",
			showFileName: false,
		});
		this.modal.open();
	}
}

export function initDefinitionModal(app: App) {
	defModal = new DefinitionModal(app);
	return defModal;
}

export function getDefinitionModal() {
	return defModal;
}
