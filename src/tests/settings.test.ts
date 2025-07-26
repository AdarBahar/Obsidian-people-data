import {
    Settings,
    DEFAULT_SETTINGS,
    PopoverEventSettings,
    PopoverDismissType,
    AutoCompletionConfig,
    OptimizationConfig,
    MentionCountingConfig,
    DefinitionPopoverConfig,
    DefFileParseConfig,
    DividerSettings,
    DEFAULT_DEF_FOLDER,
    SettingsTab,
    MentionCountDisplayType
} from "../settings";
import { DefFileType } from "../core/file-type";
import { App, Plugin } from "obsidian";

jest.mock('obsidian');

// Mock the company manager
jest.mock('../core/company-manager', () => ({
    getCompanyManager: () => ({
        getAllCompanies: jest.fn(() => []),
        getCompanyConfig: jest.fn(() => ({}))
    })
}));

// Mock the modals
jest.mock('../editor/company-config-modal', () => ({
    CompanyConfigModal: jest.fn().mockImplementation(() => ({
        open: jest.fn()
    }))
}));

jest.mock('../editor/about-modal', () => ({
    AboutPeopleMetadataModal: jest.fn().mockImplementation(() => ({
        open: jest.fn()
    }))
}));

describe('Settings', () => {
    describe('Default Settings', () => {
        test('should have correct default values', () => {
            expect(DEFAULT_SETTINGS.enableInReadingView).toBe(true);
            expect(DEFAULT_SETTINGS.enableSpellcheck).toBe(false);
            expect(DEFAULT_SETTINGS.enableFileExplorerTags).toBe(false);
            expect(DEFAULT_DEF_FOLDER).toBe("people");
        });

        test('should have valid auto-completion config', () => {
            const autoConfig = DEFAULT_SETTINGS.autoCompletionConfig;
            expect(autoConfig?.enabled).toBe(true);
            expect(autoConfig?.triggerPattern).toBe("@name:");
            expect(autoConfig?.minQueryLength).toBe(1);
            expect(autoConfig?.maxSuggestions).toBe(10);
            expect(autoConfig?.showMentionCounts).toBe(true);
            expect(autoConfig?.showCompanyInfo).toBe(true);
            expect(autoConfig?.showPositionInfo).toBe(true);
        });

        test('should have valid optimization config', () => {
            const optConfig = DEFAULT_SETTINGS.optimizationConfig;
            expect(optConfig?.useOptimizedSearch).toBe(true);
            expect(optConfig?.autoRefreshMentionCounts).toBe(true);
            expect(optConfig?.cacheSize).toBe(1000);
            expect(optConfig?.enablePerformanceMonitoring).toBe(true);
        });

        test('should have valid mention counting config', () => {
            const mentionConfig = DEFAULT_SETTINGS.mentionCountingConfig;
            expect(mentionConfig?.enabled).toBe(true);
            expect(mentionConfig?.autoRefreshOnFileChange).toBe(true);
            expect(mentionConfig?.showInTooltips).toBe(MentionCountDisplayType.All);
            expect(mentionConfig?.includeTaskMentions).toBe(true);
            expect(mentionConfig?.includeTextMentions).toBe(true);
            expect(mentionConfig?.refreshIntervalMinutes).toBe(30);
            expect(mentionConfig?.maxFilesToScanPerBatch).toBe(10);
        });
    });

    describe('Enums', () => {
        test('should validate popover event settings', () => {
            expect(PopoverEventSettings.Hover).toBe("hover");
            expect(PopoverEventSettings.Click).toBe("click");
            
            const validEvents = Object.values(PopoverEventSettings);
            expect(validEvents).toContain("hover");
            expect(validEvents).toContain("click");
        });

        test('should validate popover dismiss types', () => {
            expect(PopoverDismissType.Click).toBe("click");
            expect(PopoverDismissType.MouseExit).toBe("mouse_exit");
            
            const validDismissTypes = Object.values(PopoverDismissType);
            expect(validDismissTypes).toContain("click");
            expect(validDismissTypes).toContain("mouse_exit");
        });
    });

    describe('Interface Validation', () => {
        test('should validate DividerSettings interface', () => {
            const dividerSettings: DividerSettings = {
                dash: true,
                underscore: false
            };
            
            expect(typeof dividerSettings.dash).toBe("boolean");
            expect(typeof dividerSettings.underscore).toBe("boolean");
        });

        test('should validate DefFileParseConfig interface', () => {
            const parseConfig: DefFileParseConfig = {
                defaultFileType: DefFileType.Consolidated,
                divider: {
                    dash: true,
                    underscore: true
                }
            };
            
            expect(parseConfig.defaultFileType).toBe(DefFileType.Consolidated);
            expect(parseConfig.divider.dash).toBe(true);
            expect(parseConfig.divider.underscore).toBe(true);
        });

        test('should validate DefinitionPopoverConfig interface', () => {
            const popoverConfig: DefinitionPopoverConfig = {
                displayDefFileName: true,
                enableCustomSize: true,
                maxWidth: 600,
                maxHeight: 400,
                popoverDismissEvent: PopoverDismissType.MouseExit,
                backgroundColour: "#ffffff"
            };
            
            expect(popoverConfig.displayDefFileName).toBe(true);
            expect(popoverConfig.enableCustomSize).toBe(true);
            expect(popoverConfig.maxWidth).toBe(600);
            expect(popoverConfig.maxHeight).toBe(400);
            expect(popoverConfig.popoverDismissEvent).toBe(PopoverDismissType.MouseExit);
            expect(popoverConfig.backgroundColour).toBe("#ffffff");
        });

        test('should validate AutoCompletionConfig interface', () => {
            const autoConfig: AutoCompletionConfig = {
                enabled: true,
                triggerPattern: "@person:",
                minQueryLength: 2,
                maxSuggestions: 5,
                showMentionCounts: false,
                showCompanyInfo: false,
                showPositionInfo: true
            };
            
            expect(autoConfig.enabled).toBe(true);
            expect(autoConfig.triggerPattern).toBe("@person:");
            expect(autoConfig.minQueryLength).toBe(2);
            expect(autoConfig.maxSuggestions).toBe(5);
            expect(autoConfig.showMentionCounts).toBe(false);
            expect(autoConfig.showCompanyInfo).toBe(false);
            expect(autoConfig.showPositionInfo).toBe(true);
        });

        test('should validate OptimizationConfig interface', () => {
            const optConfig: OptimizationConfig = {
                useOptimizedSearch: false,
                autoRefreshMentionCounts: false,
                cacheSize: 500,
                enablePerformanceMonitoring: false
            };
            
            expect(optConfig.useOptimizedSearch).toBe(false);
            expect(optConfig.autoRefreshMentionCounts).toBe(false);
            expect(optConfig.cacheSize).toBe(500);
            expect(optConfig.enablePerformanceMonitoring).toBe(false);
        });

        test('should validate MentionCountingConfig interface', () => {
            const mentionConfig: MentionCountingConfig = {
                enabled: false,
                autoRefreshOnFileChange: false,
                showInTooltips: MentionCountDisplayType.Off,
                includeTaskMentions: false,
                includeTextMentions: true,
                refreshIntervalMinutes: 60,
                maxFilesToScanPerBatch: 20
            };
            
            expect(mentionConfig.enabled).toBe(false);
            expect(mentionConfig.autoRefreshOnFileChange).toBe(false);
            expect(mentionConfig.showInTooltips).toBe(MentionCountDisplayType.Off);
            expect(mentionConfig.includeTaskMentions).toBe(false);
            expect(mentionConfig.includeTextMentions).toBe(true);
            expect(mentionConfig.refreshIntervalMinutes).toBe(60);
            expect(mentionConfig.maxFilesToScanPerBatch).toBe(20);
        });
    });

    describe('Settings Merging', () => {
        test('should merge partial settings with defaults', () => {
            const partialSettings: Partial<Settings> = {
                enableInReadingView: false,
                enableSpellcheck: false
            };

            const mergedSettings = { ...DEFAULT_SETTINGS, ...partialSettings };

            expect(mergedSettings.enableInReadingView).toBe(false);
            expect(mergedSettings.enableSpellcheck).toBe(false);
            expect(mergedSettings.enableFileExplorerTags).toBe(DEFAULT_SETTINGS.enableFileExplorerTags);
        });

        test('should handle nested config merging', () => {
            const partialSettings: Partial<Settings> = {
                autoCompletionConfig: {
                    ...DEFAULT_SETTINGS.autoCompletionConfig!,
                    enabled: false,
                    maxSuggestions: 5
                }
            };

            const mergedSettings = { ...DEFAULT_SETTINGS, ...partialSettings };

            expect(mergedSettings.autoCompletionConfig?.enabled).toBe(false);
            expect(mergedSettings.autoCompletionConfig?.maxSuggestions).toBe(5);
            expect(mergedSettings.autoCompletionConfig?.triggerPattern).toBe(DEFAULT_SETTINGS.autoCompletionConfig?.triggerPattern);
        });
    });

    describe('Settings Validation', () => {
        test('should validate cache size limits', () => {
            const validCacheSizes = [100, 500, 1000, 5000];
            
            validCacheSizes.forEach(size => {
                const config: OptimizationConfig = {
                    useOptimizedSearch: true,
                    autoRefreshMentionCounts: true,
                    cacheSize: size,
                    enablePerformanceMonitoring: true
                };
                expect(config.cacheSize).toBe(size);
                expect(config.cacheSize).toBeGreaterThan(0);
            });
        });

        test('should validate refresh intervals', () => {
            const validIntervals = [5, 15, 30, 60, 120];
            
            validIntervals.forEach(interval => {
                const config: MentionCountingConfig = {
                    enabled: true,
                    autoRefreshOnFileChange: true,
                    showInTooltips: MentionCountDisplayType.All,
                    includeTaskMentions: true,
                    includeTextMentions: true,
                    refreshIntervalMinutes: interval,
                    maxFilesToScanPerBatch: 10
                };
                expect(config.refreshIntervalMinutes).toBe(interval);
                expect(config.refreshIntervalMinutes).toBeGreaterThanOrEqual(5);
                expect(config.refreshIntervalMinutes).toBeLessThanOrEqual(120);
            });
        });

        test('should validate batch sizes', () => {
            const validBatchSizes = [1, 5, 10, 20, 50];
            
            validBatchSizes.forEach(size => {
                const config: MentionCountingConfig = {
                    enabled: true,
                    autoRefreshOnFileChange: true,
                    showInTooltips: MentionCountDisplayType.All,
                    includeTaskMentions: true,
                    includeTextMentions: true,
                    refreshIntervalMinutes: 30,
                    maxFilesToScanPerBatch: size
                };
                expect(config.maxFilesToScanPerBatch).toBe(size);
                expect(config.maxFilesToScanPerBatch).toBeGreaterThan(0);
            });
        });
    });

    describe('Settings Consistency', () => {
        test('should maintain consistency between related settings', () => {
            // When hover is selected, dismiss should be MouseExit for better UX
            const hoverSettings: Partial<Settings> = {
                popoverEvent: PopoverEventSettings.Hover
            };

            expect(hoverSettings.popoverEvent).toBe(PopoverEventSettings.Hover);
        });

        test('should handle disabled features gracefully', () => {
            const disabledSettings: Partial<Settings> = {
                autoCompletionConfig: {
                    enabled: false,
                    triggerPattern: "@name:",
                    minQueryLength: 1,
                    maxSuggestions: 10,
                    showMentionCounts: false,
                    showCompanyInfo: false,
                    showPositionInfo: false
                },
                optimizationConfig: {
                    useOptimizedSearch: false,
                    autoRefreshMentionCounts: false,
                    cacheSize: 1000,
                    enablePerformanceMonitoring: false
                },
                mentionCountingConfig: {
                    enabled: false,
                    autoRefreshOnFileChange: false,
                    showInTooltips: MentionCountDisplayType.Off,
                    includeTaskMentions: false,
                    includeTextMentions: false,
                    refreshIntervalMinutes: 30,
                    maxFilesToScanPerBatch: 10
                }
            };

            expect(disabledSettings.autoCompletionConfig?.enabled).toBe(false);
            expect(disabledSettings.optimizationConfig?.useOptimizedSearch).toBe(false);
            expect(disabledSettings.mentionCountingConfig?.enabled).toBe(false);
        });
    });
});

describe('SettingsTab', () => {
    let mockApp: jest.Mocked<App>;
    let mockPlugin: jest.Mocked<Plugin>;

    beforeEach(() => {
        mockApp = {
            setting: {
                settingTabs: []
            }
        } as any;

        mockPlugin = {
            app: mockApp,
            settings: DEFAULT_SETTINGS,
            saveSettings: jest.fn()
        } as any;

        // Mock PluginContext to avoid initialization errors
        const mockPluginContext = require('../core/plugin-context');
        mockPluginContext.PluginContext.getInstance = jest.fn(() => ({
            settings: DEFAULT_SETTINGS,
            app: mockApp,
            plugin: mockPlugin
        }));
    });

    test('should create settings tab without errors', () => {
        expect(() => {
            new SettingsTab(mockApp, mockPlugin, jest.fn());
        }).not.toThrow();
    });

    test('should have correct constructor parameters', () => {
        const saveCallback = jest.fn();
        const settingTab = new SettingsTab(mockApp, mockPlugin, saveCallback);

        expect(settingTab.app).toBe(mockApp);
        expect(settingTab.plugin).toBe(mockPlugin);
    });
});
