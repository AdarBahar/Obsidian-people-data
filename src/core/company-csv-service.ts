import { App, TFile, Notice } from "obsidian";
import { getDefFileManager } from "./def-file-manager";
import { DefFileUpdater } from "./def-file-updater";
import { PersonMetadata } from "./model";

export interface CompanyCSVRow {
    fullName: string;
    position?: string;
    department?: string;
    description?: string;
    email?: string;
    phoneNumber?: string;
}

export interface CompanyCSVImportResult {
    totalProcessed: number;
    peopleAdded: number;
    peopleUpdated: number;
    errors: string[];
}

export class CompanyCSVService {
    private app: App;
    private defUpdater: DefFileUpdater;

    constructor(app: App) {
        this.app = app;
        this.defUpdater = new DefFileUpdater(app);
    }

    /**
     * Export company people to CSV format
     */
    async exportCompanyToCSV(companyFile: TFile): Promise<string> {
        try {
            const people = await this.getExistingPeople(companyFile);
            
            if (people.length === 0) {
                return "Full Name,Position,Department,Description,Email,Phone Number\n";
            }

            // Create CSV header
            let csvContent = "Full Name,Position,Department,Description,Email,Phone Number\n";

            // Add each person as a CSV row
            for (const person of people) {
                const row = this.personToCSVRow(person);
                csvContent += this.formatCSVRow(row) + "\n";
            }

            return csvContent;
        } catch (error) {
            throw new Error(`Failed to export company data: ${error.message}`);
        }
    }

    /**
     * Import CSV data to a specific company
     */
    async importCSVToCompany(csvContent: string, companyFile: TFile): Promise<CompanyCSVImportResult> {
        const result: CompanyCSVImportResult = {
            totalProcessed: 0,
            peopleAdded: 0,
            peopleUpdated: 0,
            errors: []
        };

        try {
            // Parse CSV content
            const rows = this.parseCompanyCSV(csvContent);
            if (rows.length === 0) {
                throw new Error("No valid data found in CSV");
            }

            // Process each person
            for (const person of rows) {
                try {
                    const wasUpdated = await this.addPersonToCompany(person, companyFile);
                    if (wasUpdated) {
                        result.peopleUpdated++;
                    } else {
                        result.peopleAdded++;
                    }
                } catch (error) {
                    result.errors.push(`Error adding ${person.fullName}: ${error.message}`);
                }
            }

            result.totalProcessed = rows.length;

            // Refresh definitions to include new data
            await getDefFileManager().loadDefinitions();

        } catch (error) {
            result.errors.push(`Import failed: ${error.message}`);
            throw error;
        }

        return result;
    }

    private parseCompanyCSV(csvContent: string): CompanyCSVRow[] {
        const lines = csvContent.trim().split(/\r?\n/);
        if (lines.length < 2) {
            throw new Error("CSV must have at least a header row and one data row");
        }

        const headers = this.parseCSVLine(lines[0]);
        const headerMap = this.createCompanyHeaderMap(headers);

        const rows: CompanyCSVRow[] = [];
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);
                if (values.length === 0 || values.every(v => !v.trim())) {
                    continue; // Skip empty rows
                }

                const row = this.createCompanyRowFromValues(values, headerMap, i + 1);
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

    private createCompanyHeaderMap(headers: string[]): { [key: string]: number } {
        const map: { [key: string]: number } = {};
        
        // Define header variations for company-specific CSV
        const headerVariations = {
            fullName: ['full name', 'name', 'fullname'],
            position: ['position', 'jobtitle', 'title', 'role'],
            department: ['department', 'dept', 'division'],
            description: ['description', 'desc', 'notes', 'bio'],
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
        if (map.fullName === undefined) {
            throw new Error("Missing required header: Full Name (or Name, FullName)");
        }

        return map;
    }

    private createCompanyRowFromValues(values: string[], headerMap: { [key: string]: number }, lineNumber: number): CompanyCSVRow | null {
        const fullName = values[headerMap.fullName]?.trim();

        if (!fullName) {
            console.warn(`Line ${lineNumber}: Missing required field Full Name: "${fullName}"`);
            return null;
        }

        return {
            fullName,
            position: values[headerMap.position]?.trim() || '',
            department: values[headerMap.department]?.trim() || '',
            description: values[headerMap.description]?.trim() || '',
            email: values[headerMap.email]?.trim() || '',
            phoneNumber: values[headerMap.phoneNumber]?.trim() || ''
        };
    }

    private async addPersonToCompany(person: CompanyCSVRow, companyFile: TFile): Promise<boolean> {
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
            fileType: require('./file-type').DefFileType.Consolidated
        });

        return false; // Added new
    }

    private async getExistingPeople(file: TFile): Promise<PersonMetadata[]> {
        try {
            const fileContent = await this.app.vault.read(file);
            const parser = new (await import('./file-parser')).FileParser(this.app, file);
            return await parser.parseFile(fileContent);
        } catch (error) {
            console.warn(`Error reading existing people from ${file.path}:`, error);
            return [];
        }
    }

    private personNeedsUpdate(existing: PersonMetadata, csvPerson: CompanyCSVRow): boolean {
        return (
            existing.position !== (csvPerson.position || '') ||
            existing.department !== (csvPerson.department || '') ||
            !this.notesContainInfo(existing.notes, csvPerson.email) ||
            !this.notesContainInfo(existing.notes, csvPerson.phoneNumber) ||
            !this.notesContainInfo(existing.notes, csvPerson.description)
        );
    }

    private notesContainInfo(notes: string, info?: string): boolean {
        if (!info) return true;
        return notes.toLowerCase().includes(info.toLowerCase());
    }

    private async updateExistingPerson(existing: PersonMetadata, csvPerson: CompanyCSVRow): Promise<void> {
        const updatedMetadata: PersonMetadata = {
            ...existing,
            position: csvPerson.position || existing.position,
            department: csvPerson.department || existing.department,
            notes: this.mergePersonNotes(existing.notes, csvPerson)
        };

        await this.defUpdater.updateMetadata(updatedMetadata);
    }

    private createPersonNotes(person: CompanyCSVRow): string {
        const notes: string[] = [];
        
        if (person.description) {
            notes.push(person.description);
        }
        
        if (person.email) {
            notes.push(`Email: ${person.email}`);
        }
        
        if (person.phoneNumber) {
            notes.push(`Phone: ${person.phoneNumber}`);
        }
        
        return notes.join('\n');
    }

    private mergePersonNotes(existingNotes: string, csvPerson: CompanyCSVRow): string {
        let notes = existingNotes;
        
        // Add description if not present
        if (csvPerson.description && !this.notesContainInfo(notes, csvPerson.description)) {
            notes = csvPerson.description + '\n' + notes;
        }
        
        // Add email if not present
        if (csvPerson.email && !this.notesContainInfo(notes, csvPerson.email)) {
            notes += `\nEmail: ${csvPerson.email}`;
        }
        
        // Add phone if not present
        if (csvPerson.phoneNumber && !this.notesContainInfo(notes, csvPerson.phoneNumber)) {
            notes += `\nPhone: ${csvPerson.phoneNumber}`;
        }
        
        return notes.trim();
    }

    private personToCSVRow(person: PersonMetadata): CompanyCSVRow {
        // Extract email and phone from notes
        const email = this.extractFromNotes(person.notes, /email:\s*([^\n]+)/i);
        const phone = this.extractFromNotes(person.notes, /phone:\s*([^\n]+)/i);
        
        // Extract description (everything that's not email or phone)
        let description = person.notes
            .replace(/email:\s*[^\n]+/gi, '')
            .replace(/phone:\s*[^\n]+/gi, '')
            .trim();

        return {
            fullName: person.fullName,
            position: person.position || '',
            department: person.department || '',
            description: description || '',
            email: email || '',
            phoneNumber: phone || ''
        };
    }

    private extractFromNotes(notes: string, regex: RegExp): string {
        const match = notes.match(regex);
        return match ? match[1].trim() : '';
    }

    private formatCSVRow(row: CompanyCSVRow): string {
        const values = [
            row.fullName || '',
            row.position || '',
            row.department || '',
            row.description || '',
            row.email || '',
            row.phoneNumber || ''
        ];

        return values.map(value => {
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
        }).join(',');
    }
}
