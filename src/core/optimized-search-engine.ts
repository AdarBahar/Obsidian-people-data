import { PersonMetadata } from "./model";
import { normaliseWord } from "../util/editor";
import { logInfo, logWarn } from "../util/log";

/**
 * Advanced search index for optimized name and company lookups
 * Supports large-scale datasets with multiple indexing strategies
 */
export class OptimizedSearchEngine {
    // Primary indexes
    private nameIndex: Map<string, PersonMetadata[]> = new Map();
    private companyIndex: Map<string, PersonMetadata[]> = new Map();
    private fullTextIndex: Map<string, Set<string>> = new Map(); // word -> normalized names
    
    // Performance indexes
    private prefixIndex: Map<string, Set<string>> = new Map(); // prefix -> full names
    private fuzzyIndex: Map<string, Set<string>> = new Map(); // soundex/metaphone -> names
    private bigramIndex: Map<string, Set<string>> = new Map(); // bigrams -> names
    
    // Cache for frequent lookups
    private searchCache: Map<string, PersonMetadata[]> = new Map();
    private cacheMaxSize = 1000;
    private cacheHits = 0;
    private cacheMisses = 0;
    
    // Statistics
    private totalPeople = 0;
    private totalCompanies = 0;
    private indexBuildTime = 0;

    constructor() {
        this.clear();
    }

    /**
     * Add a person to all indexes
     */
    addPerson(person: PersonMetadata): void {
        const normalizedName = normaliseWord(person.fullName);
        const normalizedCompany = person.companyName ? normaliseWord(person.companyName) : '';

        // Primary name index
        if (!this.nameIndex.has(normalizedName)) {
            this.nameIndex.set(normalizedName, []);
        }
        this.nameIndex.get(normalizedName)!.push(person);

        // Company index
        if (normalizedCompany) {
            if (!this.companyIndex.has(normalizedCompany)) {
                this.companyIndex.set(normalizedCompany, []);
            }
            this.companyIndex.get(normalizedCompany)!.push(person);
        }

        // Full-text index (index individual words)
        this.indexWords(normalizedName, normalizedName);
        if (person.position) {
            this.indexWords(normaliseWord(person.position), normalizedName);
        }
        if (person.department) {
            this.indexWords(normaliseWord(person.department), normalizedName);
        }

        // Prefix index for autocomplete
        this.buildPrefixIndex(normalizedName);

        // Fuzzy search index
        this.buildFuzzyIndex(normalizedName);

        // Bigram index for partial matching
        this.buildBigramIndex(normalizedName);

        this.totalPeople++;
        if (normalizedCompany && !this.companyIndex.has(normalizedCompany)) {
            this.totalCompanies++;
        }
    }

    /**
     * Fast exact name lookup
     */
    findByName(name: string): PersonMetadata[] {
        const normalizedName = normaliseWord(name);
        const cacheKey = `name:${normalizedName}`;
        
        if (this.searchCache.has(cacheKey)) {
            this.cacheHits++;
            return this.searchCache.get(cacheKey)!;
        }

        const result = this.nameIndex.get(normalizedName) || [];
        this.updateCache(cacheKey, result);
        this.cacheMisses++;
        return result;
    }

    /**
     * Fast company lookup
     */
    findByCompany(company: string): PersonMetadata[] {
        const normalizedCompany = normaliseWord(company);
        const cacheKey = `company:${normalizedCompany}`;
        
        if (this.searchCache.has(cacheKey)) {
            this.cacheHits++;
            return this.searchCache.get(cacheKey)!;
        }

        const result = this.companyIndex.get(normalizedCompany) || [];
        this.updateCache(cacheKey, result);
        this.cacheMisses++;
        return result;
    }

    /**
     * Prefix search for autocomplete
     */
    findByPrefix(prefix: string, limit: number = 10): PersonMetadata[] {
        const normalizedPrefix = normaliseWord(prefix);
        const cacheKey = `prefix:${normalizedPrefix}:${limit}`;
        
        if (this.searchCache.has(cacheKey)) {
            this.cacheHits++;
            return this.searchCache.get(cacheKey)!;
        }

        const matchingNames = this.prefixIndex.get(normalizedPrefix) || new Set();
        const results: PersonMetadata[] = [];
        
        for (const name of matchingNames) {
            if (results.length >= limit) break;
            const people = this.nameIndex.get(name) || [];
            results.push(...people);
        }

        this.updateCache(cacheKey, results);
        this.cacheMisses++;
        return results;
    }

    /**
     * Fuzzy search for typo tolerance
     */
    findFuzzy(query: string, limit: number = 10): PersonMetadata[] {
        const fuzzyKey = this.generateFuzzyKey(normaliseWord(query));
        const cacheKey = `fuzzy:${fuzzyKey}:${limit}`;
        
        if (this.searchCache.has(cacheKey)) {
            this.cacheHits++;
            return this.searchCache.get(cacheKey)!;
        }

        const matchingNames = this.fuzzyIndex.get(fuzzyKey) || new Set();
        const results: PersonMetadata[] = [];
        
        for (const name of matchingNames) {
            if (results.length >= limit) break;
            const people = this.nameIndex.get(name) || [];
            results.push(...people);
        }

        this.updateCache(cacheKey, results);
        this.cacheMisses++;
        return results;
    }

    /**
     * Full-text search across all indexed fields
     */
    searchFullText(query: string, limit: number = 20): PersonMetadata[] {
        const words = normaliseWord(query).split(/\s+/).filter(w => w.length > 0);
        const cacheKey = `fulltext:${words.join('+')}:${limit}`;
        
        if (this.searchCache.has(cacheKey)) {
            this.cacheHits++;
            return this.searchCache.get(cacheKey)!;
        }

        const candidateNames = new Set<string>();
        
        // Find names that contain any of the query words
        for (const word of words) {
            const names = this.fullTextIndex.get(word) || new Set();
            names.forEach(name => candidateNames.add(name));
        }

        // Score and rank results
        const scoredResults: Array<{person: PersonMetadata, score: number}> = [];
        
        for (const name of candidateNames) {
            const people = this.nameIndex.get(name) || [];
            for (const person of people) {
                const score = this.calculateRelevanceScore(person, words);
                if (score > 0) {
                    scoredResults.push({person, score});
                }
            }
        }

        // Sort by relevance score and limit results
        scoredResults.sort((a, b) => b.score - a.score);
        const results = scoredResults.slice(0, limit).map(r => r.person);

        this.updateCache(cacheKey, results);
        this.cacheMisses++;
        return results;
    }

    /**
     * Get all unique names for prefix tree building
     */
    getAllNames(): Set<string> {
        return new Set(this.nameIndex.keys());
    }

    /**
     * Get all unique companies
     */
    getAllCompanies(): Set<string> {
        return new Set(this.companyIndex.keys());
    }

    /**
     * Clear all indexes and cache
     */
    clear(): void {
        this.nameIndex.clear();
        this.companyIndex.clear();
        this.fullTextIndex.clear();
        this.prefixIndex.clear();
        this.fuzzyIndex.clear();
        this.bigramIndex.clear();
        this.searchCache.clear();
        this.totalPeople = 0;
        this.totalCompanies = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * Get performance statistics
     */
    getStats(): {
        totalPeople: number;
        totalCompanies: number;
        cacheHitRate: number;
        indexSizes: {
            names: number;
            companies: number;
            fullText: number;
            prefixes: number;
            fuzzy: number;
            bigrams: number;
        };
        indexBuildTime: number;
    } {
        const totalCacheRequests = this.cacheHits + this.cacheMisses;
        return {
            totalPeople: this.totalPeople,
            totalCompanies: this.totalCompanies,
            cacheHitRate: totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0,
            indexSizes: {
                names: this.nameIndex.size,
                companies: this.companyIndex.size,
                fullText: this.fullTextIndex.size,
                prefixes: this.prefixIndex.size,
                fuzzy: this.fuzzyIndex.size,
                bigrams: this.bigramIndex.size,
            },
            indexBuildTime: this.indexBuildTime
        };
    }

    // Private helper methods

    private indexWords(text: string, targetName: string): void {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        for (const word of words) {
            if (!this.fullTextIndex.has(word)) {
                this.fullTextIndex.set(word, new Set());
            }
            this.fullTextIndex.get(word)!.add(targetName);
        }
    }

    private buildPrefixIndex(name: string): void {
        for (let i = 1; i <= name.length; i++) {
            const prefix = name.substring(0, i);
            if (!this.prefixIndex.has(prefix)) {
                this.prefixIndex.set(prefix, new Set());
            }
            this.prefixIndex.get(prefix)!.add(name);
        }
    }

    private buildFuzzyIndex(name: string): void {
        const fuzzyKey = this.generateFuzzyKey(name);
        if (!this.fuzzyIndex.has(fuzzyKey)) {
            this.fuzzyIndex.set(fuzzyKey, new Set());
        }
        this.fuzzyIndex.get(fuzzyKey)!.add(name);
    }

    private buildBigramIndex(name: string): void {
        for (let i = 0; i < name.length - 1; i++) {
            const bigram = name.substring(i, i + 2);
            if (!this.bigramIndex.has(bigram)) {
                this.bigramIndex.set(bigram, new Set());
            }
            this.bigramIndex.get(bigram)!.add(name);
        }
    }

    private generateFuzzyKey(text: string): string {
        // Simple soundex-like algorithm for fuzzy matching
        return text
            .replace(/[aeiou]/g, '') // Remove vowels
            .replace(/(.)\1+/g, '$1') // Remove consecutive duplicates
            .substring(0, 4) // Take first 4 characters
            .padEnd(4, '0'); // Pad to 4 characters
    }

    private calculateRelevanceScore(person: PersonMetadata, queryWords: string[]): number {
        let score = 0;
        const nameWords = normaliseWord(person.fullName).split(/\s+/);
        const companyWords = person.companyName ? normaliseWord(person.companyName).split(/\s+/) : [];
        
        for (const queryWord of queryWords) {
            // Exact name match gets highest score
            if (nameWords.includes(queryWord)) {
                score += 10;
            }
            // Partial name match
            else if (nameWords.some(w => w.includes(queryWord))) {
                score += 5;
            }
            // Company match
            else if (companyWords.includes(queryWord)) {
                score += 3;
            }
            // Position/department match
            else if (person.position && normaliseWord(person.position).includes(queryWord)) {
                score += 2;
            }
            else if (person.department && normaliseWord(person.department).includes(queryWord)) {
                score += 2;
            }
        }
        
        return score;
    }

    private updateCache(key: string, result: PersonMetadata[]): void {
        if (this.searchCache.size >= this.cacheMaxSize) {
            // Simple LRU: remove first entry
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        this.searchCache.set(key, result);
    }
}
