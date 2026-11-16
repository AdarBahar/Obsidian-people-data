import { App, TFile, TFolder } from "obsidian";
import { ensureFolder } from "src/util/folders";

function makeVault(existing: Record<string, "file" | "folder">) {
	const items = new Map<string, unknown>();
	const add = (path: string, kind: "file" | "folder") =>
		items.set(path, Object.create((kind === "folder" ? TFolder : TFile).prototype));
	Object.entries(existing).forEach(([path, kind]) => add(path, kind));
	const created: string[] = [];
	const app = {
		vault: {
			getAbstractFileByPath: (path: string) => items.get(path) ?? null,
			createFolder: async (path: string) => {
				created.push(path);
				add(path, "folder");
			},
		},
	} as unknown as App;
	return { app, created };
}

test("makes a missing folder", async () => {
	const { app, created } = makeVault({});
	expect(await ensureFolder(app, "people")).toBe(true);
	expect(created).toEqual(["people"]);
});

test("makes the missing parent folders, in order", async () => {
	const { app, created } = makeVault({ "Work": "folder" });
	expect(await ensureFolder(app, "Work/Contacts/people/")).toBe(true);
	expect(created).toEqual(["Work/Contacts", "Work/Contacts/people"]);
});

test("does nothing if the folder exists", async () => {
	const { app, created } = makeVault({ "people": "folder" });
	expect(await ensureFolder(app, "people")).toBe(true);
	expect(created).toEqual([]);
});

test("returns false if a file uses the path", async () => {
	const { app, created } = makeVault({ "people": "file" });
	expect(await ensureFolder(app, "people/new")).toBe(false);
	expect(created).toEqual([]);
});

test("returns false for an empty path or the vault root", async () => {
	const { app } = makeVault({});
	expect(await ensureFolder(app, "")).toBe(false);
	expect(await ensureFolder(app, "/")).toBe(false);
});

test("accepts a folder that another action made at the same time", async () => {
	const { app } = makeVault({});
	const vault = app.vault as unknown as { createFolder: (p: string) => Promise<void>; getAbstractFileByPath: (p: string) => unknown };
	const realCreate = vault.createFolder;
	vault.createFolder = async (path: string) => {
		await realCreate(path);
		throw new Error("Folder already exists.");
	};
	expect(await ensureFolder(app, "people")).toBe(true);
});
