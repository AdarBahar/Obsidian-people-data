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

// Parse a color value (name or hex) to hex code
export function parseColorValue(colorValue: string): string {
	// Trim and convert to lowercase for comparison
	const trimmedValue = colorValue.trim().toLowerCase();
	
	// Check if it's a predefined color name
	if (COMPANY_COLOR_PALETTE[trimmedValue]) {
		return COMPANY_COLOR_PALETTE[trimmedValue];
	}
	
	// Check if it's a hex color (with #)
	if (trimmedValue.startsWith('#') && trimmedValue.match(/^#[0-9a-fA-F]{6}$/)) {
		return trimmedValue;
	}
	
	// Check if it's a hex color (without #)
	if (trimmedValue.match(/^[0-9a-fA-F]{6}$/)) {
		return `#${trimmedValue}`;
	}
	
	// For CSS named colors or other formats, return as-is
	return colorValue;
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
