import { App, Editor, EditorPosition, EditorSuggestContext, TFile } from "obsidian";
import { 
    NameAutoCompletion, 
    AutoCompletionSuggestion 
} from "../editor/auto-completion";
import { PersonMetadata, generatePersonId } from "../core/model";
import { DefFileType } from "../core/file-type";
import { Settings, DEFAULT_SETTINGS } from "../settings";

jest.mock('obsidian');

// Mock the def file manager
jest.mock('../core/def-file-manager', () => ({
    getDefFileManager: () => ({
        getAllPeople: jest.fn(() => [
            {
                id: 'john-smith-test',
                fullName: 'John Smith',
                position: 'Developer',
                department: 'Engineering',
                notes: 'Test person',
                file: { path: 'test.md' } as any,
                linkText: 'John Smith',
                fileType: 'consolidated' as any
            },
            {
                id: 'jane-doe-test',
                fullName: 'Jane Doe',
                position: 'Manager',
                department: 'Management',
                notes: 'Test manager',
                file: { path: 'test.md' } as any,
                linkText: 'Jane Doe',
                fileType: 'consolidated' as any
            }
        ])
    })
}));

// Mock settings
let mockSettings: Partial<Settings> = { ...DEFAULT_SETTINGS };
jest.mock('../settings', () => ({
    getSettings: () => mockSettings,
    DEFAULT_SETTINGS: {
        autoCompletionConfig: {
            enabled: true,
            triggerPattern: "@name:",
            minQueryLength: 1,
            maxSuggestions: 10,
            showMentionCounts: true,
            showCompanyInfo: true,
            showPositionInfo: true
        }
    }
}));

// Mock mention counting service
jest.mock('../core/mention-counting-service', () => ({
    getMentionCountingService: () => ({
        getMentionCountByName: jest.fn((name: string) => ({
            fullName: name,
            totalMentions: 5,
            textMentions: 3,
            taskMentions: 2
        }))
    })
}));

describe('NameAutoCompletion', () => {
    let autoCompletion: NameAutoCompletion;
    let mockApp: jest.Mocked<App>;
    let mockEditor: jest.Mocked<Editor>;
    let mockFile: jest.Mocked<TFile>;

    beforeEach(() => {
        mockApp = {} as any;
        
        mockEditor = {
            getLine: jest.fn(),
            getCursor: jest.fn(),
            replaceRange: jest.fn()
        } as any;

        mockFile = {
            path: "test.md",
            basename: "test",
            extension: "md"
        } as any;

        autoCompletion = new NameAutoCompletion(mockApp);
        
        // Reset mock settings
        mockSettings = {
            ...DEFAULT_SETTINGS,
            autoCompletionConfig: {
                enabled: true,
                triggerPattern: "@name:",
                minQueryLength: 1,
                maxSuggestions: 10,
                showMentionCounts: true,
                showCompanyInfo: true,
                showPositionInfo: true
            }
        };
    });

    describe('Initialization', () => {
        test('should initialize correctly', () => {
            expect(autoCompletion).toBeInstanceOf(NameAutoCompletion);
            expect(autoCompletion.app).toBe(mockApp);
        });
    });

    describe('Trigger Detection', () => {
        test('should detect trigger pattern correctly', () => {
            mockEditor.getLine.mockReturnValue("Meeting with @name:John");
            const cursor: EditorPosition = { line: 0, ch: 23 }; // End of "John"

            const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);

            expect(trigger).toBeDefined();
            expect(trigger?.query).toBe("John");
            expect(trigger?.start).toEqual({ line: 0, ch: 13 }); // Start of "@name:"
            expect(trigger?.end).toEqual(cursor);
        });

        test('should not trigger without pattern', () => {
            mockEditor.getLine.mockReturnValue("Meeting with John Smith");
            const cursor: EditorPosition = { line: 0, ch: 23 };

            const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);
            
            expect(trigger).toBeNull();
        });

        test('should handle custom trigger patterns', () => {
            mockSettings.autoCompletionConfig!.triggerPattern = "@@person:";
            
            mockEditor.getLine.mockReturnValue("Contact @@person:Jane");
            const cursor: EditorPosition = { line: 0, ch: 21 };

            const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);
            
            expect(trigger).toBeDefined();
            expect(trigger?.query).toBe("Jane");
        });

        test('should respect minimum query length', () => {
            mockSettings.autoCompletionConfig!.minQueryLength = 3;
            
            mockEditor.getLine.mockReturnValue("Meeting with @name:Jo");
            const cursor: EditorPosition = { line: 0, ch: 21 };

            const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);
            
            expect(trigger).toBeNull(); // Query "Jo" is too short
        });

        test('should not trigger when disabled', () => {
            mockSettings.autoCompletionConfig!.enabled = false;
            
            mockEditor.getLine.mockReturnValue("Meeting with @name:John");
            const cursor: EditorPosition = { line: 0, ch: 23 };

            const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);
            
            expect(trigger).toBeNull();
        });

        test('should handle trigger at line start', () => {
            mockEditor.getLine.mockReturnValue("@name:John");
            const cursor: EditorPosition = { line: 0, ch: 10 };

            const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);
            
            expect(trigger).toBeDefined();
            expect(trigger?.query).toBe("John");
        });

        test('should not trigger with spaces after pattern', () => {
            mockEditor.getLine.mockReturnValue("Meeting with @name: John");
            const cursor: EditorPosition = { line: 0, ch: 24 };

            const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);
            
            expect(trigger).toBeNull();
        });
    });

    describe('Suggestion Generation', () => {
        test('should generate suggestions for partial names', () => {
            const context: EditorSuggestContext = {
                query: "John",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 10 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);
            
            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThan(0);
            
            if (suggestions.length > 0) {
                expect(suggestions[0]).toHaveProperty('person');
                expect(suggestions[0]).toHaveProperty('displayText');
                expect(suggestions[0]).toHaveProperty('insertText');
                expect(suggestions[0]).toHaveProperty('score');
            }
        });

        test('should limit suggestions based on maxSuggestions', () => {
            mockSettings.autoCompletionConfig!.maxSuggestions = 1;
            
            const context: EditorSuggestContext = {
                query: "",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 6 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);
            
            expect(suggestions.length).toBeLessThanOrEqual(1);
        });

        test('should handle empty query', () => {
            const context: EditorSuggestContext = {
                query: "",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 6 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);

            expect(Array.isArray(suggestions)).toBe(true);
        });

        test('should score suggestions appropriately', () => {
            const context: EditorSuggestContext = {
                query: "John",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 10 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);

            // Suggestions should be sorted by score (highest first)
            for (let i = 1; i < suggestions.length; i++) {
                expect(suggestions[i-1].score).toBeGreaterThanOrEqual(suggestions[i].score);
            }
        });

        test('should filter out low-score suggestions', () => {
            const context: EditorSuggestContext = {
                query: "xyz", // Query that shouldn't match anyone
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 9 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);

            // Should filter out suggestions with score 0
            suggestions.forEach(suggestion => {
                expect(suggestion.score).toBeGreaterThan(0);
            });
        });
    });

    describe('Suggestion Rendering', () => {
        test('should render suggestion correctly', () => {
            const suggestion: AutoCompletionSuggestion = {
                person: {
                    id: 'test-id',
                    fullName: 'John Smith',
                    position: 'Developer',
                    department: 'Engineering',
                    notes: 'Test person',
                    file: { path: 'test.md' } as TFile,
                    linkText: 'John Smith',
                    fileType: DefFileType.Consolidated
                },
                displayText: 'John Smith (Developer)',
                insertText: 'John Smith',
                mentionCount: 5,
                score: 100
            };

            const mockElement = {
                setText: jest.fn(),
                empty: jest.fn(),
                createEl: jest.fn(() => ({
                    setText: jest.fn(),
                    addClass: jest.fn(),
                    style: {}
                })),
                addClass: jest.fn(),
                style: {}
            };

            expect(() => {
                autoCompletion.renderSuggestion(suggestion, mockElement as any);
            }).not.toThrow();
        });
    });

    describe('Suggestion Selection', () => {
        test('should select suggestion correctly', () => {
            const suggestion: AutoCompletionSuggestion = {
                person: {
                    id: 'test-id',
                    fullName: 'John Smith',
                    position: 'Developer',
                    department: 'Engineering',
                    notes: 'Test person',
                    file: { path: 'test.md' } as TFile,
                    linkText: 'John Smith',
                    fileType: DefFileType.Consolidated
                },
                displayText: 'John Smith (Developer)',
                insertText: 'John Smith',
                mentionCount: 5,
                score: 100
            };

            const mockEvent = {} as MouseEvent;

            expect(() => {
                autoCompletion.selectSuggestion(suggestion, mockEvent);
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle errors in trigger detection gracefully', () => {
            mockEditor.getLine.mockImplementation(() => {
                throw new Error("Editor error");
            });

            const cursor: EditorPosition = { line: 0, ch: 10 };
            
            expect(() => {
                const trigger = autoCompletion.onTrigger(cursor, mockEditor, mockFile);
                expect(trigger).toBeNull();
            }).not.toThrow();
        });

        test('should handle errors in suggestion generation gracefully', () => {
            const context: EditorSuggestContext = {
                query: "John",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 10 },
                editor: mockEditor,
                file: mockFile
            };

            // Temporarily override the mock to throw error
            const originalMock = jest.requireMock('../core/def-file-manager');
            originalMock.getDefFileManager = jest.fn(() => {
                throw new Error("DefManager error");
            });

            expect(() => {
                const suggestions = autoCompletion.getSuggestions(context);
                expect(Array.isArray(suggestions)).toBe(true);
                expect(suggestions).toHaveLength(0);
            }).not.toThrow();
        });

        test('should handle missing def manager', () => {
            const context: EditorSuggestContext = {
                query: "John",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 10 },
                editor: mockEditor,
                file: mockFile
            };

            // Temporarily override the mock to return null
            const originalMock = jest.requireMock('../core/def-file-manager');
            originalMock.getDefFileManager = jest.fn(() => null);

            const suggestions = autoCompletion.getSuggestions(context);
            expect(suggestions).toHaveLength(0);
        });
    });

    describe('Performance Tests', () => {
        test('should handle large numbers of people efficiently', () => {
            // Mock large people list
            const largePeopleList: any[] = [];
            for (let i = 0; i < 1000; i++) {
                largePeopleList.push({
                    id: `person-${i}`,
                    fullName: `Person ${i}`,
                    position: `Position ${i}`,
                    department: `Department ${i}`,
                    notes: `Notes ${i}`,
                    file: { path: 'test.md' },
                    linkText: `Person ${i}`,
                    fileType: 'consolidated'
                });
            }

            // Override the mock temporarily
            const originalMock = jest.requireMock('../core/def-file-manager');
            originalMock.getDefFileManager = jest.fn(() => ({
                getAllPeople: () => largePeopleList
            }));

            const context: EditorSuggestContext = {
                query: "Person 5",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 14 },
                editor: mockEditor,
                file: mockFile
            };

            const start = performance.now();
            const suggestions = autoCompletion.getSuggestions(context);
            const time = performance.now() - start;

            expect(time).toBeLessThan(100); // Should complete in under 100ms
            expect(Array.isArray(suggestions)).toBe(true);
        });
    });

    describe('Configuration Integration', () => {
        test('should respect showMentionCounts setting', () => {
            mockSettings.autoCompletionConfig!.showMentionCounts = false;

            const context: EditorSuggestContext = {
                query: "John",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 10 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);

            // Should still generate suggestions but without mention counts in display
            expect(Array.isArray(suggestions)).toBe(true);
        });

        test('should respect showCompanyInfo setting', () => {
            mockSettings.autoCompletionConfig!.showCompanyInfo = false;

            const context: EditorSuggestContext = {
                query: "John",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 10 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);

            // Should still generate suggestions but without company info in display
            expect(Array.isArray(suggestions)).toBe(true);
        });

        test('should respect showPositionInfo setting', () => {
            mockSettings.autoCompletionConfig!.showPositionInfo = false;

            const context: EditorSuggestContext = {
                query: "John",
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 10 },
                editor: mockEditor,
                file: mockFile
            };

            const suggestions = autoCompletion.getSuggestions(context);

            // Should still generate suggestions but without position info in display
            expect(Array.isArray(suggestions)).toBe(true);
        });
    });
});
