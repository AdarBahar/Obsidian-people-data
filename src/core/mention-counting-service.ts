import { TFile, Vault, MetadataCache } from "obsidian";
import { PersonMetadata } from "./model";
import { getSmartLineScanner } from "./smart-line-scanner";
import { getOptimizedSearchEngine } from "./optimized-search-engine";

export interface MentionCount {
	personId: string;
	fullName: string;
	totalMentions: number;
	textMentions: number;
	taskMentions: number;
	lastUpdated: number;
	mentionsByFile: Map<string, FileMentionCount>;
}

export interface FileMentionCount {
	filePath: string;
	fileName: string;
	textMentions: number;
	taskMentions: number;
	lastScanned: number;
}

export interface MentionContext {
	lineNumber: number;
	lineContent: string;
	mentionType: 'text' | 'task';
	beforeContext: string;
	afterContext: string;
}

export interface MentionCountingStats {
	totalFilesScanned: number;
	totalMentionsFound: number;
	lastFullScan: number;
	averageScanTime: number;
	filesWithMentions: number;
}

export class MentionCountingService {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private mentionCounts = new Map<string, MentionCount>();
	private scanQueue = new Set<string>();
	private isScanning = false;
	private stats: MentionCountingStats = {
		totalFilesScanned: 0,
		totalMentionsFound: 0,
		lastFullScan: 0,
		averageScanTime: 0,
		filesWithMentions: 0
	};

	constructor(vault: Vault, metadataCache: MetadataCache) {
		this.vault = vault;
		this.metadataCache = metadataCache;
	}

	/**
	 * Perform a full scan of all files in the vault
	 */
	async performFullScan(people: PersonMetadata[]): Promise<void> {
		console.log(`Starting full mention scan for ${people.length} people...`);
		const startTime = Date.now();

		// Clear existing counts
		this.mentionCounts.clear();
		
		// Initialize mention counts for all people
		for (const person of people) {
			this.mentionCounts.set(person.id, {
				personId: person.id,
				fullName: person.fullName,
				totalMentions: 0,
				textMentions: 0,
				taskMentions: 0,
				lastUpdated: Date.now(),
				mentionsByFile: new Map()
			});
		}

		// Get all markdown files
		const markdownFiles = this.vault.getMarkdownFiles();
		this.stats.totalFilesScanned = 0;
		this.stats.totalMentionsFound = 0;
		this.stats.filesWithMentions = 0;

		// Scan each file
		for (const file of markdownFiles) {
			// Skip people definition files
			if (this.isPeopleDefinitionFile(file)) {
				continue;
			}

			await this.scanFile(file, people);
			this.stats.totalFilesScanned++;
		}

		// Update stats
		const scanTime = Date.now() - startTime;
		this.stats.lastFullScan = Date.now();
		this.stats.averageScanTime = scanTime / markdownFiles.length;

		console.log(`Full mention scan completed in ${scanTime}ms. Found ${this.stats.totalMentionsFound} mentions across ${this.stats.filesWithMentions} files.`);
	}

	/**
	 * Scan a specific file for mentions
	 */
	async scanFile(file: TFile, people: PersonMetadata[]): Promise<void> {
		try {
			const content = await this.vault.read(file);
			const lines = content.split('\n');
			let fileMentionsFound = false;

			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				const mentions = this.findMentionsInLine(line, people, lineIndex);

				for (const mention of mentions) {
					this.addMention(mention.person, file, mention.mentionType);
					fileMentionsFound = true;
					this.stats.totalMentionsFound++;
				}
			}

			if (fileMentionsFound) {
				this.stats.filesWithMentions++;
			}
		} catch (error) {
			console.error(`Error scanning file ${file.path}:`, error);
		}
	}

	/**
	 * Find mentions in a single line using smart detection
	 */
	private findMentionsInLine(line: string, people: PersonMetadata[], lineNumber: number): Array<{person: PersonMetadata, mentionType: 'text' | 'task'}> {
		const mentions: Array<{person: PersonMetadata, mentionType: 'text' | 'task'}> = [];
		
		// Determine if this is a task line
		const isTaskLine = this.isTaskLine(line);
		
		// Use smart line scanner for efficient name detection
		const scanner = getSmartLineScanner();
		if (scanner) {
			const scanResults = scanner.scanLine(line, people, true);
			
			for (const result of scanResults) {
				mentions.push({
					person: result.person,
					mentionType: isTaskLine ? 'task' : 'text'
				});
			}
		} else {
			// Fallback to simple string matching
			for (const person of people) {
				const nameIndex = line.toLowerCase().indexOf(person.fullName.toLowerCase());
				if (nameIndex !== -1) {
					mentions.push({
						person: person,
						mentionType: isTaskLine ? 'task' : 'text'
					});
				}
			}
		}

		return mentions;
	}

	/**
	 * Determine if a line is a task line
	 */
	private isTaskLine(line: string): boolean {
		// Check for common task patterns
		const taskPatterns = [
			/^\s*-\s*\[[ xX]\]/, // - [ ] or - [x] or - [X]
			/^\s*\*\s*\[[ xX]\]/, // * [ ] or * [x] or * [X]
			/^\s*\+\s*\[[ xX]\]/, // + [ ] or + [x] or + [X]
			/^\s*\d+\.\s*\[[ xX]\]/, // 1. [ ] or 1. [x] or 1. [X]
		];

		return taskPatterns.some(pattern => pattern.test(line));
	}

	/**
	 * Check if a file is a people definition file
	 */
	private isPeopleDefinitionFile(file: TFile): boolean {
		const fileCache = this.metadataCache.getFileCache(file);
		const frontmatter = fileCache?.frontmatter;
		
		// Check if file has def-type frontmatter
		return !!(frontmatter && (
			frontmatter['def-type'] === 'consolidated' ||
			frontmatter['def-type'] === 'atomic'
		));
	}

	/**
	 * Add a mention to the counts
	 */
	private addMention(person: PersonMetadata, file: TFile, mentionType: 'text' | 'task'): void {
		const personCount = this.mentionCounts.get(person.id);
		if (!personCount) return;

		// Update total counts
		personCount.totalMentions++;
		if (mentionType === 'text') {
			personCount.textMentions++;
		} else {
			personCount.taskMentions++;
		}
		personCount.lastUpdated = Date.now();

		// Update file-specific counts
		let fileCount = personCount.mentionsByFile.get(file.path);
		if (!fileCount) {
			fileCount = {
				filePath: file.path,
				fileName: file.basename,
				textMentions: 0,
				taskMentions: 0,
				lastScanned: Date.now()
			};
			personCount.mentionsByFile.set(file.path, fileCount);
		}

		if (mentionType === 'text') {
			fileCount.textMentions++;
		} else {
			fileCount.taskMentions++;
		}
		fileCount.lastScanned = Date.now();
	}

	/**
	 * Queue a file for scanning
	 */
	queueFileForScan(filePath: string): void {
		this.scanQueue.add(filePath);
		this.processScanQueue();
	}

	/**
	 * Process the scan queue
	 */
	private async processScanQueue(): Promise<void> {
		if (this.isScanning || this.scanQueue.size === 0) {
			return;
		}

		this.isScanning = true;

		try {
			// Process up to 5 files at a time to avoid blocking
			const filesToProcess = Array.from(this.scanQueue).slice(0, 5);
			
			for (const filePath of filesToProcess) {
				const file = this.vault.getAbstractFileByPath(filePath);
				if (file instanceof TFile && file.extension === 'md') {
					// Get current people list (this would need to be injected)
					// For now, we'll skip individual file processing
					// This will be implemented when we integrate with the main plugin
				}
				this.scanQueue.delete(filePath);
			}
		} finally {
			this.isScanning = false;
			
			// Process remaining queue if any
			if (this.scanQueue.size > 0) {
				setTimeout(() => this.processScanQueue(), 100);
			}
		}
	}

	/**
	 * Get mention count for a specific person
	 */
	getMentionCount(personId: string): MentionCount | undefined {
		return this.mentionCounts.get(personId);
	}

	/**
	 * Get all mention counts
	 */
	getAllMentionCounts(): Map<string, MentionCount> {
		return new Map(this.mentionCounts);
	}

	/**
	 * Get mention counting statistics
	 */
	getStats(): MentionCountingStats {
		return { ...this.stats };
	}

	/**
	 * Clear all mention counts
	 */
	clearCounts(): void {
		this.mentionCounts.clear();
		this.stats = {
			totalFilesScanned: 0,
			totalMentionsFound: 0,
			lastFullScan: 0,
			averageScanTime: 0,
			filesWithMentions: 0
		};
	}

	/**
	 * Get top mentioned people
	 */
	getTopMentioned(limit: number = 10): Array<{person: string, count: number}> {
		const sorted = Array.from(this.mentionCounts.values())
			.sort((a, b) => b.totalMentions - a.totalMentions)
			.slice(0, limit);

		return sorted.map(count => ({
			person: count.fullName,
			count: count.totalMentions
		}));
	}
}

let mentionCountingService: MentionCountingService;

export function initMentionCountingService(vault: Vault, metadataCache: MetadataCache): MentionCountingService {
	mentionCountingService = new MentionCountingService(vault, metadataCache);
	return mentionCountingService;
}

export function getMentionCountingService(): MentionCountingService {
	return mentionCountingService;
}
