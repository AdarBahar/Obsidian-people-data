import { App } from "obsidian";
import { DEFAULT_DEF_FOLDER, getSettings } from "src/settings";
import { FileExplorerView } from "src/types/obsidian";
import { logError } from "src/util/log";

let fileExplorerDecoration: FileExplorerDecoration;

const MAX_RETRY = 3;
const RETRY_INTERVAL = 1000;
const TAG_CLASS = "people-metadata-file-tag";
const TAG_DATA_ATTR = "data-people-metadata-tag";

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => window.setTimeout(resolve, ms));
}

export class FileExplorerDecoration {
	app: App;
	retryCount: number;

	constructor(app: App) {
		this.app = app;
	}

	// Take note: May not be re-entrant
	async run() {
		this.retryCount = 0;

		// Handle deferred views properly - retry until view is available
		// Views in Obsidian can be deferred (not immediately loaded) especially during startup
		// We need to check if the view exists and is fully loaded before accessing its properties
		while (this.retryCount < MAX_RETRY) {
			try {
				const success = this.exec();
				if (success) {
					return;
				}
			} catch (e) {
				logError(`File explorer access attempt ${this.retryCount + 1} failed: ${e.message}`);
			}

			this.retryCount++;
			if (this.retryCount < MAX_RETRY) {
				await sleep(RETRY_INTERVAL);
			}
		}

		// Don't log error if workspace isn't ready yet - this is normal during startup
		if (this.app.workspace && this.app.workspace.layoutReady) {
			logError("Failed to access file explorer view after maximum retries");
		}
	}

	private exec(): boolean {
		// Check if workspace is ready
		if (!this.app.workspace) {
			return false;
		}

		// Get file explorer leaves
		const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');

		// Check if file explorer view exists
		if (fileExplorerLeaves.length === 0) {
			return false;
		}

		const fileExplorer = fileExplorerLeaves[0];

		// Check if the view is loaded (not deferred)
		if (!fileExplorer.view) {
			return false;
		}

		const fileExpView = fileExplorer.view as FileExplorerView;

		// Check if the view has the required properties
		if (!fileExpView.fileItems) {
			return false;
		}

		const settings = getSettings();
		const defFolder = settings.defFolder || DEFAULT_DEF_FOLDER;

		// If def folder is an invalid folder path, then do not add any tags
		if (!fileExpView.fileItems[defFolder]) {
			return true; // Still consider this successful, just no tagging needed
		}

		Object.keys(fileExpView.fileItems).forEach(k => {
			const fileItem = fileExpView.fileItems[k];

			// Clear previously added ones (if exist)
			const fileTags = fileItem.selfEl.querySelectorAll(`[${TAG_DATA_ATTR}]`);
			fileTags.forEach(fileTag => {
				fileTag.remove();
			});

			if (k.startsWith(defFolder)) {
				this.tagFile(fileExpView, k, "PEOPLE");
			}
		});

		return true; // Successfully completed
	}

	private tagFile(explorer: FileExplorerView, filePath: string, tagContent: string) {
		const el = explorer.fileItems[filePath];
		if (!el) {
			return;
		}

		// Remove any existing people metadata tags
		const existingTags = el.selfEl.querySelectorAll(`[${TAG_DATA_ATTR}]`);
		existingTags.forEach(tag => {
			tag.remove();
		});

		el.selfEl.createDiv({
			cls: `nav-file-tag ${TAG_CLASS}`,
			text: tagContent,
			attr: {
				[TAG_DATA_ATTR]: "true"
			}
		})
	}
}

export function initFileExplorerDecoration(app: App): FileExplorerDecoration {
	fileExplorerDecoration = new FileExplorerDecoration(app);
	return fileExplorerDecoration;
}

export function getFileExplorerDecoration(app: App): FileExplorerDecoration {
	if (fileExplorerDecoration) {
		return fileExplorerDecoration;
	}
	return initFileExplorerDecoration(app);
}
