import { App, Component, MarkdownRenderer, normalizePath, Modal } from "obsidian";
// import { Definition } from "src/core/model"; // Removed as it's no longer used
import { PersonMetadata } from "src/core/model";

let defModal: DefinitionModal;

export class DefinitionModal extends Component {
	app: App;
	modal: Modal;

	constructor(app: App) {
		super()
		this.app = app;
		this.modal = new Modal(app);
	}

	open(person: PersonMetadata) {
		this.modal.contentEl.empty();

		// Create header with person name and company info
		const headerEl = this.modal.contentEl.createDiv({ cls: "people-metadata-modal-header" });
		const personNameEl = headerEl.createEl("h1", {
			cls: "people-metadata-person-name",
			text: person.fullName
		});

		// Company info on the right side of header
		if (person.companyName || person.companyLogo) {
			const companyEl = headerEl.createDiv({ cls: "people-metadata-company-info" });
			if (person.companyLogo) {
				const logoEl = companyEl.createDiv({ cls: "people-metadata-company-logo" });
				this.renderCompanyLogoWithFallback(person.companyLogo, logoEl, person);
			}
			if (person.companyName) {
				companyEl.createDiv({ text: person.companyName, cls: "people-metadata-company-name" });
			}
		}

		// Person details (removed company field)
		const detailsEl = this.modal.contentEl.createDiv({ cls: "people-metadata-person-details" });
		if (person.position) {
			detailsEl.createDiv({ text: `Position: ${person.position}` });
		}
		if (person.department) {
			detailsEl.createDiv({ text: `Department: ${person.department}` });
		}

		// Notes content
		const notesContent = this.modal.contentEl.createDiv({
			cls: "people-metadata-person-notes",
			attr: {
				ctx: "person-popup"
			}
		});
		MarkdownRenderer.render(this.app, person.notes, notesContent,
			normalizePath(person.file.path) ?? '', this);
		this.modal.open();
	}

	// Open modal with multiple companies (tabs)
	openMultiple(people: PersonMetadata[]) {
		this.modal.contentEl.empty();

		// Create header with person name (same across all companies)
		const headerEl = this.modal.contentEl.createDiv({ cls: "people-metadata-modal-header" });
		const personNameEl = headerEl.createEl("h1", {
			cls: "people-metadata-person-name",
			text: people[0].fullName
		});

		// Create tabs container
		const tabsContainer = this.modal.contentEl.createDiv({ cls: "people-metadata-tabs-container" });
		const tabsHeader = tabsContainer.createDiv({ cls: "people-metadata-tabs-header" });
		const tabsContent = tabsContainer.createDiv({ cls: "people-metadata-tabs-content" });

		// Create tabs for each company
		people.forEach((person, index) => {
			// Create tab button
			const tabButton = tabsHeader.createDiv({
				cls: `people-metadata-tab-button ${index === 0 ? 'active' : ''}`,
				text: person.companyName || 'Unknown Company',
				attr: {
					'data-tab-index': index.toString()
				}
			});

			// Create tab content
			const tabContent = tabsContent.createDiv({
				cls: `people-metadata-tab-content ${index === 0 ? 'active' : ''}`,
				attr: {
					'data-tab-index': index.toString()
				}
			});

			// Company info on the right side of header
			if (person.companyName || person.companyLogo) {
				const companyEl = tabContent.createDiv({ cls: "people-metadata-company-info" });
				if (person.companyLogo) {
					const logoEl = companyEl.createDiv({ cls: "people-metadata-company-logo" });
					this.renderCompanyLogoWithFallback(person.companyLogo, logoEl, person);
				}
				if (person.companyName) {
					companyEl.createDiv({ text: person.companyName, cls: "people-metadata-company-name" });
				}
			}

			// Person details
			const detailsEl = tabContent.createDiv({ cls: "people-metadata-person-details" });
			if (person.position) {
				detailsEl.createDiv({ text: `Position: ${person.position}` });
			}
			if (person.department) {
				detailsEl.createDiv({ text: `Department: ${person.department}` });
			}

			// Notes content
			const notesContent = tabContent.createDiv({
				cls: "people-metadata-person-notes",
				attr: {
					ctx: "person-popup"
				}
			});
			MarkdownRenderer.render(this.app, person.notes, notesContent,
				normalizePath(person.file.path) ?? '', this);

			// Add click handler for tab switching
			tabButton.addEventListener('click', () => {
				this.switchTab(tabsContainer, index);
			});

			// Check if content is scrollable and add fade effect
			this.checkScrollableContent(tabContent);
		});

		this.modal.open();
	}

	// Switch active tab in multi-company modal
	private switchTab(tabsContainer: HTMLElement, activeIndex: number) {
		// Remove active class from all tabs and content
		const tabButtons = tabsContainer.querySelectorAll('.people-metadata-tab-button');
		const tabContents = tabsContainer.querySelectorAll('.people-metadata-tab-content');

		tabButtons.forEach(button => button.removeClass('active'));
		tabContents.forEach(content => content.removeClass('active'));

		// Add active class to selected tab and content
		const activeButton = tabsContainer.querySelector(`[data-tab-index="${activeIndex}"]`);
		const activeContent = tabsContainer.querySelector(`.people-metadata-tab-content[data-tab-index="${activeIndex}"]`);

		if (activeButton) activeButton.addClass('active');
		if (activeContent) {
			activeContent.addClass('active');
			// Check if the newly active content is scrollable
			this.checkScrollableContent(activeContent as HTMLElement);
		}
	}

	// Check if content is scrollable and add appropriate class
	private checkScrollableContent(element: HTMLElement) {
		// Use setTimeout to ensure content is rendered
		setTimeout(() => {
			if (element.scrollHeight > element.clientHeight) {
				element.addClass('has-scroll');
			} else {
				element.removeClass('has-scroll');
			}
		}, 10);
	}

	private renderCompanyLogoWithFallback(logoMarkdown: string, logoEl: HTMLElement, person: PersonMetadata) {
		// First try to render the original logo
		MarkdownRenderer.render(this.app, logoMarkdown, logoEl,
			normalizePath(person.file.path), this);

		// Set up error handling for failed images
		window.setTimeout(() => {
			const imgElements = logoEl.querySelectorAll('img');
			imgElements.forEach(img => {
				// Check if image failed to load or is broken
				if (!img.complete || img.naturalHeight === 0) {
					this.showDefaultLogo(logoEl, person.companyName);
				} else {
					// Set up error handler for future load failures
					img.onerror = () => {
						this.showDefaultLogo(logoEl, person.companyName);
					};
				}
			});
		}, 100); // Small delay to allow image loading attempt
	}

	private showDefaultLogo(logoEl: HTMLElement, companyName?: string) {
		// Clear existing content
		logoEl.empty();

		// Create default logo element
		const defaultLogo = logoEl.createDiv({
			cls: "people-metadata-company-logo-default",
			text: companyName ? companyName.substring(0, 2).toUpperCase() : "CO"
		});

		// Add title attribute for accessibility
		defaultLogo.title = companyName ? `${companyName} (default logo)` : "Company (default logo)";
	}
}

export function initDefinitionModal(app: App) {
	defModal = new DefinitionModal(app);
	return defModal;
}

export function getDefinitionModal() {
	return defModal;
}
