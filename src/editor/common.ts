import { Platform } from "obsidian";
import { getSettings, PopoverEventSettings } from "src/settings";
import { DefinitionPreviewService } from "src/core/definition-preview-service";

const previewService = DefinitionPreviewService.getInstance();
const triggerFunc = previewService.getTriggerFunctionString();
const leaveFunc = previewService.getCloseFunctionString();

export const DEF_DECORATION_CLS = "people-metadata-def-decoration";

// For normal decoration of people
export function getDecorationAttrs(phrase: string, companyName?: string): { [key: string]: string } {
	let attributes: { [key: string]: string } = {
		def: phrase,
	}
	const settings = getSettings();
	if (Platform.isMobile) {
		attributes.onclick = triggerFunc;
		return attributes;
	}
	if (settings.popoverEvent === PopoverEventSettings.Click) {
		attributes.onclick = triggerFunc;
	} else {
		attributes.onmouseenter = triggerFunc;
		attributes.onmouseleave = leaveFunc;
	}
	if (!settings.enableSpellcheck) {
		attributes.spellcheck = "false";
	}
	
	// Add company data attribute for CSS targeting
	if (companyName) {
		const safeName = companyName.replace(/[^a-zA-Z0-9-_]/g, '-');
		attributes['data-company'] = safeName;
	}
	
	return attributes;
}

