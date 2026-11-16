import { App, TFile, TFolder } from "obsidian";
import { DefManager } from "src/core/def-file-manager";
import { PluginContext } from "src/core/plugin-context";
import { mergeSettings } from "src/settings";

function makeFile(path: string, mtime = 1): TFile {
	const file = Object.create(TFile.prototype);
	const name = path.split("/").pop() ?? path;
	Object.assign(file, {
		path, name,
		basename: name.replace(/\.[^.]+$/, ""),
		extension: name.split(".").pop(),
		stat: { mtime },
	});
	return file;
}

function makeFolder(path: string, children: unknown[]): TFolder {
	const folder = Object.create(TFolder.prototype);
	Object.assign(folder, { path, children });
	return folder;
}

const contents: Record<string, string> = {
	"people/Acme.md": "---\ndef-type: consolidated\n---\n# Ann Lee\n\nNotes.\n",
	"people/Beta.md": "---\ndef-type: consolidated\n---\n# Bob Ray\n\nNotes.\n",
};

function setup() {
	const acme = makeFile("people/Acme.md");
	const beta = makeFile("people/Beta.md");
	const logo = makeFile("people/logo.png");
	const root = makeFolder("people", [acme, beta, logo]);
	const parsed: string[] = [];
	const app = {
		vault: {
			getFolderByPath: (path: string) => path === "people" ? root : null,
			cachedRead: async (file: TFile) => {
				parsed.push(file.path);
				return contents[file.path] ?? "";
			},
		},
		metadataCache: {
			getFileCache: () => ({ frontmatter: { "def-type": "consolidated" } }),
		},
		workspace: { getActiveFile: () => null },
	} as unknown as App;
	return { app, acme, beta, parsed };
}

async function makeManager(app: App) {
	const manager = new DefManager(app);
	await manager.loadDefinitions();
	return manager;
}

beforeEach(() => {
	PluginContext.cleanup();
	PluginContext.initialize({} as App, {} as never, mergeSettings(null));
});

test("loads people and skips files that are not markdown (B19)", async () => {
	const { app, parsed } = setup();
	const manager = await makeManager(app);
	expect(manager.get("Ann Lee")?.fullName).toBe("Ann Lee");
	expect(manager.get("bob ray")?.fullName).toBe("Bob Ray");
	expect(parsed).not.toContain("people/logo.png");
});

test("a deleted file removes its people and reports a change (B15)", async () => {
	const { app } = setup();
	const manager = await makeManager(app);
	const listener = jest.fn();
	manager.onChange(listener);

	manager.removeFile("people/Acme.md");

	expect(manager.get("ann lee")).toBeUndefined();
	expect(manager.get("bob ray")).toBeDefined();
	expect(manager.getConsolidatedDefFiles().map(f => f.path)).toEqual(["people/Beta.md"]);
	expect(listener).toHaveBeenCalledTimes(1);
});

test("a renamed file keeps its people under the new path (B15)", async () => {
	const { app } = setup();
	const manager = await makeManager(app);
	contents["people/Acme Corp.md"] = contents["people/Acme.md"];

	await manager.renameFile(makeFile("people/Acme Corp.md", Date.now() + 1000), "people/Acme.md");

	expect(manager.get("ann lee")?.file.path).toBe("people/Acme Corp.md");
	expect(manager.getDefFiles().map(f => f.path).sort()).toEqual(["people/Acme Corp.md", "people/Beta.md"]);
});

test("a file moved out of the people folder removes its people (B15)", async () => {
	const { app } = setup();
	const manager = await makeManager(app);

	await manager.renameFile(makeFile("archive/Acme.md"), "people/Acme.md");

	expect(manager.get("ann lee")).toBeUndefined();
});

test("a reload with no changed files parses nothing and reports no change (P2)", async () => {
	const { app, parsed } = setup();
	const manager = await makeManager(app);
	const listener = jest.fn();
	manager.onChange(listener);
	parsed.length = 0;

	await manager.loadUpdatedFiles();

	expect(parsed).toEqual([]);
	expect(listener).not.toHaveBeenCalled();
});

test("a reload parses only the file that changed (P2)", async () => {
	const { app, beta, parsed } = setup();
	const manager = await makeManager(app);
	parsed.length = 0;
	contents["people/Beta.md"] = "---\ndef-type: consolidated\n---\n# Bob Ray\n\nNew notes.\n";

	manager.markDirty(beta);
	await manager.loadUpdatedFiles();

	expect(parsed).toEqual(["people/Beta.md"]);
	expect(manager.get("bob ray")?.notes).toBe("New notes.");
	expect(manager.get("ann lee")).toBeDefined();
});

test("a reload keeps the file order, so the first file still wins for a duplicate name", async () => {
	const { app, acme } = setup();
	contents["people/Beta.md"] = "---\ndef-type: consolidated\n---\n# Ann Lee\n\nBeta Ann.\n";
	const manager = await makeManager(app);
	expect(manager.get("ann lee")?.file.path).toBe("people/Acme.md");

	// An unrelated change in the first file
	contents["people/Acme.md"] = "---\ndef-type: consolidated\n---\n# Ann Lee\n\nChanged.\n";
	manager.markDirty(acme);
	await manager.loadUpdatedFiles();

	expect(manager.get("ann lee")?.file.path).toBe("people/Acme.md");
	expect(manager.get("ann lee")?.notes).toBe("Changed.");
});
