import { getSettings } from "../settings";

/**
 * Debug logging utility for People Metadata plugin
 * Logs messages with "People-metadata:" prefix when debug mode is enabled
 */

const DEBUG_PREFIX = "People-metadata:";

/**
 * Log a debug message if debug mode is enabled
 * @param message The message to log
 * @param ...args Additional arguments to log
 */
export function debugLog(message: string, ...args: any[]): void {
    try {
        const settings = getSettings();
        if (settings.debugMode) {
            if (args.length > 0) {
                console.log(`${DEBUG_PREFIX} ${message}`, ...args);
            } else {
                console.log(`${DEBUG_PREFIX} ${message}`);
            }
        }
    } catch (error) {
        // Fallback: if settings can't be accessed, don't log anything
        // This prevents errors during plugin initialization
    }
}

/**
 * Log an error message (always shown, regardless of debug mode)
 * @param message The error message to log
 * @param ...args Additional arguments to log
 */
export function debugError(message: string, ...args: any[]): void {
    if (args.length > 0) {
        console.error(`${DEBUG_PREFIX} ERROR: ${message}`, ...args);
    } else {
        console.error(`${DEBUG_PREFIX} ERROR: ${message}`);
    }
}

/**
 * Log a warning message if debug mode is enabled
 * @param message The warning message to log
 * @param ...args Additional arguments to log
 */
export function debugWarn(message: string, ...args: any[]): void {
    try {
        const settings = getSettings();
        if (settings.debugMode) {
            if (args.length > 0) {
                console.warn(`${DEBUG_PREFIX} WARN: ${message}`, ...args);
            } else {
                console.warn(`${DEBUG_PREFIX} WARN: ${message}`);
            }
        }
    } catch (error) {
        // Fallback: if settings can't be accessed, don't log anything
    }
}

/**
 * Log an info message if debug mode is enabled
 * @param message The info message to log
 * @param ...args Additional arguments to log
 */
export function debugInfo(message: string, ...args: any[]): void {
    try {
        const settings = getSettings();
        if (settings.debugMode) {
            if (args.length > 0) {
                console.info(`${DEBUG_PREFIX} INFO: ${message}`, ...args);
            } else {
                console.info(`${DEBUG_PREFIX} INFO: ${message}`);
            }
        }
    } catch (error) {
        // Fallback: if settings can't be accessed, don't log anything
    }
}

/**
 * Log a debug message with timing information
 * @param operation The operation being timed
 * @param startTime The start time (from performance.now())
 * @param ...args Additional arguments to log
 */
export function debugTiming(operation: string, startTime: number, ...args: any[]): void {
    try {
        const settings = getSettings();
        if (settings.debugMode) {
            const duration = performance.now() - startTime;
            const message = `${operation} completed in ${duration.toFixed(2)}ms`;
            if (args.length > 0) {
                console.log(`${DEBUG_PREFIX} TIMING: ${message}`, ...args);
            } else {
                console.log(`${DEBUG_PREFIX} TIMING: ${message}`);
            }
        }
    } catch (error) {
        // Fallback: if settings can't be accessed, don't log anything
    }
}

/**
 * Create a debug timer for measuring operation duration
 * @param operation The operation name
 * @returns A function to call when the operation completes
 */
export function debugTimer(operation: string): () => void {
    const startTime = performance.now();
    return () => debugTiming(operation, startTime);
}
