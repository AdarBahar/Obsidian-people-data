import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import { PersonMetadata } from "src/core/model";
import { getDefFileManager } from "src/core/def-file-manager";
import { getSettings } from "src/settings";

export interface AutoCompletionSuggestion {
	person: PersonMetadata;
	displayText: string;
	insertText: string;
	mentionCount: number;
	score: number;
}

export class NameAutoCompletion extends EditorSuggest<AutoCompletionSuggestion> {
	app: App; // Make public to match base class
	private triggerPattern: string;
	private minQueryLength: number;

	constructor(app: App) {
		super(app);
		this.app = app;
		this.triggerPattern = "@name:"; // Default trigger pattern
		this.minQueryLength = 1;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
		try {
			const settings = getSettings();

			// Check if auto-completion is enabled
			if (settings.autoCompletionConfig?.enabled === false) {
				return null;
			}

			this.triggerPattern = settings.autoCompletionConfig?.triggerPattern || "@name:";
			this.minQueryLength = settings.autoCompletionConfig?.minQueryLength || 1;

			const line = editor.getLine(cursor.line);
			const textBeforeCursor = line.substring(0, cursor.ch);

			// Find the last occurrence of the trigger pattern
			const triggerIndex = textBeforeCursor.lastIndexOf(this.triggerPattern);

			if (triggerIndex === -1) {
				return null;
			}

			// Check if there's any non-whitespace character between trigger and cursor
			const afterTrigger = textBeforeCursor.substring(triggerIndex + this.triggerPattern.length);
			if (afterTrigger.includes(' ') || afterTrigger.includes('\n')) {
				return null;
			}

			const query = afterTrigger;

			// Only trigger if we have minimum query length or if just triggered
			if (query.length < this.minQueryLength && query.length > 0) {
				return null;
			}

			return {
				start: { line: cursor.line, ch: triggerIndex },
				end: cursor,
				query: query
			};
		} catch (error) {
			console.warn("Error in auto-completion trigger:", error);
			return null;
		}
	}

	getSuggestions(context: EditorSuggestContext): AutoCompletionSuggestion[] {
		try {
			const defManager = getDefFileManager();
			if (!defManager) {
				return [];
			}

			const query = context.query.toLowerCase().trim();
			const allPeople = this.getAllPeople();
			
			if (allPeople.length === 0) {
				return [];
			}

			// Filter and score suggestions
			const settings = getSettings();
			const maxSuggestions = settings.autoCompletionConfig?.maxSuggestions || 10;

			const suggestions = allPeople
				.map(person => this.createSuggestion(person, query))
				.filter(suggestion => suggestion.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, maxSuggestions);

			return suggestions;
		} catch (error) {
			console.warn("Error getting auto-completion suggestions:", error);
			return [];
		}
	}

	renderSuggestion(suggestion: AutoCompletionSuggestion, el: HTMLElement): void {
		try {
			const settings = getSettings();
			const config = settings.autoCompletionConfig;

			el.empty();
			el.addClass("people-metadata-autocomplete-suggestion");

			// Set minimum dimensions
			el.style.minWidth = "350px";
			el.style.minHeight = "60px";
			el.style.padding = "12px 16px";
			el.style.display = "flex";
			el.style.alignItems = "center";

			// Main container
			const container = el.createDiv({ cls: "suggestion-container" });
			container.style.width = "100%";

			// Name and company line
			const nameRow = container.createDiv({ cls: "suggestion-name-row" });

			const nameEl = nameRow.createSpan({
				text: suggestion.person.fullName,
				cls: "suggestion-name"
			});
			nameEl.style.fontSize = "16px";
			nameEl.style.fontWeight = "600";

			if (suggestion.person.companyName && config?.showCompanyInfo !== false) {
				const companyEl = nameRow.createSpan({
					text: ` @ ${suggestion.person.companyName}`,
					cls: "suggestion-company"
				});
				companyEl.style.fontSize = "14px";
				companyEl.style.color = "var(--text-muted)";
			}

			// Details line
			const detailsRow = container.createDiv({ cls: "suggestion-details-row" });
			detailsRow.style.marginTop = "4px";

			if (suggestion.person.position && config?.showPositionInfo !== false) {
				const positionEl = detailsRow.createSpan({
					text: suggestion.person.position,
					cls: "suggestion-position"
				});
				positionEl.style.fontSize = "13px";
				positionEl.style.fontStyle = "italic";
				positionEl.style.color = "var(--text-muted)";
			}

			// Mention count (placeholder for now)
			const mockMentionCount = Math.floor(Math.random() * 10) + 1; // Mock data for demo
			if (config?.showMentionCounts !== false) {
				const mentionEl = detailsRow.createSpan({
					text: `${mockMentionCount} mentions`,
					cls: "suggestion-mentions"
				});
				mentionEl.style.fontSize = "12px";
				mentionEl.style.color = "var(--text-accent)";
				mentionEl.style.backgroundColor = "var(--background-modifier-border)";
				mentionEl.style.padding = "2px 6px";
				mentionEl.style.borderRadius = "4px";
				mentionEl.style.marginLeft = "8px";
			}

			// Score indicator (for debugging)
			if (suggestion.score > 0) {
				const scoreEl = detailsRow.createSpan({
					text: `(${suggestion.score.toFixed(1)})`,
					cls: "suggestion-score"
				});
				scoreEl.style.fontSize = "11px";
				scoreEl.style.color = "var(--text-faint)";
				scoreEl.style.marginLeft = "auto";
			}
		} catch (error) {
			console.warn("Error rendering auto-completion suggestion:", error);
			el.setText(suggestion.person.fullName);
			el.style.padding = "12px 16px";
			el.style.fontSize = "16px";
		}
	}

	selectSuggestion(suggestion: AutoCompletionSuggestion, evt: MouseEvent | KeyboardEvent): void {
		try {
			const editor = this.context?.editor;
			if (!editor || !this.context) {
				return;
			}

			// Replace the trigger pattern and query with the selected name
			const start = this.context.start;
			const end = this.context.end;
			
			editor.replaceRange(suggestion.insertText, start, end);
			
			// Position cursor after the inserted text
			const newCursor = {
				line: start.line,
				ch: start.ch + suggestion.insertText.length
			};
			editor.setCursor(newCursor);

			// Update mention count
			this.updateMentionCount(suggestion.person);
		} catch (error) {
			console.warn("Error selecting auto-completion suggestion:", error);
		}
	}

	private getAllPeople(): PersonMetadata[] {
		try {
			const defManager = getDefFileManager();
			if (!defManager) {
				return [];
			}

			// Use the new getAllPeople method
			const people = defManager.getAllPeople();

			// Remove duplicates based on full name and company
			const uniquePeople = people.filter((person, index, array) => {
				return array.findIndex(p =>
					p.fullName === person.fullName &&
					p.companyName === person.companyName
				) === index;
			});

			return uniquePeople;
		} catch (error) {
			console.warn("Error getting all people:", error);
			return [];
		}
	}

	private createSuggestion(person: PersonMetadata, query: string): AutoCompletionSuggestion {
		const score = this.calculateScore(person, query);
		const mentionCount = this.getMentionCount(person);
		
		return {
			person,
			displayText: this.getDisplayText(person),
			insertText: this.getInsertText(person),
			mentionCount,
			score
		};
	}

	private calculateScore(person: PersonMetadata, query: string): number {
		if (!query) {
			return 1; // Show all people when no query
		}

		const fullName = person.fullName.toLowerCase();
		const company = (person.companyName || "").toLowerCase();
		const position = (person.position || "").toLowerCase();
		
		let score = 0;

		// Exact name match gets highest score
		if (fullName === query) {
			score += 100;
		}
		// Name starts with query
		else if (fullName.startsWith(query)) {
			score += 50;
		}
		// Name contains query
		else if (fullName.includes(query)) {
			score += 25;
		}
		// Company matches
		else if (company.includes(query)) {
			score += 15;
		}
		// Position matches
		else if (position.includes(query)) {
			score += 10;
		}

		// Boost score based on mention count
		const mentionCount = this.getMentionCount(person);
		score += Math.min(mentionCount * 2, 20); // Max 20 points from mentions

		return score;
	}

	private getDisplayText(person: PersonMetadata): string {
		let display = person.fullName;
		if (person.companyName) {
			display += ` @ ${person.companyName}`;
		}
		if (person.position) {
			display += ` (${person.position})`;
		}
		return display;
	}

	private getInsertText(person: PersonMetadata): string {
		// Insert just the name, formatted for linking
		return `[[${person.fullName}]]`;
	}

	private getMentionCount(person: PersonMetadata): number {
		// TODO: Implement mention counting by searching through vault
		// For now, return a placeholder
		return 0;
	}

	private updateMentionCount(person: PersonMetadata): void {
		// TODO: Implement mention count tracking
		// This could update a cache or database of mention counts
	}
}

let nameAutoCompletion: NameAutoCompletion;

export function initNameAutoCompletion(app: App): NameAutoCompletion {
	nameAutoCompletion = new NameAutoCompletion(app);
	return nameAutoCompletion;
}

export function getNameAutoCompletion(): NameAutoCompletion {
	return nameAutoCompletion;
}
