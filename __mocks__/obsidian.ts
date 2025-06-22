
export class App { }

export class TFile {}

export class PluginSettingTab {}

export class EditorSuggest<T> {
    context: any = null;

    constructor(app: App) {}

    onTrigger(cursor: any, editor: any, file: any): any {
        return null;
    }

    getSuggestions(context: any): T[] | Promise<T[]> {
        return [];
    }

    renderSuggestion(suggestion: T, el: HTMLElement): void {}

    selectSuggestion(suggestion: T, evt: MouseEvent | KeyboardEvent): void {}
}
