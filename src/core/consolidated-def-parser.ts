import { App, TFile } from "obsidian";
import { BaseDefParser } from "src/core/base-def-parser";
import { DefFileParseConfig } from "src/settings";
import { DefFileType } from "./file-type";
import { FilePosition, PersonMetadata } from "./model";
import { parseColorValue } from "./company-colors";
import { parseFileHeader, splitLines } from "./file-header";


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

	currLine: number;
	// Number of header lines (frontmatter and logo) before the parsed text
	lineOffset: number;

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
		this.lineOffset = 0;
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
	// File positions in the result are line indexes in the full file text.
	parseContent(fileContent: string): PersonMetadata[] {
		const lines = splitLines(fileContent);
		const header = parseFileHeader(lines);
		if (header.logo) {
			this.companyLogo = header.logo;
		}
		this.lineOffset = header.bodyStart;
		return this.directParseFile(lines.slice(header.bodyStart).join('\n'));
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
			// A "# Name" line always starts a new person, also when the divider is missing
			if (this.isFullNameDeclaration(line) && (this.inDefinition || this.bufferValid())) {
				if (this.bufferValid()) {
					this.commitDefBuffer();
				}
				this.startNewBlock();
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
				this.defBuffer.filePosition = {
					from: this.currLine,
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
				from: (this.defBuffer.filePosition?.from ?? 0) + this.lineOffset,
				to: this.currLine - 1 + this.lineOffset,
			},
			companyName: this.companyName,
			companyLogo: this.companyLogo,
			companyColor: this.companyColor,
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
		// Drop notes or fields that have no name, so they do not join the next person
		this.defBuffer = {};
	}


}
