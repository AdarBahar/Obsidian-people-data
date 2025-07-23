import { PersonMetadata } from "./model";

export interface SearchPerformanceStats {
	cacheHitRate: number;
	averageScanTime: number;
	memoryUsage: number;
	indexSizes: {
		nameIndex: number;
		companyIndex: number;
		prefixIndex: number;
		fuzzyIndex: number;
	};
	totalSearches: number;
	cacheHits: number;
	cacheMisses: number;
}

export interface SearchResult {
	person: PersonMetadata;
	relevanceScore: number;
	matchType: 'exact' | 'prefix' | 'fuzzy' | 'partial';
}

export class LRUCache<K, V> {
	private cache = new Map<K, V>();
	private maxSize: number;

	constructor(maxSize: number = 1000) {
		this.maxSize = maxSize;
	}

	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	set(key: K, value: V): void {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.maxSize) {
			// Remove least recently used (first item)
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
		this.cache.set(key, value);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

export class CompressedPrefixTree {
	private root: PrefixNode = { children: new Map(), isEndOfWord: false, people: [] };
	private nodeCount = 0;

	insert(word: string, person: PersonMetadata): void {
		let current = this.root;
		let i = 0;

		while (i < word.length) {
			const char = word[i].toLowerCase();
			
			if (!current.children.has(char)) {
				// Create new compressed path
				const remainingPath = word.slice(i).toLowerCase();
				const newNode: PrefixNode = {
					children: new Map(),
					isEndOfWord: true,
					people: [person],
					compressedPath: remainingPath
				};
				current.children.set(char, newNode);
				this.nodeCount++;
				return;
			}

			const child = current.children.get(char)!;
			
			if (child.compressedPath) {
				// Handle compressed path
				const commonPrefix = this.getCommonPrefix(word.slice(i).toLowerCase(), child.compressedPath);
				
				if (commonPrefix.length === child.compressedPath.length) {
					// Full match with compressed path
					i += commonPrefix.length;
					current = child;
					if (i === word.length) {
						child.isEndOfWord = true;
						child.people.push(person);
					}
				} else {
					// Split compressed path
					this.splitCompressedNode(child, commonPrefix, word.slice(i).toLowerCase(), person);
					return;
				}
			} else {
				i++;
				current = child;
			}
		}

		current.isEndOfWord = true;
		current.people.push(person);
	}

	search(prefix: string): PersonMetadata[] {
		const node = this.findNode(prefix.toLowerCase());
		if (!node) return [];

		const results: PersonMetadata[] = [];
		this.collectAllPeople(node, results);
		return results;
	}

	private findNode(prefix: string): PrefixNode | null {
		let current = this.root;
		let i = 0;

		while (i < prefix.length && current) {
			const char = prefix[i];
			const child = current.children.get(char);
			
			if (!child) return null;

			if (child.compressedPath) {
				const remaining = prefix.slice(i);
				if (child.compressedPath.startsWith(remaining)) {
					return child;
				} else if (remaining.startsWith(child.compressedPath)) {
					i += child.compressedPath.length;
					current = child;
				} else {
					return null;
				}
			} else {
				i++;
				current = child;
			}
		}

		return current;
	}

	private collectAllPeople(node: PrefixNode, results: PersonMetadata[]): void {
		if (node.isEndOfWord) {
			results.push(...node.people);
		}

		for (const child of node.children.values()) {
			this.collectAllPeople(child, results);
		}
	}

	private getCommonPrefix(str1: string, str2: string): string {
		let i = 0;
		while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
			i++;
		}
		return str1.slice(0, i);
	}

	private splitCompressedNode(node: PrefixNode, commonPrefix: string, newWord: string, person: PersonMetadata): void {
		// Create intermediate node for common prefix
		const intermediateNode: PrefixNode = {
			children: new Map(),
			isEndOfWord: commonPrefix.length === newWord.length,
			people: commonPrefix.length === newWord.length ? [person] : [],
			compressedPath: commonPrefix
		};

		// Update original node
		const remainingOriginal = node.compressedPath!.slice(commonPrefix.length);
		node.compressedPath = remainingOriginal;

		// Create new node for new word
		if (commonPrefix.length < newWord.length) {
			const remainingNew = newWord.slice(commonPrefix.length);
			const newNode: PrefixNode = {
				children: new Map(),
				isEndOfWord: true,
				people: [person],
				compressedPath: remainingNew
			};
			intermediateNode.children.set(remainingNew[0], newNode);
		}

		intermediateNode.children.set(remainingOriginal[0], node);
		this.nodeCount += 2;
	}

	getStats(): { nodeCount: number; memoryEstimate: number } {
		return {
			nodeCount: this.nodeCount,
			memoryEstimate: this.nodeCount * 100 // Rough estimate in bytes
		};
	}
}

interface PrefixNode {
	children: Map<string, PrefixNode>;
	isEndOfWord: boolean;
	people: PersonMetadata[];
	compressedPath?: string;
}

export class OptimizedSearchEngine {
	private nameIndex = new Map<string, PersonMetadata[]>();
	private companyIndex = new Map<string, PersonMetadata[]>();
	private prefixTree = new CompressedPrefixTree();
	private fuzzyIndex = new Map<string, Set<string>>();
	private cache = new LRUCache<string, SearchResult[]>(1000);
	
	private stats: SearchPerformanceStats = {
		cacheHitRate: 0,
		averageScanTime: 0,
		memoryUsage: 0,
		indexSizes: { nameIndex: 0, companyIndex: 0, prefixIndex: 0, fuzzyIndex: 0 },
		totalSearches: 0,
		cacheHits: 0,
		cacheMisses: 0
	};

	buildIndexes(people: PersonMetadata[]): void {
		console.log(`Building optimized indexes for ${people.length} people...`);
		const startTime = performance.now();

		// Clear existing indexes
		this.nameIndex.clear();
		this.companyIndex.clear();
		this.prefixTree = new CompressedPrefixTree();
		this.fuzzyIndex.clear();
		this.cache.clear();

		// Build indexes
		for (const person of people) {
			this.indexPerson(person);
		}

		const buildTime = performance.now() - startTime;
		console.log(`Indexes built in ${buildTime.toFixed(2)}ms`);
		
		this.updateStats();
	}

	private indexPerson(person: PersonMetadata): void {
		const fullName = person.fullName.toLowerCase();
		
		// Name index
		if (!this.nameIndex.has(fullName)) {
			this.nameIndex.set(fullName, []);
		}
		this.nameIndex.get(fullName)!.push(person);

		// Company index
		if (person.companyName) {
			const companyName = person.companyName.toLowerCase();
			if (!this.companyIndex.has(companyName)) {
				this.companyIndex.set(companyName, []);
			}
			this.companyIndex.get(companyName)!.push(person);
		}

		// Prefix tree
		this.prefixTree.insert(fullName, person);

		// Fuzzy index (soundex-like)
		const fuzzyKey = this.generateFuzzyKey(fullName);
		if (!this.fuzzyIndex.has(fuzzyKey)) {
			this.fuzzyIndex.set(fuzzyKey, new Set());
		}
		this.fuzzyIndex.get(fuzzyKey)!.add(fullName);
	}

	search(query: string, maxResults: number = 10): SearchResult[] {
		const startTime = performance.now();
		const cacheKey = `${query}:${maxResults}`;
		
		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached) {
			this.stats.cacheHits++;
			this.stats.totalSearches++;
			this.updateCacheHitRate();
			return cached;
		}

		// Perform search
		const results = this.performSearch(query, maxResults);
		
		// Cache results
		this.cache.set(cacheKey, results);
		
		// Update stats
		this.stats.cacheMisses++;
		this.stats.totalSearches++;
		const searchTime = performance.now() - startTime;
		this.updateAverageScanTime(searchTime);
		this.updateCacheHitRate();

		return results;
	}

	private performSearch(query: string, maxResults: number): SearchResult[] {
		const queryLower = query.toLowerCase();
		const results: SearchResult[] = [];

		// 1. Exact name matches (highest priority)
		const exactMatches = this.nameIndex.get(queryLower) || [];
		for (const person of exactMatches) {
			results.push({ person, relevanceScore: 100, matchType: 'exact' });
		}

		// 2. Prefix matches
		if (results.length < maxResults) {
			const prefixMatches = this.prefixTree.search(queryLower);
			for (const person of prefixMatches) {
				if (!results.some(r => r.person === person)) {
					results.push({ person, relevanceScore: 80, matchType: 'prefix' });
				}
			}
		}

		// 3. Company matches
		if (results.length < maxResults) {
			const companyMatches = this.companyIndex.get(queryLower) || [];
			for (const person of companyMatches) {
				if (!results.some(r => r.person === person)) {
					results.push({ person, relevanceScore: 60, matchType: 'partial' });
				}
			}
		}

		// 4. Fuzzy matches
		if (results.length < maxResults) {
			const fuzzyKey = this.generateFuzzyKey(queryLower);
			const fuzzyMatches = this.fuzzyIndex.get(fuzzyKey) || new Set();
			for (const name of fuzzyMatches) {
				const people = this.nameIndex.get(name) || [];
				for (const person of people) {
					if (!results.some(r => r.person === person)) {
						results.push({ person, relevanceScore: 40, matchType: 'fuzzy' });
					}
				}
			}
		}

		// Sort by relevance and limit results
		return results
			.sort((a, b) => b.relevanceScore - a.relevanceScore)
			.slice(0, maxResults);
	}

	private generateFuzzyKey(name: string): string {
		// Simple soundex-like algorithm
		return name
			.replace(/[aeiou]/g, '')
			.replace(/[^a-z]/g, '')
			.slice(0, 4)
			.padEnd(4, '0');
	}

	private updateStats(): void {
		this.stats.indexSizes = {
			nameIndex: this.nameIndex.size,
			companyIndex: this.companyIndex.size,
			prefixIndex: this.prefixTree.getStats().nodeCount,
			fuzzyIndex: this.fuzzyIndex.size
		};

		this.stats.memoryUsage = 
			this.nameIndex.size * 50 + 
			this.companyIndex.size * 50 + 
			this.prefixTree.getStats().memoryEstimate +
			this.fuzzyIndex.size * 30;
	}

	private updateCacheHitRate(): void {
		this.stats.cacheHitRate = this.stats.totalSearches > 0 
			? (this.stats.cacheHits / this.stats.totalSearches) * 100 
			: 0;
	}

	private updateAverageScanTime(newTime: number): void {
		const totalTime = this.stats.averageScanTime * (this.stats.totalSearches - 1) + newTime;
		this.stats.averageScanTime = totalTime / this.stats.totalSearches;
	}

	getPerformanceStats(): SearchPerformanceStats {
		return { ...this.stats };
	}

	clearCache(): void {
		this.cache.clear();
		this.stats.cacheHits = 0;
		this.stats.cacheMisses = 0;
		this.stats.totalSearches = 0;
		this.updateCacheHitRate();
	}
}

let optimizedSearchEngine: OptimizedSearchEngine;

export function initOptimizedSearchEngine(): OptimizedSearchEngine {
	optimizedSearchEngine = new OptimizedSearchEngine();
	return optimizedSearchEngine;
}

export function getOptimizedSearchEngine(): OptimizedSearchEngine {
	return optimizedSearchEngine;
}
