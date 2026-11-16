// Helpers that find the header of a people file from its text.
// The header is the frontmatter block and an optional logo line after it.
// The parsers and the file updater use the same helpers, so line numbers agree.

// A logo line is only an image: ![alt](path) or the embed syntax ![[path]]
const LOGO_REGEX = /^(!\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]+\))$/;

export interface FileHeader {
	// Index of the first line after the header
	bodyStart: number;
	// The logo line as markdown, or an empty string
	logo: string;
}

// Returns the number of lines that the frontmatter block uses, or 0.
export function countFrontmatterLines(lines: string[]): number {
	if (lines.length === 0 || lines[0].trim() !== "---") {
		return 0;
	}
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			return i + 1;
		}
	}
	// No closing delimiter: this is not frontmatter
	return 0;
}

export function parseFileHeader(lines: string[]): FileHeader {
	const fmLines = countFrontmatterLines(lines);
	for (let i = fmLines; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) {
			continue;
		}
		if (LOGO_REGEX.test(line)) {
			return { bodyStart: i + 1, logo: line };
		}
		break;
	}
	return { bodyStart: fmLines, logo: "" };
}

export function splitLines(content: string): string[] {
	return content.split(/\r?\n/);
}

// Keeps the line ending style of the original file
export function detectEol(content: string): string {
	return content.includes("\r\n") ? "\r\n" : "\n";
}

// Returns true if the file has no text after its frontmatter block
export function hasEmptyBody(content: string): boolean {
	const lines = splitLines(content);
	return lines.slice(countFrontmatterLines(lines)).join("").trim().length === 0;
}

// Puts `body` after the frontmatter block of `content` and keeps the frontmatter.
// Returns null if the file already has a body, so a concurrent edit is kept.
export function appendTemplateBody(content: string, body: string): string | null {
	if (!hasEmptyBody(content)) {
		return null;
	}
	const eol = detectEol(content);
	const lines = splitLines(content);
	const fmLines = countFrontmatterLines(lines);
	const head = lines.slice(0, fmLines).join(eol);
	const text = body.replace(/^\s*\n/, "").replace(/\r?\n/g, eol);
	return head ? `${head}${eol}${eol}${text}` : text;
}
