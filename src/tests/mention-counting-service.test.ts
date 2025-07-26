import { TFile, Vault, MetadataCache } from "obsidian";
import { MentionCountingService, MentionCount, MentionCountingStats } from "../core/mention-counting-service";
import { PersonMetadata, generatePersonId } from "../core/model";
import { DefFileType } from "../core/file-type";

jest.mock('obsidian');

// Mock the smart line scanner
jest.mock('../core/smart-line-scanner', () => ({
    getSmartLineScanner: () => ({
        scanLine: jest.fn(() => [])
    })
}));

// Mock the optimized search engine
jest.mock('../core/optimized-search-engine', () => ({
    getOptimizedSearchEngine: () => ({
        search: jest.fn(() => [])
    })
}));

describe('MentionCountingService', () => {
    let mentionService: MentionCountingService;
    let mockVault: jest.Mocked<Vault>;
    let mockMetadataCache: jest.Mocked<MetadataCache>;
    let testPeople: PersonMetadata[];
    let testFiles: TFile[];

    beforeEach(() => {
        // Setup mock vault
        mockVault = {
            getMarkdownFiles: jest.fn(),
            read: jest.fn(),
        } as any;

        // Setup mock metadata cache
        mockMetadataCache = {
            getFileCache: jest.fn(),
        } as any;

        // Create test people
        testPeople = [
            {
                id: generatePersonId("John Smith", "company-a.md"),
                fullName: "John Smith",
                position: "Developer",
                department: "Engineering",
                notes: "Test person",
                file: { path: "company-a.md" } as TFile,
                linkText: "John Smith",
                fileType: DefFileType.Consolidated,
                companyName: "Company A"
            },
            {
                id: generatePersonId("Jane Doe", "company-b.md"),
                fullName: "Jane Doe",
                position: "Manager",
                department: "Management",
                notes: "Test manager",
                file: { path: "company-b.md" } as TFile,
                linkText: "Jane Doe",
                fileType: DefFileType.Consolidated,
                companyName: "Company B"
            }
        ];

        // Create test files
        testFiles = [
            { path: "notes/meeting.md", basename: "meeting", extension: "md" } as TFile,
            { path: "notes/project.md", basename: "project", extension: "md" } as TFile,
            { path: "company-a.md", basename: "company-a", extension: "md" } as TFile,
        ];

        mentionService = new MentionCountingService(mockVault, mockMetadataCache);
    });

    describe('Basic Functionality', () => {
        test('should initialize with empty mention counts', () => {
            const stats = mentionService.getStats();
            expect(stats.totalFilesScanned).toBe(0);
            expect(stats.totalMentionsFound).toBe(0);
            expect(stats.filesWithMentions).toBe(0);
        });

        test('should generate consistent mention IDs', () => {
            // Test the private getMentionId method through public API
            const johnMention1 = mentionService.getMentionCountByName("John Smith");
            const johnMention2 = mentionService.getMentionCountByName("john smith");
            const johnMention3 = mentionService.getMentionCountByName("JOHN SMITH");
            
            // All should be undefined initially (no scan performed)
            expect(johnMention1).toBeUndefined();
            expect(johnMention2).toBeUndefined();
            expect(johnMention3).toBeUndefined();
        });
    });

    describe('Full Scan Functionality', () => {
        test('should perform full scan and initialize mention counts', async () => {
            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 2)); // Exclude definition files
            mockVault.read.mockResolvedValue("Some content without mentions");
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await mentionService.performFullScan(testPeople);

            // Should have initialized mention counts for all people
            const johnMentions = mentionService.getMentionCountByName("John Smith");
            const janeMentions = mentionService.getMentionCountByName("Jane Doe");

            expect(johnMentions).toBeDefined();
            expect(johnMentions?.fullName).toBe("John Smith");
            expect(johnMentions?.totalMentions).toBe(0);

            expect(janeMentions).toBeDefined();
            expect(janeMentions?.fullName).toBe("Jane Doe");
            expect(janeMentions?.totalMentions).toBe(0);
        });

        test('should detect text mentions correctly', async () => {
            const testContent = `
# Meeting Notes

John Smith attended the meeting today. He provided great insights.
Jane Doe was also present and shared her thoughts.
John Smith's presentation was excellent.
            `.trim();

            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockResolvedValue(testContent);
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await mentionService.performFullScan(testPeople);

            const johnMentions = mentionService.getMentionCountByName("John Smith");
            const janeMentions = mentionService.getMentionCountByName("Jane Doe");

            expect(johnMentions?.totalMentions).toBeGreaterThan(0);
            expect(janeMentions?.totalMentions).toBeGreaterThan(0);
        });

        test('should detect task mentions correctly', async () => {
            const testContent = `
# Action Items

- [ ] John Smith will review the proposal
- [x] Jane Doe sent the updated timeline
- [ ] Follow up with John Smith next week
            `.trim();

            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockResolvedValue(testContent);
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await mentionService.performFullScan(testPeople);

            const johnMentions = mentionService.getMentionCountByName("John Smith");
            const janeMentions = mentionService.getMentionCountByName("Jane Doe");

            expect(johnMentions?.totalMentions).toBeGreaterThan(0);
            expect(janeMentions?.totalMentions).toBeGreaterThan(0);
        });

        test('should skip people definition files', async () => {
            mockVault.getMarkdownFiles.mockReturnValue(testFiles);
            mockVault.read.mockResolvedValue("John Smith is mentioned here.");
            
            // Mock metadata cache to return def-type for company files
            mockMetadataCache.getFileCache.mockImplementation((file) => {
                if (file.path === "company-a.md") {
                    return {
                        frontmatter: { 'def-type': 'consolidated' }
                    } as any;
                }
                return null;
            });

            await mentionService.performFullScan(testPeople);

            const stats = mentionService.getStats();
            expect(stats.totalFilesScanned).toBe(2); // Should skip company-a.md
        });
    });

    describe('Statistics and Performance', () => {
        test('should track scanning statistics', async () => {
            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 2));
            mockVault.read.mockResolvedValue("John Smith and Jane Doe worked together.");
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await mentionService.performFullScan(testPeople);

            const stats = mentionService.getStats();
            expect(stats.totalFilesScanned).toBe(2);
            expect(stats.lastFullScan).toBeGreaterThan(0);
            // averageScanTime might be 0 for very fast operations
            expect(stats.averageScanTime).toBeGreaterThanOrEqual(0);
        });

        test('should provide top mentioned people', async () => {
            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockResolvedValue("John Smith John Smith John Smith. Jane Doe.");
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await mentionService.performFullScan(testPeople);

            const topMentioned = mentionService.getTopMentioned(2);
            expect(topMentioned).toHaveLength(2);
            expect(topMentioned[0].person).toBe("John Smith");
            expect(topMentioned[1].person).toBe("Jane Doe");
        });

        test('should handle empty top mentioned list', () => {
            const topMentioned = mentionService.getTopMentioned(5);
            expect(topMentioned).toHaveLength(0);
        });
    });

    describe('Multi-Company Support', () => {
        test('should aggregate mentions for same person across companies', async () => {
            // Create same person in multiple companies
            const johnInCompanyA = testPeople[0];
            const johnInCompanyB = {
                ...johnInCompanyA,
                id: generatePersonId("John Smith", "company-b.md"),
                file: { path: "company-b.md" } as TFile,
                companyName: "Company B"
            };

            const peopleWithDuplicates = [johnInCompanyA, johnInCompanyB, testPeople[1]];

            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockResolvedValue("John Smith is mentioned here.");
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await mentionService.performFullScan(peopleWithDuplicates);

            // Both should get the same mention count by name
            const mentionCount = mentionService.getMentionCountByName("John Smith");
            expect(mentionCount).toBeDefined();
            expect(mentionCount?.fullName).toBe("John Smith");
        });
    });

    describe('Error Handling', () => {
        test('should handle file read errors gracefully', async () => {
            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockRejectedValue(new Error("File not found"));
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await expect(mentionService.performFullScan(testPeople)).resolves.not.toThrow();

            const stats = mentionService.getStats();
            expect(stats.totalFilesScanned).toBe(1);
        });

        test('should handle malformed file content', async () => {
            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockResolvedValue(""); // Empty content
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await expect(mentionService.performFullScan(testPeople)).resolves.not.toThrow();

            const stats = mentionService.getStats();
            expect(stats.totalFilesScanned).toBe(1);
        });

        test('should handle empty people list', async () => {
            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockResolvedValue("Some content");
            mockMetadataCache.getFileCache.mockReturnValue(null);

            await expect(mentionService.performFullScan([])).resolves.not.toThrow();

            const stats = mentionService.getStats();
            expect(stats.totalFilesScanned).toBe(1);
        });
    });

    describe('Performance Tests', () => {
        test('should handle large numbers of people efficiently', async () => {
            // Create large people list
            const largePeopleList: PersonMetadata[] = [];
            for (let i = 0; i < 100; i++) {
                largePeopleList.push({
                    id: generatePersonId(`Person ${i}`, "large-company.md"),
                    fullName: `Person ${i}`,
                    position: `Position ${i}`,
                    department: `Department ${i}`,
                    notes: `Notes ${i}`,
                    file: { path: "large-company.md" } as TFile,
                    linkText: `Person ${i}`,
                    fileType: DefFileType.Consolidated,
                    companyName: `Company ${i}`
                });
            }

            mockVault.getMarkdownFiles.mockReturnValue(testFiles.slice(0, 1));
            mockVault.read.mockResolvedValue("Person 50 is mentioned here.");
            mockMetadataCache.getFileCache.mockReturnValue(null);

            const start = performance.now();
            await mentionService.performFullScan(largePeopleList);
            const time = performance.now() - start;

            expect(time).toBeLessThan(1000); // Should complete in under 1 second

            const stats = mentionService.getStats();
            expect(stats.totalFilesScanned).toBe(1);
        });
    });
});
