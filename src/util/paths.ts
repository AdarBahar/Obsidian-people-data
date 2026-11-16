// Returns true if `path` is the folder itself or is inside the folder.
// A plain startsWith() check also matches "people-archive/" for the folder "people".
export function isPathInFolder(path: string, folder: string): boolean {
	const normalizedFolder = folder.replace(/\/+$/, "");
	if (!normalizedFolder) {
		return false;
	}
	return path === normalizedFolder || path.startsWith(normalizedFolder + "/");
}

// Returns the new path of `folder` after `oldPath` was renamed to `newPath`,
// or null if the rename does not affect the folder.
// This also covers the rename of a parent folder.
export function renamedFolderPath(folder: string, oldPath: string, newPath: string): string | null {
	const normalizedFolder = folder.replace(/\/+$/, "");
	if (!isPathInFolder(normalizedFolder, oldPath)) {
		return null;
	}
	return newPath + normalizedFolder.slice(oldPath.replace(/\/+$/, "").length);
}
