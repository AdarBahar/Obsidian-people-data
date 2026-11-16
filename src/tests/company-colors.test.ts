import { App } from "obsidian";
import { parseColorValue } from "src/core/company-colors";
import { PluginContext } from "src/core/plugin-context";
import { getDecorationAttrs } from "src/editor/common";
import { mergeSettings } from "src/settings";

describe("parseColorValue (B18)", () => {
	test("accepts palette names, hex codes, CSS names and rgb/hsl", () => {
		expect(parseColorValue("Blue")).toBe("#0066cc");
		expect(parseColorValue("#FF6B35")).toBe("#ff6b35");
		expect(parseColorValue("#abc")).toBe("#abc");
		expect(parseColorValue("b5e550")).toBe("#b5e550");
		expect(parseColorValue("rebeccapurple")).toBe("rebeccapurple");
		expect(parseColorValue("rgb(10, 20, 30)")).toBe("rgb(10, 20, 30)");
		expect(parseColorValue("hsla(120 50% 50% / 0.5)")).toBe("hsla(120 50% 50% / 0.5)");
	});

	test("rejects values that can break out of a CSS declaration", () => {
		expect(parseColorValue("red; } body { display: none")).toBe("");
		expect(parseColorValue("red !important")).toBe("");
		expect(parseColorValue("url(https://example.com/x)")).toBe("");
		expect(parseColorValue("var(--x)")).toBe("");
		expect(parseColorValue("rgb(1,2,3); color: red")).toBe("");
		expect(parseColorValue("")).toBe("");
	});
});

describe("getDecorationAttrs (P5)", () => {
	beforeEach(() => {
		PluginContext.cleanup();
		PluginContext.initialize({} as App, {} as never, mergeSettings(null));
	});

	test("puts the company color on the name as a style variable", () => {
		const attrs = getDecorationAttrs("ann lee", "Acme Inc", "#0066cc");
		expect(attrs).toEqual({
			def: "ann lee",
			"data-company": "Acme-Inc",
			style: "--person-underline-color: #0066cc",
		});
	});

	test("adds no style when the company has no color, and no inline handlers", () => {
		const attrs = getDecorationAttrs("ann lee");
		expect(attrs).toEqual({ def: "ann lee" });
	});

	test("turns off spellcheck when the setting is off", () => {
		PluginContext.getInstance().settings.enableSpellcheck = false;
		expect(getDecorationAttrs("ann lee").spellcheck).toBe("false");
	});
});
