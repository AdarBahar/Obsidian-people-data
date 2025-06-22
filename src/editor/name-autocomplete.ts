import { 
    App, 
    Editor, 
    EditorPosition, 
    EditorSuggest, 
    EditorSuggestContext, 
    EditorSuggestTriggerInfo, 
    TFile 
} from 'obsidian';
import { getDefFileManager } from '../core/def-file-manager';
import { PersonMetadata } from '../core/model';
import { getSettings } from '../settings';

interface NameSuggestion {
    person: PersonMetadata;
    displayText: string;
    insertText: string;
}

/**
 * Name Auto-completion EditorSuggest
 * Provides intelligent name suggestions when triggered with a specific pattern
 */
export class NameAutocompleteSuggest extends EditorSuggest<NameSuggestion> {
    private defaultTrigger = '@name:';
    private triggerPattern: string;

    constructor(app: App) {
        super(app);
        this.updateTriggerPattern();
    }

    /**
     * Update the trigger pattern from settings
     */
    updateTriggerPattern(): void {
        const settings = getSettings();
        // Use custom trigger from settings if available, otherwise use default
        this.triggerPattern = settings.nameAutocompleteTrigger || this.defaultTrigger;
    }

    /**
     * Detect when the trigger pattern is typed and extract query
     */
    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        // Get the current line up to cursor position
        const line = editor.getLine(cursor.line);
        const textBeforeCursor = line.substring(0, cursor.ch);

        // Find the last occurrence of our trigger pattern
        const triggerIndex = textBeforeCursor.lastIndexOf(this.triggerPattern);
        
        if (triggerIndex === -1) {
            return null; // Trigger pattern not found
        }

        // Extract the query text after the trigger
        const queryStart = triggerIndex + this.triggerPattern.length;
        const query = textBeforeCursor.substring(queryStart);

        // Only trigger if we have a reasonable query (allow empty for showing all)
        if (query.length > 50) {
            return null; // Query too long, probably not intentional
        }

        return {
            start: {
                line: cursor.line,
                ch: triggerIndex
            },
            end: cursor,
            query: query.trim()
        };
    }

    /**
     * Get name suggestions based on the query
     */
    getSuggestions(context: EditorSuggestContext): NameSuggestion[] | Promise<NameSuggestion[]> {
        const defManager = getDefFileManager();
        const query = context.query.toLowerCase().trim();
        
        let people: PersonMetadata[] = [];

        if (query.length === 0) {
            // Show recent or popular names when no query
            people = this.getRecentOrPopularPeople(10);
        } else {
            // Use optimized search engine for prefix matching
            if (defManager.useOptimizedSearch) {
                people = defManager.optimizedSearchEngine.findByPrefix(query, 15);
            } else {
                // Fallback to basic search
                people = this.basicNameSearch(query, 15);
            }
        }

        // Convert to suggestions with rich display information
        return people.map(person => this.createNameSuggestion(person));
    }

    /**
     * Get recent or popular people for empty query
     */
    private getRecentOrPopularPeople(limit: number): PersonMetadata[] {
        const defManager = getDefFileManager();
        const allPeople: PersonMetadata[] = [];
        
        // Get all people from the definition manager
        const repo = defManager.getDefRepo();
        for (const [_, people] of repo.fileDefMap) {
            for (const [_, person] of people) {
                allPeople.push(person);
            }
        }

        // Sort by mention counts (if available) or alphabetically
        allPeople.sort((a, b) => {
            const aMentions = a.mentionCounts?.totalMentions || 0;
            const bMentions = b.mentionCounts?.totalMentions || 0;
            
            if (aMentions !== bMentions) {
                return bMentions - aMentions; // Higher mentions first
            }
            
            return a.fullName.localeCompare(b.fullName); // Alphabetical fallback
        });

        return allPeople.slice(0, limit);
    }

    /**
     * Basic name search fallback when optimized search is not available
     */
    private basicNameSearch(query: string, limit: number): PersonMetadata[] {
        const defManager = getDefFileManager();
        const results: PersonMetadata[] = [];
        const queryLower = query.toLowerCase();
        
        const repo = defManager.getDefRepo();
        for (const [_, people] of repo.fileDefMap) {
            for (const [_, person] of people) {
                if (person.fullName.toLowerCase().includes(queryLower)) {
                    results.push(person);
                    if (results.length >= limit) {
                        return results;
                    }
                }
            }
        }
        
        return results;
    }

    /**
     * Create a name suggestion with rich display information
     */
    private createNameSuggestion(person: PersonMetadata): NameSuggestion {
        let displayText = person.fullName;
        
        // Add company and position info if available
        const details: string[] = [];
        if (person.companyName) {
            details.push(person.companyName);
        }
        if (person.position) {
            details.push(person.position);
        }
        
        if (details.length > 0) {
            displayText += ` (${details.join(', ')})`;
        }

        // Add mention count if available
        if (person.mentionCounts?.totalMentions) {
            displayText += ` [${person.mentionCounts.totalMentions} mentions]`;
        }

        return {
            person,
            displayText,
            insertText: person.fullName
        };
    }

    /**
     * Render the suggestion in the popup
     */
    renderSuggestion(suggestion: NameSuggestion, el: HTMLElement): void {
        el.addClass('name-autocomplete-suggestion');
        
        // Create main container
        const container = el.createDiv('name-suggestion-container');
        
        // Name (primary text)
        const nameEl = container.createDiv('name-suggestion-name');
        nameEl.textContent = suggestion.person.fullName;
        
        // Company and position (secondary text)
        const detailsEl = container.createDiv('name-suggestion-details');
        const details: string[] = [];
        
        if (suggestion.person.companyName) {
            details.push(suggestion.person.companyName);
        }
        if (suggestion.person.position) {
            details.push(suggestion.person.position);
        }
        
        if (details.length > 0) {
            detailsEl.textContent = details.join(' • ');
        }
        
        // Mention count (if available)
        if (suggestion.person.mentionCounts?.totalMentions) {
            const mentionEl = container.createDiv('name-suggestion-mentions');
            mentionEl.textContent = `${suggestion.person.mentionCounts.totalMentions} mentions`;
        }
        
        // Company color indicator (if available)
        if (suggestion.person.companyColor) {
            const colorIndicator = container.createDiv('name-suggestion-color-indicator');
            colorIndicator.style.backgroundColor = suggestion.person.companyColor;
        }
    }

    /**
     * Handle suggestion selection
     */
    selectSuggestion(suggestion: NameSuggestion, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) {
            return;
        }

        const { start, end } = this.context;

        // Replace the trigger pattern and query with just the person's name
        this.context.editor.replaceRange(
            suggestion.insertText,
            start,
            end
        );

        // Position cursor after the inserted name
        const newCursorPos = {
            line: start.line,
            ch: start.ch + suggestion.insertText.length
        };
        this.context.editor.setCursor(newCursorPos);
    }
}
