import { App, TFile } from "obsidian";
import { BaseDefParser } from "src/core/base-def-parser";
import { DefFileParseConfig } from "src/settings";
import { DefFileType } from "./file-type";
// import { Definition } from "./model"; // Removed as it's no longer used
import { FilePosition, PersonMetadata } from "./model";
import { parseColorValue } from "./company-colors";


export class ConsolidatedDefParser extends BaseDefParser {
	app: App;
	file: TFile;
	parseSettings: DefFileParseConfig;

	defBuffer: {
		fullName?: string;
		position?: string;
		department?: string;
		notes?: string;
		filePosition?: Partial<FilePosition>;
	};
	inDefinition: boolean;
	definitions: PersonMetadata[];
	companyName: string;
	companyLogo: string;
	companyColor: string;
	companyUrl: string;

	currLine: number;

	constructor(app: App, file: TFile, parseSettings?: DefFileParseConfig) {
		super(parseSettings);

		this.app = app;
		this.file = file;

		this.parseSettings = parseSettings ? parseSettings : this.getParseSettings();

		this.defBuffer = {};
		this.inDefinition = false;
		this.definitions = [];
		this.companyName = file.basename; // Extract company name from file name
		this.companyLogo = "";
		this.companyColor = "";
		this.companyUrl = "";
	}

	async parseFile(fileContent?: string): Promise<PersonMetadata[]> {
		if (!fileContent) {
			fileContent = await this.app.vault.cachedRead(this.file);
		}

		// Read company color from frontmatter (properties)
		const fileMetadata = this.app.metadataCache.getFileCache(this.file);

		if (fileMetadata?.frontmatter?.color) {
			// Handle different color formats from frontmatter
			const colorValue = fileMetadata.frontmatter.color;
			if (typeof colorValue === 'string') {
				this.companyColor = parseColorValue(colorValue);
			}
		}

		if (fileMetadata?.frontmatter?.url) {
			// Read company URL from frontmatter
			const urlValue = fileMetadata.frontmatter.url;
			if (typeof urlValue === 'string') {
				this.companyUrl = urlValue;
			}
		}

		// Ignore frontmatter (properties) from content
		const fmPos = fileMetadata?.frontmatterPosition;
		if (fmPos) {
			fileContent = fileContent.slice(fmPos.end.offset+1);
		}

		// Check if first non-empty line is a company logo (image)
		const lines = fileContent.split(/\r?\n/);
		let startIndex = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line) {
				if (line.match(/!\[.*\]\(.*\)/)) {
					this.companyLogo = line;
					startIndex = i + 1;
				}
				break;
			}
		}
		
		// Remove the logo and color lines from content before parsing
		if (startIndex > 0) {
			fileContent = lines.slice(startIndex).join('\n');
		}

		return this.directParseFile(fileContent);
	}

	// Parse from string, no dependency on App
	// For ease of testing
	directParseFile(fileContent: string) {
		const lines = fileContent.split(/\r?\n/);
		this.currLine = -1;

		for (const line of lines) {
			this.currLine++;

			if (this.isEndOfBlock(line)) {
				if (this.bufferValid()) {
					this.commitDefBuffer();
				}
				this.startNewBlock();
				continue
			}
			if (this.inDefinition) {
				this.defBuffer.notes += line + "\n";
				continue
			}

			// If not within definition, ignore empty lines
			if (line == "") {
				continue
			}
			if (this.isFullNameDeclaration(line)) {
				let from = this.currLine;
				this.defBuffer.filePosition = {
					from: from,
				}
				this.defBuffer.fullName = this.extractFullName(line);
				continue
			}
			if (this.isPositionDeclaration(line)) {
				this.defBuffer.position = this.extractPosition(line);
				continue
			}
			if (this.isDepartmentDeclaration(line)) {
				this.defBuffer.department = this.extractDepartment(line);
				continue
			}
			// Begin definition
			this.inDefinition = true;
			this.defBuffer.notes = line + "\n";
		}
		this.currLine++;
		if (this.bufferValid()) {
			this.commitDefBuffer();
		}
		return this.definitions;
	}

	private commitDefBuffer() {
		const notes = (this.defBuffer.notes ?? "").trim();

		const personMetadata = {
			fullName: this.defBuffer.fullName ?? "",
			position: this.defBuffer.position ?? "",
			department: this.defBuffer.department ?? "",
			notes: notes,
			file: this.file,
			linkText: `${this.file.path}${this.defBuffer.fullName ? '#' + this.defBuffer.fullName : ''}`,
			fileType: DefFileType.Consolidated,
			filePosition: {
				from: this.defBuffer.filePosition?.from ?? 0,
				to: this.currLine - 1,
			},
			companyName: this.companyName,
			companyLogo: this.companyLogo,
			companyColor: this.companyColor,
			companyUrl: this.companyUrl,
		};



		this.definitions.push(personMetadata);
		this.defBuffer = {};
	}

	private bufferValid(): boolean {
		return !!this.defBuffer.fullName;
	}

	private isEndOfBlock(line: string): boolean {
		if (this.parseSettings.divider.dash && line.startsWith("---")) {
			return true;
		}
		return this.parseSettings.divider.underscore && line.startsWith("___");
	}

	private isFullNameDeclaration(line: string): boolean {
		return line.startsWith("# ") && !line.startsWith("Position: ") && !line.startsWith("Department: ");
	}

	private extractFullName(line: string): string {
		return line.replace("# ", "").trim();
	}

	private isPositionDeclaration(line: string): boolean {
		return line.startsWith("Position: ");
	}

	private extractPosition(line: string): string {
		return line.replace("Position: ", "").trim();
	}

	private isDepartmentDeclaration(line: string): boolean {
		return line.startsWith("Department: ");
	}

	private extractDepartment(line: string): string {
		return line.replace("Department: ", "").trim();
	}

	private startNewBlock() {
		this.inDefinition = false;
	}


}
