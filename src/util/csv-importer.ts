import { App, TFile, Notice } from "obsidian";
import { getDefFileManager } from "src/core/def-file-manager";
import { PersonMetadata } from "src/core/model";
import { logError, logInfo } from "./log";

// CSV row interface matching the required format
export interface CSVPersonRow {
	company: string;        // mandatory
	fullName: string;       // mandatory
	position?: string;      // optional
	department?: string;    // optional
	email?: string;         // optional
	phoneNumber?: string;   // optional
}

// Summary of import actions
export interface ImportSummary {
	companiesAdded: number;
	companiesAddedList: string[];
	peopleAdded: Map<string, number>;  // company -> count
	peopleUpdated: Map<string, number>; // company -> count
	failures: ImportFailure[];
	totalProcessed: number;
}

export interface ImportFailure {
	row: number;
	company: string;
	fullName: string;
	reason: string;
}

/**
 * CSV Parser and Validator
 * Handles parsing CSV content and validating required fields
 */
export class CSVParser {
	
	/**
	 * Parse CSV content into structured data
	 * @param csvContent Raw CSV content as string
	 * @returns Array of parsed and validated CSV rows
	 */
	static parseCSV(csvContent: string): { data: CSVPersonRow[], errors: string[] } {
		const lines = csvContent.trim().split('\n');
		const errors: string[] = [];
		const data: CSVPersonRow[] = [];
		
		if (lines.length === 0) {
			errors.push("CSV file is empty");
			return { data, errors };
		}
		
		// Parse header row
		const headers = this.parseCSVLine(lines[0]);
		const headerMap = this.createHeaderMap(headers);
		
		// Validate required headers
		const requiredHeaders = ['company', 'fullname'];
		const missingHeaders = requiredHeaders.filter(header => 
			!headerMap.has(header.toLowerCase())
		);
		
		if (missingHeaders.length > 0) {
			errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
			return { data, errors };
		}
		
		// Parse data rows
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue; // Skip empty lines
			
			try {
				const values = this.parseCSVLine(line);
				const row = this.mapRowToInterface(values, headerMap, i + 1);
				
				// Validate mandatory fields
				const validationError = this.validateRow(row, i + 1);
				if (validationError) {
					errors.push(validationError);
					continue;
				}
				
				data.push(row);
			} catch (error) {
				errors.push(`Row ${i + 1}: Failed to parse - ${error.message}`);
			}
		}
		
		return { data, errors };
	}
	
	/**
	 * Parse a single CSV line handling quoted values and commas
	 */
	private static parseCSVLine(line: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;
		
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					// Escaped quote
					current += '"';
					i++; // Skip next quote
				} else {
					// Toggle quote state
					inQuotes = !inQuotes;
				}
			} else if (char === ',' && !inQuotes) {
				// End of field
				result.push(current.trim());
				current = '';
			} else {
				current += char;
			}
		}
		
		// Add the last field
		result.push(current.trim());
		
		return result;
	}
	
	/**
	 * Create a map of header names to their column indices
	 */
	private static createHeaderMap(headers: string[]): Map<string, number> {
		const map = new Map<string, number>();
		headers.forEach((header, index) => {
			// Normalize header names for flexible matching
			const normalized = header.toLowerCase()
				.replace(/\s+/g, '')
				.replace(/[^a-z0-9]/g, '');
			map.set(normalized, index);
		});
		return map;
	}
	
	/**
	 * Map CSV values to CSVPersonRow interface
	 */
	private static mapRowToInterface(values: string[], headerMap: Map<string, number>, rowNumber: number): CSVPersonRow {
		const getValue = (headerVariants: string[]): string | undefined => {
			for (const variant of headerVariants) {
				const index = headerMap.get(variant);
				if (index !== undefined && values[index]) {
					return values[index].trim();
				}
			}
			return undefined;
		};
		
		return {
			company: getValue(['company', 'companyname']) || '',
			fullName: getValue(['fullname', 'name', 'fullname']) || '',
			position: getValue(['position', 'jobtitle', 'title', 'role']),
			department: getValue(['department', 'dept', 'division']),
			email: getValue(['email', 'emailaddress', 'mail']),
			phoneNumber: getValue(['phonenumber', 'phone', 'tel', 'telephone'])
		};
	}
	
	/**
	 * Validate a single row for required fields
	 */
	private static validateRow(row: CSVPersonRow, rowNumber: number): string | null {
		if (!row.company || row.company.trim() === '') {
			return `Row ${rowNumber}: Company is required but missing`;
		}
		
		if (!row.fullName || row.fullName.trim() === '') {
			return `Row ${rowNumber}: Full Name is required but missing`;
		}
		
		// Validate email format if provided
		if (row.email && !this.isValidEmail(row.email)) {
			return `Row ${rowNumber}: Invalid email format: ${row.email}`;
		}
		
		return null;
	}
	
	/**
	 * Basic email validation
	 */
	private static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
}

/**
 * Company Page Manager
 * Handles creation and management of company pages
 */
export class CompanyPageManager {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Check if a company page exists
	 * @param companyName Name of the company
	 * @returns TFile if exists, null otherwise
	 */
	async getCompanyPage(companyName: string): Promise<TFile | null> {
		const defManager = getDefFileManager();
		const defFolder = defManager.getGlobalDefFolder();
		const sanitizedName = this.sanitizeFileName(companyName);
		const filePath = `${defFolder}/${sanitizedName}.md`;

		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		return existingFile instanceof TFile ? existingFile : null;
	}

	/**
	 * Create a new company page using the template
	 * @param companyName Name of the company
	 * @returns Created TFile
	 */
	async createCompanyPage(companyName: string): Promise<TFile> {
		const defManager = getDefFileManager();
		const defFolder = defManager.getGlobalDefFolder();
		const sanitizedName = this.sanitizeFileName(companyName);
		let filePath = `${defFolder}/${sanitizedName}.md`;

		// Check if file already exists, if so, add a number suffix
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(filePath)) {
			filePath = `${defFolder}/${sanitizedName}-${counter}.md`;
			counter++;
		}

		// Create the company file with template (without sample names)
		const template = this.createCompanyTemplate(companyName);
		const file = await this.app.vault.create(filePath, template);

		// Register the file as a consolidated definition file
		const fileMetadata = this.app.metadataCache.getFileCache(file);
		if (fileMetadata?.frontmatter?.['def-type'] === 'consolidated') {
			defManager.addDefFile(file);
		}

		logInfo(`Created new company page: ${file.path}`);
		return file;
	}

	/**
	 * Create company template without sample names
	 * @param companyName Name of the company
	 * @returns Template content
	 */
	private createCompanyTemplate(companyName: string): string {
		return `---
def-type: consolidated
color: "blue"
---

![${companyName} Logo](logo.png)

`;
	}

	/**
	 * Remove sample names from an existing company page
	 * @param file Company file to clean
	 */
	async removeSampleNames(file: TFile): Promise<void> {
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');

		// Find the end of frontmatter and logo
		let startIndex = 0;
		let inFrontmatter = false;
		let foundLogo = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (line === '---') {
				if (!inFrontmatter) {
					inFrontmatter = true;
				} else {
					inFrontmatter = false;
					startIndex = i + 1;
				}
			} else if (!inFrontmatter && line.match(/!\[.*\]\(.*\)/)) {
				foundLogo = true;
				startIndex = i + 1;
				break;
			} else if (!inFrontmatter && !foundLogo && line) {
				// Found content after frontmatter, no logo
				startIndex = i;
				break;
			}
		}

		// Keep only frontmatter and logo, remove all sample content
		const cleanedLines = lines.slice(0, startIndex);

		// Add empty line after logo/frontmatter if not present
		if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() !== '') {
			cleanedLines.push('');
		}

		const cleanedContent = cleanedLines.join('\n');
		await this.app.vault.modify(file, cleanedContent);

		logInfo(`Removed sample names from company page: ${file.path}`);
	}

	/**
	 * Sanitize company name for use as filename
	 * @param companyName Raw company name
	 * @returns Sanitized filename
	 */
	private sanitizeFileName(companyName: string): string {
		return companyName
			.replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/\.+$/, '') // Remove trailing dots
			.trim();
	}
}

/**
 * Person Data Comparator
 * Handles comparison and updating of person data
 */
export class PersonDataComparator {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Find existing person in company file
	 * @param file Company file to search
	 * @param fullName Person's full name
	 * @returns PersonMetadata if found, null otherwise
	 */
	async findExistingPerson(file: TFile, fullName: string): Promise<PersonMetadata | null> {
		const defManager = getDefFileManager();

		// Get all people from this file
		const fileContent = await this.app.vault.read(file);
		const parser = new (await import('../core/consolidated-def-parser')).ConsolidatedDefParser(this.app, file);
		const people = await parser.parseFile(fileContent);

		// Find person by normalized name
		const normalizedSearchName = fullName.toLowerCase().trim();
		return people.find(person =>
			person.fullName.toLowerCase().trim() === normalizedSearchName
		) || null;
	}

	/**
	 * Compare CSV data with existing person data
	 * @param csvPerson CSV person data
	 * @param existingPerson Existing person metadata
	 * @returns true if update is needed, false otherwise
	 */
	needsUpdate(csvPerson: CSVPersonRow, existingPerson: PersonMetadata): boolean {
		// Compare each field
		const fieldsToCompare = [
			{ csv: csvPerson.position || '', existing: existingPerson.position || '' },
			{ csv: csvPerson.department || '', existing: existingPerson.department || '' }
		];

		// Check if any field has changed
		return fieldsToCompare.some(field =>
			field.csv.trim() !== field.existing.trim()
		);
	}

	/**
	 * Update person data in company file
	 * @param file Company file
	 * @param csvPerson CSV person data
	 * @param existingPerson Existing person metadata
	 */
	async updatePersonInFile(file: TFile, csvPerson: CSVPersonRow, existingPerson: PersonMetadata): Promise<void> {
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');

		// Find the person's section in the file
		const personStartLine = this.findPersonStartLine(lines, existingPerson.fullName);
		if (personStartLine === -1) {
			throw new Error(`Could not find person ${existingPerson.fullName} in file`);
		}

		// Find the end of this person's section
		const personEndLine = this.findPersonEndLine(lines, personStartLine);

		// Generate new person content
		const newPersonContent = this.generatePersonContent(csvPerson);
		const newPersonLines = newPersonContent.split('\n');

		// Replace the person's section
		const updatedLines = [
			...lines.slice(0, personStartLine),
			...newPersonLines,
			...lines.slice(personEndLine + 1)
		];

		const updatedContent = updatedLines.join('\n');
		await this.app.vault.modify(file, updatedContent);

		logInfo(`Updated person ${csvPerson.fullName} in ${file.path}`);
	}

	/**
	 * Find the line number where a person's section starts
	 * @param lines File content lines
	 * @param fullName Person's full name
	 * @returns Line number or -1 if not found
	 */
	private findPersonStartLine(lines: string[], fullName: string): number {
		const searchPattern = `# ${fullName}`;
		return lines.findIndex(line => line.trim() === searchPattern);
	}

	/**
	 * Find the line number where a person's section ends
	 * @param lines File content lines
	 * @param startLine Starting line of person's section
	 * @returns End line number
	 */
	private findPersonEndLine(lines: string[], startLine: number): number {
		// Look for the next person (starts with #) or divider (---)
		for (let i = startLine + 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.startsWith('# ') || line.startsWith('---')) {
				return i - 1;
			}
		}
		// If no next section found, end at last line
		return lines.length - 1;
	}

	/**
	 * Generate markdown content for a person
	 * @param csvPerson CSV person data
	 * @returns Markdown content
	 */
	private generatePersonContent(csvPerson: CSVPersonRow): string {
		return MarkdownGenerator.generatePersonEntry(csvPerson);
	}
}

/**
 * Markdown Generator
 * Handles generation of markdown content for people and companies
 */
export class MarkdownGenerator {

	/**
	 * Generate markdown entry for a person
	 * @param csvPerson CSV person data
	 * @returns Formatted markdown content
	 */
	static generatePersonEntry(csvPerson: CSVPersonRow): string {
		let content = `# ${csvPerson.fullName}\n`;

		if (csvPerson.position) {
			content += `Position: ${csvPerson.position}\n`;
		}

		if (csvPerson.department) {
			content += `Department: ${csvPerson.department}\n`;
		}

		// Add notes section with contact info if available
		const contactInfo = [];
		if (csvPerson.email) {
			contactInfo.push(`Email: ${csvPerson.email}`);
		}
		if (csvPerson.phoneNumber) {
			contactInfo.push(`Phone: ${csvPerson.phoneNumber}`);
		}

		if (contactInfo.length > 0) {
			content += '\n' + contactInfo.join('\n') + '\n';
		} else {
			content += '\n';
		}

		content += '\n---';

		return content;
	}

	/**
	 * Generate multiple person entries for a company
	 * @param people Array of CSV person data
	 * @returns Combined markdown content
	 */
	static generateMultiplePersonEntries(people: CSVPersonRow[]): string {
		return people.map(person => this.generatePersonEntry(person)).join('\n\n');
	}

	/**
	 * Generate complete company page content
	 * @param companyName Name of the company
	 * @param people Array of people for this company
	 * @param companyColor Optional company color
	 * @returns Complete company page markdown
	 */
	static generateCompanyPage(companyName: string, people: CSVPersonRow[], companyColor: string = "blue"): string {
		let content = `---
def-type: consolidated
color: "${companyColor}"
---

![${companyName} Logo](logo.png)

`;

		if (people.length > 0) {
			content += this.generateMultiplePersonEntries(people);
			content += '\n';
		}

		return content;
	}

	/**
	 * Append person entry to existing company content
	 * @param existingContent Current company file content
	 * @param csvPerson Person to add
	 * @returns Updated content
	 */
	static appendPersonToCompany(existingContent: string, csvPerson: CSVPersonRow): string {
		const personEntry = this.generatePersonEntry(csvPerson);

		// If content ends with whitespace, add person entry
		// Otherwise add some spacing first
		let updatedContent = existingContent.trimEnd();

		if (updatedContent.length > 0) {
			updatedContent += '\n\n';
		}

		updatedContent += personEntry + '\n';

		return updatedContent;
	}
}

/**
 * Import Summary Reporter
 * Tracks and reports on import operations
 */
export class ImportSummaryReporter {
	private summary: ImportSummary;

	constructor() {
		this.summary = {
			companiesAdded: 0,
			companiesAddedList: [],
			peopleAdded: new Map<string, number>(),
			peopleUpdated: new Map<string, number>(),
			failures: [],
			totalProcessed: 0
		};
	}

	/**
	 * Record a new company being added
	 * @param companyName Name of the company
	 */
	recordCompanyAdded(companyName: string): void {
		this.summary.companiesAdded++;
		this.summary.companiesAddedList.push(companyName);
	}

	/**
	 * Record a person being added to a company
	 * @param companyName Name of the company
	 */
	recordPersonAdded(companyName: string): void {
		const current = this.summary.peopleAdded.get(companyName) || 0;
		this.summary.peopleAdded.set(companyName, current + 1);
	}

	/**
	 * Record a person being updated in a company
	 * @param companyName Name of the company
	 */
	recordPersonUpdated(companyName: string): void {
		const current = this.summary.peopleUpdated.get(companyName) || 0;
		this.summary.peopleUpdated.set(companyName, current + 1);
	}

	/**
	 * Record a failure during import
	 * @param failure Import failure details
	 */
	recordFailure(failure: ImportFailure): void {
		this.summary.failures.push(failure);
	}

	/**
	 * Increment total processed count
	 */
	incrementProcessed(): void {
		this.summary.totalProcessed++;
	}

	/**
	 * Get the current summary
	 * @returns Import summary
	 */
	getSummary(): ImportSummary {
		return { ...this.summary };
	}

	/**
	 * Generate a formatted report string
	 * @returns Formatted summary report
	 */
	generateReport(): string {
		const s = this.summary;
		let report = '# CSV Import Summary\n\n';

		report += `**Total Records Processed:** ${s.totalProcessed}\n\n`;

		// Companies section
		report += '## Companies\n';
		report += `**New Companies Added:** ${s.companiesAdded}\n`;
		if (s.companiesAddedList.length > 0) {
			report += '- ' + s.companiesAddedList.join('\n- ') + '\n';
		}
		report += '\n';

		// People added section
		report += '## People Added\n';
		if (s.peopleAdded.size > 0) {
			let totalAdded = 0;
			for (const [company, count] of s.peopleAdded) {
				report += `**${company}:** ${count} people\n`;
				totalAdded += count;
			}
			report += `\n**Total People Added:** ${totalAdded}\n\n`;
		} else {
			report += 'No new people were added.\n\n';
		}

		// People updated section
		report += '## People Updated\n';
		if (s.peopleUpdated.size > 0) {
			let totalUpdated = 0;
			for (const [company, count] of s.peopleUpdated) {
				report += `**${company}:** ${count} people\n`;
				totalUpdated += count;
			}
			report += `\n**Total People Updated:** ${totalUpdated}\n\n`;
		} else {
			report += 'No people were updated.\n\n';
		}

		// Failures section
		report += '## Failures\n';
		if (s.failures.length > 0) {
			report += `**Total Failures:** ${s.failures.length}\n\n`;
			for (const failure of s.failures) {
				report += `**Row ${failure.row}:** ${failure.fullName} (${failure.company})\n`;
				report += `- Reason: ${failure.reason}\n\n`;
			}
		} else {
			report += 'No failures occurred during import.\n\n';
		}

		return report;
	}

	/**
	 * Display summary as Obsidian notice
	 */
	showNotice(): void {
		const s = this.summary;
		const totalSuccess = Array.from(s.peopleAdded.values()).reduce((sum, count) => sum + count, 0) +
							Array.from(s.peopleUpdated.values()).reduce((sum, count) => sum + count, 0);

		let message = `CSV Import Complete!\n`;
		message += `✅ ${totalSuccess} people processed successfully\n`;
		message += `🏢 ${s.companiesAdded} new companies created\n`;

		if (s.failures.length > 0) {
			message += `❌ ${s.failures.length} failures`;
		}

		new Notice(message, 5000);
	}
}

/**
 * Main CSV Importer
 * Orchestrates the entire CSV import process
 */
export class CSVImporter {
	private app: App;
	private companyManager: CompanyPageManager;
	private dataComparator: PersonDataComparator;
	private reporter: ImportSummaryReporter;

	constructor(app: App) {
		this.app = app;
		this.companyManager = new CompanyPageManager(app);
		this.dataComparator = new PersonDataComparator(app);
		this.reporter = new ImportSummaryReporter();
	}

	/**
	 * Import people from CSV content
	 * @param csvContent Raw CSV content
	 * @returns Import summary
	 */
	async importFromCSV(csvContent: string): Promise<ImportSummary> {
		logInfo("Starting CSV import process");

		// Parse and validate CSV
		const { data: csvPeople, errors } = CSVParser.parseCSV(csvContent);

		if (errors.length > 0) {
			logError(`CSV parsing errors: ${errors.join(', ')}`);
			// Add parsing errors as failures
			errors.forEach((error, index) => {
				this.reporter.recordFailure({
					row: index + 1,
					company: '',
					fullName: '',
					reason: error
				});
			});
		}

		if (csvPeople.length === 0) {
			logError("No valid people found in CSV");
			return this.reporter.getSummary();
		}

		// Group people by company
		const companiesMap = this.groupPeopleByCompany(csvPeople);

		// Process each company
		for (const [companyName, people] of companiesMap) {
			await this.processCompany(companyName, people);
		}

		// Refresh definitions to pick up new/updated files
		const defManager = getDefFileManager();
		defManager.loadDefinitions();

		// Show summary
		this.reporter.showNotice();

		logInfo("CSV import process completed");
		return this.reporter.getSummary();
	}

	/**
	 * Group CSV people by company
	 * @param csvPeople Array of CSV person data
	 * @returns Map of company name to people array
	 */
	private groupPeopleByCompany(csvPeople: CSVPersonRow[]): Map<string, CSVPersonRow[]> {
		const companiesMap = new Map<string, CSVPersonRow[]>();

		for (const person of csvPeople) {
			const companyName = person.company.trim();
			if (!companiesMap.has(companyName)) {
				companiesMap.set(companyName, []);
			}
			companiesMap.get(companyName)!.push(person);
		}

		return companiesMap;
	}

	/**
	 * Process all people for a single company
	 * @param companyName Name of the company
	 * @param people Array of people for this company
	 */
	private async processCompany(companyName: string, people: CSVPersonRow[]): Promise<void> {
		try {
			logInfo(`Processing company: ${companyName} with ${people.length} people`);

			// Check if company page exists
			let companyFile = await this.companyManager.getCompanyPage(companyName);
			let isNewCompany = false;

			if (!companyFile) {
				// Create new company page
				companyFile = await this.companyManager.createCompanyPage(companyName);
				this.reporter.recordCompanyAdded(companyName);
				isNewCompany = true;
				logInfo(`Created new company page for: ${companyName}`);
			} else {
				// Remove sample names from existing company if it has them
				await this.companyManager.removeSampleNames(companyFile);
				logInfo(`Using existing company page for: ${companyName}`);
			}

			// Process each person in the company
			for (const person of people) {
				await this.processPerson(companyFile, person, isNewCompany);
			}

		} catch (error) {
			logError(`Failed to process company ${companyName}: ${error.message}`);
			// Record failures for all people in this company
			people.forEach((person, index) => {
				this.reporter.recordFailure({
					row: index + 1, // This is approximate since we don't track original row numbers
					company: companyName,
					fullName: person.fullName,
					reason: `Company processing failed: ${error.message}`
				});
			});
		}
	}

	/**
	 * Process a single person within a company
	 * @param companyFile Company file to add/update person in
	 * @param csvPerson CSV person data
	 * @param isNewCompany Whether this is a newly created company
	 */
	private async processPerson(companyFile: TFile, csvPerson: CSVPersonRow, isNewCompany: boolean): Promise<void> {
		try {
			this.reporter.incrementProcessed();

			// Check if person already exists
			const existingPerson = await this.dataComparator.findExistingPerson(companyFile, csvPerson.fullName);

			if (existingPerson) {
				// Person exists, check if update is needed
				if (this.dataComparator.needsUpdate(csvPerson, existingPerson)) {
					await this.dataComparator.updatePersonInFile(companyFile, csvPerson, existingPerson);
					this.reporter.recordPersonUpdated(csvPerson.company);
					logInfo(`Updated person: ${csvPerson.fullName} in ${csvPerson.company}`);
				} else {
					logInfo(`No changes needed for: ${csvPerson.fullName} in ${csvPerson.company}`);
				}
			} else {
				// Person doesn't exist, add them
				await this.addPersonToCompany(companyFile, csvPerson);
				this.reporter.recordPersonAdded(csvPerson.company);
				logInfo(`Added new person: ${csvPerson.fullName} to ${csvPerson.company}`);
			}

		} catch (error) {
			logError(`Failed to process person ${csvPerson.fullName}: ${error.message}`);
			this.reporter.recordFailure({
				row: 0, // We don't have the original row number here
				company: csvPerson.company,
				fullName: csvPerson.fullName,
				reason: error.message
			});
		}
	}

	/**
	 * Add a new person to a company file
	 * @param companyFile Company file
	 * @param csvPerson CSV person data
	 */
	private async addPersonToCompany(companyFile: TFile, csvPerson: CSVPersonRow): Promise<void> {
		const currentContent = await this.app.vault.read(companyFile);
		const updatedContent = MarkdownGenerator.appendPersonToCompany(currentContent, csvPerson);
		await this.app.vault.modify(companyFile, updatedContent);
	}
}

/**
 * Utility function to create and run CSV importer
 * @param app Obsidian App instance
 * @param csvContent Raw CSV content
 * @returns Import summary
 */
export async function importPeopleFromCSV(app: App, csvContent: string): Promise<ImportSummary> {
	const importer = new CSVImporter(app);
	return await importer.importFromCSV(csvContent);
}
