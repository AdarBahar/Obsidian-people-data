import { BaseDefParser } from "./base-def-parser";
import { App, TFile } from "obsidian";
import { PersonMetadata } from "./model";
import { DefFileType } from "./file-type";
import { parseColorValue } from "./company-colors";
import { parseFileHeader, splitLines } from "./file-header";


export class AtomicDefParser extends BaseDefParser {
	app: App;
	file: TFile;
	companyColor: string;

	constructor(app: App, file: TFile) {
		super();

		this.app = app;
		this.file = file;
		this.companyColor = "";
	}

	async parseFile(fileContent?: string): Promise<PersonMetadata[]> {
		if (fileContent === undefined) {
			fileContent = await this.app.vault.cachedRead(this.file);
		}

		// Read company color from frontmatter (properties)
		const fileMetadata = this.app.metadataCache.getFileCache(this.file);
		const colorValue = fileMetadata?.frontmatter?.color;
		if (typeof colorValue === 'string') {
			this.companyColor = parseColorValue(colorValue);
		}

		return this.parseContent(fileContent);
	}

	// Parse the full file text (frontmatter and logo included).
	// Synchronous, so it can run inside vault.process().
	parseContent(fileContent: string): PersonMetadata[] {
		const lines = splitLines(fileContent);
		const header = parseFileHeader(lines);

		let fullName = "";
		let position = "";
		let department = "";
		let notes = "";

		for (let i = header.bodyStart; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith("# ")) {
				fullName = line.replace("# ", "").trim();
			} else if (line.startsWith("Position: ")) {
				position = line.replace("Position: ", "").trim();
			} else if (line.startsWith("Department: ")) {
				department = line.replace("Department: ", "").trim();
			} else {
				notes += line + "\n";
			}
		}

		const personMetadata: PersonMetadata = {
			fullName,
			position,
			department,
			notes: notes.trim(),
			file: this.file,
			linkText: `${this.file.path}`,
			fileType: DefFileType.Atomic,
			filePosition: {
				from: header.bodyStart,
				to: lines.length - 1,
			},
			// Extract company name from file name (without .md extension)
			companyName: this.file.basename,
			companyLogo: header.logo,
			companyColor: this.companyColor,
		};

		return [personMetadata];
	}
}
