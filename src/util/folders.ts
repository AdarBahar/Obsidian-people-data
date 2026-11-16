import { App, normalizePath, TAbstractFile, TFolder } from "obsidian";

// The path of a file or folder inside `folder`. "/" is the vault root.
export function childPath(folder: string, name: string): string {
	return folder === "/" ? name : `${folder}/${name}`;
}

// Finds a child of `parent` by name. An exact match wins; otherwise the match ignores letter case,
// because the file systems of macOS and Windows ignore it too.
function findChild(parent: TFolder, name: string): TAbstractFile | null {
	const lower = name.toLowerCase();
	return parent.children.find(c => c.name === name) ??
		parent.children.find(c => c.name.toLowerCase() === lower) ?? null;
}

// Returns the folder at `path`, with the letter case ignored, or null.
export function findFolder(app: App, path: string): TFolder | null {
	const target = normalizePath(path);
	let folder: TFolder = app.vault.getRoot();
	if (target === "/") {
		return folder;
	}
	for (const part of target.split("/")) {
		const child = findChild(folder, part);
		if (!(child instanceof TFolder)) {
			return null;
		}
		folder = child;
	}
	return folder;
}

// Makes the folder and the parent folders that do not exist.
// Returns the real path of the folder ("/" for the vault root). The letter case of a folder
// that exists can be different from `path`.
// Returns null if a file (not a folder) uses a part of the path.
export async function ensureFolder(app: App, path: string): Promise<string | null> {
	const target = normalizePath(path);
	let folder: TFolder = app.vault.getRoot();
	if (target === "/") {
		return "/";
	}

	for (const part of target.split("/")) {
		const existing = findChild(folder, part);
		if (existing) {
			if (!(existing instanceof TFolder)) {
				return null;
			}
			folder = existing;
			continue;
		}
		const newPath = childPath(folder.path, part);
		try {
			await app.vault.createFolder(newPath);
		} catch (e) {
			// Another action can make the same folder at the same time
			if (!(app.vault.getAbstractFileByPath(newPath) instanceof TFolder)) {
				throw e;
			}
		}
		const created = app.vault.getAbstractFileByPath(newPath);
		if (!(created instanceof TFolder)) {
			return null;
		}
		folder = created;
	}
	return folder.path;
}
