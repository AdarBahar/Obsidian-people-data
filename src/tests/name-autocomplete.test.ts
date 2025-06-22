import { NameAutocompleteSuggest } from '../editor/name-autocomplete';
import { App, Editor, EditorPosition, TFile } from 'obsidian';
import { getDefFileManager } from '../core/def-file-manager';
import { PersonMetadata } from '../core/model';
import { DefFileType } from '../core/file-type';

// Mock the dependencies
jest.mock('../core/def-file-manager');
jest.mock('../settings');

describe('NameAutocompleteSuggest', () => {
    let nameAutocomplete: NameAutocompleteSuggest;
    let mockApp: jest.Mocked<App>;
    let mockEditor: jest.Mocked<Editor>;
    let mockFile: jest.Mocked<TFile>;
    let mockDefManager: any;

    beforeEach(() => {
        // Setup mocks
        mockApp = {} as jest.Mocked<App>;
        mockEditor = {
            getLine: jest.fn(),
            replaceRange: jest.fn(),
            setCursor: jest.fn(),
        } as any;
        mockFile = {} as jest.Mocked<TFile>;

        // Mock the definition manager
        mockDefManager = {
            useOptimizedSearch: true,
            optimizedSearchEngine: {
                findByPrefix: jest.fn(),
            },
            getDefRepo: jest.fn(() => ({
                fileDefMap: new Map(),
            })),
        };

        (getDefFileManager as jest.Mock).mockReturnValue(mockDefManager);

        // Mock settings
        const mockSettings = {
            nameAutocompleteTrigger: '@name:',
            enableNameAutocomplete: true,
        };
        require('../settings').getSettings = jest.fn(() => mockSettings);

        nameAutocomplete = new NameAutocompleteSuggest(mockApp);
    });

    describe('onTrigger', () => {
        it('should return null when trigger pattern is not found', () => {
            const cursor: EditorPosition = { line: 0, ch: 10 };
            mockEditor.getLine.mockReturnValue('Hello world');

            const result = nameAutocomplete.onTrigger(cursor, mockEditor, mockFile);

            expect(result).toBeNull();
        });

        it('should return trigger info when trigger pattern is found', () => {
            const cursor: EditorPosition = { line: 0, ch: 15 };
            mockEditor.getLine.mockReturnValue('Hello @name:John');

            const result = nameAutocomplete.onTrigger(cursor, mockEditor, mockFile);

            expect(result).toEqual({
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 15 },
                query: 'Joh' // The query is extracted from the trigger position to cursor
            });
        });

        it('should return trigger info with empty query when cursor is right after trigger', () => {
            const cursor: EditorPosition = { line: 0, ch: 12 };
            mockEditor.getLine.mockReturnValue('Hello @name:');

            const result = nameAutocomplete.onTrigger(cursor, mockEditor, mockFile);

            expect(result).toEqual({
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 12 },
                query: ''
            });
        });

        it('should return null when query is too long', () => {
            const cursor: EditorPosition = { line: 0, ch: 70 };
            const longQuery = 'a'.repeat(60);
            mockEditor.getLine.mockReturnValue(`Hello @name:${longQuery}`);

            const result = nameAutocomplete.onTrigger(cursor, mockEditor, mockFile);

            expect(result).toBeNull();
        });
    });

    describe('getSuggestions', () => {
        const mockPerson1: PersonMetadata = {
            fullName: 'John Doe',
            position: 'Software Engineer',
            department: 'Engineering',
            notes: 'Test notes',
            file: mockFile,
            linkText: 'john-doe',
            fileType: DefFileType.Consolidated,
            companyName: 'Tech Corp',
            companyColor: '#ff0000',
            mentionCounts: {
                totalMentions: 5,
                taskMentions: 2,
                textMentions: 3,
            },
        };

        const mockPerson2: PersonMetadata = {
            fullName: 'Jane Smith',
            position: 'Product Manager',
            department: 'Product',
            notes: 'Test notes 2',
            file: mockFile,
            linkText: 'jane-smith',
            fileType: DefFileType.Consolidated,
            companyName: 'Tech Corp',
            // No mention counts, so it should be sorted after mockPerson1
        };

        it('should return suggestions from optimized search when query is provided', () => {
            const context = {
                query: 'John',
                start: { line: 0, ch: 0 },
                end: { line: 0, ch: 4 },
                editor: mockEditor,
                file: mockFile,
            };

            mockDefManager.optimizedSearchEngine.findByPrefix.mockReturnValue([mockPerson1]);

            const suggestions = nameAutocomplete.getSuggestions(context) as any[];

            expect(mockDefManager.optimizedSearchEngine.findByPrefix).toHaveBeenCalledWith('john', 15);
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].person).toBe(mockPerson1);
            expect(suggestions[0].insertText).toBe('John Doe');
            expect(suggestions[0].displayText).toContain('John Doe');
            expect(suggestions[0].displayText).toContain('Tech Corp');
            expect(suggestions[0].displayText).toContain('Software Engineer');
            expect(suggestions[0].displayText).toContain('5 mentions');
        });

        it('should return popular people when query is empty', () => {
            const context = {
                query: '',
                start: { line: 0, ch: 0 },
                end: { line: 0, ch: 0 },
                editor: mockEditor,
                file: mockFile,
            };

            // Mock the file definition map
            const mockFileMap = new Map();
            mockFileMap.set('person1', mockPerson1);
            mockFileMap.set('person2', mockPerson2);

            const mockDefRepo = {
                fileDefMap: new Map([['file1', mockFileMap]]),
            };

            mockDefManager.getDefRepo.mockReturnValue(mockDefRepo);

            const suggestions = nameAutocomplete.getSuggestions(context) as any[];

            expect(suggestions).toHaveLength(2);
            // Should be sorted by mention count (mockPerson1 has 5 mentions, mockPerson2 has 0)
            expect(suggestions[0].person).toBe(mockPerson1);
            expect(suggestions[1].person).toBe(mockPerson2);
        });

        it('should create proper display text with company and position', () => {
            const context = {
                query: 'John',
                start: { line: 0, ch: 0 },
                end: { line: 0, ch: 4 },
                editor: mockEditor,
                file: mockFile,
            };

            mockDefManager.optimizedSearchEngine.findByPrefix.mockReturnValue([mockPerson1]);

            const suggestions = nameAutocomplete.getSuggestions(context) as any[];

            expect(suggestions[0].displayText).toBe('John Doe (Tech Corp, Software Engineer) [5 mentions]');
        });

        it('should create display text without optional fields when not available', () => {
            const context = {
                query: 'Jane',
                start: { line: 0, ch: 0 },
                end: { line: 0, ch: 4 },
                editor: mockEditor,
                file: mockFile,
            };

            mockDefManager.optimizedSearchEngine.findByPrefix.mockReturnValue([mockPerson2]);

            const suggestions = nameAutocomplete.getSuggestions(context) as any[];

            expect(suggestions[0].displayText).toBe('Jane Smith (Tech Corp, Product Manager)');
        });
    });

    describe('updateTriggerPattern', () => {
        it('should update trigger pattern from settings', () => {
            const mockSettings = {
                nameAutocompleteTrigger: '@@',
                enableNameAutocomplete: true,
            };
            require('../settings').getSettings = jest.fn(() => mockSettings);

            nameAutocomplete.updateTriggerPattern();

            // Test that the new trigger pattern works
            const cursor: EditorPosition = { line: 0, ch: 8 };
            mockEditor.getLine.mockReturnValue('Hello @@John');

            const result = nameAutocomplete.onTrigger(cursor, mockEditor, mockFile);

            expect(result).toEqual({
                start: { line: 0, ch: 6 },
                end: { line: 0, ch: 8 },
                query: ''
            });
        });
    });
});
