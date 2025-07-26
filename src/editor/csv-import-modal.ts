import { App, Modal, Notice, Setting, TextAreaComponent, ButtonComponent } from "obsidian";
import { CSVImportService, CSVImportResult } from "../core/csv-import-service";
import { getDefFileManager } from "../core/def-file-manager";

export class CSVImportModal {
    app: App;
    modal: Modal;
    csvTextArea: TextAreaComponent;
    importButton: ButtonComponent;
    isImporting: boolean = false;

    constructor(app: App) {
        this.app = app;
        this.modal = new Modal(app);
        this.setupModal();
    }

    private setupModal() {
        this.modal.setTitle("Import People from CSV");
        
        // Add description
        const descEl = this.modal.contentEl.createDiv({
            cls: "csv-import-description"
        });
        descEl.innerHTML = `
            <p><strong>Import people and company data from CSV format.</strong></p>
            <p>Required columns: <code>Company</code>, <code>Full Name</code></p>
            <p>Optional columns: <code>Position</code>, <code>Department</code>, <code>Email</code>, <code>Phone Number</code></p>
        `;

        // Add example section
        const exampleEl = this.modal.contentEl.createDiv({
            cls: "csv-import-example"
        });
        exampleEl.innerHTML = `
            <details>
                <summary><strong>Example CSV Format</strong></summary>
                <pre>Company,Full Name,Position,Department,Email,Phone Number
TechCorp,John Doe,Software Engineer,Engineering,john@techcorp.com,555-1234
TechCorp,Jane Smith,Product Manager,Product,jane@techcorp.com,555-5678
DataSystems,Bob Johnson,Data Analyst,Analytics,bob@datasystems.com,555-9012</pre>
            </details>
        `;

        // CSV input area
        new Setting(this.modal.contentEl)
            .setName("CSV Data")
            .setDesc("Paste your CSV content here")
            .addTextArea(text => {
                this.csvTextArea = text;
                text.setPlaceholder("Company,Full Name,Position,Department\nTechCorp,John Doe,Software Engineer,Engineering\n...");
                text.inputEl.rows = 12;
                text.inputEl.style.width = "100%";
                text.inputEl.style.fontFamily = "monospace";
            });

        // Import button
        const buttonContainer = this.modal.contentEl.createDiv({
            cls: "csv-import-buttons"
        });

        this.importButton = new ButtonComponent(buttonContainer);
        this.importButton
            .setButtonText("Import CSV")
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
            .csv-import-description {
                margin-bottom: 1rem;
                padding: 1rem;
                background: var(--background-secondary);
                border-radius: 6px;
            }
            
            .csv-import-description p {
                margin: 0.5rem 0;
            }
            
            .csv-import-description code {
                background: var(--background-primary);
                padding: 2px 4px;
                border-radius: 3px;
                font-family: var(--font-monospace);
            }
            
            .csv-import-example {
                margin-bottom: 1rem;
            }
            
            .csv-import-example details {
                background: var(--background-secondary);
                padding: 1rem;
                border-radius: 6px;
            }
            
            .csv-import-example pre {
                background: var(--background-primary);
                padding: 0.5rem;
                border-radius: 3px;
                font-family: var(--font-monospace);
                font-size: 0.9em;
                overflow-x: auto;
                margin: 0.5rem 0 0 0;
            }
            
            .csv-import-buttons {
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

        // Validate that we have a People folder set up
        const defManager = getDefFileManager();
        const peopleFolder = defManager.getGlobalDefFolder();
        if (!peopleFolder) {
            new Notice("Please set up a People metadata folder first");
            return;
        }

        this.setImportingState(true);

        try {
            const importService = new CSVImportService(this.app);
            const result = await importService.importFromCSV(csvContent);
            
            this.handleImportResult(result);
            this.modal.close();
        } catch (error) {
            new Notice(`Import failed: ${error.message}`);
            console.error("CSV Import Error:", error);
        } finally {
            this.setImportingState(false);
        }
    }

    private setImportingState(importing: boolean) {
        this.isImporting = importing;
        this.importButton.setButtonText(importing ? "Importing..." : "Import CSV");
        this.importButton.setDisabled(importing);
        this.csvTextArea.setDisabled(importing);
    }

    private handleImportResult(result: CSVImportResult) {
        if (result.errors.length > 0) {
            new Notice(`Import completed with ${result.errors.length} errors. Check the summary for details.`, 8000);
        } else {
            new Notice(`Successfully imported ${result.totalProcessed} people across ${result.companiesCreated.length} companies!`, 5000);
        }

        // Show summary
        if (result.summaryFile) {
            new Notice(`Import summary created: ${result.summaryFile.name}`, 3000);
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
