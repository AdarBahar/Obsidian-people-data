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

			const def = getDefFileManager().get(word);
			if (!def) return;

			if (Platform.isMobile) {
				const defModal = getDefinitionModal();
				defModal.open(def);
				return;
			}

			const defPopover = getDefinitionPopover();
			defPopover.openAtCoords(def, el.getBoundingClientRect());
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
		settings,
	}
}
