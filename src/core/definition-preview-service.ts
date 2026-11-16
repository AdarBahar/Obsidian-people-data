import { Platform, Plugin } from "obsidian";
import { getDefFileManager } from "./def-file-manager";
import { getDefinitionPopover } from "../editor/definition-popover";
import { getDefinitionModal } from "../editor/mobile/definition-modal";
import { DEF_DECORATION_CLS } from "../editor/common";
import { getSettings, PopoverDismissType, PopoverEventSettings } from "../settings";

/**
 * Opens and closes person previews.
 * One set of document listeners handles all decorated names (event delegation),
 * so names need no inline handlers. Call attach() for each window document.
 */
export class DefinitionPreviewService {
	private static instance: DefinitionPreviewService | null = null;

	private constructor() {}

	public static getInstance(): DefinitionPreviewService {
		if (!DefinitionPreviewService.instance) {
			DefinitionPreviewService.instance = new DefinitionPreviewService();
		}
		return DefinitionPreviewService.instance;
	}

	// The plugin removes these listeners when it unloads
	public attach(plugin: Plugin, doc: Document): void {
		plugin.registerDomEvent(doc, "mouseover", evt => this.onMouseOver(evt));
		plugin.registerDomEvent(doc, "mouseout", evt => this.onMouseOut(evt));
		plugin.registerDomEvent(doc, "click", evt => this.onClick(evt));
	}

	/**
	 * Open the preview for a decorated name element.
	 */
	public triggerDefPreview(el: HTMLElement): void {
		const word = el.getAttr('def');
		if (!word) return;

		const def = getDefFileManager().get(word);
		if (!def) return;

		if (Platform.isMobile) {
			getDefinitionModal().open(def);
			return;
		}
		getDefinitionPopover().openAtElement(def, el);
	}

	public closeDefPreview(): void {
		if (Platform.isMobile) {
			getDefinitionModal().modal.close();
			return;
		}
		getDefinitionPopover().close();
	}

	private isHoverMode(): boolean {
		return !Platform.isMobile && getSettings().popoverEvent !== PopoverEventSettings.Click;
	}

	private onMouseOver(evt: MouseEvent) {
		if (!this.isHoverMode()) return;
		const el = findDecoration(evt.target);
		if (!el) return;
		const popover = getDefinitionPopover();
		if (popover.isOpenFor(el)) {
			popover.cancelScheduledClose();
			return;
		}
		this.triggerDefPreview(el);
	}

	private onMouseOut(evt: MouseEvent) {
		if (!this.isHoverMode()) return;
		if (getSettings().defPopoverConfig.popoverDismissEvent !== PopoverDismissType.MouseExit) return;
		const el = findDecoration(evt.target);
		if (!el) return;
		// Moves between child nodes of the same name are not an exit
		if (evt.relatedTarget && el.contains(evt.relatedTarget as Node)) return;
		const popover = getDefinitionPopover();
		if (popover.isOpenFor(el)) {
			// The delay lets the mouse move into the popover
			popover.scheduleClose();
		}
	}

	private onClick(evt: MouseEvent) {
		if (this.isHoverMode()) return;
		const el = findDecoration(evt.target);
		if (!el) return;
		this.triggerDefPreview(el);
	}

	public static cleanup(): void {
		DefinitionPreviewService.instance = null;
	}
}

// Does not use instanceof, because popout windows have their own Element class
function findDecoration(target: EventTarget | null): HTMLElement | null {
	const el = target as HTMLElement | null;
	if (!el || typeof el.closest !== "function") {
		return null;
	}
	return el.closest<HTMLElement>(`.${DEF_DECORATION_CLS}`);
}
