
export class App {
    vault = new Vault();
    metadataCache = new MetadataCache();
    workspace = new Workspace();
}

export class TFile {
    path: string = "";
    basename: string = "";
    name: string = "";
    extension: string = "";
}

export class Vault {
    getMarkdownFiles = jest.fn(() => []);
    read = jest.fn(() => Promise.resolve(""));
    getAbstractFileByPath = jest.fn();
}

export class MetadataCache {
    getFileCache = jest.fn(() => null);
    getFirstLinkpathDest = jest.fn();
}

export class Workspace {
    getLeaf = jest.fn(() => ({ openFile: jest.fn() }));
}

export class Component {
    addChild = jest.fn();
    removeChild = jest.fn();
    register = jest.fn();
    registerEvent = jest.fn();
    unload = jest.fn();
}

export class Modal {
    app: App;
    titleEl = { setText: jest.fn() };
    contentEl = {
        createEl: jest.fn(() => ({
            setText: jest.fn(),
            createEl: jest.fn(),
            createDiv: jest.fn(),
            addEventListener: jest.fn()
        })),
        createDiv: jest.fn(() => ({
            createEl: jest.fn(),
            createDiv: jest.fn(),
            createSpan: jest.fn(),
            addEventListener: jest.fn(),
            removeChild: jest.fn()
        }))
    };

    constructor(app: App) {
        this.app = app;
    }

    open = jest.fn();
    close = jest.fn();
}

export class PluginSettingTab {
    app: App;
    plugin: any;
    containerEl = {
        empty: jest.fn(),
        createEl: jest.fn(),
        createDiv: jest.fn()
    };

    constructor(app: App, plugin: any) {
        this.app = app;
        this.plugin = plugin;
    }
}

export class Setting {
    constructor(containerEl: any) {}
    setName = jest.fn(() => this);
    setDesc = jest.fn(() => this);
    setHeading = jest.fn(() => this);
    addToggle = jest.fn(() => this);
    addSlider = jest.fn(() => this);
    addDropdown = jest.fn(() => this);
    addText = jest.fn(() => this);
    addButton = jest.fn(() => this);
    onChange = jest.fn(() => this);
}

export class Notice {
    constructor(message: string, timeout?: number) {}
}

export class Plugin {
    app: App;
    manifest: any;

    constructor(app: App, manifest: any) {
        this.app = app;
        this.manifest = manifest;
    }

    addCommand = jest.fn();
    addSettingTab = jest.fn();
    registerEvent = jest.fn();
    registerEditorSuggest = jest.fn();
    loadData = jest.fn(() => Promise.resolve({}));
    saveData = jest.fn(() => Promise.resolve());
}

export interface EditorPosition {
    line: number;
    ch: number;
}

export interface Editor {
    getLine: (line: number) => string;
    getCursor: () => EditorPosition;
    getRange: (from: EditorPosition, to: EditorPosition) => string;
    replaceRange: (replacement: string, from: EditorPosition, to?: EditorPosition) => void;
    posToOffset: (pos: EditorPosition) => number;
    offsetToPos: (offset: number) => EditorPosition;
}

export abstract class EditorSuggest<T> {
    constructor(app: App) {}

    abstract onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): any;
    abstract getSuggestions(context: any): Promise<T[]>;
    abstract renderSuggestion(suggestion: T, el: HTMLElement): void;
    abstract selectSuggestion(suggestion: T, evt: MouseEvent | KeyboardEvent): void;
}
