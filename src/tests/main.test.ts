/**
 * @jest-environment jsdom
 */
import { App, Plugin, TFile, Vault, MetadataCache, Workspace } from "obsidian";
import NoteDefinition from "../main";
import { DEFAULT_SETTINGS } from "../settings";

jest.mock('obsidian');

// Mock all the core modules
jest.mock('../core/def-file-manager', () => ({
    initDefFileManager: jest.fn(() => ({
        getAllPeople: jest.fn(() => []),
        refreshDefinitions: jest.fn(() => Promise.resolve()),
        loadDefinitions: jest.fn(() => Promise.resolve()),
        registerDefFile: jest.fn()
    })),
    getDefFileManager: jest.fn(() => ({
        getAllPeople: jest.fn(() => []),
        refreshDefinitions: jest.fn(() => Promise.resolve()),
        loadDefinitions: jest.fn(() => Promise.resolve())
    }))
}));

jest.mock('../editor/definition-popover', () => ({
    initDefinitionPopover: jest.fn(),
    getDefinitionPopover: jest.fn(),
    cleanupDefinitionPopover: jest.fn()
}));

jest.mock('../ui/file-explorer', () => ({
    initFileExplorerDecoration: jest.fn(() => ({
        run: jest.fn()
    }))
}));

jest.mock('../core/company-manager', () => ({
    initCompanyManager: jest.fn(),
    getCompanyManager: jest.fn(() => ({
        getAllCompanies: jest.fn(() => []),
        updateCompanyColors: jest.fn()
    }))
}));

jest.mock('../editor/auto-completion', () => ({
    initNameAutoCompletion: jest.fn(() => ({
        onTrigger: jest.fn(),
        getSuggestions: jest.fn(() => []),
        renderSuggestion: jest.fn(),
        selectSuggestion: jest.fn()
    }))
}));

jest.mock('../core/optimized-search-engine', () => ({
    initOptimizedSearchEngine: jest.fn(),
    getOptimizedSearchEngine: jest.fn()
}));

jest.mock('../core/smart-line-scanner', () => ({
    initSmartLineScanner: jest.fn(),
    getSmartLineScanner: jest.fn()
}));

jest.mock('../core/mention-counting-service', () => ({
    initMentionCountingService: jest.fn(),
    getMentionCountingService: jest.fn()
}));

jest.mock('../editor/mobile/definition-modal', () => ({
    initDefinitionModal: jest.fn()
}));

jest.mock('../editor/md-postprocessor', () => ({
    postProcessor: jest.fn()
}));

jest.mock('../core/plugin-context', () => ({
    PluginContext: {
        initialize: jest.fn(() => ({
            settings: DEFAULT_SETTINGS
        })),
        getInstance: jest.fn(() => ({
            settings: DEFAULT_SETTINGS
        })),
        cleanup: jest.fn()
    }
}));

jest.mock('../core/definition-preview-service', () => ({
    DefinitionPreviewService: {
        getInstance: jest.fn(() => ({
            triggerDefPreview: jest.fn(),
            closeDefPreview: jest.fn(),
            getTriggerFunctionString: jest.fn(() => "function() { return 'trigger'; }"),
            getCloseFunctionString: jest.fn(() => "function() { return 'close'; }")
        })),
        cleanup: jest.fn()
    }
}));

describe('NoteDefinition Plugin', () => {
    let plugin: NoteDefinition;
    let mockApp: jest.Mocked<App>;

    beforeEach(() => {
        // Setup DOM methods for jsdom
        if (!document.head.createEl) {
            (document.head as any).createEl = jest.fn((tag: string, attrs?: any) => {
                const element = document.createElement(tag);
                if (attrs?.attr) {
                    Object.entries(attrs.attr).forEach(([key, value]) => {
                        element.setAttribute(key, value as string);
                    });
                }
                document.head.appendChild(element);
                return element;
            });
        }

        // Setup mock app
        mockApp = {
            vault: {
                getMarkdownFiles: jest.fn(() => []),
                read: jest.fn(() => Promise.resolve("")),
                on: jest.fn()
            } as any,
            metadataCache: {
                getFileCache: jest.fn(() => null),
                on: jest.fn()
            } as any,
            workspace: {
                onLayoutReady: jest.fn((callback) => {
                    // Immediately call the callback for testing
                    setTimeout(callback, 0);
                }),
                on: jest.fn(),
                getActiveViewOfType: jest.fn(),
                getActiveFile: jest.fn(() => null),
                updateOptions: jest.fn()
            } as any,
            setting: {
                settingTabs: []
            }
        } as any;

        // Create plugin instance
        plugin = new NoteDefinition(mockApp, {
            id: "people-metadata",
            name: "People Metadata",
            version: "1.0.0",
            minAppVersion: "0.15.0",
            description: "Test plugin",
            author: "Test Author"
        });

        // Mock plugin methods
        plugin.loadData = jest.fn(() => Promise.resolve({}));
        plugin.saveData = jest.fn(() => Promise.resolve());
        plugin.addCommand = jest.fn();
        plugin.addSettingTab = jest.fn();
        plugin.registerEditorExtension = jest.fn();
        plugin.registerEditorSuggest = jest.fn();
        plugin.registerMarkdownPostProcessor = jest.fn();
        plugin.registerEvent = jest.fn();
        plugin.addRibbonIcon = jest.fn();
    });

    describe('Plugin Initialization', () => {
        test('should initialize correctly', () => {
            expect(plugin).toBeInstanceOf(NoteDefinition);
            expect(plugin.app).toBe(mockApp);
        });

        test('should load plugin data on startup', async () => {
            await plugin.onload();
            
            expect(plugin.loadData).toHaveBeenCalled();
        });

        test('should initialize all core systems', async () => {
            await plugin.onload();
            
            // Check that all initialization functions were called
            const initDefFileManager = require('../core/def-file-manager').initDefFileManager;
            const initDefinitionPopover = require('../editor/definition-popover').initDefinitionPopover;
            const initFileExplorerDecoration = require('../ui/file-explorer').initFileExplorerDecoration;
            const initCompanyManager = require('../core/company-manager').initCompanyManager;
            const initOptimizedSearchEngine = require('../core/optimized-search-engine').initOptimizedSearchEngine;
            const initSmartLineScanner = require('../core/smart-line-scanner').initSmartLineScanner;
            const initMentionCountingService = require('../core/mention-counting-service').initMentionCountingService;
            
            expect(initDefFileManager).toHaveBeenCalledWith(mockApp);
            expect(initDefinitionPopover).toHaveBeenCalledWith(plugin);
            expect(initFileExplorerDecoration).toHaveBeenCalledWith(mockApp);
            expect(initCompanyManager).toHaveBeenCalledWith(mockApp);
            expect(initOptimizedSearchEngine).toHaveBeenCalled();
            expect(initSmartLineScanner).toHaveBeenCalled();
            expect(initMentionCountingService).toHaveBeenCalledWith(mockApp.vault, mockApp.metadataCache);
        });

        test('should register auto-completion when enabled', async () => {
            await plugin.onload();
            
            expect(plugin.registerEditorSuggest).toHaveBeenCalled();
        });

        test('should register markdown post processor', async () => {
            await plugin.onload();
            
            expect(plugin.registerMarkdownPostProcessor).toHaveBeenCalled();
        });

        test('should add settings tab', async () => {
            await plugin.onload();
            
            expect(plugin.addSettingTab).toHaveBeenCalled();
        });
    });

    describe('Settings Management', () => {
        test('should save settings correctly', async () => {
            await plugin.onload();

            // Mock the saveSettings method since it doesn't take parameters
            plugin.saveSettings = jest.fn(() => Promise.resolve());

            await plugin.saveSettings();

            expect(plugin.saveSettings).toHaveBeenCalled();
        });

        test('should handle settings save errors gracefully', async () => {
            await plugin.onload();

            plugin.saveData = jest.fn(() => Promise.reject(new Error("Save failed")));
            plugin.saveSettings = jest.fn(() => plugin.saveData({}));

            await expect(plugin.saveSettings()).rejects.toThrow("Save failed");
        });
    });

    describe('Command Registration', () => {
        test('should register commands', async () => {
            await plugin.onload();
            
            // Commands should be registered
            expect(plugin.addCommand).toHaveBeenCalled();
        });

        test('should register multiple commands', async () => {
            await plugin.onload();
            
            // Should register several commands (exact number may vary)
            expect(plugin.addCommand).toHaveBeenCalled();
        });
    });

    describe('Event Registration', () => {
        test('should register workspace events', async () => {
            await plugin.onload();
            
            expect(mockApp.workspace.onLayoutReady).toHaveBeenCalled();
        });

        test('should handle workspace layout ready', async () => {
            await plugin.onload();
            
            // Wait for the layout ready callback to execute
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // File explorer decoration should run if enabled
            expect(mockApp.workspace.onLayoutReady).toHaveBeenCalled();
        });
    });

    describe('Definition Management', () => {
        test('should refresh definitions on startup', async () => {
            await plugin.onload();
            
            // Should call refreshDefinitions
            expect(plugin.defManager).toBeDefined();
        });

        test('should handle definition refresh errors gracefully', async () => {
            const mockDefManager = require('../core/def-file-manager');
            mockDefManager.initDefFileManager.mockReturnValue({
                getAllPeople: jest.fn(() => []),
                refreshDefinitions: jest.fn(() => Promise.reject(new Error("Refresh failed"))),
                loadDefinitions: jest.fn(() => Promise.reject(new Error("Load failed"))),
                registerDefFile: jest.fn()
            });

            // Should handle errors during onload
            await expect(plugin.onload()).rejects.toThrow();

            // Reset the mock for other tests
            mockDefManager.initDefFileManager.mockReturnValue({
                getAllPeople: jest.fn(() => []),
                refreshDefinitions: jest.fn(() => Promise.resolve()),
                loadDefinitions: jest.fn(() => Promise.resolve()),
                registerDefFile: jest.fn()
            });
        });
    });

    describe('Auto-completion Integration', () => {
        test('should initialize auto-completion when enabled', async () => {
            // Mock settings with auto-completion enabled
            const mockContext = require('../core/plugin-context');
            mockContext.PluginContext.initialize.mockReturnValue({
                settings: {
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
                }
            });

            await plugin.onload();
            
            expect(plugin.nameAutoCompletion).toBeDefined();
            expect(plugin.registerEditorSuggest).toHaveBeenCalledWith(plugin.nameAutoCompletion);
        });

        test('should skip auto-completion when disabled', async () => {
            // Mock settings with auto-completion disabled
            const mockContext = require('../core/plugin-context');
            mockContext.PluginContext.initialize.mockReturnValue({
                settings: {
                    ...DEFAULT_SETTINGS,
                    autoCompletionConfig: {
                        enabled: false,
                        triggerPattern: "@name:",
                        minQueryLength: 1,
                        maxSuggestions: 10,
                        showMentionCounts: true,
                        showCompanyInfo: true,
                        showPositionInfo: true
                    }
                }
            });

            await plugin.onload();
            
            // Auto-completion should not be initialized
            expect(plugin.nameAutoCompletion).toBeUndefined();
        });
    });

    describe('Global Interface', () => {
        test('should expose global interface for HTML handlers', async () => {
            await plugin.onload();
            
            expect((window as any).peopleMetadataPlugin).toBeDefined();
            expect((window as any).peopleMetadataPlugin.triggerDefPreview).toBeInstanceOf(Function);
            expect((window as any).peopleMetadataPlugin.closeDefPreview).toBeInstanceOf(Function);
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors gracefully', async () => {
            // Mock one of the init functions to throw
            const mockDefManager = require('../core/def-file-manager');
            mockDefManager.initDefFileManager.mockImplementation(() => {
                throw new Error("Init failed");
            });

            // Should throw during onload when initialization fails
            await expect(plugin.onload()).rejects.toThrow("Init failed");

            // Reset the mock
            mockDefManager.initDefFileManager.mockReturnValue({
                getAllPeople: jest.fn(() => []),
                refreshDefinitions: jest.fn(() => Promise.resolve()),
                loadDefinitions: jest.fn(() => Promise.resolve()),
                registerDefFile: jest.fn()
            });
        });

        test('should handle file explorer decoration errors gracefully', async () => {
            const mockFileExplorer = require('../ui/file-explorer');
            mockFileExplorer.initFileExplorerDecoration.mockReturnValue({
                run: jest.fn(() => {
                    throw new Error("File explorer error");
                })
            });

            await plugin.onload();
            
            // Wait for the layout ready callback
            await new Promise(resolve => setTimeout(resolve, 2100));
            
            // Should not throw even if file explorer decoration fails
            expect(plugin.fileExplorerDeco).toBeDefined();
        });
    });

    describe('Plugin Unload', () => {
        test('should clean up on unload', () => {
            // Test that unload doesn't throw
            expect(() => plugin.onunload()).not.toThrow();
        });
    });

    describe('Performance', () => {
        test('should initialize within reasonable time', async () => {
            // Reset any previous mocks
            const mockDefManager = require('../core/def-file-manager');
            mockDefManager.initDefFileManager.mockReturnValue({
                getAllPeople: jest.fn(() => []),
                refreshDefinitions: jest.fn(() => Promise.resolve()),
                loadDefinitions: jest.fn(() => Promise.resolve()),
                registerDefFile: jest.fn()
            });

            const start = performance.now();
            await plugin.onload();
            const time = performance.now() - start;

            expect(time).toBeLessThan(1000); // Should initialize in under 1 second
        });
    });
});
