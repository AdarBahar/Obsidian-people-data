import { appendTemplateBody, hasEmptyBody } from "src/core/file-header";
import { isDismissKey } from "src/editor/definition-popover";

const key = (k: string, mods: { metaKey?: boolean; ctrlKey?: boolean } = {}) =>
	({ key: k, metaKey: !!mods.metaKey, ctrlKey: !!mods.ctrlKey });

describe("isDismissKey", () => {
	test("a lone modifier key does not close the popover", () => {
		for (const k of ["Meta", "Control", "Shift", "Alt"]) {
			expect(isDismissKey(key(k))).toBe(false);
		}
	});

	test("a copy shortcut does not close the popover", () => {
		expect(isDismissKey(key("c", { metaKey: true }))).toBe(false);
		expect(isDismissKey(key("c", { ctrlKey: true }))).toBe(false);
	});

	test("Escape and text keys close the popover", () => {
		expect(isDismissKey(key("Escape"))).toBe(true);
		expect(isDismissKey(key("a"))).toBe(true);
	});
});

describe("template for a new people file", () => {
	test("a file with only frontmatter has an empty body", () => {
		expect(hasEmptyBody("")).toBe(true);
		expect(hasEmptyBody("---\ntags: [person]\n---\n\n")).toBe(true);
		expect(hasEmptyBody("---\ntags: [person]\n---\nText")).toBe(false);
	});

	test("the body goes after the frontmatter and keeps its keys", () => {
		const result = appendTemplateBody("---\ndef-type: consolidated\ntags: [person]\n---\n", "\n# Person Name\n");
		expect(result).toBe("---\ndef-type: consolidated\ntags: [person]\n---\n\n# Person Name\n");
	});

	test("a file with no frontmatter gets only the body", () => {
		expect(appendTemplateBody("", "# Person Name\n")).toBe("# Person Name\n");
	});

	test("a file that has a body does not change", () => {
		expect(appendTemplateBody("---\na: 1\n---\nText", "# Person Name\n")).toBeNull();
	});

	test("the line endings of the file stay the same", () => {
		expect(appendTemplateBody("---\r\na: 1\r\n---\r\n", "# P\nX\n")).toBe("---\r\na: 1\r\n---\r\n\r\n# P\r\nX\r\n");
	});
});
