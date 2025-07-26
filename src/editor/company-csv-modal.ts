import { App, Modal, Notice, Setting, TextAreaComponent, ButtonComponent, TFile } from "obsidian";
import { CompanyCSVService, CompanyCSVImportResult } from "../core/company-csv-service";

export class CompanyCSVImportModal {
    app: App;
    modal: Modal;
    companyFile: TFile;
    companyName: string;
    csvTextArea: TextAreaComponent;
    importButton: ButtonComponent;
    isImporting: boolean = false;

    constructor(app: App, companyFile: TFile, companyName: string) {
        this.app = app;
        this.companyFile = companyFile;
        this.companyName = companyName;
        this.modal = new Modal(app);
        this.setupModal();
    }

    private setupModal() {
        this.modal.setTitle(`Import People to ${this.companyName}`);
        
        // Add description
        const descEl = this.modal.contentEl.createDiv({
            cls: "company-csv-import-description"
        });
        descEl.innerHTML = `
            <p><strong>Import people to ${this.companyName} from CSV format.</strong></p>
            <p>Required column: <code>Full Name</code></p>
            <p>Optional columns: <code>Position</code>, <code>Department</code>, <code>Description</code>, <code>Email</code>, <code>Phone Number</code></p>
        `;

        // Add example section
        const exampleEl = this.modal.contentEl.createDiv({
            cls: "company-csv-import-example"
        });
        exampleEl.innerHTML = `
            <details>
                <summary><strong>Example CSV Format</strong></summary>
                <pre>Full Name,Position,Department,Description,Email,Phone Number
John Doe,Software Engineer,Engineering,Senior developer with 5 years experience,john@company.com,555-1234
Jane Smith,Product Manager,Product,Leads product strategy,jane@company.com,555-5678</pre>
            </details>
        `;

        // CSV input area
        new Setting(this.modal.contentEl)
            .setName("CSV Data")
            .setDesc("Paste your CSV content here")
            .addTextArea(text => {
                this.csvTextArea = text;
                text.setPlaceholder("Full Name,Position,Department,Description\nJohn Doe,Software Engineer,Engineering,Senior developer\n...");
                text.inputEl.rows = 12;
                text.inputEl.style.width = "100%";
                text.inputEl.style.fontFamily = "monospace";
            });

        // Import button
        const buttonContainer = this.modal.contentEl.createDiv({
            cls: "company-csv-import-buttons"
        });

        this.importButton = new ButtonComponent(buttonContainer);
        this.importButton
            .setButtonText("Import to Company")
            .setCta()
            .onClick(() => this.handleImport());

        // Cancel button
        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => this.modal.close());

        // Add styles
        this.addStyles();
    }

    private addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .company-csv-import-description {
                margin-bottom: 1rem;
                padding: 1rem;
                background: var(--background-secondary);
                border-radius: 6px;
            }
            
            .company-csv-import-description p {
                margin: 0.5rem 0;
            }
            
            .company-csv-import-description code {
                background: var(--background-primary);
                padding: 2px 4px;
                border-radius: 3px;
                font-family: var(--font-monospace);
            }
            
            .company-csv-import-example {
                margin-bottom: 1rem;
            }
            
            .company-csv-import-example details {
                background: var(--background-secondary);
                padding: 1rem;
                border-radius: 6px;
            }
            
            .company-csv-import-example pre {
                background: var(--background-primary);
                padding: 0.5rem;
                border-radius: 3px;
                font-family: var(--font-monospace);
                font-size: 0.9em;
                overflow-x: auto;
                margin: 0.5rem 0 0 0;
            }
            
            .company-csv-import-buttons {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
                margin-top: 1rem;
            }
        `;
        document.head.appendChild(style);
    }

    private async handleImport() {
        if (this.isImporting) return;

        const csvContent = this.csvTextArea.getValue().trim();
        if (!csvContent) {
            new Notice("Please enter CSV data");
            return;
        }

        this.setImportingState(true);

        try {
            const csvService = new CompanyCSVService(this.app);
            const result = await csvService.importCSVToCompany(csvContent, this.companyFile);
            
            this.handleImportResult(result);
            this.modal.close();
        } catch (error) {
            new Notice(`Import failed: ${error.message}`);
            console.error("Company CSV Import Error:", error);
        } finally {
            this.setImportingState(false);
        }
    }

    private setImportingState(importing: boolean) {
        this.isImporting = importing;
        this.importButton.setButtonText(importing ? "Importing..." : "Import to Company");
        this.importButton.setDisabled(importing);
        this.csvTextArea.setDisabled(importing);
    }

    private handleImportResult(result: CompanyCSVImportResult) {
        if (result.errors.length > 0) {
            new Notice(`Import completed with ${result.errors.length} errors. Added: ${result.peopleAdded}, Updated: ${result.peopleUpdated}`, 8000);
        } else {
            new Notice(`Successfully imported to ${this.companyName}! Added: ${result.peopleAdded}, Updated: ${result.peopleUpdated}`, 5000);
        }
    }

    open() {
        this.modal.open();
        // Focus the text area after a short delay
        setTimeout(() => {
            this.csvTextArea.inputEl.focus();
        }, 100);
    }
}

export class CompanyCSVExportModal {
    app: App;
    modal: Modal;
    companyFile: TFile;
    companyName: string;
    csvContent: string = '';

    constructor(app: App, companyFile: TFile, companyName: string) {
        this.app = app;
        this.companyFile = companyFile;
        this.companyName = companyName;
        this.modal = new Modal(app);
        this.setupModal();
    }

    private setupModal() {
        this.modal.setTitle(`Export ${this.companyName} to CSV`);
        
        // Add description
        const descEl = this.modal.contentEl.createDiv({
            cls: "company-csv-export-description"
        });
        descEl.innerHTML = `
            <p><strong>Export all people from ${this.companyName} to CSV format.</strong></p>
            <p>You can copy the CSV data below or download it as a file.</p>
        `;

        // CSV output area (will be populated after loading)
        const csvContainer = this.modal.contentEl.createDiv({
            cls: "company-csv-export-container"
        });

        const loadingEl = csvContainer.createDiv({
            cls: "company-csv-export-loading",
            text: "Loading company data..."
        });

        // Load and display CSV data
        this.loadCSVData(csvContainer, loadingEl);

        // Buttons
        const buttonContainer = this.modal.contentEl.createDiv({
            cls: "company-csv-export-buttons"
        });

        const copyButton = new ButtonComponent(buttonContainer);
        copyButton
            .setButtonText("Copy to Clipboard")
            .onClick(() => this.copyToClipboard());

        const downloadButton = new ButtonComponent(buttonContainer);
        downloadButton
            .setButtonText("Download CSV")
            .setCta()
            .onClick(() => this.downloadCSV());

        const closeButton = new ButtonComponent(buttonContainer);
        closeButton
            .setButtonText("Close")
            .onClick(() => this.modal.close());

        // Add styles
        this.addStyles();
    }

    private async loadCSVData(container: HTMLElement, loadingEl: HTMLElement) {
        try {
            const csvService = new CompanyCSVService(this.app);
            this.csvContent = await csvService.exportCompanyToCSV(this.companyFile);
            
            // Remove loading indicator
            loadingEl.remove();
            
            // Add CSV display
            const csvDisplay = container.createEl("textarea", {
                cls: "company-csv-export-textarea"
            });
            csvDisplay.value = this.csvContent;
            csvDisplay.readOnly = true;
            csvDisplay.rows = 15;
            csvDisplay.style.width = "100%";
            csvDisplay.style.fontFamily = "monospace";
            csvDisplay.style.fontSize = "0.9em";
            
            // Add row count info
            const rowCount = this.csvContent.split('\n').length - 2; // Subtract header and empty line
            const infoEl = container.createDiv({
                cls: "company-csv-export-info",
                text: `${Math.max(0, rowCount)} people exported`
            });
            
        } catch (error) {
            loadingEl.textContent = `Error loading data: ${error.message}`;
            console.error("CSV Export Error:", error);
        }
    }

    private copyToClipboard() {
        if (!this.csvContent) {
            new Notice("No CSV data to copy");
            return;
        }

        navigator.clipboard.writeText(this.csvContent).then(() => {
            new Notice("CSV data copied to clipboard!");
        }).catch(() => {
            new Notice("Failed to copy to clipboard");
        });
    }

    private downloadCSV() {
        if (!this.csvContent) {
            new Notice("No CSV data to download");
            return;
        }

        const blob = new Blob([this.csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_people.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        new Notice(`Downloaded ${this.companyName} people as CSV`);
    }

    private addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .company-csv-export-description {
                margin-bottom: 1rem;
                padding: 1rem;
                background: var(--background-secondary);
                border-radius: 6px;
            }
            
            .company-csv-export-container {
                margin-bottom: 1rem;
            }
            
            .company-csv-export-loading {
                text-align: center;
                padding: 2rem;
                color: var(--text-muted);
            }
            
            .company-csv-export-textarea {
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 0.5rem;
                resize: vertical;
            }
            
            .company-csv-export-info {
                margin-top: 0.5rem;
                text-align: center;
                color: var(--text-muted);
                font-size: 0.9em;
            }
            
            .company-csv-export-buttons {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
                margin-top: 1rem;
            }
        `;
        document.head.appendChild(style);
    }

    open() {
        this.modal.open();
    }
}
