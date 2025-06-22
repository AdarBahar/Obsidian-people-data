import { OptimizedPrefixTree, OptimizedTrieTraverser } from "./optimized-prefix-tree";
import { OptimizedSearchEngine } from "./optimized-search-engine";
import { PhraseInfo } from "../editor/definition-search";

/**
 * High-performance line scanner optimized for large datasets
 * Uses multiple scanning strategies and caching for maximum efficiency
 */
export class OptimizedLineScanner {
    private prefixTree: OptimizedPrefixTree;
    private searchEngine: OptimizedSearchEngine;
    
    // Performance optimizations
    private scanCache: Map<string, PhraseInfo[]> = new Map();
    private maxCacheSize = 500;
    private cacheHits = 0;
    private cacheMisses = 0;
    
    // Regex patterns for optimization
    private readonly cnLangRegex = /\p{Script=Han}/u;
    private readonly terminatingCharRegex = /[!@#$%^&*()\+={}[\]:;"'<>,.?\/|\\\r\n （）＊＋，－／：；＜＝＞＠［＼］＾＿｀｛｜｝～｟｠｢｣､　、〃〈〉《》「」『』【】〔〕〖〗〘〙〚〛〜〝〞〟—''‛""„‟…‧﹏﹑﹔·。]/;
    private readonly wordBoundaryRegex = /\b/;
    
    // Performance tracking
    private scanCount = 0;
    private totalScanTime = 0;

    constructor(prefixTree: OptimizedPrefixTree, searchEngine: OptimizedSearchEngine) {
        this.prefixTree = prefixTree;
        this.searchEngine = searchEngine;
    }

    /**
     * Scan a line for name matches with multiple optimization strategies
     */
    scanLine(line: string, offset: number = 0): PhraseInfo[] {
        const startTime = performance.now();
        this.scanCount++;

        // Check cache first
        const cacheKey = `${line}:${offset}`;
        if (this.scanCache.has(cacheKey)) {
            this.cacheHits++;
            return this.scanCache.get(cacheKey)!;
        }

        let results: PhraseInfo[] = [];

        // Strategy 1: Fast prefix tree scanning for exact matches
        const prefixResults = this.scanWithPrefixTree(line, offset);
        results.push(...prefixResults);

        // Strategy 2: Word boundary optimization for common cases
        if (results.length === 0 && line.length < 200) {
            const wordResults = this.scanWithWordBoundaries(line, offset);
            results.push(...wordResults);
        }

        // Strategy 3: Fuzzy matching for potential typos (only if no exact matches)
        if (results.length === 0 && line.length < 100) {
            const fuzzyResults = this.scanWithFuzzyMatching(line, offset);
            results.push(...fuzzyResults);
        }

        // Remove overlapping matches and sort
        results = this.deduplicateAndSort(results);

        // Update cache
        this.updateCache(cacheKey, results);
        this.cacheMisses++;

        const endTime = performance.now();
        this.totalScanTime += endTime - startTime;

        return results;
    }

    /**
     * Batch scan multiple lines for better performance
     */
    scanLines(lines: string[], baseOffset: number = 0): PhraseInfo[] {
        const allResults: PhraseInfo[] = [];
        let currentOffset = baseOffset;

        for (const line of lines) {
            const lineResults = this.scanLine(line, currentOffset);
            allResults.push(...lineResults);
            currentOffset += line.length + 1; // +1 for newline
        }

        return this.deduplicateAndSort(allResults);
    }

    /**
     * Clear caches and reset performance counters
     */
    clearCache(): void {
        this.scanCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.scanCount = 0;
        this.totalScanTime = 0;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        scanCount: number;
        averageScanTime: number;
        cacheHitRate: number;
        cacheSize: number;
        totalScanTime: number;
    } {
        const totalRequests = this.cacheHits + this.cacheMisses;
        return {
            scanCount: this.scanCount,
            averageScanTime: this.scanCount > 0 ? this.totalScanTime / this.scanCount : 0,
            cacheHitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
            cacheSize: this.scanCache.size,
            totalScanTime: this.totalScanTime
        };
    }

    // Private scanning strategies

    private scanWithPrefixTree(line: string, offset: number): PhraseInfo[] {
        const results: PhraseInfo[] = [];
        const traversers: OptimizedTrieTraverser[] = [];

        for (let i = 0; i < line.length; i++) {
            const char = line.charAt(i).toLowerCase();
            
            // Start new traversers at valid word boundaries
            if (this.isValidStart(line, i)) {
                traversers.push(this.prefixTree.createTraverser());
            }

            // Process all active traversers
            for (let j = traversers.length - 1; j >= 0; j--) {
                const traverser = traversers[j];
                
                if (!traverser.gotoNext(char)) {
                    // Dead end, remove traverser
                    traversers.splice(j, 1);
                    continue;
                }

                // Check for complete words
                if (traverser.isWordEnd() && this.isValidEnd(line, i)) {
                    const words = traverser.getWords();
                    for (const word of words) {
                        results.push({
                            phrase: word,
                            from: offset + i - word.length + 1,
                            to: offset + i + 1
                        });
                    }
                }
            }
        }

        return results;
    }

    private scanWithWordBoundaries(line: string, offset: number): PhraseInfo[] {
        const results: PhraseInfo[] = [];
        const words = line.split(this.wordBoundaryRegex).filter(w => w.trim().length > 0);
        let currentPos = 0;

        for (const word of words) {
            const wordStart = line.indexOf(word, currentPos);
            if (wordStart === -1) continue;

            const normalizedWord = word.toLowerCase().trim();
            const matches = this.searchEngine.findByName(normalizedWord);
            
            if (matches.length > 0) {
                results.push({
                    phrase: normalizedWord,
                    from: offset + wordStart,
                    to: offset + wordStart + word.length
                });
            }

            currentPos = wordStart + word.length;
        }

        return results;
    }

    private scanWithFuzzyMatching(line: string, offset: number): PhraseInfo[] {
        const results: PhraseInfo[] = [];
        const words = line.split(/\s+/).filter(w => w.length > 2);

        for (const word of words) {
            const wordStart = line.indexOf(word);
            if (wordStart === -1) continue;

            const fuzzyMatches = this.searchEngine.findFuzzy(word, 3);
            
            if (fuzzyMatches.length > 0) {
                // Use the best fuzzy match
                const bestMatch = fuzzyMatches[0];
                results.push({
                    phrase: bestMatch.fullName.toLowerCase(),
                    from: offset + wordStart,
                    to: offset + wordStart + word.length
                });
            }
        }

        return results;
    }

    private deduplicateAndSort(results: PhraseInfo[]): PhraseInfo[] {
        // Remove duplicates and overlapping matches
        const uniqueResults = new Map<string, PhraseInfo>();
        
        for (const result of results) {
            const key = `${result.from}-${result.to}`;
            if (!uniqueResults.has(key) || 
                uniqueResults.get(key)!.phrase.length < result.phrase.length) {
                uniqueResults.set(key, result);
            }
        }

        // Sort by position, then by length (prefer longer matches)
        return Array.from(uniqueResults.values()).sort((a, b) => {
            if (a.from !== b.from) return a.from - b.from;
            return b.phrase.length - a.phrase.length;
        });
    }

    private isValidStart(line: string, ptr: number): boolean {
        const char = line.charAt(ptr).toLowerCase();
        if (char === " ") return false;
        
        if (ptr === 0 || this.isNonSpacedLanguage(char)) {
            return true;
        }
        
        return this.terminatingCharRegex.test(line.charAt(ptr - 1));
    }

    private isValidEnd(line: string, ptr: number): boolean {
        const char = line.charAt(ptr).toLowerCase();
        if (this.isNonSpacedLanguage(char)) {
            return true;
        }
        
        if (ptr === line.length - 1) {
            return true;
        }
        
        return this.terminatingCharRegex.test(line.charAt(ptr + 1));
    }

    private isNonSpacedLanguage(char: string): boolean {
        return this.cnLangRegex.test(char);
    }

    private updateCache(key: string, result: PhraseInfo[]): void {
        if (this.scanCache.size >= this.maxCacheSize) {
            // Simple LRU: remove oldest entry
            const firstKey = this.scanCache.keys().next().value;
            this.scanCache.delete(firstKey);
        }
        this.scanCache.set(key, result);
    }
}

/**
 * Factory for creating optimized scanners
 */
export class OptimizedScannerFactory {
    private static instance: OptimizedScannerFactory;
    private scanners: Map<string, OptimizedLineScanner> = new Map();

    static getInstance(): OptimizedScannerFactory {
        if (!OptimizedScannerFactory.instance) {
            OptimizedScannerFactory.instance = new OptimizedScannerFactory();
        }
        return OptimizedScannerFactory.instance;
    }

    createScanner(
        prefixTree: OptimizedPrefixTree, 
        searchEngine: OptimizedSearchEngine,
        id: string = 'default'
    ): OptimizedLineScanner {
        if (this.scanners.has(id)) {
            return this.scanners.get(id)!;
        }

        const scanner = new OptimizedLineScanner(prefixTree, searchEngine);
        this.scanners.set(id, scanner);
        return scanner;
    }

    getScanner(id: string = 'default'): OptimizedLineScanner | null {
        return this.scanners.get(id) || null;
    }

    clearAllCaches(): void {
        for (const scanner of this.scanners.values()) {
            scanner.clearCache();
        }
    }

    getGlobalStats(): {
        totalScanners: number;
        totalCacheSize: number;
        averageHitRate: number;
    } {
        let totalCacheSize = 0;
        let totalHitRate = 0;
        let validScanners = 0;

        for (const scanner of this.scanners.values()) {
            const stats = scanner.getPerformanceStats();
            totalCacheSize += stats.cacheSize;
            if (stats.cacheHitRate > 0) {
                totalHitRate += stats.cacheHitRate;
                validScanners++;
            }
        }

        return {
            totalScanners: this.scanners.size,
            totalCacheSize,
            averageHitRate: validScanners > 0 ? totalHitRate / validScanners : 0
        };
    }
}
