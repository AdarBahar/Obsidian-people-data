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
	 * Generate a mention-specific ID based only on the person's name
	 * This ensures the same person gets the same mention count regardless of which company file they're in
	 */
	private getMentionId(fullName: string): string {
		return fullName.toLowerCase().replace(/\s+/g, '-');
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
		// Use name-based ID for mention counting to handle multi-company people
		for (const person of people) {
			const mentionId = this.getMentionId(person.fullName);
			if (!this.mentionCounts.has(mentionId)) {
				this.mentionCounts.set(mentionId, {
					personId: mentionId,
					fullName: person.fullName,
					totalMentions: 0,
					textMentions: 0,
					taskMentions: 0,
					lastUpdated: Date.now(),
					mentionsByFile: new Map()
				});
			}
		}

		// Get all markdown files
		const markdownFiles = this.vault.getMarkdownFiles();
		this.stats.totalFilesScanned = 0;
		this.stats.totalMentionsFound = 0;
		this.stats.filesWithMentions = 0;

		console.log(`Found ${markdownFiles.length} markdown files in vault`);

		// Scan each file
		for (const file of markdownFiles) {
			// Skip people definition files
			if (this.isPeopleDefinitionFile(file)) {
				console.log(`Skipping people definition file: ${file.path}`);
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
			let fileMentionCount = 0;

			console.log(`Scanning file: ${file.path} (${lines.length} lines)`);

			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				if (line.trim().length === 0) continue; // Skip empty lines

				const mentions = this.findMentionsInLine(line, people, lineIndex);

				if (mentions.length > 0) {
					console.log(`Line ${lineIndex + 1}: "${line.substring(0, 100)}..." -> Found ${mentions.length} mentions`);
				}

				for (const mention of mentions) {
					this.addMention(mention.person, file, mention.mentionType);
					fileMentionsFound = true;
					fileMentionCount++;
					this.stats.totalMentionsFound++;
				}
			}

			if (fileMentionsFound) {
				this.stats.filesWithMentions++;
				console.log(`File ${file.path}: Found ${fileMentionCount} total mentions`);
			}
		} catch (error) {
			console.error(`Error scanning file ${file.path}:`, error);
		}
	}

	/**
	 * Find mentions in a single line using comprehensive detection
	 */
	private findMentionsInLine(line: string, people: PersonMetadata[], lineNumber: number): Array<{person: PersonMetadata, mentionType: 'text' | 'task'}> {
		const mentions: Array<{person: PersonMetadata, mentionType: 'text' | 'task'}> = [];

		// Determine if this is a task line
		const isTaskLine = this.isTaskLine(line);

		// Use comprehensive mention detection for each person
		for (const person of people) {
			const personMentions = this.findPersonMentionsInLine(line, person, isTaskLine);
			mentions.push(...personMentions);
		}

		return mentions;
	}

	/**
	 * Find all mentions of a specific person in a line (handles multiple occurrences)
	 */
	private findPersonMentionsInLine(line: string, person: PersonMetadata, isTaskLine: boolean): Array<{person: PersonMetadata, mentionType: 'text' | 'task'}> {
		const mentions: Array<{person: PersonMetadata, mentionType: 'text' | 'task'}> = [];
		const mentionType = isTaskLine ? 'task' : 'text';

		// Convert to lowercase for case-insensitive matching
		const lowerLine = line.toLowerCase();
		const lowerName = person.fullName.toLowerCase();

		// Find all occurrences of the person's name in the line
		let startIndex = 0;
		let foundIndex = lowerLine.indexOf(lowerName, startIndex);

		while (foundIndex !== -1) {
			// Check if this is a whole word match (not part of another word)
			if (this.isWholeWordMatch(line, foundIndex, person.fullName.length)) {
				mentions.push({
					person: person,
					mentionType: mentionType
				});

				// Debug logging for found mentions
				const contextStart = Math.max(0, foundIndex - 10);
				const contextEnd = Math.min(line.length, foundIndex + person.fullName.length + 10);
				const context = line.substring(contextStart, contextEnd);
				console.log(`  Found "${person.fullName}" in: "...${context}..." (${mentionType})`);
			}

			// Look for next occurrence
			startIndex = foundIndex + 1;
			foundIndex = lowerLine.indexOf(lowerName, startIndex);
		}

		return mentions;
	}

	/**
	 * Check if a found name is a whole word match (not part of another word)
	 */
	private isWholeWordMatch(text: string, startIndex: number, nameLength: number): boolean {
		const endIndex = startIndex + nameLength;

		// Check character before the match
		if (startIndex > 0) {
			const charBefore = text[startIndex - 1];
			if (/[a-zA-Z0-9]/.test(charBefore)) {
				return false; // Part of another word
			}
		}

		// Check character after the match
		if (endIndex < text.length) {
			const charAfter = text[endIndex];
			if (/[a-zA-Z0-9]/.test(charAfter)) {
				return false; // Part of another word
			}
		}

		return true; // It's a whole word match
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
		const mentionId = this.getMentionId(person.fullName);
		const personCount = this.mentionCounts.get(mentionId);
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
	 * Can accept either a person ID or a person name
	 */
	getMentionCount(personIdOrName: string): MentionCount | undefined {
		// First try direct lookup (for backward compatibility)
		let result = this.mentionCounts.get(personIdOrName);
		if (result) return result;

		// If not found, try as a person name
		const mentionId = this.getMentionId(personIdOrName);
		return this.mentionCounts.get(mentionId);
	}

	/**
	 * Get mention count by person name (preferred method)
	 */
	getMentionCountByName(fullName: string): MentionCount | undefined {
		const mentionId = this.getMentionId(fullName);
		return this.mentionCounts.get(mentionId);
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
