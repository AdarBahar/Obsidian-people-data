import { App, TFile } from "obsidian";
import { ConsolidatedDefParser } from "src/core/consolidated-def-parser";
import { parseFileHeader } from "src/core/file-header";
import { DefFileType } from "src/core/file-type";
import { resolveLogoSource } from "src/editor/person-card";
import { DefFileParseConfig } from "src/settings";

const parseSettings: DefFileParseConfig = {
	defaultFileType: DefFileType.Consolidated,
	divider: { dash: true, underscore: false },
};

function makeParser() {
	const file = Object.create(TFile.prototype);
	Object.assign(file, { basename: "Acme", path: "people/Acme.md", name: "Acme.md", extension: "md" });
	return new ConsolidatedDefParser(null as unknown as App, file, parseSettings);
}

describe("Missed dividers (B11)", () => {
	test("a name line after notes starts a new person", () => {
		const defs = makeParser().parseContent("# Ann\n\nAnn notes.\n# Bob\n\nBob notes.\n");
		expect(defs.map(d => d.fullName)).toEqual(["Ann", "Bob"]);
		expect(defs[0].notes).toBe("Ann notes.");
		expect(defs[1].notes).toBe("Bob notes.");
		expect(defs[0].filePosition).toEqual({ from: 0, to: 2 });
		expect(defs[1].filePosition?.from).toBe(3);
	});

	test("a person with no notes and no divider is kept", () => {
		const defs = makeParser().parseContent("# Ann\nPosition: CEO\n# Bob\n");
		expect(defs.map(d => d.fullName)).toEqual(["Ann", "Bob"]);
		expect(defs[0].position).toBe("CEO");
		expect(defs[1].position).toBe("");
	});

	test("text before the first name does not hide the first person", () => {
		const defs = makeParser().parseContent("Some intro text.\n\n# Ann\n\nNotes.\n");
		expect(defs.map(d => d.fullName)).toEqual(["Ann"]);
		expect(defs[0].notes).toBe("Notes.");
	});

	test("fields without a name do not join the next person", () => {
		const defs = makeParser().parseContent("Position: Orphan\n\n---\n\n# Ann\n\nNotes.\n");
		expect(defs).toHaveLength(1);
		expect(defs[0].position).toBe("");
	});

	test("smaller headings stay in the notes", () => {
		const defs = makeParser().parseContent("# Ann\n\n## History\nJoined 2020.\n");
		expect(defs).toHaveLength(1);
		expect(defs[0].notes).toBe("## History\nJoined 2020.");
	});
});

describe("Logo line (B12)", () => {
	test("accepts the embed syntax", () => {
		const header = parseFileHeader(["---", "a: 1", "---", "", "![[acme.png]]", "# Ann"]);
		expect(header).toEqual({ bodyStart: 5, logo: "![[acme.png]]" });
	});

	test("accepts the markdown image syntax", () => {
		expect(parseFileHeader(["![Acme](logo.png)", "# Ann"]).logo).toBe("![Acme](logo.png)");
	});

	test("a text line with an image in it is not a logo", () => {
		expect(parseFileHeader(["See ![x](y.png) here", "# Ann"])).toEqual({ bodyStart: 0, logo: "" });
	});

	test("the embed logo does not hide the first person", () => {
		const defs = makeParser().parseContent("![[acme.png]]\n\n# Ann\n\nNotes.\n");
		expect(defs.map(d => d.fullName)).toEqual(["Ann"]);
		expect(defs[0].companyLogo).toBe("![[acme.png]]");
		expect(defs[0].filePosition?.from).toBe(2);
	});
});

describe("resolveLogoSource", () => {
	const logoFile = { path: "assets/acme.png" };
	const app = {
		metadataCache: {
			getFirstLinkpathDest: (link: string) => (link === "acme.png" || link === "assets/acme.png") ? logoFile : null,
		},
		vault: { getResourcePath: (file: { path: string }) => `app://local/${file.path}` },
	} as unknown as App;

	test("resolves embed and markdown links to vault files", () => {
		expect(resolveLogoSource(app, "![[acme.png]]", "people/Acme.md")).toBe("app://local/assets/acme.png");
		expect(resolveLogoSource(app, "![[acme.png|64]]", "people/Acme.md")).toBe("app://local/assets/acme.png");
		expect(resolveLogoSource(app, "![Logo](assets/acme.png)", "people/Acme.md")).toBe("app://local/assets/acme.png");
	});

	test("keeps external URLs", () => {
		expect(resolveLogoSource(app, "![Logo](https://example.com/a.png)", "people/Acme.md")).toBe("https://example.com/a.png");
	});

	test("returns null for a missing file, so the default badge shows", () => {
		expect(resolveLogoSource(app, "![Logo](missing.png)", "people/Acme.md")).toBeNull();
		expect(resolveLogoSource(app, "![[missing.png]]", "people/Acme.md")).toBeNull();
	});
});
