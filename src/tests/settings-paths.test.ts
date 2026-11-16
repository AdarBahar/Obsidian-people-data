import { DEFAULT_DEF_FOLDER, DEFAULT_SETTINGS, mergeSettings } from "src/settings";
import { isPathInFolder } from "src/util/paths";

describe("isPathInFolder", () => {
	test("matches the folder and files inside it", () => {
		expect(isPathInFolder("people", "people")).toBe(true);
		expect(isPathInFolder("people/Acme.md", "people")).toBe(true);
		expect(isPathInFolder("people/sub/Acme.md", "people/")).toBe(true);
	});

	test("does not match folders or files that only start with the same text", () => {
		expect(isPathInFolder("people-archive/Acme.md", "people")).toBe(false);
		expect(isPathInFolder("peoples.md", "people")).toBe(false);
		expect(isPathInFolder("notes/people/Acme.md", "people")).toBe(false);
	});

	test("an empty folder matches nothing", () => {
		expect(isPathInFolder("Acme.md", "")).toBe(false);
		expect(isPathInFolder("Acme.md", "/")).toBe(false);
	});
});

describe("mergeSettings", () => {
	test("a new install gets the default people folder", () => {
		expect(mergeSettings(null).defFolder).toBe(DEFAULT_DEF_FOLDER);
		expect(mergeSettings({ defFolder: "" }).defFolder).toBe(DEFAULT_DEF_FOLDER);
	});

	test("saved values win, and missing nested keys get defaults", () => {
		const settings = mergeSettings({
			defFolder: "contacts",
			defPopoverConfig: { displayDefFileName: true } as never,
		});
		expect(settings.defFolder).toBe("contacts");
		expect(settings.defPopoverConfig.displayDefFileName).toBe(true);
		expect(settings.defPopoverConfig.maxWidth).toBe(150);
		expect(settings.defFileParseConfig.divider.dash).toBe(true);
	});

	test("changes to the result do not change DEFAULT_SETTINGS", () => {
		const settings = mergeSettings(null);
		settings.defFileParseConfig.divider.underscore = true;
		settings.defPopoverConfig.maxWidth = 999;
		expect(DEFAULT_SETTINGS.defFileParseConfig?.divider.underscore).toBe(false);
		expect(DEFAULT_SETTINGS.defPopoverConfig?.maxWidth).toBe(150);
	});
});
