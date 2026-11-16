// Minimal stubs of the Obsidian API for unit tests.
// Only classes and functions used at module load time or in tests are needed.

export class App { }

export class TAbstractFile { }

export class TFile extends TAbstractFile { }

export class TFolder extends TAbstractFile { }

export class Component {
	load() { }
	unload() { }
	addChild<T>(child: T): T { return child; }
	removeChild<T>(child: T): T { return child; }
	register(_cb: () => void) { }
}

export class Plugin extends Component { }

export class Modal { }

export class FuzzySuggestModal<T> { }

export class PluginSettingTab { }

export class Setting { }

export class Notice { }

export class MarkdownView { }

export const MarkdownRenderer = {
	render: async () => { },
};

export const Platform = {
	isMobile: false,
};

// Like Obsidian: one slash between parts, no slash at the start or the end, "/" for the root
export function normalizePath(path: string): string {
	const normalized = path.replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "");
	return normalized === "" ? "/" : normalized;
}

export function setTooltip() { }

export function parseYaml(_yaml: string): unknown {
	return {};
}
