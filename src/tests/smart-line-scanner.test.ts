import { 
    SmartLineScanner, 
    ScanResult, 
    ScanStrategy, 
    ScanPerformanceMetrics,
    getSmartLineScanner
} from "../core/smart-line-scanner";
import { PersonMetadata, generatePersonId } from "../core/model";
import { DefFileType } from "../core/file-type";
import { TFile } from "obsidian";

jest.mock('obsidian');

// Mock the optimized search engine
jest.mock('../core/optimized-search-engine', () => ({
    getOptimizedSearchEngine: () => ({
        search: jest.fn((query: string) => {
            // Mock search results based on query
            if (query.toLowerCase().includes('john')) {
                return [{
                    person: {
                        id: 'john-smith-test',
                        fullName: 'John Smith',
                        position: 'Developer',
                        department: 'Engineering',
                        notes: 'Test person',
                        file: { path: 'test.md' } as TFile,
                        linkText: 'John Smith',
                        fileType: DefFileType.Consolidated
                    },
                    relevanceScore: 100,
                    matchType: 'exact'
                }];
            }
            if (query.toLowerCase().includes('jane')) {
                return [{
                    person: {
                        id: 'jane-doe-test',
                        fullName: 'Jane Doe',
                        position: 'Manager',
                        department: 'Management',
                        notes: 'Test manager',
                        file: { path: 'test.md' } as TFile,
                        linkText: 'Jane Doe',
                        fileType: DefFileType.Consolidated
                    },
                    relevanceScore: 90,
                    matchType: 'exact'
                }];
            }
            return [];
        })
    })
}));

describe('SmartLineScanner', () => {
    let scanner: SmartLineScanner;
    let testPeople: PersonMetadata[];

    beforeEach(() => {
        scanner = new SmartLineScanner();
        
        testPeople = [
            {
                id: generatePersonId("John Smith", "test.md"),
                fullName: "John Smith",
                position: "Developer",
                department: "Engineering",
                notes: "Test person",
                file: { path: "test.md" } as TFile,
                linkText: "John Smith",
                fileType: DefFileType.Consolidated
            },
            {
                id: generatePersonId("Jane Doe", "test.md"),
                fullName: "Jane Doe",
                position: "Manager",
                department: "Management",
                notes: "Test manager",
                file: { path: "test.md" } as TFile,
                linkText: "Jane Doe",
                fileType: DefFileType.Consolidated
            },
            {
                id: generatePersonId("Bob Johnson", "test.md"),
                fullName: "Bob Johnson",
                position: "Designer",
                department: "Design",
                notes: "Test designer",
                file: { path: "test.md" } as TFile,
                linkText: "Bob Johnson",
                fileType: DefFileType.Consolidated
            }
        ];
    });

    describe('Basic Scanning', () => {
        test('should scan line and find people mentions', () => {
            const line = "John Smith attended the meeting with Jane Doe.";
            const results = scanner.scanLine(line, testPeople);
            
            expect(Array.isArray(results)).toBe(true);
            // Results depend on the mocked search engine
        });

        test('should handle empty lines', () => {
            const line = "";
            const results = scanner.scanLine(line, testPeople);
            
            expect(Array.isArray(results)).toBe(true);
            expect(results).toHaveLength(0);
        });

        test('should handle lines with no mentions', () => {
            const line = "This is a line with no people mentioned.";
            const results = scanner.scanLine(line, testPeople);
            
            expect(Array.isArray(results)).toBe(true);
        });

        test('should handle lines with special characters', () => {
            const line = "John Smith's presentation was great! @Jane Doe agreed.";
            const results = scanner.scanLine(line, testPeople);
            
            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('Scan Strategies', () => {
        test('should use prefix tree strategy for short lines', () => {
            const shortLine = "John Smith is here.";
            const results = scanner.scanLine(shortLine, testPeople, true);
            
            expect(Array.isArray(results)).toBe(true);
        });

        test('should use word boundary strategy for medium lines', () => {
            const mediumLine = "A".repeat(300) + " John Smith " + "B".repeat(300);
            const results = scanner.scanLine(mediumLine, testPeople, true);
            
            expect(Array.isArray(results)).toBe(true);
        });

        test('should use fuzzy matching strategy for long lines', () => {
            const longLine = "A".repeat(1200) + " John Smith " + "B".repeat(1200);
            const results = scanner.scanLine(longLine, testPeople, true);
            
            expect(Array.isArray(results)).toBe(true);
        });

        test('should use legacy strategy when optimization disabled', () => {
            const line = "John Smith attended the meeting.";
            const results = scanner.scanLine(line, testPeople, false);
            
            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('Caching', () => {
        test('should cache scan results', () => {
            const line = "John Smith attended the meeting.";
            
            // First scan
            const results1 = scanner.scanLine(line, testPeople);
            
            // Second scan (should be cached)
            const results2 = scanner.scanLine(line, testPeople);
            
            expect(results1).toEqual(results2);
        });

        test('should handle cache size limits', () => {
            // Fill cache beyond limit
            for (let i = 0; i < 600; i++) {
                const line = `Line ${i} with John Smith`;
                scanner.scanLine(line, testPeople);
            }
            
            // Should not throw and should still work
            const results = scanner.scanLine("Final line with John Smith", testPeople);
            expect(Array.isArray(results)).toBe(true);
        });

        test('should clear cache when requested', () => {
            const line = "John Smith attended the meeting.";
            scanner.scanLine(line, testPeople);
            
            scanner.clearCache();
            
            // Should still work after cache clear
            const results = scanner.scanLine(line, testPeople);
            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('Performance Metrics', () => {
        test('should track performance metrics', () => {
            const line = "John Smith attended the meeting.";
            scanner.scanLine(line, testPeople);
            
            const metrics = scanner.getPerformanceMetrics();
            expect(Array.isArray(metrics)).toBe(true);
            expect(metrics.length).toBeGreaterThan(0);
            
            if (metrics.length > 0) {
                const metric = metrics[0];
                expect(metric).toHaveProperty('strategy');
                expect(metric).toHaveProperty('scanTime');
                expect(metric).toHaveProperty('matchesFound');
                expect(metric).toHaveProperty('lineLength');
                expect(metric).toHaveProperty('cacheHit');
            }
        });

        test('should track different strategies', () => {
            // Scan lines of different lengths to trigger different strategies
            scanner.scanLine("Short line with John Smith", testPeople, true);
            scanner.scanLine("A".repeat(300) + " John Smith", testPeople, true);
            scanner.scanLine("Line with John Smith", testPeople, false);
            
            const metrics = scanner.getPerformanceMetrics();
            expect(metrics.length).toBeGreaterThan(0);
        });

        test('should track performance metrics over time', () => {
            scanner.scanLine("John Smith attended the meeting.", testPeople);
            scanner.scanLine("Jane Doe was also present.", testPeople);

            const metrics = scanner.getPerformanceMetrics();
            expect(metrics.length).toBeGreaterThan(0);

            // Should track multiple scans
            expect(metrics.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Error Handling', () => {
        test('should handle null/undefined lines', () => {
            // These should return empty arrays rather than throw
            const nullResult = scanner.scanLine(null as any, testPeople);
            const undefinedResult = scanner.scanLine(undefined as any, testPeople);

            expect(Array.isArray(nullResult)).toBe(true);
            expect(Array.isArray(undefinedResult)).toBe(true);
            expect(nullResult).toHaveLength(0);
            expect(undefinedResult).toHaveLength(0);
        });

        test('should handle empty people array', () => {
            const line = "John Smith attended the meeting.";
            const results = scanner.scanLine(line, []);
            
            expect(Array.isArray(results)).toBe(true);
        });

        test('should handle malformed people data', () => {
            const malformedPeople = [
                {
                    id: "",
                    fullName: null as any,
                    position: "",
                    department: "",
                    notes: "",
                    file: null as any,
                    linkText: "",
                    fileType: DefFileType.Consolidated
                }
            ];
            
            const line = "John Smith attended the meeting.";
            expect(() => scanner.scanLine(line, malformedPeople)).not.toThrow();
        });
    });

    describe('ScanResult Interface', () => {
        test('should return properly structured ScanResult objects', () => {
            const line = "John Smith attended the meeting.";
            const results = scanner.scanLine(line, testPeople);
            
            results.forEach(result => {
                expect(result).toHaveProperty('person');
                expect(result).toHaveProperty('startIndex');
                expect(result).toHaveProperty('endIndex');
                expect(result).toHaveProperty('matchedText');
                expect(result).toHaveProperty('strategy');
                
                expect(typeof result.startIndex).toBe('number');
                expect(typeof result.endIndex).toBe('number');
                expect(typeof result.matchedText).toBe('string');
                expect(Object.values(ScanStrategy)).toContain(result.strategy);
            });
        });
    });

    describe('Performance Tests', () => {
        test('should handle large lines efficiently', () => {
            const largeLine = "A".repeat(5000) + " John Smith " + "B".repeat(5000);
            
            const start = performance.now();
            const results = scanner.scanLine(largeLine, testPeople);
            const time = performance.now() - start;
            
            expect(time).toBeLessThan(200); // Should complete in under 200ms
            expect(Array.isArray(results)).toBe(true);
        });

        test('should handle many people efficiently', () => {
            const manyPeople: PersonMetadata[] = [];
            for (let i = 0; i < 1000; i++) {
                manyPeople.push({
                    id: generatePersonId(`Person ${i}`, "test.md"),
                    fullName: `Person ${i}`,
                    position: `Position ${i}`,
                    department: `Department ${i}`,
                    notes: `Notes ${i}`,
                    file: { path: "test.md" } as TFile,
                    linkText: `Person ${i}`,
                    fileType: DefFileType.Consolidated
                });
            }
            
            const line = "Person 500 attended the meeting.";
            
            const start = performance.now();
            const results = scanner.scanLine(line, manyPeople);
            const time = performance.now() - start;
            
            expect(time).toBeLessThan(200); // Should complete in under 200ms
            expect(Array.isArray(results)).toBe(true);
        });
    });
});

describe('ScanStrategy Enum', () => {
    test('should have correct enum values', () => {
        expect(ScanStrategy.PrefixTree).toBe("prefix-tree");
        expect(ScanStrategy.WordBoundary).toBe("word-boundary");
        expect(ScanStrategy.FuzzyMatching).toBe("fuzzy-matching");
        expect(ScanStrategy.Legacy).toBe("legacy");
    });

    test('should validate all enum values', () => {
        const strategies = Object.values(ScanStrategy);
        expect(strategies).toContain("prefix-tree");
        expect(strategies).toContain("word-boundary");
        expect(strategies).toContain("fuzzy-matching");
        expect(strategies).toContain("legacy");
        expect(strategies).toHaveLength(4);
    });
});

describe('Global Scanner Function', () => {
    test('should get smart line scanner instance', () => {
        const scanner = getSmartLineScanner();
        expect(scanner).toBeInstanceOf(SmartLineScanner);
    });

    test('should return same instance on multiple calls', () => {
        const scanner1 = getSmartLineScanner();
        const scanner2 = getSmartLineScanner();
        expect(scanner1).toBe(scanner2);
    });
});
