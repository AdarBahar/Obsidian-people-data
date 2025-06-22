import { App, Platform } from "obsidian";
import { DefinitionRepo, getDefFileManager } from "./core/def-file-manager";
import { getDefinitionPopover } from "./editor/definition-popover";
import { getDefinitionModal } from "./editor/mobile/definition-modal";
import { getSettings, PopoverDismissType, Settings } from "./settings";
import { LogLevel } from "./util/log";

export {}

declare global {
	interface Window { NoteDefinition: GlobalVars; }
}

export interface GlobalVars {
	LOG_LEVEL: LogLevel;
	definitions: {
		global: DefinitionRepo;
	};
	triggerDefPreview: (el: HTMLElement) => void;
	closeDefPreview: () => void;
	delayedCloseDefPreview: () => void;
	settings: Settings;
	app: App;
}

// Initialise and inject globals
export function injectGlobals(settings: Settings, app: App, targetWindow: Window) {
	targetWindow.NoteDefinition = {
		app: app,
		LOG_LEVEL: activeWindow.NoteDefinition?.LOG_LEVEL || LogLevel.Error,
		definitions: {
			global: new DefinitionRepo(),
		},
		triggerDefPreview: (el: HTMLElement) => {
			const word = el.getAttr('def');
			if (!word) return;

			const allDefs = getDefFileManager().getAll(word);
			if (!allDefs || allDefs.length === 0) return;

			if (Platform.isMobile) {
				const defModal = getDefinitionModal();
				// For mobile, show the first match for now (could be enhanced later)
				defModal.open(allDefs[0]);
				return;
			}

			const defPopover = getDefinitionPopover();
			if (allDefs.length === 1) {
				// Single person, show normal tooltip
				defPopover.openAtCoords(allDefs[0], el.getBoundingClientRect());
			} else {
				// Multiple people with same name, show tabbed tooltip
				defPopover.openAtCoordsWithTabs(allDefs, el.getBoundingClientRect());
			}
		},
		closeDefPreview: () => {
			if (Platform.isMobile) {
				const defModal = getDefinitionModal();
				defModal.modal.close();
				return;
			}

			const defPopover = getDefinitionPopover();
			defPopover.close();
		},
		delayedCloseDefPreview: () => {
			if (Platform.isMobile) {
				const defModal = getDefinitionModal();
				defModal.modal.close();
				return;
			}

			const defPopover = getDefinitionPopover();
			defPopover.delayedClose();
		},
		settings,
	}
}
