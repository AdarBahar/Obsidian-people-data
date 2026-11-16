import { App, Component, MarkdownRenderer, normalizePath } from "obsidian";
import { PersonMetadata } from "src/core/model";

// Renders the content of a person card into `parent`.
// The desktop popover and the mobile modal use the same card.
// `component` owns the rendered markdown. Unload it when the card closes.
export function renderPersonCard(app: App, person: PersonMetadata, parent: HTMLElement,
	component: Component, options: { headingTag: "h1" | "h2", showFileName: boolean }) {

	const headerEl = parent.createDiv({ cls: "people-metadata-popover-header" });
	headerEl.createEl(options.headingTag, {
		cls: "people-metadata-person-name",
		text: person.fullName
	});

	// Company info on the right side of header
	if (person.companyName || person.companyLogo) {
		const companyEl = headerEl.createDiv({ cls: "people-metadata-company-info" });
		if (person.companyLogo) {
			const logoEl = companyEl.createDiv({ cls: "people-metadata-company-logo" });
			renderCompanyLogo(app, person, logoEl);
		}
		if (person.companyName) {
			companyEl.createDiv({ text: person.companyName, cls: "people-metadata-company-name" });
		}
	}

	if (options.showFileName) {
		parent.createDiv({
			text: person.file.basename,
			cls: "people-metadata-definition-popover-filename"
		});
	}

	const detailsEl = parent.createDiv({ cls: "people-metadata-person-details" });
	if (person.position) {
		detailsEl.createDiv({ text: `Position: ${person.position}` });
	}
	if (person.department) {
		detailsEl.createDiv({ text: `Department: ${person.department}` });
	}

	const notesEl = parent.createDiv({ cls: "people-metadata-person-notes" });
	MarkdownRenderer.render(app, person.notes, notesEl, normalizePath(person.file.path), component);
	return notesEl;
}

const EMBED_LOGO_REGEX = /^!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/;
const MD_LOGO_REGEX = /^!\[[^\]]*\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)$/;
const EXTERNAL_URL_REGEX = /^(https?:|data:|app:)/i;

// Returns the image source for a logo line, or null if the logo file does not exist.
export function resolveLogoSource(app: App, logoMarkdown: string, sourcePath: string): string | null {
	const line = logoMarkdown.trim();
	let link: string | undefined;

	const embedMatch = line.match(EMBED_LOGO_REGEX);
	if (embedMatch) {
		link = embedMatch[1].trim();
	} else {
		const mdMatch = line.match(MD_LOGO_REGEX);
		if (!mdMatch) {
			return null;
		}
		if (EXTERNAL_URL_REGEX.test(mdMatch[1])) {
			return mdMatch[1];
		}
		try {
			link = decodeURIComponent(mdMatch[1]);
		} catch (e) {
			link = mdMatch[1];
		}
	}

	const file = app.metadataCache.getFirstLinkpathDest(link, sourcePath);
	if (!file) {
		return null;
	}
	return app.vault.getResourcePath(file);
}

// Shows the logo, or a badge with the company initials if the logo cannot load.
// The badge appears only after a real load error, not after a timeout.
function renderCompanyLogo(app: App, person: PersonMetadata, logoEl: HTMLElement) {
	const src = resolveLogoSource(app, person.companyLogo ?? "", normalizePath(person.file.path));
	if (!src) {
		showDefaultLogo(logoEl, person.companyName);
		return;
	}
	const img = logoEl.createEl("img", {
		attr: { src: src, alt: `${person.companyName ?? "Company"} logo` }
	});
	img.addEventListener("error", () => showDefaultLogo(logoEl, person.companyName), { once: true });
}

function showDefaultLogo(logoEl: HTMLElement, companyName?: string) {
	logoEl.empty();
	const defaultLogo = logoEl.createDiv({
		cls: "people-metadata-company-logo-default",
		text: companyName ? companyName.substring(0, 2).toUpperCase() : "CO"
	});
	defaultLogo.title = companyName ? `${companyName} (default logo)` : "Company (default logo)";
}
