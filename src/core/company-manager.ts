import { App, TFile } from "obsidian";
import { CompanyConfig } from "src/editor/company-config-modal";
import { getDefFileManager } from "./def-file-manager";

export class CompanyManager {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get all companies with their current configurations
	 */
	getAllCompanies(): CompanyConfig[] {
		const companies = new Map<string, CompanyConfig>();
		const defManager = getDefFileManager();
		const defRepo = defManager?.globalDefs;

		if (!defRepo) {
			return [];
		}

		// Collect all companies from the definition repository
		for (const [filePath, fileMap] of defRepo.fileDefMap) {
			for (const [, person] of fileMap) {
				if (person.companyName && person.file) {
					const companyName = person.companyName;
					
					if (!companies.has(companyName)) {
						companies.set(companyName, {
							name: companyName,
							color: person.companyColor || undefined,
							logo: person.companyLogo || undefined,
							url: person.companyUrl || undefined,
							file: person.file
						});
					}
				}
			}
		}

		// Sort companies by name
		return Array.from(companies.values()).sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Get company configuration for a specific company
	 */
	getCompanyConfig(companyName: string): CompanyConfig | null {
		const companies = this.getAllCompanies();
		return companies.find(company => company.name === companyName) || null;
	}

	/**
	 * Get all company files in the people folder
	 */
	async getCompanyFiles(): Promise<TFile[]> {
		const defManager = getDefFileManager();
		const files: TFile[] = [];

		// Get all files from the definition manager
		if (defManager?.globalDefs) {
			for (const [filePath] of defManager.globalDefs.fileDefMap) {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (file instanceof TFile) {
					files.push(file);
				}
			}
		}

		return files.sort((a, b) => a.basename.localeCompare(b.basename));
	}

	/**
	 * Create a new company file
	 */
	async createCompanyFile(companyName: string, color?: string, logo?: string): Promise<TFile> {
		const defManager = getDefFileManager();
		const peopleFolderPath = defManager.getGlobalDefFolder();
		const peopleFolder = this.app.vault.getFolderByPath(peopleFolderPath);

		if (!peopleFolder) {
			throw new Error(`People folder not found at path: ${peopleFolderPath}`);
		}

		const fileName = `${companyName}.md`;
		const filePath = `${peopleFolder.path}/${fileName}`;

		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (existingFile) {
			throw new Error(`Company file "${fileName}" already exists`);
		}

		// Create frontmatter
		let frontmatter = "---\n";
		frontmatter += "def-type: consolidated\n";
		if (color) {
			frontmatter += `color: "${color}"\n`;
		}
		frontmatter += "---\n\n";

		// Add logo if provided
		let content = frontmatter;
		if (logo) {
			content += logo + "\n\n";
		}

		// Add template content
		content += `# Company: ${companyName}\n\n`;
		content += "Add people definitions below using the format:\n\n";
		content += "---\n\n";
		content += "# Person Name\n";
		content += "Position: Job Title\n";
		content += "Department: Department Name\n\n";
		content += "Notes about this person...\n\n";

		// Create the file
		const file = await this.app.vault.create(filePath, content);
		
		// Refresh definitions to include the new file
		await defManager.loadDefinitions();
		
		return file;
	}

	/**
	 * Update company configuration in file
	 */
	async updateCompanyConfig(config: CompanyConfig): Promise<void> {
		const file = config.file;
		if (!file) {
			throw new Error("Cannot update company config without file");
		}
		const content = await this.app.vault.read(file);
		
		// Parse existing frontmatter
		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const match = content.match(frontmatterRegex);
		
		let frontmatterContent = "";
		let bodyContent = content;

		if (match) {
			frontmatterContent = match[1];
			bodyContent = content.slice(match[0].length);
		}

		// Parse frontmatter lines
		const frontmatterLines = frontmatterContent.split('\n').filter(line => line.trim());
		const frontmatterMap = new Map<string, string>();
		
		frontmatterLines.forEach(line => {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.slice(0, colonIndex).trim();
				const value = line.slice(colonIndex + 1).trim();
				frontmatterMap.set(key, value);
			}
		});

		// Update color
		if (config.color) {
			frontmatterMap.set('color', `"${config.color}"`);
		} else {
			frontmatterMap.delete('color');
		}

		// Ensure def-type is set
		if (!frontmatterMap.has('def-type')) {
			frontmatterMap.set('def-type', 'consolidated');
		}

		// Update logo in body content
		const logoRegex = /^!\[.*?\]\(.*?\)/m;
		const currentLogo = bodyContent.match(logoRegex)?.[0] || '';
		
		if (currentLogo && config.logo) {
			// Replace existing logo
			bodyContent = bodyContent.replace(logoRegex, config.logo);
		} else if (currentLogo && !config.logo) {
			// Remove existing logo
			bodyContent = bodyContent.replace(logoRegex, '').trimStart();
		} else if (!currentLogo && config.logo) {
			// Add new logo at the beginning
			bodyContent = config.logo + '\n' + bodyContent.trimStart();
		}

		// Rebuild frontmatter
		let newFrontmatter = '';
		if (frontmatterMap.size > 0) {
			newFrontmatter = '---\n';
			for (const [key, value] of frontmatterMap) {
				newFrontmatter += `${key}: ${value}\n`;
			}
			newFrontmatter += '---';
		}

		const newContent = newFrontmatter + bodyContent;
		if (file) {
			await this.app.vault.modify(file, newContent);
		}
	}

	/**
	 * Delete a company file
	 */
	async deleteCompanyFile(companyName: string): Promise<void> {
		const config = this.getCompanyConfig(companyName);
		if (!config) {
			throw new Error(`Company "${companyName}" not found`);
		}

		if (!config.file) {
			throw new Error("Cannot delete company config without file");
		}
		await this.app.vault.delete(config.file);
		
		// Refresh definitions
		const defManager = getDefFileManager();
		await defManager.loadDefinitions();
	}

	/**
	 * Get company statistics
	 */
	getCompanyStats(): { totalCompanies: number, companiesWithColors: number, companiesWithLogos: number } {
		const companies = this.getAllCompanies();
		
		return {
			totalCompanies: companies.length,
			companiesWithColors: companies.filter(c => c.color).length,
			companiesWithLogos: companies.filter(c => c.logo).length
		};
	}
}

let companyManager: CompanyManager;

export function initCompanyManager(app: App): CompanyManager {
	companyManager = new CompanyManager(app);
	return companyManager;
}

export function getCompanyManager(): CompanyManager {
	return companyManager;
}
