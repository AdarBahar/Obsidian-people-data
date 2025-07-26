import { PersonMetadata } from "./model";
import { getOptimizedSearchEngine } from "./optimized-search-engine";

export interface ScanResult {
	person: PersonMetadata;
	startIndex: number;
	endIndex: number;
	matchedText: string;
	strategy: ScanStrategy;
}

export enum ScanStrategy {
	PrefixTree = "prefix-tree",
	WordBoundary = "word-boundary", 
	FuzzyMatching = "fuzzy-matching",
	Legacy = "legacy"
}

export interface ScanPerformanceMetrics {
	strategy: ScanStrategy;
	scanTime: number;
	matchesFound: number;
	lineLength: number;
	cacheHit: boolean;
}

export class SmartLineScanner {
	private lineCache = new Map<string, ScanResult[]>();
	private maxCacheSize = 500;
	private performanceMetrics: ScanPerformanceMetrics[] = [];

	scanLine(line: string, allPeople: PersonMetadata[], useOptimized: boolean = true): ScanResult[] {
		const startTime = performance.now();

		// Handle null/undefined lines
		if (!line || typeof line !== 'string') {
			return [];
		}

		// Check cache first
		const cacheKey = this.generateCacheKey(line);
		const cached = this.lineCache.get(cacheKey);
		if (cached) {
			this.recordMetrics(ScanStrategy.PrefixTree, performance.now() - startTime, cached.length, line.length, true);
			return cached;
		}

		let results: ScanResult[] = [];
		let strategy: ScanStrategy;

		if (useOptimized) {
			// Try optimized strategies in order of efficiency
			if (line.length < 200) {
				results = this.scanWithPrefixTree(line);
				strategy = ScanStrategy.PrefixTree;
			} else if (line.length < 1000) {
				results = this.scanWithWordBoundary(line, allPeople);
				strategy = ScanStrategy.WordBoundary;
			} else {
				results = this.scanWithFuzzyMatching(line, allPeople);
				strategy = ScanStrategy.FuzzyMatching;
			}
		} else {
			// Fall back to legacy scanning
			results = this.legacyScan(line, allPeople);
			strategy = ScanStrategy.Legacy;
		}

		// Cache results
		this.cacheResults(cacheKey, results);
		
		// Record performance metrics
		const scanTime = performance.now() - startTime;
		this.recordMetrics(strategy, scanTime, results.length, line.length, false);

		return results;
	}

	private scanWithPrefixTree(line: string): ScanResult[] {
		const results: ScanResult[] = [];
		const searchEngine = getOptimizedSearchEngine();
		
		if (!searchEngine) {
			return [];
		}

		// Use sliding window approach with prefix tree
		const words = line.split(/\s+/);
		
		for (let i = 0; i < words.length; i++) {
			// Try single word
			const singleWord = this.cleanWord(words[i]);
			if (singleWord.length >= 2) {
				const matches = searchEngine.search(singleWord, 5);
				for (const match of matches) {
					if (match.matchType === 'exact' || match.relevanceScore > 70) {
						const startIndex = line.indexOf(words[i]);
						if (startIndex !== -1) {
							results.push({
								person: match.person,
								startIndex,
								endIndex: startIndex + words[i].length,
								matchedText: words[i],
								strategy: ScanStrategy.PrefixTree
							});
						}
					}
				}
			}

			// Try two-word combinations
			if (i < words.length - 1) {
				const twoWords = this.cleanWord(words[i] + " " + words[i + 1]);
				if (twoWords.length >= 4) {
					const matches = searchEngine.search(twoWords, 3);
					for (const match of matches) {
						if (match.matchType === 'exact' || match.relevanceScore > 80) {
							const fullMatch = words[i] + " " + words[i + 1];
							const startIndex = line.indexOf(fullMatch);
							if (startIndex !== -1) {
								results.push({
									person: match.person,
									startIndex,
									endIndex: startIndex + fullMatch.length,
									matchedText: fullMatch,
									strategy: ScanStrategy.PrefixTree
								});
							}
						}
					}
				}
			}
		}

		return this.deduplicateResults(results);
	}

	private scanWithWordBoundary(line: string, allPeople: PersonMetadata[]): ScanResult[] {
		const results: ScanResult[] = [];
		
		// Create regex patterns for efficient scanning
		const namePatterns = allPeople.map(person => ({
			person,
			pattern: new RegExp(`\\b${this.escapeRegex(person.fullName)}\\b`, 'gi')
		}));

		for (const { person, pattern } of namePatterns) {
			let match;
			while ((match = pattern.exec(line)) !== null) {
				results.push({
					person,
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					matchedText: match[0],
					strategy: ScanStrategy.WordBoundary
				});
			}
		}

		return this.deduplicateResults(results);
	}

	private scanWithFuzzyMatching(line: string, allPeople: PersonMetadata[]): ScanResult[] {
		const results: ScanResult[] = [];
		const words = line.split(/\s+/);
		
		// Use fuzzy matching for large lines
		for (const person of allPeople) {
			const nameWords = person.fullName.toLowerCase().split(/\s+/);
			
			for (let i = 0; i <= words.length - nameWords.length; i++) {
				const candidate = words.slice(i, i + nameWords.length).join(" ");
				const similarity = this.calculateSimilarity(candidate.toLowerCase(), person.fullName.toLowerCase());
				
				if (similarity > 0.8) {
					const startIndex = line.indexOf(candidate);
					if (startIndex !== -1) {
						results.push({
							person,
							startIndex,
							endIndex: startIndex + candidate.length,
							matchedText: candidate,
							strategy: ScanStrategy.FuzzyMatching
						});
					}
				}
			}
		}

		return this.deduplicateResults(results);
	}

	private legacyScan(line: string, allPeople: PersonMetadata[]): ScanResult[] {
		const results: ScanResult[] = [];
		
		// Simple substring matching (legacy approach)
		for (const person of allPeople) {
			const nameIndex = line.toLowerCase().indexOf(person.fullName.toLowerCase());
			if (nameIndex !== -1) {
				results.push({
					person,
					startIndex: nameIndex,
					endIndex: nameIndex + person.fullName.length,
					matchedText: line.substring(nameIndex, nameIndex + person.fullName.length),
					strategy: ScanStrategy.Legacy
				});
			}
		}

		return this.deduplicateResults(results);
	}

	private cleanWord(word: string): string {
		return word.replace(/[^\w\s]/g, '').trim();
	}

	private escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	private calculateSimilarity(str1: string, str2: string): number {
		// Simple Levenshtein distance-based similarity
		const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
		
		for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
		for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
		
		for (let j = 1; j <= str2.length; j++) {
			for (let i = 1; i <= str1.length; i++) {
				const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
				matrix[j][i] = Math.min(
					matrix[j][i - 1] + 1,
					matrix[j - 1][i] + 1,
					matrix[j - 1][i - 1] + indicator
				);
			}
		}
		
		const maxLength = Math.max(str1.length, str2.length);
		return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
	}

	private deduplicateResults(results: ScanResult[]): ScanResult[] {
		// Remove overlapping matches, keeping the highest quality ones
		const sorted = results.sort((a, b) => {
			// Prefer exact matches and longer matches
			const aScore = (a.strategy === ScanStrategy.PrefixTree ? 10 : 0) + a.matchedText.length;
			const bScore = (b.strategy === ScanStrategy.PrefixTree ? 10 : 0) + b.matchedText.length;
			return bScore - aScore;
		});

		const deduplicated: ScanResult[] = [];
		
		for (const result of sorted) {
			const overlaps = deduplicated.some(existing => 
				this.rangesOverlap(
					result.startIndex, result.endIndex,
					existing.startIndex, existing.endIndex
				)
			);
			
			if (!overlaps) {
				deduplicated.push(result);
			}
		}

		return deduplicated.sort((a, b) => a.startIndex - b.startIndex);
	}

	private rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
		return start1 < end2 && start2 < end1;
	}

	private generateCacheKey(line: string): string {
		// Generate a hash-like key for the line
		let hash = 0;
		for (let i = 0; i < line.length; i++) {
			const char = line.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}

	private cacheResults(key: string, results: ScanResult[]): void {
		if (this.lineCache.size >= this.maxCacheSize) {
			// Remove oldest entries
			const keysToDelete = Array.from(this.lineCache.keys()).slice(0, 100);
			keysToDelete.forEach(k => this.lineCache.delete(k));
		}
		
		this.lineCache.set(key, results);
	}

	private recordMetrics(strategy: ScanStrategy, scanTime: number, matchesFound: number, lineLength: number, cacheHit: boolean): void {
		this.performanceMetrics.push({
			strategy,
			scanTime,
			matchesFound,
			lineLength,
			cacheHit
		});

		// Keep only recent metrics (last 1000)
		if (this.performanceMetrics.length > 1000) {
			this.performanceMetrics = this.performanceMetrics.slice(-1000);
		}
	}

	getPerformanceMetrics(): ScanPerformanceMetrics[] {
		return [...this.performanceMetrics];
	}

	getAveragePerformance(): {
		averageScanTime: number;
		cacheHitRate: number;
		strategyCounts: Record<ScanStrategy, number>;
	} {
		if (this.performanceMetrics.length === 0) {
			return {
				averageScanTime: 0,
				cacheHitRate: 0,
				strategyCounts: {
					[ScanStrategy.PrefixTree]: 0,
					[ScanStrategy.WordBoundary]: 0,
					[ScanStrategy.FuzzyMatching]: 0,
					[ScanStrategy.Legacy]: 0
				}
			};
		}

		const totalScanTime = this.performanceMetrics.reduce((sum, m) => sum + m.scanTime, 0);
		const cacheHits = this.performanceMetrics.filter(m => m.cacheHit).length;
		
		const strategyCounts = this.performanceMetrics.reduce((counts, m) => {
			counts[m.strategy] = (counts[m.strategy] || 0) + 1;
			return counts;
		}, {} as Record<ScanStrategy, number>);

		return {
			averageScanTime: totalScanTime / this.performanceMetrics.length,
			cacheHitRate: (cacheHits / this.performanceMetrics.length) * 100,
			strategyCounts
		};
	}

	clearCache(): void {
		this.lineCache.clear();
	}

	clearMetrics(): void {
		this.performanceMetrics = [];
	}
}

let smartLineScanner: SmartLineScanner;

export function initSmartLineScanner(): SmartLineScanner {
	smartLineScanner = new SmartLineScanner();
	return smartLineScanner;
}

export function getSmartLineScanner(): SmartLineScanner {
	if (!smartLineScanner) {
		smartLineScanner = new SmartLineScanner();
	}
	return smartLineScanner;
}
