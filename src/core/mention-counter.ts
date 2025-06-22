import { App, TFile } from "obsidian";
import { MentionCounts, PersonMetadata } from "./model";
import { getDefFileManager } from "./def-file-manager";
import { LineScanner } from "../editor/definition-search";
import { logInfo, logError } from "../util/log";

/**
 * Service for counting mentions of people across the vault
 * Excludes People/Company pages from counting
 */
export class MentionCounter {
	private app: App;
	private mentionCache: Map<string, MentionCounts>;
	private lastScanTime: number;
	private scanInProgress: boolean;

	constructor(app: App) {
		this.app = app;
		this.mentionCache = new Map();
		this.lastScanTime = 0;
		this.scanInProgress = false;
	}

	/**
	 * Get mention counts for a specific person
	 * @param personName Normalized person name
	 * @returns MentionCounts or undefined if not found
	 */
	getMentionCounts(personName: string): MentionCounts | undefined {
		return this.mentionCache.get(personName);
	}

	/**
	 * Scan the entire vault for mentions and update cache
	 * This is an expensive operation, use sparingly
	 */
	async scanVaultForMentions(): Promise<void> {
		if (this.scanInProgress) {
			logInfo("Mention scan already in progress, skipping");
			return;
		}

		this.scanInProgress = true;
		logInfo("Starting vault mention scan...");

		try {
			// Clear existing cache
			this.mentionCache.clear();

			// Get all people names to search for
			const defManager = getDefFileManager();
			const allPeople = this.getAllPeopleNames();

			if (allPeople.length === 0) {
				logInfo("No people found to scan for mentions");
				return;
			}

			// Get all files in vault excluding People/Company pages
			const filesToScan = this.getFilesToScan();
			logInfo(`Scanning ${filesToScan.length} files for mentions of ${allPeople.length} people`);

			// Initialize mention counts for all people
			allPeople.forEach(personName => {
				this.mentionCache.set(personName, {
					totalMentions: 0,
					taskMentions: 0,
					textMentions: 0
				});
			});

			// Scan each file
			for (const file of filesToScan) {
				await this.scanFileForMentions(file, allPeople);
			}

			this.lastScanTime = Date.now();
			logInfo(`Mention scan completed. Scanned ${filesToScan.length} files.`);

		} catch (error) {
			logError(`Error during mention scan: ${error.message}`);
		} finally {
			this.scanInProgress = false;
		}
	}

	/**
	 * Scan a single file for mentions and update cache
	 * @param file File to scan
	 * @param peopleNames Array of normalized people names to search for
	 */
	private async scanFileForMentions(file: TFile, peopleNames: string[]): Promise<void> {
		try {
			const content = await this.app.vault.cachedRead(file);
			const lines = content.split('\n');

			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				this.scanLineForMentions(line, peopleNames);
			}

		} catch (error) {
			logError(`Error scanning file ${file.path}: ${error.message}`);
		}
	}

	/**
	 * Scan a single line for mentions
	 * @param line Line content to scan
	 * @param peopleNames Array of normalized people names to search for
	 */
	private scanLineForMentions(line: string, peopleNames: string[]): void {
		// Check if this line is a task
		const isTask = this.isTaskLine(line);

		// Use LineScanner to find mentions in this line
		const lineScanner = new LineScanner();
		const phraseInfos = lineScanner.scanLine(line);

		// Count mentions for each person found in this line
		phraseInfos.forEach(phraseInfo => {
			const normalizedPhrase = phraseInfo.phrase.toLowerCase().trim();
			
			if (peopleNames.includes(normalizedPhrase)) {
				const counts = this.mentionCache.get(normalizedPhrase);
				if (counts) {
					counts.totalMentions++;
					if (isTask) {
						counts.taskMentions++;
					} else {
						counts.textMentions++;
					}
				}
			}
		});
	}

	/**
	 * Check if a line represents a task
	 * @param line Line content
	 * @returns true if line is a task
	 */
	private isTaskLine(line: string): boolean {
		const trimmedLine = line.trim();
		// Check for various task formats
		return /^[-*+]\s*\[[ xX]\]/.test(trimmedLine) || // - [ ] or - [x] or - [X]
			   /^\d+\.\s*\[[ xX]\]/.test(trimmedLine);    // 1. [ ] or 1. [x]
	}

	/**
	 * Get all normalized people names from the definition manager
	 * @returns Array of normalized people names
	 */
	private getAllPeopleNames(): string[] {
		const defManager = getDefFileManager();
		const allKeys = defManager.getDefRepo().getAllKeys();
		return Array.from(allKeys);
	}

	/**
	 * Get all files that should be scanned for mentions
	 * Excludes People/Company pages and other system files
	 * @returns Array of files to scan
	 */
	private getFilesToScan(): TFile[] {
		const allFiles = this.app.vault.getMarkdownFiles();
		const defManager = getDefFileManager();
		const peopleFolder = defManager.getGlobalDefFolder();

		return allFiles.filter(file => {
			// Exclude People/Company pages
			if (file.path.startsWith(peopleFolder)) {
				return false;
			}

			// Exclude system folders
			if (file.path.startsWith('.obsidian/') || 
				file.path.startsWith('_templates/') ||
				file.path.startsWith('templates/')) {
				return false;
			}

			// Include all other markdown files
			return true;
		});
	}

	/**
	 * Update mention counts for a specific person
	 * This is used when we want to update counts for a single person without full vault scan
	 * @param personName Normalized person name
	 */
	async updatePersonMentions(personName: string): Promise<void> {
		logInfo(`Updating mentions for: ${personName}`);

		// Initialize counts
		const counts: MentionCounts = {
			totalMentions: 0,
			taskMentions: 0,
			textMentions: 0
		};

		// Get files to scan
		const filesToScan = this.getFilesToScan();

		// Scan each file for this specific person
		for (const file of filesToScan) {
			try {
				const content = await this.app.vault.cachedRead(file);
				const lines = content.split('\n');

				for (const line of lines) {
					const isTask = this.isTaskLine(line);
					const lineScanner = new LineScanner();
					const phraseInfos = lineScanner.scanLine(line);

					phraseInfos.forEach(phraseInfo => {
						const normalizedPhrase = phraseInfo.phrase.toLowerCase().trim();
						if (normalizedPhrase === personName) {
							counts.totalMentions++;
							if (isTask) {
								counts.taskMentions++;
							} else {
								counts.textMentions++;
							}
						}
					});
				}
			} catch (error) {
				logError(`Error scanning file ${file.path} for ${personName}: ${error.message}`);
			}
		}

		// Update cache
		this.mentionCache.set(personName, counts);
		logInfo(`Updated mentions for ${personName}: ${counts.totalMentions} total (${counts.taskMentions} tasks, ${counts.textMentions} text)`);
	}

	/**
	 * Update mention counts for all people mentioned in a specific file
	 * This is more efficient than full vault scan when a file is modified
	 * @param file The file that was modified
	 */
	async updateFileBasedMentions(file: TFile): Promise<void> {
		// Skip if this is a People/Company page
		const defManager = getDefFileManager();
		const peopleFolder = defManager.getGlobalDefFolder();
		if (file.path.startsWith(peopleFolder)) {
			return;
		}

		// Skip system folders
		if (file.path.startsWith('.obsidian/') ||
			file.path.startsWith('_templates/') ||
			file.path.startsWith('templates/')) {
			return;
		}

		try {
			const content = await this.app.vault.cachedRead(file);
			const lines = content.split('\n');
			const allPeople = this.getAllPeopleNames();

			// Track which people are mentioned in this file
			const fileMentions = new Map<string, MentionCounts>();

			// Initialize counts for all people
			allPeople.forEach(personName => {
				fileMentions.set(personName, {
					totalMentions: 0,
					taskMentions: 0,
					textMentions: 0
				});
			});

			// Scan each line in the file
			for (const line of lines) {
				const isTask = this.isTaskLine(line);
				const lineScanner = new LineScanner();
				const phraseInfos = lineScanner.scanLine(line);

				phraseInfos.forEach(phraseInfo => {
					const normalizedPhrase = phraseInfo.phrase.toLowerCase().trim();
					if (allPeople.includes(normalizedPhrase)) {
						const counts = fileMentions.get(normalizedPhrase);
						if (counts) {
							counts.totalMentions++;
							if (isTask) {
								counts.taskMentions++;
							} else {
								counts.textMentions++;
							}
						}
					}
				});
			}

			// Update cache for people who have mentions in this file
			fileMentions.forEach((fileCounts, personName) => {
				if (fileCounts.totalMentions > 0) {
					// For incremental updates, we need to recalculate the person's total counts
					// This is still more efficient than full vault scan
					this.updatePersonMentions(personName);
				}
			});

		} catch (error) {
			logError(`Error updating file-based mentions for ${file.path}: ${error.message}`);
		}
	}

	/**
	 * Debounced file update to prevent excessive scanning during rapid edits
	 */
	private fileUpdateTimeouts = new Map<string, NodeJS.Timeout>();

	/**
	 * Schedule a debounced update for a file
	 * @param file The file to update
	 * @param delay Delay in milliseconds (default: 1000ms)
	 */
	scheduleFileUpdate(file: TFile, delay: number = 1000): void {
		// Clear existing timeout for this file
		const existingTimeout = this.fileUpdateTimeouts.get(file.path);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Schedule new update
		const timeout = setTimeout(() => {
			this.updateFileBasedMentions(file);
			this.fileUpdateTimeouts.delete(file.path);
		}, delay);

		this.fileUpdateTimeouts.set(file.path, timeout);
	}

	/**
	 * Check if mention cache needs refresh
	 * @returns true if cache is stale
	 */
	isCacheStale(): boolean {
		const maxAge = 5 * 60 * 1000; // 5 minutes
		return Date.now() - this.lastScanTime > maxAge;
	}

	/**
	 * Clear the mention cache
	 */
	clearCache(): void {
		this.mentionCache.clear();
		this.lastScanTime = 0;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { peopleCount: number, lastScanTime: number, isStale: boolean } {
		return {
			peopleCount: this.mentionCache.size,
			lastScanTime: this.lastScanTime,
			isStale: this.isCacheStale()
		};
	}
}

// Global instance
let mentionCounter: MentionCounter | undefined;

export function initMentionCounter(app: App): void {
	mentionCounter = new MentionCounter(app);
}

export function getMentionCounter(): MentionCounter {
	if (!mentionCounter) {
		throw new Error("MentionCounter not initialized. Call initMentionCounter first.");
	}
	return mentionCounter;
}
