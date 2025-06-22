/**
 * Optimized Prefix Tree (Trie) implementation for large-scale name matching
 * Features: compressed paths, memory optimization, and fast traversal
 */

export interface TrieNode {
    children: Map<string, TrieNode>;
    isWordEnd: boolean;
    // Compressed path optimization
    compressedPath?: string;
    // Store full words at leaf nodes for faster retrieval
    words?: Set<string>;
    // Reference counting for memory management
    refCount: number;
}

export class OptimizedPrefixTree {
    private root: TrieNode;
    private totalWords: number = 0;
    private totalNodes: number = 0;
    private compressionRatio: number = 0;

    constructor() {
        this.root = this.createNode();
    }

    /**
     * Add a word to the trie with path compression
     */
    add(word: string): void {
        if (!word || word.length === 0) return;
        
        const normalizedWord = word.toLowerCase().trim();
        if (this.contains(normalizedWord)) return; // Avoid duplicates
        
        this.insertWord(this.root, normalizedWord, 0);
        this.totalWords++;
    }

    /**
     * Check if a word exists in the trie
     */
    contains(word: string): boolean {
        const normalizedWord = word.toLowerCase().trim();
        return this.search(this.root, normalizedWord, 0) !== null;
    }

    /**
     * Find all words with a given prefix
     */
    findWordsWithPrefix(prefix: string, limit: number = 50): string[] {
        const normalizedPrefix = prefix.toLowerCase().trim();
        const node = this.search(this.root, normalizedPrefix, 0);
        
        if (!node) return [];
        
        const results: string[] = [];
        this.collectWords(node, normalizedPrefix, results, limit);
        return results;
    }

    /**
     * Get all words in the trie
     */
    getAllWords(): string[] {
        const results: string[] = [];
        this.collectWords(this.root, '', results, Number.MAX_SAFE_INTEGER);
        return results;
    }

    /**
     * Create an optimized traverser for real-time scanning
     */
    createTraverser(): OptimizedTrieTraverser {
        return new OptimizedTrieTraverser(this.root);
    }

    /**
     * Compress the trie to reduce memory usage
     */
    compress(): void {
        const startTime = Date.now();
        const originalNodes = this.totalNodes;
        
        this.compressNode(this.root);
        
        const endTime = Date.now();
        this.compressionRatio = (originalNodes - this.totalNodes) / originalNodes;
        
        console.log(`Trie compressed in ${endTime - startTime}ms. Compression ratio: ${(this.compressionRatio * 100).toFixed(2)}%`);
    }

    /**
     * Clear the trie
     */
    clear(): void {
        this.root = this.createNode();
        this.totalWords = 0;
        this.totalNodes = 0;
        this.compressionRatio = 0;
    }

    /**
     * Get trie statistics
     */
    getStats(): {
        totalWords: number;
        totalNodes: number;
        compressionRatio: number;
        memoryEstimate: number;
        averageDepth: number;
    } {
        return {
            totalWords: this.totalWords,
            totalNodes: this.totalNodes,
            compressionRatio: this.compressionRatio,
            memoryEstimate: this.estimateMemoryUsage(),
            averageDepth: this.calculateAverageDepth()
        };
    }

    // Private methods

    private createNode(): TrieNode {
        this.totalNodes++;
        return {
            children: new Map(),
            isWordEnd: false,
            refCount: 0
        };
    }

    private insertWord(node: TrieNode, word: string, index: number): void {
        if (index === word.length) {
            node.isWordEnd = true;
            if (!node.words) {
                node.words = new Set();
            }
            node.words.add(word);
            return;
        }

        const char = word[index];
        
        if (!node.children.has(char)) {
            node.children.set(char, this.createNode());
        }
        
        const childNode = node.children.get(char)!;
        childNode.refCount++;
        
        this.insertWord(childNode, word, index + 1);
    }

    private search(node: TrieNode, word: string, index: number): TrieNode | null {
        if (index === word.length) {
            return node;
        }

        // Handle compressed paths
        if (node.compressedPath) {
            const remainingWord = word.substring(index);
            if (remainingWord.startsWith(node.compressedPath)) {
                return this.search(node, word, index + node.compressedPath.length);
            } else {
                return null;
            }
        }

        const char = word[index];
        const childNode = node.children.get(char);
        
        if (!childNode) {
            return null;
        }
        
        return this.search(childNode, word, index + 1);
    }

    private collectWords(node: TrieNode, currentPrefix: string, results: string[], limit: number): void {
        if (results.length >= limit) return;
        
        if (node.isWordEnd && node.words) {
            for (const word of node.words) {
                if (results.length >= limit) break;
                results.push(word);
            }
        }

        for (const [char, childNode] of node.children) {
            if (results.length >= limit) break;
            
            const newPrefix = node.compressedPath 
                ? currentPrefix + node.compressedPath 
                : currentPrefix + char;
                
            this.collectWords(childNode, newPrefix, results, limit);
        }
    }

    private compressNode(node: TrieNode): void {
        // Compress single-child chains
        if (node.children.size === 1 && !node.isWordEnd) {
            const [char, childNode] = node.children.entries().next().value;
            
            if (childNode.children.size === 1 && !childNode.isWordEnd) {
                // Merge this node with its child
                const compressedPath = char + (childNode.compressedPath || '');
                node.compressedPath = compressedPath;
                node.children = childNode.children;
                node.isWordEnd = childNode.isWordEnd;
                node.words = childNode.words;
                this.totalNodes--; // One less node after compression
            }
        }

        // Recursively compress children
        for (const childNode of node.children.values()) {
            this.compressNode(childNode);
        }
    }

    private estimateMemoryUsage(): number {
        // Rough estimate: each node ~100 bytes, each character ~2 bytes
        return this.totalNodes * 100 + this.totalWords * 20;
    }

    private calculateAverageDepth(): number {
        if (this.totalWords === 0) return 0;
        
        let totalDepth = 0;
        let wordCount = 0;
        
        const calculateDepth = (node: TrieNode, depth: number): void => {
            if (node.isWordEnd && node.words) {
                totalDepth += depth * node.words.size;
                wordCount += node.words.size;
            }
            
            for (const childNode of node.children.values()) {
                const childDepth = node.compressedPath 
                    ? depth + node.compressedPath.length 
                    : depth + 1;
                calculateDepth(childNode, childDepth);
            }
        };
        
        calculateDepth(this.root, 0);
        return wordCount > 0 ? totalDepth / wordCount : 0;
    }
}

/**
 * Optimized traverser for real-time text scanning
 */
export class OptimizedTrieTraverser {
    private currentNode: TrieNode | null;
    private wordBuffer: string[] = [];
    private compressedIndex: number = 0;

    constructor(private root: TrieNode) {
        this.currentNode = root;
    }

    /**
     * Move to the next character
     */
    gotoNext(char: string): boolean {
        if (!this.currentNode) return false;

        const lowerChar = char.toLowerCase();

        // Handle compressed paths
        if (this.currentNode.compressedPath) {
            if (this.compressedIndex < this.currentNode.compressedPath.length) {
                if (this.currentNode.compressedPath[this.compressedIndex] === lowerChar) {
                    this.wordBuffer.push(lowerChar);
                    this.compressedIndex++;
                    
                    // If we've consumed the entire compressed path, move to children
                    if (this.compressedIndex === this.currentNode.compressedPath.length) {
                        this.compressedIndex = 0;
                        this.currentNode.compressedPath = undefined; // Clear for next traversal
                    }
                    return true;
                } else {
                    this.currentNode = null;
                    return false;
                }
            }
        }

        // Normal character traversal
        const nextNode = this.currentNode.children.get(lowerChar);
        if (nextNode) {
            this.currentNode = nextNode;
            this.wordBuffer.push(lowerChar);
            return true;
        } else {
            this.currentNode = null;
            return false;
        }
    }

    /**
     * Check if current position represents a complete word
     */
    isWordEnd(): boolean {
        return this.currentNode?.isWordEnd || false;
    }

    /**
     * Get the current word being built
     */
    getWord(): string {
        return this.wordBuffer.join('');
    }

    /**
     * Get all complete words at current position
     */
    getWords(): string[] {
        if (!this.currentNode?.words) return [];
        return Array.from(this.currentNode.words);
    }

    /**
     * Reset traverser to root
     */
    reset(): void {
        this.currentNode = this.root;
        this.wordBuffer = [];
        this.compressedIndex = 0;
    }

    /**
     * Check if traverser is still valid (not at dead end)
     */
    isValid(): boolean {
        return this.currentNode !== null;
    }

    /**
     * Clone the traverser for parallel processing
     */
    clone(): OptimizedTrieTraverser {
        const cloned = new OptimizedTrieTraverser(this.root);
        cloned.currentNode = this.currentNode;
        cloned.wordBuffer = [...this.wordBuffer];
        cloned.compressedIndex = this.compressedIndex;
        return cloned;
    }
}
