import { App, TFile, Notice } from "obsidian";
import { getDefFileManager } from "./def-file-manager";
import { DefFileUpdater } from "./def-file-updater";
import { DefFileType } from "./file-type";
import { PersonMetadata } from "./model";
import { getCompanyManager } from "./company-manager";

export interface CSVRow {
    company: string;
    fullName: string;
    position?: string;
    department?: string;
    email?: string;
    phoneNumber?: string;
}

export interface CSVImportResult {
    totalProcessed: number;
    companiesCreated: string[];
    peopleAdded: { [company: string]: number };
    peopleUpdated: { [company: string]: number };
    errors: string[];
    summaryFile?: TFile;
}

export interface CompanyData {
    name: string;
    file?: TFile;
    people: CSVRow[];
}

export class CSVImportService {
    private app: App;
    private defUpdater: DefFileUpdater;

    constructor(app: App) {
        this.app = app;
        this.defUpdater = new DefFileUpdater(app);
    }

    async importFromCSV(csvContent: string): Promise<CSVImportResult> {
        const result: CSVImportResult = {
            totalProcessed: 0,
            companiesCreated: [],
            peopleAdded: {},
            peopleUpdated: {},
            errors: []
        };

        try {
            // Parse CSV content
            const rows = this.parseCSV(csvContent);
            if (rows.length === 0) {
                throw new Error("No valid data found in CSV");
            }

            // Group by company
            const companies = this.groupByCompany(rows);
            
            // Process each company
            for (const company of companies) {
                await this.processCompany(company, result);
            }

            result.totalProcessed = rows.length;

            // Create import summary
            result.summaryFile = await this.createImportSummary(result);

            // Refresh definitions to include new data
            await getDefFileManager().loadDefinitions();

        } catch (error) {
            result.errors.push(`Import failed: ${error.message}`);
            throw error;
        }

        return result;
    }

    private parseCSV(csvContent: string): CSVRow[] {
        const lines = csvContent.trim().split(/\r?\n/);
        if (lines.length < 2) {
            throw new Error("CSV must have at least a header row and one data row");
        }

        const headers = this.parseCSVLine(lines[0]);
        const headerMap = this.createHeaderMap(headers);

        const rows: CSVRow[] = [];
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);
                if (values.length === 0 || values.every(v => !v.trim())) {
                    continue; // Skip empty rows
                }

                const row = this.createRowFromValues(values, headerMap, i + 1);
                if (row) {
                    rows.push(row);
                }
            } catch (error) {
                console.warn(`Error parsing CSV line ${i + 1}: ${error.message}`);
            }
        }

        return rows;
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    private createHeaderMap(headers: string[]): { [key: string]: number } {
        const map: { [key: string]: number } = {};
        
        // Define header variations
        const headerVariations = {
            company: ['company', 'companyname'],
            fullName: ['full name', 'name', 'fullname'],
            position: ['position', 'jobtitle', 'title', 'role'],
            department: ['department', 'dept', 'division'],
            email: ['email', 'emailaddress', 'mail'],
            phoneNumber: ['phonenumber', 'phone', 'tel', 'telephone']
        };

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase().trim();
            
            for (const [key, variations] of Object.entries(headerVariations)) {
                if (variations.includes(header)) {
                    map[key] = i;
                    break;
                }
            }
        }

        // Validate required headers
        if (map.company === undefined) {
            throw new Error("Missing required header: Company (or CompanyName)");
        }
        if (map.fullName === undefined) {
            throw new Error("Missing required header: Full Name (or Name, FullName)");
        }

        return map;
    }

    private createRowFromValues(values: string[], headerMap: { [key: string]: number }, lineNumber: number): CSVRow | null {
        const company = values[headerMap.company]?.trim();
        const fullName = values[headerMap.fullName]?.trim();

        if (!company || !fullName) {
            console.warn(`Line ${lineNumber}: Missing required fields (Company: "${company}", Full Name: "${fullName}")`);
            return null;
        }

        return {
            company,
            fullName,
            position: values[headerMap.position]?.trim() || '',
            department: values[headerMap.department]?.trim() || '',
            email: values[headerMap.email]?.trim() || '',
            phoneNumber: values[headerMap.phoneNumber]?.trim() || ''
        };
    }

    private groupByCompany(rows: CSVRow[]): CompanyData[] {
        const companyMap = new Map<string, CSVRow[]>();
        
        for (const row of rows) {
            if (!companyMap.has(row.company)) {
                companyMap.set(row.company, []);
            }
            companyMap.get(row.company)!.push(row);
        }

        return Array.from(companyMap.entries()).map(([name, people]) => ({
            name,
            people
        }));
    }

    private async processCompany(company: CompanyData, result: CSVImportResult): Promise<void> {
        try {
            // Find or create company file
            company.file = await this.findOrCreateCompanyFile(company.name);
            
            // Check if this is a new company (case-insensitive)
            const defManager = getDefFileManager();
            const existingFiles = defManager.getConsolidatedDefFiles();
            const existingCompany = existingFiles.find(f =>
                f.basename.toLowerCase() === company.name.toLowerCase()
            );

            if (!existingCompany && !result.companiesCreated.includes(company.name)) {
                result.companiesCreated.push(company.name);
            }

            // Process each person in the company
            let addedCount = 0;
            let updatedCount = 0;

            for (const person of company.people) {
                try {
                    const wasUpdated = await this.addPersonToCompany(person, company.file);
                    if (wasUpdated) {
                        updatedCount++;
                    } else {
                        addedCount++;
                    }
                } catch (error) {
                    result.errors.push(`Error adding ${person.fullName} to ${company.name}: ${error.message}`);
                }
            }

            result.peopleAdded[company.name] = addedCount;
            result.peopleUpdated[company.name] = updatedCount;

        } catch (error) {
            result.errors.push(`Error processing company ${company.name}: ${error.message}`);
        }
    }

    private async findOrCreateCompanyFile(companyName: string): Promise<TFile> {
        const defManager = getDefFileManager();
        const existingFiles = defManager.getConsolidatedDefFiles();

        // Look for existing company file (case-insensitive)
        const existingFile = existingFiles.find(file =>
            file.basename.toLowerCase() === companyName.toLowerCase()
        );
        if (existingFile) {
            return existingFile;
        }

        // Create new company file
        return await this.createCompanyFile(companyName);
    }

    private async createCompanyFile(companyName: string): Promise<TFile> {
        const defManager = getDefFileManager();
        const defFolder = defManager.getGlobalDefFolder();

        // Check for case-insensitive conflicts first
        const existingFiles = defManager.getConsolidatedDefFiles();
        const caseConflict = existingFiles.find(file =>
            file.basename.toLowerCase() === companyName.toLowerCase() &&
            file.basename !== companyName
        );

        if (caseConflict) {
            // Use the existing file's case to maintain consistency
            throw new Error(`Company file already exists with different case: "${caseConflict.basename}". Please use "${caseConflict.basename}" in your CSV.`);
        }

        const filePath = `${defFolder}/${companyName}.md`;

        // Check if file already exists, if so, add a number suffix
        let finalPath = filePath;
        let counter = 1;
        while (this.app.vault.getAbstractFileByPath(finalPath)) {
            finalPath = `${defFolder}/${companyName}-${counter}.md`;
            counter++;
        }

        // Create the company file with template
        const template = `---
def-type: consolidated
color: "blue"
---

![${companyName} Logo](logo.png)

# Company: ${companyName}

`;

        const file = await this.app.vault.create(finalPath, template);

        // Add to def manager
        defManager.addDefFile(file);

        return file;
    }

    private async addPersonToCompany(person: CSVRow, companyFile: TFile): Promise<boolean> {
        // Check if person already exists
        const existingPeople = await this.getExistingPeople(companyFile);
        const existingPerson = existingPeople.find(p =>
            p.fullName.toLowerCase() === person.fullName.toLowerCase()
        );

        if (existingPerson) {
            // Person exists, check if we need to update
            const needsUpdate = this.personNeedsUpdate(existingPerson, person);
            if (needsUpdate) {
                await this.updateExistingPerson(existingPerson, person);
                return true; // Updated
            }
            return false; // No change needed
        }

        // Add new person
        await this.defUpdater.addMetadata({
            fullName: person.fullName,
            position: person.position || '',
            department: person.department || '',
            notes: this.createPersonNotes(person),
            file: companyFile,
            fileType: DefFileType.Consolidated
        });

        return false; // Added new
    }

    private async getExistingPeople(file: TFile): Promise<PersonMetadata[]> {
        try {
            const defManager = getDefFileManager();
            const fileContent = await this.app.vault.read(file);
            const parser = new (await import('./file-parser')).FileParser(this.app, file);
            return await parser.parseFile(fileContent);
        } catch (error) {
            console.warn(`Error reading existing people from ${file.path}:`, error);
            return [];
        }
    }

    private personNeedsUpdate(existing: PersonMetadata, csvPerson: CSVRow): boolean {
        return (
            existing.position !== (csvPerson.position || '') ||
            existing.department !== (csvPerson.department || '') ||
            !existing.notes.includes(csvPerson.email || '') ||
            !existing.notes.includes(csvPerson.phoneNumber || '')
        );
    }

    private async updateExistingPerson(existing: PersonMetadata, csvPerson: CSVRow): Promise<void> {
        const updatedMetadata: PersonMetadata = {
            ...existing,
            position: csvPerson.position || existing.position,
            department: csvPerson.department || existing.department,
            notes: this.mergePersonNotes(existing.notes, csvPerson)
        };

        await this.defUpdater.updateMetadata(updatedMetadata);
    }

    private createPersonNotes(person: CSVRow): string {
        const notes: string[] = [];

        if (person.email) {
            notes.push(`Email: ${person.email}`);
        }

        if (person.phoneNumber) {
            notes.push(`Phone: ${person.phoneNumber}`);
        }

        return notes.join('\n');
    }

    private mergePersonNotes(existingNotes: string, csvPerson: CSVRow): string {
        let notes = existingNotes;

        // Add email if not present
        if (csvPerson.email && !notes.toLowerCase().includes(csvPerson.email.toLowerCase())) {
            notes += `\nEmail: ${csvPerson.email}`;
        }

        // Add phone if not present
        if (csvPerson.phoneNumber && !notes.toLowerCase().includes(csvPerson.phoneNumber.toLowerCase())) {
            notes += `\nPhone: ${csvPerson.phoneNumber}`;
        }

        return notes.trim();
    }

    private async createImportSummary(result: CSVImportResult): Promise<TFile> {
        const defManager = getDefFileManager();
        const defFolder = defManager.getGlobalDefFolder();

        const timestamp = new Date().toLocaleString().replace(/[/:]/g, '-').replace(', ', '_');
        const fileName = `People-Plugin CSV import ${timestamp}.md`;
        const filePath = `${defFolder}/${fileName}`;

        const summary = this.generateSummaryContent(result);

        return await this.app.vault.create(filePath, summary);
    }

    private generateSummaryContent(result: CSVImportResult): string {
        const timestamp = new Date().toLocaleString();

        let content = `---\ndef-type: import-summary\nexclude-from-people: true\n---\n\n`;
        content += `# CSV Import Summary\n\n`;
        content += `**Import Date:** ${timestamp}\n`;
        content += `**Total Records Processed:** ${result.totalProcessed}\n\n`;

        // Companies section
        content += `## Companies\n`;
        if (result.companiesCreated.length > 0) {
            content += `**New Companies Added:** ${result.companiesCreated.length}\n`;
            result.companiesCreated.forEach(company => {
                content += `- ${company}\n`;
            });
        } else {
            content += `No new companies were created.\n`;
        }
        content += `\n`;

        // People added section
        content += `## People Added\n`;
        const addedEntries = Object.entries(result.peopleAdded).filter(([_, count]) => count > 0);
        if (addedEntries.length > 0) {
            addedEntries.forEach(([company, count]) => {
                content += `- **${company}**: ${count} people\n`;
            });
        } else {
            content += `No new people were added.\n`;
        }
        content += `\n`;

        // People updated section
        content += `## People Updated\n`;
        const updatedEntries = Object.entries(result.peopleUpdated).filter(([_, count]) => count > 0);
        if (updatedEntries.length > 0) {
            updatedEntries.forEach(([company, count]) => {
                content += `- **${company}**: ${count} people\n`;
            });
        } else {
            content += `No existing people were updated.\n`;
        }
        content += `\n`;

        // Errors section
        content += `## Import Errors\n`;
        if (result.errors.length > 0) {
            content += `**${result.errors.length} errors occurred:**\n`;
            result.errors.forEach((error, index) => {
                content += `${index + 1}. ${error}\n`;
            });
        } else {
            content += `No errors occurred during import.\n`;
        }

        return content;
    }
}
