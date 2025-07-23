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
		// Skip file explorer decoration if it's causing issues
		// This is a non-critical feature that adds visual tags to files
		try {
			// Quick check if we can access the file explorer safely
			if (!this.app.workspace || !this.app.workspace.layoutReady) {
				// Workspace not ready, skip silently
				return;
			}

			const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
			if (fileExplorerLeaves.length === 0) {
				// No file explorer view available, skip silently
				return;
			}

			const fileExplorer = fileExplorerLeaves[0];
			if (!fileExplorer.view) {
				// View not loaded, skip silently
				return;
			}

			// Try to execute safely without retries
			this.exec();
		} catch (e) {
			// File explorer decoration is non-critical, fail silently
			// This prevents console errors while maintaining core functionality
		}
	}

	private exec(): boolean {
		try {
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
		} catch (error) {
			// Fail silently to prevent console errors
			return false;
		}
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
