import { App, Notice, TFile } from "obsidian";
import { getSettings } from "src/settings";
import { logError } from "src/util/log";
import { normaliseWord } from "src/util/text";
import { ConsolidatedDefParser } from "./consolidated-def-parser";
import { getDefFileManager } from "./def-file-manager";
import { detectEol, parseFileHeader, splitLines } from "./file-header";
import { DEF_TYPE_FM } from "./file-parser";
import { DefFileType } from "./file-type";
import { FrontmatterBuilder } from "./fm-builder";
import { FilePosition, PersonMetadata } from "./model";


// All writes use vault.process(), so each change applies to the current file data.
export class DefFileUpdater {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	// Replace the entry of `original` with the values of `updated`.
	// Returns true if the file was changed.
	async updateMetadata(original: PersonMetadata, updated: PersonMetadata): Promise<boolean> {
		let changed = false;
		try {
			if (original.fileType === DefFileType.Atomic) {
				changed = await this.updateAtomicMetadataFile(original.file, updated);
			} else if (original.fileType === DefFileType.Consolidated) {
				changed = await this.updateConsolidatedMetadataFile(original, updated);
			}
		} catch (e) {
			logError(`Update of ${original.file.path} failed: ${e}`);
		}
		if (!changed) {
			new Notice(`Could not save the changes. '${original.fullName}' was not found in ${original.file.basename}.`);
			return false;
		}
		await getDefFileManager().loadUpdatedFiles();
		new Notice(`Updated '${updated.fullName}'`);
		return true;
	}

	private async updateAtomicMetadataFile(file: TFile, updated: PersonMetadata): Promise<boolean> {
		await this.app.vault.process(file, data => {
			const lines = splitLines(data);
			// Keep the frontmatter and the logo line
			const header = parseFileHeader(lines);
			const newLines = lines.slice(0, header.bodyStart)
				.concat(this.constructLinesFromMetadata(updated, false));
			return newLines.join(detectEol(data));
		});
		return true;
	}

	private async updateConsolidatedMetadataFile(original: PersonMetadata, updated: PersonMetadata): Promise<boolean> {
		let found = false;
		await this.app.vault.process(original.file, data => {
			const parser = new ConsolidatedDefParser(this.app, original.file);
			const entries = parser.parseContent(data);
			const entry = entries.find(e =>
				normaliseWord(e.fullName) === normaliseWord(original.fullName)
			);
			if (!entry?.filePosition) {
				return data;
			}
			found = true;
			const newLines = this.replaceMetadata(entry.filePosition, updated, splitLines(data));
			return newLines.join(detectEol(data));
		});
		return found;
	}

	// Returns true if the person was added.
	async addMetadata(metadata: Partial<PersonMetadata>, folder?: string): Promise<boolean> {
		let added = false;
		try {
			if (metadata.fileType === DefFileType.Consolidated) {
				added = await this.addConsolidatedFileMetadata(metadata);
			} else if (metadata.fileType === DefFileType.Atomic) {
				added = await this.addAtomicFileMetadata(metadata, folder);
			} else {
				logError("File type missing");
			}
		} catch (e) {
			logError(`Add of '${metadata.fullName}' failed: ${e}`);
		}
		if (!added) {
			new Notice(`Could not add '${metadata.fullName}'`);
			return false;
		}
		await getDefFileManager().loadUpdatedFiles();
		new Notice(`Added '${metadata.fullName}'`);
		return true;
	}

	private async addAtomicFileMetadata(metadata: Partial<PersonMetadata>, folder?: string): Promise<boolean> {
		if (!folder) {
			logError("Folder missing for atomic file add");
			return false;
		}
		const fmBuilder = new FrontmatterBuilder();
		fmBuilder.add(DEF_TYPE_FM, DefFileType.Atomic);
		const fm = fmBuilder.finish();
		const body = this.constructLinesFromMetadata(metadata, false).join("\n");
		const file = await this.app.vault.create(`${folder}/${metadata.fullName}.md`, fm + body);

		getDefFileManager().addDefFile(file);
		getDefFileManager().markDirty(file);
		return true;
	}

	private async addConsolidatedFileMetadata(metadata: Partial<PersonMetadata>): Promise<boolean> {
		const file = metadata.file;
		if (!file) {
			logError("Add metadata failed, no file given");
			return false;
		}
		await this.app.vault.process(file, data => {
			const lines = this.removeTrailingBlankLines(splitLines(data));
			const header = parseFileHeader(lines);
			const hasEntries = lines.slice(header.bodyStart).some(line => line.trim().length > 0);
			if (hasEntries && !this.endsWithSeparator(lines)) {
				lines.push('', this.getDivider());
			}
			if (lines.length > 0) {
				lines.push('');
			}
			const newLines = lines.concat(this.constructLinesFromMetadata(metadata, true));
			return newLines.join(detectEol(data));
		});
		return true;
	}

	// The divider that the parser accepts with the current settings
	private getDivider(): string {
		return getSettings().defFileParseConfig.divider.dash ? "---" : "___";
	}

	private endsWithSeparator(lines: string[]): boolean {
		if (lines.length === 0) {
			return false;
		}
		const lastLine = lines[lines.length - 1];
		const divider = getSettings().defFileParseConfig.divider;
		return (divider.dash && lastLine.startsWith("---")) ||
			(divider.underscore && lastLine.startsWith("___"));
	}

	private removeTrailingBlankLines(lines: string[]): string[] {
		const result = [...lines];
		while (result.length > 0 && result[result.length - 1].trim() === "") {
			result.pop();
		}
		return result;
	}

	// Replaces lines from..to (inclusive). The divider after the entry stays in place.
	private replaceMetadata(position: FilePosition, metadata: Partial<PersonMetadata>, lines: string[]) {
		const before = lines.slice(0, position.from);
		const after = lines.slice(position.to + 1);
		const newLines = this.constructLinesFromMetadata(metadata, false);
		return before.concat(newLines, after);
	}

	private constructLinesFromMetadata(metadata: Partial<PersonMetadata>, withDivider: boolean): string[] {
		const lines = [`# ${metadata.fullName}`];
		if (metadata.position) {
			lines.push(`Position: ${metadata.position}`);
		}
		if (metadata.department) {
			lines.push(`Department: ${metadata.department}`);
		}
		const trimmedNotes = metadata.notes ? metadata.notes.replace(/\s+$/g, '') : '';
		if (trimmedNotes) {
			lines.push('', trimmedNotes);
		}
		// A blank line before the divider, so markdown does not read "---" as a heading underline
		lines.push('');
		if (withDivider) {
			lines.push(this.getDivider());
		}
		return lines;
	}
}
