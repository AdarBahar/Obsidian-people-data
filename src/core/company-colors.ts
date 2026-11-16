// Predefined company color palette
export const COMPANY_COLOR_PALETTE: Record<string, string> = {
	// Primary colors
	'blue': '#0066cc',
	'red': '#e74c3c',
	'green': '#27ae60',
	'orange': '#f39c12',
	'purple': '#9b59b6',
	'teal': '#1abc9c',

	// Secondary colors
	'navy': '#2c3e50',
	'crimson': '#c0392b',
	'forest': '#229954',
	'amber': '#f1c40f',
	'violet': '#8e44ad',
	'cyan': '#17a2b8',

	// Muted colors
	'slate': '#607d8b',
	'rose': '#e91e63',
	'lime': '#8bc34a',
	'indigo': '#3f51b5',
	'pink': '#e91e63',
	'brown': '#795548',

	// Custom colors
	'mint': '#b5e550',
	'coral': '#ff6b35',
	'lavender': '#b19cd9',
	'gold': '#ffd700',
	'silver': '#c0c0c0',
	'bronze': '#cd7f32'
};

// Get all available color names
export function getAvailableColorNames(): string[] {
	return Object.keys(COMPANY_COLOR_PALETTE).sort();
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const BARE_HEX_REGEX = /^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// CSS named colors, such as "rebeccapurple"
const NAMED_COLOR_REGEX = /^[a-z]{3,30}$/i;
// rgb(), rgba(), hsl() and hsla() with numbers only
const FUNCTION_COLOR_REGEX = /^(?:rgb|hsl)a?\(\s*[\d.%\s,/+-]+\)$/i;

// Parse a color value (palette name, hex code or CSS color) to a CSS color.
// Returns an empty string for a value that is not a safe color.
// The result goes into a style attribute, so only these simple forms are allowed.
export function parseColorValue(colorValue: string): string {
	const trimmedValue = colorValue.trim().toLowerCase();

	if (COMPANY_COLOR_PALETTE[trimmedValue]) {
		return COMPANY_COLOR_PALETTE[trimmedValue];
	}
	if (HEX_COLOR_REGEX.test(trimmedValue)) {
		return trimmedValue;
	}
	if (BARE_HEX_REGEX.test(trimmedValue)) {
		return `#${trimmedValue}`;
	}
	if (NAMED_COLOR_REGEX.test(trimmedValue) || FUNCTION_COLOR_REGEX.test(trimmedValue)) {
		return trimmedValue;
	}
	return "";
}

// Get a color preview for display purposes
export function getColorPreview(colorName: string): { name: string, hex: string, isValid: boolean } {
	const hex = parseColorValue(colorName);
	const isValid = hex.startsWith('#') && !!hex.match(/^#[0-9a-fA-F]{6}$/);

	return {
		name: colorName,
		hex: hex,
		isValid: isValid
	};
}
