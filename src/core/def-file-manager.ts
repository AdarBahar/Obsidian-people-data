import { App, TFile, TFolder } from "obsidian";
import { PTreeNode } from "src/editor/prefix-tree";
import { DEFAULT_DEF_FOLDER } from "src/settings";
import { normaliseWord } from "src/util/text";
import { logWarn } from "src/util/log";
import { isPathInFolder } from "src/util/paths";
import { useRetry } from "src/util/retry";
import { FileParser } from "./file-parser";
import { DefFileType } from "./file-type";
import { PersonMetadata } from "./model";
import { PluginContext } from "./plugin-context";

let defFileManager: DefManager;

export const DEF_CTX_FM_KEY = "def-context";

export class DefManager {
	app: App;
	globalDefs: DefinitionRepo;
	globalDefFolders: Map<string, TFolder>;
	globalDefFiles: Map<string, TFile>;
	globalPrefixTree: PTreeNode;
	lastUpdate: number;

	markedDirty: TFile[];

	consolidatedDefFiles: Map<string, TFile>;

	activeFile: TFile | null;
	localPrefixTree: PTreeNode;
	shouldUseLocal: boolean;

	localDefs: DefinitionRepo;

	// Called after the set of people changes
	private changeListeners: (() => void)[] = [];

	constructor(app: App) {
		this.app = app;
		this.globalDefs = new DefinitionRepo();
		this.globalDefFiles = new Map<string, TFile>();
		this.globalDefFolders = new Map<string, TFolder>();
		this.globalPrefixTree = new PTreeNode();
		this.consolidatedDefFiles = new Map<string, TFile>();
		this.localDefs = new DefinitionRepo();

		this.resetLocalConfigs()
		this.lastUpdate = 0;
		this.markedDirty = [];

		this.loadDefinitions();
	}

	addDefFile(file: TFile) {
		this.globalDefFiles.set(file.path, file);
	}

	// Get the appropriate prefix tree to use for current active file
	getPrefixTree() {
		if (this.shouldUseLocal) {
			return this.localPrefixTree;
		}
		return this.globalPrefixTree;
	}

	// Updates active file and rebuilds local prefix tree if necessary
	updateActiveFile() {
		this.activeFile = this.app.workspace.getActiveFile();
		this.resetLocalConfigs();

		if (this.activeFile) {
			const metadataCache = this.app.metadataCache.getFileCache(this.activeFile);
			if (!metadataCache) {
				return;
			}
			const paths = metadataCache.frontmatter?.[DEF_CTX_FM_KEY];
			if (!paths) {
				// No def-source specified
				return;
			}
			if (!Array.isArray(paths)) {
				logWarn(`Unrecognised type for '${DEF_CTX_FM_KEY}' frontmatter`);
				return;
			}
			const flattenedPaths = this.flattenPathList(paths);
			this.buildLocalPrefixTree(flattenedPaths);
			this.buildLocalDefRepo(flattenedPaths);
			this.shouldUseLocal = true;
		}
	}

	// For manually updating definition sources, as metadata cache may not be the latest updated version
	updateDefSources(defSource: string[]) {
		this.resetLocalConfigs();

		if (!defSource || defSource.length === 0) {
			return;
		}
		this.buildLocalPrefixTree(defSource);
		this.buildLocalDefRepo(defSource);
		this.shouldUseLocal = true;
	}

	markDirty(file: TFile) {
		this.markedDirty.push(file);
	}

	private flattenPathList(paths: string[]): string[] {
		const filePaths: string[] = [];
		paths.forEach(path => {
			if (this.isFolderPath(path)) {
				filePaths.push(...this.flattenFolder(path));
			} else {
				filePaths.push(path);
			}
		})
		return filePaths;
	}

	// Given a folder path, return an array of file paths
	private flattenFolder(path: string): string[] {
		if (path.endsWith("/")) {
			path = path.slice(0, path.length - 1);
		}
		const folder = this.app.vault.getFolderByPath(path)
		if (!folder) {
			return [];
		}
		const childrenFiles = this.getChildrenFiles(folder);
		return childrenFiles.map(file => file.path);
	}

	private getChildrenFiles(folder: TFolder): TFile[] {
		const files: TFile[] = [];
		folder.children.forEach(abstractFile => {
			if (abstractFile instanceof TFolder) {
				files.push(...this.getChildrenFiles(abstractFile));
			} else if (abstractFile instanceof TFile) {
				files.push(abstractFile);
			}
		})
		return files;
	}

	private isFolderPath(path: string): boolean {
		return path.endsWith("/");
	}

	// Expects an array of file paths (not directories)
	private buildLocalPrefixTree(filePaths: string[]) {
		const root = new PTreeNode();
		filePaths.forEach(filePath => {
			const defMap = this.globalDefs.getMapForFile(filePath);
			if (!defMap) {
				logWarn(`Unrecognised file path '${filePath}'`)
				return;
			}
			[...defMap.keys()].forEach(key => {
				root.add(key, 0);
			});
		});
		this.localPrefixTree = root;
	}

	// Expects an array of file paths (not directories)
	private buildLocalDefRepo(filePaths: string[]) {
		filePaths.forEach(filePath => {
			const defMap = this.globalDefs.getMapForFile(filePath);
			if (defMap) {
				this.localDefs.fileDefMap.set(filePath, defMap);
			}
		});
	}

	isDefFile(file: TFile): boolean {
		return this.isDefPath(file.path);
	}

	isDefPath(path: string): boolean {
		return isPathInFolder(path, this.getGlobalDefFolder());
	}

	onChange(listener: () => void) {
		this.changeListeners.push(listener);
	}

	private notifyChange() {
		this.changeListeners.forEach(listener => listener());
	}

	reset() {
		this.globalPrefixTree = new PTreeNode();
		this.globalDefs.clear();
		this.globalDefFiles = new Map<string, TFile>();
		this.globalDefFolders = new Map<string, TFolder>();
		this.consolidatedDefFiles = new Map<string, TFile>();
		this.markedDirty = [];
	}

	// Forget the people of a file that was deleted or moved out of the people folder
	removeFile(path: string) {
		const known = this.globalDefFiles.delete(path);
		this.consolidatedDefFiles.delete(path);
		this.globalDefs.removeFile(path);
		this.markedDirty = this.markedDirty.filter(file => file.path !== path);
		if (known) {
			this.buildPrefixTree();
			this.updateActiveFile();
			this.notifyChange();
		}
	}

	// Follow a rename or move of a file
	async renameFile(file: TFile, oldPath: string) {
		this.removeFile(oldPath);
		if (this.isDefFile(file) && file.extension === "md") {
			this.addDefFile(file);
			this.markDirty(file);
			await this.loadUpdatedFiles();
		}
	}

	// Load all people from registered people folder
	// This will recurse through the people folder, parsing all people files
	// Expensive operation so use sparingly
	async loadDefinitions() {
		this.reset();
		await this.loadGlobals();
		this.updateActiveFile();
		this.notifyChange();
	}

	private getDefRepo() {
		return this.shouldUseLocal ? this.localDefs : this.globalDefs;
	}

	get(key: string) {
		return this.getDefRepo().get(normaliseWord(key));
	}

	set(metadata: PersonMetadata) {
		this.globalDefs.set(metadata);
	}

	getDefFiles(): TFile[] {
		return [...this.globalDefFiles.values()];
	}

	getConsolidatedDefFiles(): TFile[] {
		return [...this.consolidatedDefFiles.values()];
	}

	getDefFolders(): TFolder[] {
		return [...this.globalDefFolders.values()];
	}

	// Parse only the files that changed since the last load
	async loadUpdatedFiles() {
		const dirty = new Map<string, TFile>();
		this.markedDirty.forEach(file => dirty.set(file.path, file));
		this.globalDefFiles.forEach(file => {
			if (file.stat.mtime > this.lastUpdate) {
				dirty.set(file.path, file);
			}
		});
		this.markedDirty = [];
		if (dirty.size === 0) {
			return;
		}
		// Take the time before parsing, so changes during the parse are not missed
		this.lastUpdate = Date.now();

		for (const file of dirty.values()) {
			const defs = await this.parseFile(file);
			// Keep the slot of the file in the map: the first file wins for duplicate names
			this.globalDefs.clearFile(file.path);
			defs.forEach(def => this.globalDefs.set(def));
		}

		this.buildPrefixTree();
		this.updateActiveFile();
		this.notifyChange();
	}

	// Global configs should always be used by default
	private resetLocalConfigs() {
		this.localPrefixTree = new PTreeNode();
		this.shouldUseLocal = false;
		this.localDefs.clear();
	}

	private async loadGlobals() {
		const retry = useRetry();
		let globalFolder: TFolder | null = null;
		// Retry is needed here as getFolderByPath may return null when being called on app startup
		await retry.exec(() => {
			globalFolder = this.app.vault.getFolderByPath(this.getGlobalDefFolder());
			if (!globalFolder) {
				retry.setShouldRetry();
			}
		});

		if (!globalFolder) {
			logWarn("Global people folder not found, unable to load global people");
			return
		}

		// Recursively load files within the global people folder
		const definitions = await this.parseFolder(globalFolder);
		definitions.forEach(def => {
			this.globalDefs.set(def);
		});

		this.buildPrefixTree();
		this.lastUpdate = Date.now();
	}

	private async buildPrefixTree() {
		const root = new PTreeNode();
		this.globalDefs.getAllKeys().forEach(key => {
			root.add(key, 0);
		});
		this.globalPrefixTree = root;
	}

	private async parseFolder(folder: TFolder): Promise<PersonMetadata[]> {
		this.globalDefFolders.set(folder.path, folder);
		const definitions: PersonMetadata[] = [];
		for (const f of folder.children) {
			if (f instanceof TFolder) {
				const defs = await this.parseFolder(f);
				definitions.push(...defs);
			} else if (f instanceof TFile && f.extension === "md") {
				const defs = await this.parseFile(f);
				definitions.push(...defs);
			}
		}
		return definitions;
	}

	private async parseFile(file: TFile): Promise<PersonMetadata[]> {
		this.globalDefFiles.set(file.path, file);
		const parser = new FileParser(this.app, file);
		const metadata = await parser.parseFile();
		if (parser.defFileType === DefFileType.Consolidated) {
			this.consolidatedDefFiles.set(file.path, file);
		}
		return metadata;
	}

	getGlobalDefFolder() {
		try {
			return PluginContext.getInstance().settings.defFolder || DEFAULT_DEF_FOLDER;
		} catch (e) {
			return DEFAULT_DEF_FOLDER;
		}
	}
}

export class DefinitionRepo {
	// file name -> {metadata-key -> metadata}
	fileDefMap: Map<string, Map<string, PersonMetadata>>;

	constructor() {
		this.fileDefMap = new Map<string, Map<string, PersonMetadata>>();
	}

	getMapForFile(filePath: string) {
		return this.fileDefMap.get(filePath);
	}

	get(key: string) {
		for (const defMap of this.fileDefMap.values()) {
			const def = defMap.get(key);
			if (def) {
				return def;
			}
		}
	}

	getAllKeys(): string[] {
		const keys: string[] = [];
		this.fileDefMap.forEach(defMap => {
			keys.push(...defMap.keys());
		})
		return keys;
	}

	set(metadata: PersonMetadata) {
		let defMap = this.fileDefMap.get(metadata.file.path);
		if (!defMap) {
			defMap = new Map<string, PersonMetadata>();
			this.fileDefMap.set(metadata.file.path, defMap);
		}
		// Use normalized fullName as the key for consistent lookup
		const normalizedKey = normaliseWord(metadata.fullName);
		// Prefer the first encounter over subsequent collisions
		if (defMap.has(normalizedKey)) {
			return;
		}
		defMap.set(normalizedKey, metadata);
	}

	// Remove the people of a file, but keep its position in the file order
	clearFile(filePath: string) {
		this.fileDefMap.get(filePath)?.clear();
	}

	removeFile(filePath: string) {
		this.fileDefMap.delete(filePath);
	}

	clear() {
		this.fileDefMap.clear();
	}
}

export function initDefFileManager(app: App): DefManager {
	defFileManager = new DefManager(app);
	return defFileManager;
}

export function getDefFileManager(): DefManager {
	return defFileManager;
}
