import { App, Plugin } from "obsidian";
import type { Settings } from "../settings";
import { LogLevel } from "../util/log";

/**
 * Plugin context that replaces global variables with proper dependency injection.
 * This provides a centralized way to access plugin services and state.
 */
export class PluginContext {
	private static instance: PluginContext | null = null;
	
	public readonly app: App;
	public readonly plugin: Plugin;
	public settings: Settings;
	public logLevel: LogLevel;

	private constructor(app: App, plugin: Plugin, settings: Settings) {
		this.app = app;
		this.plugin = plugin;
		this.settings = settings;
		this.logLevel = LogLevel.Error;
	}

	/**
	 * Initialize the plugin context. Should be called once during plugin load.
	 */
	public static initialize(app: App, plugin: Plugin, settings: Settings): PluginContext {
		if (PluginContext.instance) {
			throw new Error("PluginContext already initialized");
		}
		PluginContext.instance = new PluginContext(app, plugin, settings);
		return PluginContext.instance;
	}

	/**
	 * Get the current plugin context instance.
	 */
	public static getInstance(): PluginContext {
		if (!PluginContext.instance) {
			throw new Error("PluginContext not initialized. Call initialize() first.");
		}
		return PluginContext.instance;
	}

	/**
	 * Update settings in the context.
	 */
	public updateSettings(settings: Settings): void {
		this.settings = settings;
	}

	/**
	 * Update log level.
	 */
	public updateLogLevel(logLevel: LogLevel): void {
		this.logLevel = logLevel;
	}

	/**
	 * Clean up the context. Should be called during plugin unload.
	 */
	public static cleanup(): void {
		PluginContext.instance = null;
	}

	/**
	 * Check if the context is initialized.
	 */
	public static isInitialized(): boolean {
		return PluginContext.instance !== null;
	}
}
