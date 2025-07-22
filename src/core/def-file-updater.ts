import { App, Notice } from "obsidian";
import { getSettings } from "src/settings";
import { logError, logWarn } from "src/util/log";
import { normaliseWord } from "src/util/editor";
import { getDefFileManager } from "./def-file-manager";
import { FileParser } from "./file-parser";
import { DefFileType } from "./file-type";
import { FrontmatterBuilder } from "./fm-builder";
import { FilePosition, PersonMetadata } from "./model";


export class DefFileUpdater {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	async updateMetadata(metadata: PersonMetadata) {
		if (metadata.fileType === DefFileType.Atomic) {
			await this.updateAtomicMetadataFile(metadata);
		} else if (metadata.fileType === DefFileType.Consolidated) {
			await this.updateConsolidatedMetadataFile(metadata);
		} else {
			return;
		}
		await getDefFileManager().loadUpdatedFiles();
		new Notice("Metadata successfully modified");
	}

	private async updateAtomicMetadataFile(metadata: PersonMetadata) {
		await this.app.vault.process(metadata.file, () => metadata.notes);
	}

	private async updateConsolidatedMetadataFile(metadata: PersonMetadata) {
		const file = metadata.file;
		const fileContent = await this.app.vault.read(file);

		const fileParser = new FileParser(this.app, file);
		const metadatas = await fileParser.parseFile(fileContent);
		const lines = fileContent.split(/\r?\n/);

		const fileMetadata = metadatas.find(fileMetadata => 
			normaliseWord(fileMetadata.fullName) === normaliseWord(metadata.fullName)
		);
		if (!fileMetadata) {
			logError("File metadata not found, cannot edit");
			return;
		}
		if (fileMetadata.filePosition) {
			const newLines = this.replaceMetadata(fileMetadata.filePosition, metadata, lines);
			const newContent = newLines.join("\n");

			await this.app.vault.process(file, () => newContent);
		}
	}

	async addMetadata(metadata: Partial<PersonMetadata>, folder?: string) {
		if (!metadata.fileType) {
			logError("File type missing");
			return;
		}
		if (metadata.fileType === DefFileType.Consolidated) {
			await this.addConsolidatedFileMetadata(metadata);
		} else if (metadata.fileType === DefFileType.Atomic) {
			await this.addAtomicFileMetadata(metadata, folder);
		}
		await getDefFileManager().loadUpdatedFiles();
		new Notice("Metadata successfully added");
	}

	private async addAtomicFileMetadata(metadata: Partial<PersonMetadata>, folder?: string) {
		if (!folder) {
			logError("Folder missing for atomic file add");
			return;
		}
		if (!metadata.notes) {
			logWarn("No notes given");
			return;
		}
		const fmBuilder = new FrontmatterBuilder();
		fmBuilder.add("metadata-type", "atomic");
		const fm = fmBuilder.finish();
		const file = await this.app.vault.create(`${folder}/${metadata.fullName}.md`, fm+metadata.notes);

		getDefFileManager().addDefFile(file);
		getDefFileManager().markDirty(file);
	}

	private async addConsolidatedFileMetadata(metadata: Partial<PersonMetadata>) {
		const file = metadata.file;
		if (!file) {
			logError("Add metadata failed, no file given");
			return;
		}
		const fileContent = await this.app.vault.read(file);
		let lines = fileContent.split(/\r?\n/);
		lines = this.removeTrailingBlankNewlines(lines);
		if (!this.checkEndedWithSeparator(lines)) {
			this.addSeparator(lines);
		}
		const addedLines = this.constructLinesFromMetadata(metadata);
		const newLines = lines.concat(addedLines);
		const newContent = newLines.join("\n");

		await this.app.vault.process(file, () => newContent);
	}

	private addSeparator(lines: string[]) {
		const dividerSettings = getSettings().defFileParseConfig.divider;
		let sepChoice = dividerSettings.underscore ? "___" : "---";
		lines.push('', sepChoice);
	}
	
	private checkEndedWithSeparator(lines: string[]): boolean {
		const settings = getSettings();
		if (settings.defFileParseConfig.divider.dash && lines[lines.length-1].startsWith("---")) {
			return true;
		}
		if (settings.defFileParseConfig.divider.underscore && lines[lines.length-1].startsWith("___")) {
			return true;
		}
		return false;
	}

	private removeTrailingBlankNewlines(lines: string[]): string[] {
		let blankLines = 0;
		for (let i = 0; i < lines.length; i++) {
			const currLine = lines[lines.length - 1 - i];
			if (/\S/.test(currLine)) {
				blankLines = i;
				break;
			}
		}
		return lines.slice(0, lines.length - blankLines);
	}

	private replaceMetadata(position: FilePosition, metadata: PersonMetadata, lines: string[]) {
		const before = lines.slice(0, position.from);
		const after = lines.slice(position.to+1);
		const newLines = this.constructLinesFromMetadata(metadata);
		return before.concat(newLines, after);
	}

	private constructLinesFromMetadata(metadata: Partial<PersonMetadata>): string[] {
		const lines = [`# ${metadata.fullName}`];
		if (metadata.position) {
			lines.push(`Position: ${metadata.position}`);
		}
		if (metadata.department) {
			lines.push(`Department: ${metadata.department}`);
		}
		const trimmedNotes = metadata.notes ? metadata.notes.replace(/\s+$/g, '') : '';
		lines.push('', trimmedNotes, '', '---');
		return lines;
	}
}
