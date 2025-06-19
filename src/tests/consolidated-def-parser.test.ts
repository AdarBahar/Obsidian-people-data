import { App, TFile } from "obsidian";
import { ConsolidatedDefParser } from "src/core/consolidated-def-parser";
import { DefFileType } from "src/core/file-type";
import { DefFileParseConfig } from "src/settings";

const fs = require("node:fs");

// Setup for test file
const consolidatedDefData = fs.readFileSync('src/tests/def-file-samples/consolidated-definitions-test.md', 'utf8');

const parseSettings: DefFileParseConfig = {
	defaultFileType: DefFileType.Consolidated,
	divider: {
		underscore: true,
		dash: true
	}
}

const file = {
	path: "src/tests/consolidated-definitions-test.md"
};
const parser = new ConsolidatedDefParser(null as unknown as App, file as TFile, parseSettings);
const definitions = parser.directParseFile(consolidatedDefData);

test('Full names of people are parsed correctly', async () => {
	expect(definitions.find(def => def.fullName === "First Person")).toBeDefined();
	expect(definitions.find(def => def.fullName === "Multiple-word Person")).toBeDefined();
	expect(definitions.find(def => def.fullName === "Alias Person")).toBeDefined();
	expect(definitions.find(def => def.fullName === "Markdown Support Person")).toBeDefined();
});

test('Notes are parsed correctly', () => {
	expect(definitions.find(def => def.fullName === "First Person")?.notes).
		toBe("This is the first person's notes to test basic functionality.");
	expect(definitions.find(def => def.fullName === "Multiple-word Person")?.notes).
		toBe("This ensures that multiple-word person's notes work.");
	expect(definitions.find(def => def.fullName === "Alias Person")?.notes).
		toBe("This tests if the alias function works for people.");
	expect(definitions.find(def => def.fullName === "Markdown Support Person")?.notes).
		toBe('Markdown syntax _should_ *work* in notes.');
});

test('File positions are parsed correctly', () => {
	expect(definitions.find(def => def.fullName === "First Person")?.filePosition?.from).
		toBe(0);
	expect(definitions.find(def => def.fullName === "First Person")?.filePosition?.to).
		toBe(5);
	expect(definitions.find(def => def.fullName === "Multiple-word Person")?.filePosition?.from).
		toBe(8);
	expect(definitions.find(def => def.fullName === "Multiple-word Person")?.filePosition?.to).
		toBe(13);
	expect(definitions.find(def => def.fullName === "Alias Person")?.filePosition?.from).
		toBe(16);
	expect(definitions.find(def => def.fullName === "Alias Person")?.filePosition?.to).
		toBe(21);
	expect(definitions.find(def => def.fullName === "Markdown Support Person")?.filePosition?.from).
		toBe(24);
	expect(definitions.find(def => def.fullName === "Markdown Support Person")?.filePosition?.to).
		toBe(29);
});
