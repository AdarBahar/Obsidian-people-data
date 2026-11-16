import { App, Component, Editor, Plugin } from "obsidian";
import { PersonMetadata } from "src/core/model";
import { getSettings, PopoverDismissType } from "src/settings";
import { logError } from "src/util/log";
import { renderPersonCard } from "./person-card";

export const POPOVER_CLS = "people-metadata-definition-popover";
// Time to move the mouse from a name into the popover before it closes
const MOUSE_EXIT_CLOSE_DELAY = 300;
const VIEWPORT_MARGIN = 8;

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "AltGraph", "CapsLock", "Fn", "OS"]);

// A key closes the popover, but a lone modifier key or a shortcut does not.
// Thus Cmd+C and Ctrl+C can copy the text in the popover.
export function isDismissKey(evt: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">): boolean {
	if (MODIFIER_KEYS.has(evt.key)) {
		return false;
	}
	return !(evt.metaKey || evt.ctrlKey);
}

let definitionPopover: DefinitionPopover;

export interface Coordinates {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

// The popover is placed on the body of the document that holds the name,
// with fixed position in viewport coordinates. This works in all panes and in popout windows.
export class DefinitionPopover {
	app: App;
	plugin: Plugin;
	// There is only one mounted popover at a time
	mountedPopover: HTMLElement | undefined;
	// The element that opened the popover (a decorated name), if any
	anchorEl: HTMLElement | undefined;

	private renderComponent: Component | undefined;
	private closeTimer: number | undefined;
	private removeListeners: (() => void)[] = [];

	constructor(plugin: Plugin) {
		this.app = plugin.app;
		this.plugin = plugin;
	}

	// Open below or above a decorated name
	openAtElement(person: PersonMetadata, anchorEl: HTMLElement) {
		this.open(person, anchorEl.getBoundingClientRect(), anchorEl.doc, anchorEl);
	}

	// Open at the cursor of an editor
	openAtCursor(person: PersonMetadata, editor: Editor) {
		// @ts-expect-error, cm is not in the public API
		const cm = editor.cm;
		const coords = cm?.coordsAtPos?.(editor.posToOffset(editor.getCursor()), -1) as Coordinates | null;
		if (!coords) {
			logError("Could not open person popover: no cursor coordinates");
			return;
		}
		const doc: Document = cm?.dom?.doc ?? activeDocument;
		this.open(person, coords, doc);
	}

	isOpenFor(el: HTMLElement): boolean {
		return !!this.mountedPopover && this.anchorEl === el;
	}

	close = () => {
		this.cancelScheduledClose();
		this.unmount();
	}

	scheduleClose(delay = MOUSE_EXIT_CLOSE_DELAY) {
		if (!this.mountedPopover) {
			return;
		}
		this.cancelScheduledClose();
		this.closeTimer = window.setTimeout(() => this.close(), delay);
	}

	cancelScheduledClose() {
		if (this.closeTimer !== undefined) {
			window.clearTimeout(this.closeTimer);
			this.closeTimer = undefined;
		}
	}

	cleanUp() {
		this.close();
	}

	private open(person: PersonMetadata, coords: Coordinates, doc: Document, anchorEl?: HTMLElement) {
		this.close();
		const popoverSettings = getSettings().defPopoverConfig;

		const el = doc.body.createDiv({ cls: POPOVER_CLS });
		if (popoverSettings.backgroundColour) {
			el.addClass("has-custom-background");
			el.style.setProperty('--custom-popover-background', popoverSettings.backgroundColour);
		}

		this.renderComponent = new Component();
		this.renderComponent.load();
		renderPersonCard(this.app, person, el, this.renderComponent, {
			headingTag: "h2",
			showFileName: popoverSettings.displayDefFileName,
		});
		this.postprocessLinks(el, person);

		this.mountedPopover = el;
		this.anchorEl = anchorEl;
		this.position(el, coords, doc);
		this.registerCloseListeners(el, doc, anchorEl);
	}

	private position(el: HTMLElement, coords: Coordinates, doc: Document) {
		const popoverSettings = getSettings().defPopoverConfig;
		const win = doc.defaultView ?? window;
		const viewportWidth = win.innerWidth;
		const viewportHeight = win.innerHeight;
		const custom = popoverSettings.enableCustomSize;

		const style: Partial<CSSStyleDeclaration> = {};
		style.maxWidth = custom && popoverSettings.maxWidth ?
			`${popoverSettings.maxWidth}px` :
			`${Math.min(600, Math.max(280, viewportWidth / 2 - VIEWPORT_MARGIN))}px`;

		if (coords.left > viewportWidth / 2) {
			style.right = `${Math.max(VIEWPORT_MARGIN, viewportWidth - coords.right)}px`;
		} else {
			style.left = `${Math.max(VIEWPORT_MARGIN, coords.left)}px`;
		}

		if (coords.top > viewportHeight / 2) {
			style.bottom = `${viewportHeight - coords.top}px`;
			style.maxHeight = custom && popoverSettings.maxHeight ?
				`${popoverSettings.maxHeight}px` : `${coords.top - VIEWPORT_MARGIN}px`;
		} else {
			style.top = `${coords.bottom}px`;
			style.maxHeight = custom && popoverSettings.maxHeight ?
				`${popoverSettings.maxHeight}px` : `${viewportHeight - coords.bottom - VIEWPORT_MARGIN}px`;
		}

		el.setCssStyles(style);
	}

	private registerCloseListeners(el: HTMLElement, doc: Document, anchorEl?: HTMLElement) {
		const listen = <K extends keyof DocumentEventMap>(type: K, fn: (evt: DocumentEventMap[K]) => void) => {
			doc.addEventListener(type, fn, true);
			this.removeListeners.push(() => doc.removeEventListener(type, fn, true));
		};
		// No instanceof checks: popout windows have their own Node class
		const isInside = (target: EventTarget | null) =>
			!!target && (el.contains(target as Node) || !!anchorEl?.contains(target as Node));

		listen("keydown", evt => {
			if (isDismissKey(evt)) {
				this.close();
			}
		});
		listen("mousedown", evt => {
			if (!isInside(evt.target)) {
				this.close();
			}
		});
		listen("scroll", evt => {
			// Scroll inside the popover is allowed
			if (!(evt.target && el.contains(evt.target as Node))) {
				this.close();
			}
		});

		const onEnter = () => this.cancelScheduledClose();
		const onLeave = () => {
			if (getSettings().defPopoverConfig.popoverDismissEvent === PopoverDismissType.MouseExit) {
				this.scheduleClose();
			}
		};
		el.addEventListener("mouseenter", onEnter);
		el.addEventListener("mouseleave", onLeave);
	}

	// Internal links do not work in the popover without this
	private postprocessLinks(el: HTMLElement, person: PersonMetadata) {
		el.addEventListener("click", evt => {
			const linkEl = (evt.target as HTMLElement | null)?.closest?.("a.internal-link");
			if (!linkEl) {
				return;
			}
			evt.preventDefault();
			const href = linkEl.getAttr("href") ?? "";
			this.close();
			this.app.workspace.openLinkText(href, person.file.path);
		});
	}

	private unmount() {
		this.removeListeners.forEach(remove => remove());
		this.removeListeners = [];
		this.renderComponent?.unload();
		this.renderComponent = undefined;
		this.mountedPopover?.remove();
		this.mountedPopover = undefined;
		this.anchorEl = undefined;
	}
}

export function initDefinitionPopover(plugin: Plugin) {
	if (definitionPopover) {
		definitionPopover.cleanUp();
	}
	definitionPopover = new DefinitionPopover(plugin);
}

export function getDefinitionPopover() {
	return definitionPopover;
}
