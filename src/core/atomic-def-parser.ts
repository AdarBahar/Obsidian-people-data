import { BaseDefParser } from "./base-def-parser";
import { App, TFile } from "obsidian";
import { PersonMetadata } from "./model";
import { DefFileType } from "./file-type";
import { parseColorValue } from "./company-colors";


export class AtomicDefParser extends BaseDefParser {
	app: App;
	file: TFile;

	constructor(app: App, file: TFile) {
		super();

		this.app = app;
		this.file = file;
	}

	async parseFile(fileContent?: string): Promise<PersonMetadata[]> {
		if (!fileContent) {
			fileContent = await this.app.vault.cachedRead(this.file);
		}

		const fileMetadata = this.app.metadataCache.getFileCache(this.file);

		// Read company color from frontmatter (properties)
		let companyColor = "";
		if (fileMetadata?.frontmatter?.color) {
			// Handle different color formats from frontmatter
			const colorValue = fileMetadata.frontmatter.color;
			if (typeof colorValue === 'string') {
				companyColor = parseColorValue(colorValue);
			}
		}

		// Read company URL from frontmatter (properties)
		let companyUrl = "";
		if (fileMetadata?.frontmatter?.url) {
			const urlValue = fileMetadata.frontmatter.url;
			if (typeof urlValue === 'string') {
				companyUrl = urlValue;
			}
		}

		const fmPos = fileMetadata?.frontmatterPosition;
		if (fmPos) {
			fileContent = fileContent.slice(fmPos.end.offset+1);
		}

		const lines = fileContent.split(/\r?\n/);
		let fullName = "";
		let position = "";
		let department = "";
		let notes = "";
		let companyLogo = "";

		// Extract company name from file name (without .md extension)
		const companyName = this.file.basename;

		// Check if first non-empty line is a logo (image)
		let startIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line) {
				if (line.match(/!\[.*\]\(.*\)/)) {
					companyLogo = line;
					startIndex = i + 1;
				}
				break;
			}
		}

		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith("# ") && !line.startsWith("Position: ") && !line.startsWith("Department: ")) {
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
			companyName,
			companyLogo,
			companyColor,
			companyUrl,
		};

		return [personMetadata];
	}


}
