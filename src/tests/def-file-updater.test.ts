import { App, TFile } from "obsidian";
import { ConsolidatedDefParser } from "src/core/consolidated-def-parser";
import { AtomicDefParser } from "src/core/atomic-def-parser";
import { DefFileUpdater } from "src/core/def-file-updater";
import { DefFileType } from "src/core/file-type";
import { PersonMetadata } from "src/core/model";
import { PluginContext } from "src/core/plugin-context";
import { DEFAULT_SETTINGS, Settings } from "src/settings";

jest.mock("src/core/def-file-manager", () => ({
	getDefFileManager: () => ({
		loadUpdatedFiles: async () => { },
		addDefFile: () => { },
		markDirty: () => { },
	}),
}));

const COMPANY_FILE = [
	"---",
	"def-type: consolidated",
	"color: blue",
	"---",
	"",
	"![Acme Logo](logo.png)",
	"",
	"# John Doe",
	"Position: Engineer",
	"Department: R&D",
	"",
	"John notes.",
	"",
	"---",
	"",
	"# Jane Smith",
	"Position: Manager",
	"",
	"Jane notes.",
	"",
	"---",
	"",
	"# Bob Brown",
	"",
	"Bob notes.",
	"",
].join("\n");

function makeFile(): TFile {
	const file = Object.create(TFile.prototype);
	Object.assign(file, { basename: "Acme", path: "people/Acme.md", name: "Acme.md", extension: "md" });
	return file;
}

// A fake vault that holds one file in memory
function makeApp(content: string) {
	const state = { content };
	const app = {
		vault: {
			process: async (_file: TFile, fn: (data: string) => string) => {
				state.content = fn(state.content);
				return state.content;
			},
			cachedRead: async () => state.content,
		},
		metadataCache: { getFileCache: () => null },
	};
	return { app: app as unknown as App, state };
}

function settings(divider = { dash: true, underscore: false }): Settings {
	return {
		...DEFAULT_SETTINGS,
		defFileParseConfig: { defaultFileType: DefFileType.Consolidated, divider },
	} as Settings;
}

function parse(app: App, file: TFile, content: string): PersonMetadata[] {
	return new ConsolidatedDefParser(app, file).parseContent(content);
}

beforeEach(() => {
	PluginContext.cleanup();
	PluginContext.initialize({} as App, {} as never, settings());
});

test("File positions are line indexes in the full file, after frontmatter and logo", () => {
	const { app } = makeApp(COMPANY_FILE);
	const lines = COMPANY_FILE.split("\n");
	const defs = parse(app, makeFile(), COMPANY_FILE);
	expect(defs.map(d => d.fullName)).toEqual(["John Doe", "Jane Smith", "Bob Brown"]);
	defs.forEach(d => {
		expect(lines[d.filePosition?.from ?? -1]).toBe(`# ${d.fullName}`);
	});
	expect(defs[0].companyLogo).toBe("![Acme Logo](logo.png)");
});

test("Edit replaces only the lines of the chosen person", async () => {
	const { app, state } = makeApp(COMPANY_FILE);
	const file = makeFile();
	const jane = parse(app, file, COMPANY_FILE)[1];

	const ok = await new DefFileUpdater(app).updateMetadata(jane, {
		...jane, position: "Director", department: "Sales", notes: "New notes.",
	});

	expect(ok).toBe(true);
	const defs = parse(app, file, state.content);
	expect(defs.map(d => d.fullName)).toEqual(["John Doe", "Jane Smith", "Bob Brown"]);
	expect(defs[1]).toMatchObject({ position: "Director", department: "Sales", notes: "New notes." });
	expect(defs[0]).toMatchObject({ position: "Engineer", notes: "John notes." });
	expect(defs[2]).toMatchObject({ notes: "Bob notes." });
	// Frontmatter and logo stay, and no divider is added
	expect(state.content.startsWith("---\ndef-type: consolidated\ncolor: blue\n---\n\n![Acme Logo](logo.png)")).toBe(true);
	expect(state.content.split("\n").filter(l => l === "---").length).toBe(4);
});

test("Edit can rename the last person in the file", async () => {
	const { app, state } = makeApp(COMPANY_FILE);
	const file = makeFile();
	const bob = parse(app, file, COMPANY_FILE)[2];

	await new DefFileUpdater(app).updateMetadata(bob, { ...bob, fullName: "Robert Brown" });

	const defs = parse(app, file, state.content);
	expect(defs.map(d => d.fullName)).toEqual(["John Doe", "Jane Smith", "Robert Brown"]);
	expect(defs[2].notes).toBe("Bob notes.");
});

test("Edit keeps CRLF line endings", async () => {
	const crlf = COMPANY_FILE.replace(/\n/g, "\r\n");
	const { app, state } = makeApp(crlf);
	const file = makeFile();
	const john = parse(app, file, crlf)[0];

	await new DefFileUpdater(app).updateMetadata(john, { ...john, notes: "Changed." });

	expect(state.content.includes("\r\n")).toBe(true);
	expect(state.content.replace(/\r\n/g, "").includes("\n")).toBe(false);
	expect(parse(app, file, state.content)[0].notes).toBe("Changed.");
});

test("Edit of a person that is not in the file changes nothing and returns false", async () => {
	const { app, state } = makeApp(COMPANY_FILE);
	const file = makeFile();
	const ghost = { ...parse(app, file, COMPANY_FILE)[0], fullName: "Nobody" };

	const ok = await new DefFileUpdater(app).updateMetadata(ghost, { ...ghost, notes: "x" });

	expect(ok).toBe(false);
	expect(state.content).toBe(COMPANY_FILE);
});

test("Add to a new company file does not add a divider before the first person", async () => {
	const template = "---\ndef-type: consolidated\ncolor: \"blue\"\n---\n\n![New Logo](logo.png)\n\n";
	const { app, state } = makeApp(template);
	const file = makeFile();

	const ok = await new DefFileUpdater(app).addMetadata({
		fullName: "Ann Lee", position: "CEO", notes: "Founder.", file, fileType: DefFileType.Consolidated,
	});

	expect(ok).toBe(true);
	const lines = state.content.split("\n");
	expect(lines.filter(l => l === "---").length).toBe(3);
	const defs = parse(app, file, state.content);
	expect(defs).toHaveLength(1);
	expect(defs[0]).toMatchObject({ fullName: "Ann Lee", position: "CEO", notes: "Founder." });
});

test("Add after existing people keeps all of them", async () => {
	const { app, state } = makeApp(COMPANY_FILE);
	const file = makeFile();

	await new DefFileUpdater(app).addMetadata({
		fullName: "Ann Lee", notes: "New.", file, fileType: DefFileType.Consolidated,
	});

	const defs = parse(app, file, state.content);
	expect(defs.map(d => d.fullName)).toEqual(["John Doe", "Jane Smith", "Bob Brown", "Ann Lee"]);
});

test("Add uses the underscore divider when only that divider is on", async () => {
	PluginContext.getInstance().settings = settings({ dash: false, underscore: true });
	const content = "# John Doe\n\nNotes.\n\n___\n";
	const { app, state } = makeApp(content);
	const file = makeFile();

	await new DefFileUpdater(app).addMetadata({
		fullName: "Ann Lee", notes: "New.", file, fileType: DefFileType.Consolidated,
	});

	expect(state.content.includes("\n---")).toBe(false);
	const defs = parse(app, file, state.content);
	expect(defs.map(d => d.fullName)).toEqual(["John Doe", "Ann Lee"]);
});

test("Edit of an atomic file keeps the frontmatter and the logo", async () => {
	const content = "---\ndef-type: atomic\n---\n![Logo](l.png)\n# Ann Lee\nPosition: CEO\n\nOld.\n";
	const { app, state } = makeApp(content);
	const file = makeFile();
	const ann = new AtomicDefParser(app, file).parseContent(content)[0];

	await new DefFileUpdater(app).updateMetadata(ann, { ...ann, position: "CTO", notes: "New." });

	expect(state.content.startsWith("---\ndef-type: atomic\n---\n![Logo](l.png)\n")).toBe(true);
	const parsed = new AtomicDefParser(app, file).parseContent(state.content)[0];
	expect(parsed).toMatchObject({ fullName: "Ann Lee", position: "CTO", notes: "New." });
});
