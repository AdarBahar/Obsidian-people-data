// Rudimentary logger implementation
import { PluginContext } from "../core/plugin-context";

export enum LogLevel {
	Silent,
	Error,
	Warn,
	Info,
	Debug,
}

const levelMap = {
	0: "SILENT", // Should not be used
	1: "ERROR",
	2: "WARN",
	3: "INFO",
	4: "DEBUG"
}

// Log only if current log level is >= specified log level
function logWithLevel(msg: string, logLevel: LogLevel) {
	try {
		const context = PluginContext.getInstance();
		if (context.logLevel >= logLevel) {
			console.log(`${levelMap[logLevel]}: ${msg}`);
		}
	} catch (e) {
		// Fallback if context is not initialized
		console.log(`${levelMap[logLevel]}: ${msg}`);
	}
}

// Convenience methods for each level

export function logDebug(msg: string) {
	logWithLevel(msg, LogLevel.Debug);
}

export function logInfo(msg: string) {
	logWithLevel(msg, LogLevel.Info);
}

export function logWarn(msg: string) {
	logWithLevel(msg, LogLevel.Warn);
}

export function logError(msg: string) {
	logWithLevel(msg, LogLevel.Error);
}
