// Returns true if `path` is the folder itself or is inside the folder.
// A plain startsWith() check also matches "people-archive/" for the folder "people".
export function isPathInFolder(path: string, folder: string): boolean {
	const normalizedFolder = folder.replace(/\/+$/, "");
	if (!normalizedFolder) {
		return false;
	}
	return path === normalizedFolder || path.startsWith(normalizedFolder + "/");
}
