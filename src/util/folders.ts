import { App, normalizePath, TFolder } from "obsidian";

// Makes the folder and the parent folders that do not exist.
// Returns false if the path is empty, or if a file (not a folder) uses a part of the path.
export async function ensureFolder(app: App, path: string): Promise<boolean> {
	const target = normalizePath(path);
	if (!target || target === "/") {
		return false;
	}

	let current = "";
	for (const part of target.split("/")) {
		current = current ? `${current}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(current);
		if (existing) {
			if (!(existing instanceof TFolder)) {
				return false;
			}
			continue;
		}
		try {
			await app.vault.createFolder(current);
		} catch (e) {
			// Another action can make the same folder at the same time
			if (!(app.vault.getAbstractFileByPath(current) instanceof TFolder)) {
				throw e;
			}
		}
	}
	return true;
}
