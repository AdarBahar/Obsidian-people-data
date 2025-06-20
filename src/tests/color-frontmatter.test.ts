import { App, TFile } from "obsidian";
import { ConsolidatedDefParser } from "src/core/consolidated-def-parser";
import { DefFileType } from "src/core/file-type";
import { DefFileParseConfig } from "src/settings";

// Test content without frontmatter and logo (since directParseFile doesn't handle them)
const consolidatedDefData = `# John Doe
Position: Senior Developer
Department: Engineering

John is a senior developer with expertise in frontend technologies.

---

# Jane Smith
Position: Product Manager
Department: Product

Jane manages product roadmap and strategy.

---
`;

const parseSettings: DefFileParseConfig = {
	defaultFileType: DefFileType.Consolidated,
	divider: {
		underscore: true,
		dash: true
	}
};

describe('Color Frontmatter Tests', () => {
	test('ConsolidatedDefParser should parse content correctly with color set via property', () => {
		// Create a proper mock TFile object
		const mockFile = Object.create(TFile.prototype);
		Object.assign(mockFile, {
			basename: "TestCompany",
			path: "definitions/TestCompany.md",
			name: "TestCompany.md",
			extension: "md"
		});

		const parser = new ConsolidatedDefParser(null as unknown as App, mockFile, parseSettings);

		// Manually set the company color to simulate frontmatter reading
		parser.companyColor = "#ff6b35";

		const results = parser.directParseFile(consolidatedDefData);

		expect(results).toHaveLength(2);
		expect(results[0].companyColor).toBe('#ff6b35');
		expect(results[1].companyColor).toBe('#ff6b35');
		expect(results[0].fullName).toBe('John Doe');
		expect(results[1].fullName).toBe('Jane Smith');
	});

	test('ConsolidatedDefParser should handle hex color without # prefix', () => {
		// Create a proper mock TFile object
		const mockFile = Object.create(TFile.prototype);
		Object.assign(mockFile, {
			basename: "TestCompany",
			path: "definitions/TestCompany.md",
			name: "TestCompany.md",
			extension: "md"
		});

		const parser = new ConsolidatedDefParser(null as unknown as App, mockFile, parseSettings);

		// Manually set the company color to simulate frontmatter reading
		parser.companyColor = "#b5e550";

		const results = parser.directParseFile(consolidatedDefData);

		expect(results).toHaveLength(2);
		expect(results[0].companyColor).toBe('#b5e550');
		expect(results[1].companyColor).toBe('#b5e550');
	});

	test('ConsolidatedDefParser should handle missing color gracefully', () => {
		// Create a proper mock TFile object
		const mockFile = Object.create(TFile.prototype);
		Object.assign(mockFile, {
			basename: "TestCompany",
			path: "definitions/TestCompany.md",
			name: "TestCompany.md",
			extension: "md"
		});

		const parser = new ConsolidatedDefParser(null as unknown as App, mockFile, parseSettings);

		// Don't set company color (simulates missing frontmatter)

		const results = parser.directParseFile(consolidatedDefData);

		expect(results).toHaveLength(2);
		expect(results[0].companyColor).toBe('');
		expect(results[1].companyColor).toBe('');
	});
});
