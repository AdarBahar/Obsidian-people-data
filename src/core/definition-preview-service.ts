import { Platform } from "obsidian";
import { getDefFileManager } from "./def-file-manager";
import { getDefinitionPopover } from "../editor/definition-popover";
import { getDefinitionModal } from "../editor/mobile/definition-modal";
import { getSettings, PopoverEventSettings } from "../settings";

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

		const defManager = getDefFileManager();
		const allMatches = defManager.getAll(word);
		if (!allMatches || allMatches.length === 0) return;

		const settings = getSettings();

		if (Platform.isMobile) {
			const defModal = getDefinitionModal();
			if (allMatches.length === 1) {
				defModal.open(allMatches[0]);
			} else {
				defModal.openMultiple(allMatches);
			}
			return;
		}

		const defPopover = getDefinitionPopover();

		// For click trigger, check if popover is already open and toggle
		if (settings.popoverEvent === PopoverEventSettings.Click) {
			const existingPopover = defPopover.getPopoverElement();
			if (existingPopover) {
				// Popover is open, close it
				defPopover.close();
				return;
			}
		}

		const rect = el.getBoundingClientRect();
		const coords = {
			left: rect.left,
			right: rect.right,
			top: rect.top,
			bottom: rect.bottom
		};

		if (allMatches.length === 1) {
			defPopover.openAtCoords(allMatches[0], coords, el);
		} else {
			defPopover.openMultipleAtCoords(allMatches, coords, el);
		}
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
