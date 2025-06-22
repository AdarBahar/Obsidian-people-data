import { App, Component, MarkdownRenderer, normalizePath, Modal } from "obsidian";
// import { Definition } from "src/core/model"; // Removed as it's no longer used
import { PersonMetadata } from "src/core/model";
import { getMentionCounter } from "src/core/mention-counter";
import { normaliseWord } from "src/util/editor";

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
		const headerEl = this.modal.contentEl.createEl("div", { cls: "modal-header" });
		headerEl.createEl("h1", { text: person.fullName, cls: "person-name" });

		// Company info on the right side of header
		if (person.companyName || person.companyLogo) {
			const companyEl = headerEl.createEl("div", { cls: "company-info" });
			if (person.companyLogo) {
				const logoEl = companyEl.createEl("div", { cls: "company-logo" });
				this.renderCompanyLogoWithFallback(person.companyLogo, logoEl, person);
			}
			if (person.companyName) {
				companyEl.createEl("div", { text: person.companyName, cls: "company-name" });
			}
		}

		// Person details (removed company field)
		const detailsEl = this.modal.contentEl.createEl("div", { cls: "person-details" });
		if (person.position) {
			detailsEl.createEl("div", { text: `Position: ${person.position}` });
		}
		if (person.department) {
			detailsEl.createEl("div", { text: `Department: ${person.department}` });
		}

		// Add mention counts
		this.addMentionCounts(detailsEl, person);

		// Notes content
		const notesContent = this.modal.contentEl.createEl("div", {
			cls: "person-notes",
			attr: {
				ctx: "person-popup"
			}
		});
		MarkdownRenderer.render(this.app, person.notes, notesContent,
			normalizePath(person.file.path) ?? '', this);
		this.modal.open();
	}

	/**
	 * Add mention counts to the person details section
	 * @param detailsEl The details container element
	 * @param person The person metadata
	 */
	private addMentionCounts(detailsEl: HTMLElement, person: PersonMetadata): void {
		try {
			const mentionCounter = getMentionCounter();
			const normalizedName = normaliseWord(person.fullName);
			const mentionCounts = mentionCounter.getMentionCounts(normalizedName);

			if (mentionCounts && mentionCounts.totalMentions > 0) {
				const mentionEl = detailsEl.createEl("div", { cls: "mention-counts" });

				// Create main mention count display
				const totalEl = mentionEl.createEl("span", {
					cls: "mention-total",
					text: `📝 ${mentionCounts.totalMentions} mention${mentionCounts.totalMentions !== 1 ? 's' : ''}`
				});

				// Add breakdown if there are both tasks and text mentions
				if (mentionCounts.taskMentions > 0 && mentionCounts.textMentions > 0) {
					const breakdownEl = mentionEl.createEl("span", { cls: "mention-breakdown" });
					breakdownEl.createEl("span", {
						cls: "mention-tasks",
						text: ` (✅ ${mentionCounts.taskMentions} task${mentionCounts.taskMentions !== 1 ? 's' : ''}`
					});
					breakdownEl.createEl("span", {
						cls: "mention-text",
						text: `, 💬 ${mentionCounts.textMentions} text)`
					});
				} else if (mentionCounts.taskMentions > 0) {
					mentionEl.createEl("span", {
						cls: "mention-tasks-only",
						text: ` (✅ tasks only)`
					});
				} else if (mentionCounts.textMentions > 0) {
					mentionEl.createEl("span", {
						cls: "mention-text-only",
						text: ` (💬 text only)`
					});
				}
			}
		} catch (error) {
			// Silently fail if mention counter is not available
			// This prevents errors during initialization
		}
	}

	private renderCompanyLogoWithFallback(logoMarkdown: string, logoEl: HTMLElement, person: PersonMetadata) {
		// First try to render the original logo
		MarkdownRenderer.render(this.app, logoMarkdown, logoEl,
			normalizePath(person.file.path), this);

		// Set up error handling for failed images
		setTimeout(() => {
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
		const defaultLogo = logoEl.createEl("div", {
			cls: "company-logo-default",
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
