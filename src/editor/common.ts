import { getSettings } from "src/settings";

export const DEF_DECORATION_CLS = "people-metadata-def-decoration";

// Attributes for a decorated person name.
// Previews open through document listeners (see DefinitionPreviewService), not inline handlers.
// `companyColor` must come from parseColorValue(), which allows only safe color values.
export function getDecorationAttrs(phrase: string, companyName?: string, companyColor?: string): { [key: string]: string } {
	const attributes: { [key: string]: string } = {
		def: phrase,
	};
	if (!getSettings().enableSpellcheck) {
		attributes.spellcheck = "false";
	}

	// Company data attribute for CSS snippets of the user
	if (companyName) {
		attributes['data-company'] = companyName.replace(/[^a-zA-Z0-9-_]/g, '-');
	}
	// The underline color is set on each name, so it works in all windows
	if (companyColor) {
		attributes.style = `--person-underline-color: ${companyColor}`;
	}

	return attributes;
}
