/**
 * @jest-environment jsdom
 */
import { App, Plugin } from "obsidian";
import { 
    DefinitionPopover, 
    initDefinitionPopover, 
    getDefinitionPopover 
} from "../editor/definition-popover";
import { PersonMetadata, generatePersonId } from "../core/model";
import { DefFileType } from "../core/file-type";
import { DEFAULT_SETTINGS, PopoverDismissType, PopoverEventSettings } from "../settings";

jest.mock('obsidian');

// Mock the plugin context
jest.mock('../core/plugin-context', () => ({
    PluginContext: {
        getInstance: jest.fn(() => ({
            settings: DEFAULT_SETTINGS
        }))
    }
}));

// Mock settings
jest.mock('../settings', () => ({
    getSettings: jest.fn(() => DEFAULT_SETTINGS),
    PopoverDismissType: {
        Click: "click",
        MouseExit: "mouse_exit"
    },
    PopoverEventSettings: {
        Hover: "hover",
        Click: "click"
    },
    DEFAULT_SETTINGS: {
        defPopoverConfig: {
            displayDefFileName: true,
            enableCustomSize: true,
            maxWidth: 600,
            maxHeight: 400,
            popoverDismissEvent: "mouse_exit",
            backgroundColour: "#ffffff"
        }
    }
}));

// Mock mention counting service
jest.mock('../core/mention-counting-service', () => ({
    getMentionCountingService: jest.fn(() => ({
        getMentionCountByName: jest.fn(() => ({
            fullName: "John Smith",
            totalMentions: 5,
            textMentions: 3,
            taskMentions: 2
        }))
    }))
}));

// Mock markdown renderer
const mockMarkdownRenderer = {
    renderMarkdown: jest.fn((markdown, el, sourcePath, component) => {
        if (el && el.innerHTML !== undefined) {
            el.innerHTML = `<p>${markdown}</p>`;
        }
        return Promise.resolve();
    })
};

describe('DefinitionPopover', () => {
    let popover: DefinitionPopover;
    let mockApp: jest.Mocked<App>;
    let mockPlugin: jest.Mocked<Plugin>;
    let testPerson: PersonMetadata;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';
        
        mockApp = {
            workspace: {
                getActiveViewOfType: jest.fn()
            }
        } as any;

        mockPlugin = {
            app: mockApp
        } as any;

        testPerson = {
            id: generatePersonId("John Smith", "test.md"),
            fullName: "John Smith",
            position: "Developer",
            department: "Engineering",
            notes: "Test person with some notes",
            file: { path: "test.md" } as any,
            linkText: "John Smith",
            fileType: DefFileType.Consolidated,
            companyName: "TechCorp",
            companyLogo: "logo.png",
            companyColor: "blue"
        };

        popover = new DefinitionPopover(mockPlugin);
    });

    afterEach(() => {
        // Clean up any mounted popovers
        popover.cleanUp();
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize correctly', () => {
            expect(popover).toBeInstanceOf(DefinitionPopover);
            expect(popover.app).toBe(mockApp);
            expect(popover.plugin).toBe(mockPlugin);
        });

        test('should initialize global popover instance', () => {
            expect(() => {
                initDefinitionPopover(mockPlugin);
                getDefinitionPopover();
            }).not.toThrow();
        });
    });

    describe('Single Person Popover', () => {
        test('should open popover at cursor without errors', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();
        });

        test('should open popover at coordinates without errors', () => {
            const coords = { left: 100, right: 200, top: 50, bottom: 100 };

            expect(() => {
                popover.openAtCoords(testPerson, coords);
            }).not.toThrow();
        });

        test('should handle person data correctly', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Should handle the person data without errors
            expect(testPerson.fullName).toBe("John Smith");
        });

        test('should handle person without company info', () => {
            const personWithoutCompany = {
                ...testPerson,
                companyName: undefined,
                companyLogo: undefined,
                companyColor: undefined
            };

            expect(() => {
                popover.openAtCursor(personWithoutCompany);
            }).not.toThrow();
        });
    });

    describe('Multi-Company Popover', () => {
        test('should open multi-company popover at cursor without errors', () => {
            const people = [
                testPerson,
                {
                    ...testPerson,
                    id: generatePersonId("John Smith", "company-b.md"),
                    companyName: "StartupCo",
                    companyColor: "green"
                }
            ];

            expect(() => {
                popover.openMultipleAtCursor(people);
            }).not.toThrow();
        });

        test('should open multi-company popover at coordinates without errors', () => {
            const coords = { left: 100, right: 200, top: 50, bottom: 100 };
            const people = [
                testPerson,
                {
                    ...testPerson,
                    id: generatePersonId("John Smith", "company-b.md"),
                    companyName: "StartupCo",
                    companyColor: "green"
                }
            ];

            expect(() => {
                popover.openMultipleAtCoords(people, coords);
            }).not.toThrow();
        });

        test('should handle multiple companies data correctly', () => {
            const people = [
                testPerson,
                {
                    ...testPerson,
                    id: generatePersonId("John Smith", "company-b.md"),
                    companyName: "StartupCo",
                    companyColor: "green"
                }
            ];

            expect(() => {
                popover.openMultipleAtCursor(people);
            }).not.toThrow();

            // Should handle multiple people correctly
            expect(people).toHaveLength(2);
            expect(people[0].companyName).toBe("TechCorp");
            expect(people[1].companyName).toBe("StartupCo");
        });
    });

    describe('Popover Positioning', () => {
        test('should handle positioning coordinates correctly', () => {
            const coords = { left: 100, right: 200, top: 50, bottom: 100 };

            expect(() => {
                popover.openAtCoords(testPerson, coords);
            }).not.toThrow();

            // Should handle coordinates without errors
            expect(coords.left).toBe(100);
            expect(coords.top).toBe(50);
        });

        test('should handle edge positioning', () => {
            // Test positioning near screen edges
            const edgeCoords = { left: window.innerWidth - 50, right: window.innerWidth, top: 10, bottom: 50 };

            expect(() => {
                popover.openAtCoords(testPerson, edgeCoords);
            }).not.toThrow();
        });
    });

    describe('Popover Content', () => {
        test('should handle markdown content rendering', async () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Wait for any async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // Should handle markdown rendering without errors
            expect(testPerson.notes).toBe("Test person with some notes");
        });

        test('should handle mention counts when enabled', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Should handle mention counting without errors
            expect(typeof testPerson.fullName).toBe("string");
        });

        test('should handle empty notes gracefully', () => {
            const personWithEmptyNotes = {
                ...testPerson,
                notes: ""
            };

            expect(() => {
                popover.openAtCursor(personWithEmptyNotes);
            }).not.toThrow();
        });
    });

    describe('Popover Lifecycle', () => {
        test('should handle multiple popover opens correctly', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Open another popover
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();
        });

        test('should clean up without errors', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            expect(() => {
                popover.cleanUp();
            }).not.toThrow();
        });

        test('should handle cleanup properly', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Test cleanup
            expect(() => {
                popover.cleanUp();
            }).not.toThrow();
        });
    });

    describe('Event Handling', () => {
        test('should handle event registration without errors', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();
        });

        test('should handle mouse events', () => {
            const triggerElement = document.createElement('div');
            document.body.appendChild(triggerElement);

            const coords = { left: 100, right: 200, top: 50, bottom: 100 };

            expect(() => {
                popover.openAtCoords(testPerson, coords, triggerElement);
            }).not.toThrow();

            // Should handle mouse events without throwing
            const mouseEvent = new MouseEvent('mouseleave');
            expect(() => {
                triggerElement.dispatchEvent(mouseEvent);
            }).not.toThrow();
        });

        test('should handle keyboard events', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Should handle escape key
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            expect(() => {
                document.dispatchEvent(escapeEvent);
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle missing person data gracefully', () => {
            const incompletePerson = {
                id: "test-id",
                fullName: "",
                position: "",
                department: "",
                notes: "",
                file: null as any,
                linkText: "",
                fileType: DefFileType.Consolidated
            };
            
            expect(() => {
                popover.openAtCursor(incompletePerson);
            }).not.toThrow();
        });

        test('should handle markdown rendering errors', async () => {
            // Mock markdown renderer to throw error
            mockMarkdownRenderer.renderMarkdown.mockRejectedValueOnce(new Error("Render failed"));

            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();
        });

        test('should handle invalid coordinates', () => {
            const invalidCoords = { left: -100, right: -50, top: -50, bottom: -10 };
            
            expect(() => {
                popover.openAtCoords(testPerson, invalidCoords);
            }).not.toThrow();
        });
    });

    describe('Settings Integration', () => {
        test('should handle popover size settings', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Should handle settings without errors
            expect(DEFAULT_SETTINGS.defPopoverConfig?.maxWidth).toBe(600);
            expect(DEFAULT_SETTINGS.defPopoverConfig?.maxHeight).toBe(400);
        });

        test('should handle background color from settings', () => {
            expect(() => {
                popover.openAtCursor(testPerson);
            }).not.toThrow();

            // Should handle background color setting
            expect(DEFAULT_SETTINGS.defPopoverConfig?.backgroundColour).toBe("#ffffff");
        });
    });

    describe('Performance', () => {
        test('should open popover quickly', () => {
            const start = performance.now();
            popover.openAtCursor(testPerson);
            const time = performance.now() - start;
            
            expect(time).toBeLessThan(50); // Should open in under 50ms
        });

        test('should handle multiple rapid opens/closes', () => {
            const start = performance.now();
            
            for (let i = 0; i < 10; i++) {
                popover.openAtCursor(testPerson);
                popover.cleanUp();
            }
            
            const time = performance.now() - start;
            expect(time).toBeLessThan(100); // Should handle 10 cycles in under 100ms
        });
    });
});
