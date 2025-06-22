import { App, TFile, TFolder } from "obsidian";
import { PTreeNode } from "src/editor/prefix-tree";
import { OptimizedPrefixTree } from "./optimized-prefix-tree";
import { OptimizedSearchEngine } from "./optimized-search-engine";
import { OptimizedLineScanner, OptimizedScannerFactory } from "./optimized-line-scanner";
import { DEFAULT_DEF_FOLDER } from "src/settings";
import { normaliseWord } from "src/util/editor";
import { logWarn, logInfo } from "src/util/log";
import { useRetry } from "src/util/retry";
import { FileParser } from "./file-parser";
import { DefFileType } from "./file-type";
import { PersonMetadata } from "./model";

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

	// Optimized search components
	optimizedSearchEngine: OptimizedSearchEngine;
	optimizedPrefixTree: OptimizedPrefixTree;
	optimizedScanner: OptimizedLineScanner;
	useOptimizedSearch: boolean = true;

	constructor(app: App) {
		this.app = app;
		this.globalDefs = new DefinitionRepo();
		this.globalDefFiles = new Map<string, TFile>();
		this.globalDefFolders = new Map<string, TFolder>();
		this.globalPrefixTree = new PTreeNode();
		this.consolidatedDefFiles = new Map<string, TFile>();
		this.localDefs = new DefinitionRepo();

		// Initialize optimized search components
		this.optimizedSearchEngine = new OptimizedSearchEngine();
		this.optimizedPrefixTree = new OptimizedPrefixTree();
		this.optimizedScanner = OptimizedScannerFactory.getInstance()
			.createScanner(this.optimizedPrefixTree, this.optimizedSearchEngine, 'global');

		this.resetLocalConfigs()
		this.lastUpdate = 0;
		this.markedDirty = [];

		activeWindow.NoteDefinition.definitions.global = this.globalDefs;

		this.loadDefinitions();
	}

	addDefFile(file: TFile) {
		this.globalDefFiles.set(file.path, file);
	}

	// Get the appropriate prefix tree to use for current active file
	getPrefixTree(): PTreeNode {
		// Always return legacy prefix tree for compatibility
		if (this.shouldUseLocal) {
			return this.localPrefixTree;
		}
		return this.globalPrefixTree;
	}

	// Get the optimized search engine
	getOptimizedSearchEngine(): OptimizedSearchEngine {
		return this.optimizedSearchEngine;
	}

	// Get the optimized scanner
	getOptimizedScanner(): OptimizedLineScanner {
		return this.optimizedScanner;
	}

	// Toggle between optimized and legacy search
	setOptimizedSearch(enabled: boolean): void {
		this.useOptimizedSearch = enabled;
		logInfo(`Optimized search ${enabled ? 'enabled' : 'disabled'}`);
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
		return file.path.startsWith(this.getGlobalDefFolder())
	}

	reset() {
		this.globalPrefixTree = new PTreeNode();
		this.globalDefs.clear();
		this.globalDefFiles = new Map<string, TFile>();

		// Reset optimized components
		this.optimizedSearchEngine.clear();
		this.optimizedPrefixTree.clear();
		this.optimizedScanner.clearCache();
	}

	// Load all people from registered people folder
	// This will recurse through the people folder, parsing all people files
	// Expensive operation so use sparingly
	loadDefinitions() {
		this.reset();
		this.loadGlobals().then(this.updateActiveFile.bind(this));
	}

	get(key: string) {
		return this.getDefRepo().get(normaliseWord(key));
	}

	getAll(key: string): PersonMetadata[] {
		return this.getDefRepo().getAll(normaliseWord(key));
	}

	getPersonCompany(key: string): string | undefined {
		// Use optimized cache for O(1) company lookup
		const repo = this.getDefRepo();
		return repo.companyCache.get(normaliseWord(key));
	}

	getDefRepo() {
		return this.shouldUseLocal ? this.localDefs : this.globalDefs;
	}

	set(metadata: PersonMetadata) {
		this.globalDefs.set(metadata);

		// Also add to optimized search engine
		if (this.useOptimizedSearch) {
			this.optimizedSearchEngine.addPerson(metadata);
			// Add to optimized prefix tree as well
			const normalizedName = normaliseWord(metadata.fullName);
			this.optimizedPrefixTree.add(normalizedName);
		}
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

	async loadUpdatedFiles() {
		const definitions: PersonMetadata[] = [];
		const dirtyFiles: string[] = [];

		const files = [...this.globalDefFiles.values(), ...this.markedDirty];

		for (let file of files) {
			if (file.stat.mtime > this.lastUpdate) {
				dirtyFiles.push(file.path);
				const defs = await this.parseFile(file);
				definitions.push(...defs);
			}
		}

		dirtyFiles.forEach(file => {
			this.globalDefs.clearForFile(file);
		});

		if (definitions.length > 0) {
			definitions.forEach(def => {
				this.globalDefs.set(def);
			});
		}

		this.markedDirty = [];
		this.buildPrefixTree();
		this.lastUpdate = Date.now();
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
		const startTime = Date.now();

		// Build legacy prefix tree
		const root = new PTreeNode();
		this.globalDefs.getAllKeys().forEach(key => {
			root.add(key, 0);
		});
		this.globalPrefixTree = root;

		// Build optimized search system
		if (this.useOptimizedSearch) {
			logInfo("Building optimized search indexes...");

			// Clear existing indexes
			this.optimizedSearchEngine.clear();
			this.optimizedPrefixTree.clear();

			// Rebuild from current data
			const allPeople: PersonMetadata[] = [];
			for (const defMap of this.globalDefs.fileDefMap.values()) {
				for (const person of defMap.values()) {
					allPeople.push(person);
					this.optimizedSearchEngine.addPerson(person);
					this.optimizedPrefixTree.add(normaliseWord(person.fullName));
				}
			}

			// Also add all keys to prefix tree
			this.globalDefs.getAllKeys().forEach(key => {
				this.optimizedPrefixTree.add(key);
			});

			// Compress the trie for better performance
			this.optimizedPrefixTree.compress();

			const endTime = Date.now();
			const stats = this.optimizedPrefixTree.getStats();
			const engineStats = this.optimizedSearchEngine.getStats();
			logInfo(`Built optimized search system: ${allPeople.length} people, ${stats.totalWords} words, ${stats.totalNodes} nodes, ${endTime - startTime}ms`);
			logInfo(`Search engine: ${engineStats.totalPeople} people, ${engineStats.totalCompanies} companies`);
		}
	}

	private async parseFolder(folder: TFolder): Promise<PersonMetadata[]> {
		this.globalDefFolders.set(folder.path, folder);
		const definitions: PersonMetadata[] = [];
		for (let f of folder.children) {
			if (f instanceof TFolder) {
				let defs = await this.parseFolder(f);
				definitions.push(...defs);
			} else if (f instanceof TFile) {
				let defs = await this.parseFile(f);
				definitions.push(...defs);
			}
		}
		return definitions;
	}

	private async parseFile(file: TFile): Promise<PersonMetadata[]> {
		this.globalDefFiles.set(file.path, file);
		let parser = new FileParser(this.app, file);
		const metadata = await parser.parseFile();
		if (parser.defFileType === DefFileType.Consolidated) {
			this.consolidatedDefFiles.set(file.path, file);
		}
		return metadata;
	}

	getGlobalDefFolder() {
		return window.NoteDefinition.settings.defFolder || DEFAULT_DEF_FOLDER;
	}

	/**
	 * Get comprehensive performance statistics for the search system
	 */
	getPerformanceStats(): {
		legacy: {
			totalPeople: number;
			totalFiles: number;
			prefixTreeNodes: number;
		};
		optimized: {
			searchEngine: any;
			prefixTree: any;
			scanner: any;
		};
		comparison: {
			memoryUsage: string;
			searchSpeedImprovement: string;
		};
	} {
		const legacyStats = {
			totalPeople: this.globalDefs.getAllKeys().size,
			totalFiles: this.globalDefFiles.size,
			prefixTreeNodes: this.estimatePrefixTreeSize(this.globalPrefixTree)
		};

		const optimizedStats = {
			searchEngine: this.optimizedSearchEngine.getStats(),
			prefixTree: this.optimizedPrefixTree.getStats(),
			scanner: this.optimizedScanner.getPerformanceStats()
		};

		return {
			legacy: legacyStats,
			optimized: optimizedStats,
			comparison: {
				memoryUsage: this.calculateMemoryImprovement(legacyStats, optimizedStats),
				searchSpeedImprovement: this.calculateSpeedImprovement(optimizedStats)
			}
		};
	}

	/**
	 * Rebuild optimized indexes for better performance
	 */
	async rebuildOptimizedIndexes(): Promise<void> {
		if (!this.useOptimizedSearch) return;

		const startTime = Date.now();
		logInfo("Rebuilding optimized search indexes...");

		// Clear existing indexes
		this.optimizedSearchEngine.clear();
		this.optimizedPrefixTree.clear();

		// Rebuild from current data
		const allPeople: PersonMetadata[] = [];
		for (const defMap of this.globalDefs.fileDefMap.values()) {
			for (const person of defMap.values()) {
				allPeople.push(person);
				this.optimizedSearchEngine.addPerson(person);
				this.optimizedPrefixTree.add(normaliseWord(person.fullName));
			}
		}

		// Compress for optimal performance
		this.optimizedPrefixTree.compress();

		const endTime = Date.now();
		const stats = this.getPerformanceStats();
		logInfo(`Optimized indexes rebuilt in ${endTime - startTime}ms. Total people: ${allPeople.length}`);
	}

	// Private helper methods for performance analysis
	private estimatePrefixTreeSize(node: PTreeNode, depth: number = 0): number {
		let size = 1;
		if (node.children) {
			for (const child of node.children.values()) {
				size += this.estimatePrefixTreeSize(child, depth + 1);
			}
		}
		return size;
	}

	private calculateMemoryImprovement(legacyStats: any, optimizedStats: any): string {
		const legacyMemory = legacyStats.prefixTreeNodes * 100; // Rough estimate
		const optimizedMemory = optimizedStats.prefixTree.memoryEstimate;
		const improvement = ((legacyMemory - optimizedMemory) / legacyMemory * 100).toFixed(1);
		return `${improvement}% reduction`;
	}

	private calculateSpeedImprovement(optimizedStats: any): string {
		const cacheHitRate = optimizedStats.scanner.cacheHitRate * 100;
		const avgScanTime = optimizedStats.scanner.averageScanTime;
		return `${cacheHitRate.toFixed(1)}% cache hit rate, ${avgScanTime.toFixed(2)}ms avg scan time`;
	}
}

export class DefinitionRepo {
	// file name -> {metadata-key -> metadata}
	fileDefMap: Map<string, Map<string, PersonMetadata>>;
	// Optimized lookup: normalized name -> array of all people with that name
	nameIndex: Map<string, PersonMetadata[]>;
	// Company lookup cache: normalized name -> company name (for first match)
	companyCache: Map<string, string>;

	constructor() {
		this.fileDefMap = new Map<string, Map<string, PersonMetadata>>();
		this.nameIndex = new Map<string, PersonMetadata[]>();
		this.companyCache = new Map<string, string>();
	}

	getMapForFile(filePath: string) {
		return this.fileDefMap.get(filePath);
	}

	get(key: string): PersonMetadata | undefined {
		// Use optimized index for O(1) lookup instead of O(n) iteration
		const people = this.nameIndex.get(key);
		return people && people.length > 0 ? people[0] : undefined;
	}

	getAll(key: string): PersonMetadata[] {
		// Use optimized index for O(1) lookup
		return this.nameIndex.get(key) || [];
	}

	getAllKeys(): Set<string> {
		return new Set(this.nameIndex.keys());
	}

	set(metadata: PersonMetadata) {
		let defMap = this.fileDefMap.get(metadata.file.path);
		if (!defMap) {
			defMap = new Map<string, PersonMetadata>();
			this.fileDefMap.set(metadata.file.path, defMap);
		}

		const normalizedKey = normaliseWord(metadata.fullName);

		// Check if this exact person already exists in this file
		const existingPerson = defMap.get(normalizedKey);
		if (existingPerson && existingPerson.file.path === metadata.file.path) {
			return;
		}

		// Add to file map
		defMap.set(normalizedKey, metadata);

		// Update optimized indexes
		this.updateIndexes(normalizedKey, metadata);
	}

	private updateIndexes(normalizedKey: string, metadata: PersonMetadata) {
		// Update name index for fast lookups
		let peopleList = this.nameIndex.get(normalizedKey);
		if (!peopleList) {
			peopleList = [];
			this.nameIndex.set(normalizedKey, peopleList);
		}

		// Check if this person is already in the index (avoid duplicates)
		const existingIndex = peopleList.findIndex(p =>
			p.file.path === metadata.file.path &&
			normaliseWord(p.fullName) === normalizedKey
		);

		if (existingIndex === -1) {
			peopleList.push(metadata);

			// Sort by company name for consistent ordering in tabs
			peopleList.sort((a, b) => {
				const companyA = a.companyName || '';
				const companyB = b.companyName || '';
				return companyA.localeCompare(companyB);
			});
		} else {
			// Update existing entry
			peopleList[existingIndex] = metadata;
		}

		// Update company cache (for backward compatibility)
		if (!this.companyCache.has(normalizedKey) && metadata.companyName) {
			this.companyCache.set(normalizedKey, metadata.companyName);
		}
	}

	clearForFile(filePath: string) {
		const defMap = this.fileDefMap.get(filePath);
		if (defMap) {
			// Remove entries from indexes before clearing the file map
			for (const [normalizedKey, metadata] of defMap) {
				this.removeFromIndexes(normalizedKey, metadata);
			}
			defMap.clear();
		}
	}

	clear() {
		this.fileDefMap.clear();
		this.nameIndex.clear();
		this.companyCache.clear();
	}

	private removeFromIndexes(normalizedKey: string, metadata: PersonMetadata) {
		// Remove from name index
		const peopleList = this.nameIndex.get(normalizedKey);
		if (peopleList) {
			const index = peopleList.findIndex(p =>
				p.file.path === metadata.file.path &&
				normaliseWord(p.fullName) === normalizedKey
			);
			if (index !== -1) {
				peopleList.splice(index, 1);

				// If no more people with this name, remove the entry
				if (peopleList.length === 0) {
					this.nameIndex.delete(normalizedKey);
					this.companyCache.delete(normalizedKey);
				} else {
					// Update company cache to first remaining person's company
					const firstPerson = peopleList[0];
					if (firstPerson.companyName) {
						this.companyCache.set(normalizedKey, firstPerson.companyName);
					}
				}
			}
		}
	}
}

export function initDefFileManager(app: App): DefManager {
	defFileManager = new DefManager(app);
	return defFileManager;
}

export function getDefFileManager(): DefManager {
	return defFileManager;
}
