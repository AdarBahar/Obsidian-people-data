import { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { childPath, ensureFolder, findFolder } from "src/util/folders";

type Node = TAbstractFile & { path: string; name: string; children?: Node[] };

// A small vault: each entry is a path and its kind. The parent folders are made too.
function makeVault(existing: Record<string, "file" | "folder">) {
	const items = new Map<string, Node>();
	const root = Object.assign(Object.create(TFolder.prototype), { path: "/", name: "", children: [] }) as Node;

	const add = (path: string, kind: "file" | "folder"): Node => {
		const known = items.get(path);
		if (known) {
			return known;
		}
		const slash = path.lastIndexOf("/");
		const parent = slash < 0 ? root : add(path.slice(0, slash), "folder");
		const proto = kind === "folder" ? TFolder.prototype : TFile.prototype;
		const node = Object.assign(Object.create(proto), {
			path, name: path.slice(slash + 1), ...(kind === "folder" ? { children: [] } : {}),
		}) as Node;
		parent.children?.push(node);
		items.set(path, node);
		return node;
	};
	Object.entries(existing).forEach(([path, kind]) => add(path, kind));

	const created: string[] = [];
	const vault = {
		getRoot: () => root,
		getAbstractFileByPath: (path: string) => items.get(path) ?? null,
		createFolder: async (path: string) => {
			created.push(path);
			add(path, "folder");
		},
	};
	return { app: { vault } as unknown as App, vault, created };
}

describe("ensureFolder", () => {
	test("makes a missing folder and returns its path", async () => {
		const { app, created } = makeVault({});
		expect(await ensureFolder(app, "people")).toBe("people");
		expect(created).toEqual(["people"]);
	});

	test("makes the missing parent folders, in order", async () => {
		const { app, created } = makeVault({ "Work": "folder" });
		expect(await ensureFolder(app, "Work/Contacts/people/")).toBe("Work/Contacts/people");
		expect(created).toEqual(["Work/Contacts", "Work/Contacts/people"]);
	});

	test("does nothing if the folder exists", async () => {
		const { app, created } = makeVault({ "people": "folder" });
		expect(await ensureFolder(app, "people")).toBe("people");
		expect(created).toEqual([]);
	});

	test("returns the folder with a different letter case, and makes nothing", async () => {
		const { app, created } = makeVault({ "Work/People": "folder" });
		expect(await ensureFolder(app, "work/people")).toBe("Work/People");
		expect(created).toEqual([]);
	});

	test("returns null if a file uses the path", async () => {
		const { app, created } = makeVault({ "people": "file" });
		expect(await ensureFolder(app, "people/new")).toBeNull();
		expect(created).toEqual([]);
	});

	test("returns the root for an empty path or the vault root", async () => {
		const { app, created } = makeVault({});
		expect(await ensureFolder(app, "")).toBe("/");
		expect(await ensureFolder(app, "/")).toBe("/");
		expect(created).toEqual([]);
	});

	test("accepts a folder that another action made at the same time", async () => {
		const { app, vault } = makeVault({});
		const realCreate = vault.createFolder;
		vault.createFolder = async (path: string) => {
			await realCreate(path);
			throw new Error("Folder already exists.");
		};
		expect(await ensureFolder(app, "people")).toBe("people");
	});
});

describe("findFolder and childPath", () => {
	test("findFolder ignores letter case and returns null for a file", () => {
		const { app } = makeVault({ "Work/People": "folder", "notes.md": "file" });
		expect(findFolder(app, "work/people")?.path).toBe("Work/People");
		expect(findFolder(app, "notes.md")).toBeNull();
		expect(findFolder(app, "missing")).toBeNull();
	});

	test("childPath makes a path in the vault root without a slash", () => {
		expect(childPath("/", "Acme.md")).toBe("Acme.md");
		expect(childPath("people", "Acme.md")).toBe("people/Acme.md");
	});
});
