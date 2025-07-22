import { Platform } from "obsidian";
import { getDefFileManager } from "./def-file-manager";
import { getDefinitionPopover } from "../editor/definition-popover";
import { getDefinitionModal } from "../editor/mobile/definition-modal";

/**
 * Service for handling definition previews.
 * Replaces the global triggerDefPreview and closeDefPreview functions.
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

	/**
	 * Trigger definition preview for an element.
	 */
	public triggerDefPreview(el: HTMLElement): void {
		const word = el.getAttr('def');
		if (!word) return;

		const def = getDefFileManager().get(word);
		if (!def) return;

		if (Platform.isMobile) {
			const defModal = getDefinitionModal();
			defModal.open(def);
			return;
		}

		const defPopover = getDefinitionPopover();
		defPopover.openAtCoords(def, el.getBoundingClientRect());
	}

	/**
	 * Close definition preview.
	 */
	public closeDefPreview(): void {
		if (Platform.isMobile) {
			const defModal = getDefinitionModal();
			defModal.modal.close();
			return;
		}
		
		const defPopover = getDefinitionPopover();
		defPopover.close();
	}

	/**
	 * Get the trigger function as a string for HTML attributes.
	 */
	public getTriggerFunctionString(): string {
		return 'event.stopPropagation();window.peopleMetadataPlugin?.triggerDefPreview(this);';
	}

	/**
	 * Get the close function as a string for HTML attributes.
	 */
	public getCloseFunctionString(): string {
		return 'window.peopleMetadataPlugin?.closeDefPreview();';
	}

	/**
	 * Clean up the service.
	 */
	public static cleanup(): void {
		DefinitionPreviewService.instance = null;
	}
}
