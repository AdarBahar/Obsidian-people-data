import { App, Component, MarkdownRenderer, MarkdownView, normalizePath, Plugin } from "obsidian";
import { PersonMetadata } from "src/core/model";
// import { Definition } from "src/core/model"; // Removed as it's no longer used
import { getSettings, PopoverDismissType } from "src/settings";
import { logError } from "src/util/log";

const DEF_POPOVER_ID = "definition-popover";

let definitionPopover: DefinitionPopover;

interface Coordinates {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export class DefinitionPopover extends Component {
	app: App
	plugin: Plugin;
	// Code mirror editor object for capturing vim events
	cmEditor: unknown;
	// Ref to the currently mounted popover
	// There should only be one mounted popover at all times
	mountedPopover: HTMLElement | undefined;

	constructor(plugin: Plugin) {
		super();
		this.app = plugin.app;
		this.plugin = plugin;
		this.cmEditor = this.getCmEditor(this.app);
	}

	// Open at editor cursor's position
	openAtCursor(person: PersonMetadata) {
		this.unmount();
		this.mountAtCursor(person);

		if (!this.mountedPopover) {
			logError("Mounting person popover failed");
			return
		}

		this.registerClosePopoverListeners();
	}

	// Open at coordinates (can use for opening at mouse position)
	openAtCoords(person: PersonMetadata, coords: Coordinates) {
		this.unmount();
		this.mountAtCoordinates(person, coords);

		if (!this.mountedPopover) {
			logError("mounting person popover failed");
			return
		}
		this.registerClosePopoverListeners();
	}

	cleanUp() {
		const popoverEls = document.getElementsByClassName(DEF_POPOVER_ID);
		for (let i = 0; i < popoverEls.length; i++) {
			popoverEls[i].remove();
		}
	}

	close = () => {
		this.unmount();
	}

	clickClose = () => {
		if (this.mountedPopover?.matches(":hover")) {
			return;
		}
		this.close();
	}

	private getCmEditor(app: App) {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			return null;
		}

		// Access the CodeMirror editor through the view's editor property
		// This is a safer way to access the internal editor without casting to any
		const editor = activeView.editor;
		if (!editor) {
			return null;
		}

		// Try to access the CodeMirror instance through the editor
		// @ts-ignore - This is accessing internal Obsidian API
		const cmEditor = editor.cm;
		return cmEditor || null;
	}

	private shouldOpenToLeft(horizontalOffset: number, containerStyle: CSSStyleDeclaration): boolean {
		return horizontalOffset > parseInt(containerStyle.width) / 2;
	}

	private shouldOpenUpwards(verticalOffset: number, containerStyle: CSSStyleDeclaration): boolean {
		return verticalOffset > parseInt(containerStyle.height) / 2;
	}

	// Creates popover element and its children, without displaying it
	private createElement(person: PersonMetadata, parent: HTMLElement): HTMLDivElement {
		const popoverSettings = getSettings().defPopoverConfig;

		// Build CSS classes
		let cssClasses = "people-metadata-definition-popover is-hidden";
		if (popoverSettings.backgroundColour) {
			cssClasses += " has-custom-background";
		}

		const el = parent.createDiv({
			cls: cssClasses,
			attr: {
				id: DEF_POPOVER_ID,
			},
		});

		// Set custom background color as CSS variable if provided
		if (popoverSettings.backgroundColour) {
			el.style.setProperty('--custom-popover-background', popoverSettings.backgroundColour);
		}

		// Create header with person name and company info
		const headerEl = el.createDiv({ cls: "people-metadata-popover-header" });
		const personNameEl = headerEl.createEl("h2", {
			cls: "people-metadata-person-name",
			text: person.fullName
		});

		// Company info on the right side of header
		if (person.companyName || person.companyLogo) {
			const companyEl = headerEl.createDiv({ cls: "people-metadata-company-info" });
			if (person.companyLogo) {
				const logoEl = companyEl.createDiv({ cls: "people-metadata-company-logo" });
				this.renderCompanyLogoWithFallback(person.companyLogo, logoEl, person);
			}
			if (person.companyName) {
				companyEl.createDiv({ text: person.companyName, cls: "people-metadata-company-name" });
			}
		}

		// Add filename display if enabled
		if (popoverSettings.displayDefFileName) {
			const filenameEl = el.createDiv({
				text: person.file.basename,
				cls: "people-metadata-definition-popover-filename"
			});
		}

		// Person details (removed company field)
		const detailsEl = el.createDiv({ cls: "people-metadata-person-details" });
		if (person.position) {
			detailsEl.createDiv({ text: `Position: ${person.position}` });
		}
		if (person.department) {
			detailsEl.createDiv({ text: `Department: ${person.department}` });
		}

		// Notes content
		const contentEl = el.createDiv({ cls: "people-metadata-person-notes" });
		contentEl.setAttr("ctx", "person-popup");

		const currComponent = this;
		MarkdownRenderer.render(this.app, person.notes, contentEl, 
			normalizePath(person.file.path), currComponent);
		this.postprocessMarkdown(contentEl, person);

		return el;
	}

	private renderCompanyLogoWithFallback(logoMarkdown: string, logoEl: HTMLElement, person: PersonMetadata) {
		// First try to render the original logo
		MarkdownRenderer.render(this.app, logoMarkdown, logoEl,
			normalizePath(person.file.path), this);

		// Set up error handling for failed images
		window.setTimeout(() => {
			const imgElements = logoEl.querySelectorAll('img');
			imgElements.forEach(img => {
				// Check if image failed to load or is broken
				if (!img.complete || img.naturalHeight === 0) {
					this.showDefaultLogo(logoEl, person.companyName);
				} else {
					// Set up error handler for future load failures
					img.onerror = () => {
						this.showDefaultLogo(logoEl, person.companyName);
					};
				}
			});
		}, 100); // Small delay to allow image loading attempt
	}

	private showDefaultLogo(logoEl: HTMLElement, companyName?: string) {
		// Clear existing content
		logoEl.empty();

		// Create default logo element
		const defaultLogo = logoEl.createDiv({
			cls: "people-metadata-company-logo-default",
			text: companyName ? companyName.substring(0, 2).toUpperCase() : "CO"
		});

		// Add title attribute for accessibility
		defaultLogo.title = companyName ? `${companyName} (default logo)` : "Company (default logo)";
	}

	// Internal links do not work properly in the popover
	// This is to manually open internal links
	private postprocessMarkdown(el: HTMLDivElement, person: PersonMetadata) {
		const internalLinks = el.getElementsByClassName("internal-link");
		for (let i = 0; i < internalLinks.length; i++) {
			const linkEl = internalLinks.item(i);
			if (linkEl) {
				linkEl.addEventListener('click', e => {
					e.preventDefault();
					const file = this.app.metadataCache.getFirstLinkpathDest(linkEl.getAttr("href") ?? '', 
						normalizePath(person.file.path))
					this.unmount();
					if (!file) {
						return;
					}
					this.app.workspace.getLeaf().openFile(file)
				});
			}
		}
	}

	private mountAtCursor(person: PersonMetadata) {
		let cursorCoords;
		try {
			cursorCoords = this.getCursorCoords();
		} catch (e) {
			logError("Could not open person popover - could not get cursor coordinates");
			return
		}

		this.mountAtCoordinates(person, cursorCoords);
	}

	// Offset coordinates from viewport coordinates to coordinates relative to the parent container element
	private offsetCoordsToContainer(coords: Coordinates, container: HTMLElement): Coordinates {
		const containerRect = container.getBoundingClientRect();
		return {
			left: coords.left - containerRect.left,
			right: coords.right - containerRect.left,
			top: coords.top - containerRect.top,
			bottom: coords.bottom - containerRect.top
		}
	}

	private mountAtCoordinates(person: PersonMetadata, coords: Coordinates) {
		const mdView = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (!mdView) {
			logError("Could not mount popover: No active markdown view found");
			return;
		}

		this.mountedPopover = this.createElement(person, mdView.containerEl);
		this.positionAndSizePopover(mdView, coords);
	}

	// Position and display popover
	private positionAndSizePopover(mdView: MarkdownView, coords: Coordinates) {
		if (!this.mountedPopover) {
			return;
		}
		const popoverSettings = getSettings().defPopoverConfig;
		const containerStyle = getComputedStyle(mdView.containerEl);
		const matchedClasses = mdView.containerEl.getElementsByClassName("view-header");
		// The container div has a header element that needs to be accounted for
		let offsetHeaderHeight = 0;
		if (matchedClasses.length > 0) {
			offsetHeaderHeight = parseInt(getComputedStyle(matchedClasses[0]).height);
		}

		// Offset coordinates to be relative to container
		coords = this.offsetCoordsToContainer(coords, mdView.containerEl);

		// Remove the hidden class to make the popover visible
		this.mountedPopover.removeClass('is-hidden');

		const positionStyle: Partial<CSSStyleDeclaration> = {};

		positionStyle.maxWidth = popoverSettings.enableCustomSize && popoverSettings.maxWidth ?
			`${popoverSettings.maxWidth}px` : `${parseInt(containerStyle.width) / 2}px`;
		if (this.shouldOpenToLeft(coords.left, containerStyle)) {
			positionStyle.right = `${parseInt(containerStyle.width) - coords.right}px`;
		} else {
			positionStyle.left = `${coords.left}px`;
		}

		if (this.shouldOpenUpwards(coords.top, containerStyle)) {
			positionStyle.bottom = `${parseInt(containerStyle.height) - coords.top}px`;
			positionStyle.maxHeight = popoverSettings.enableCustomSize && popoverSettings.maxHeight ?
				`${popoverSettings.maxHeight}px` : `${coords.top - offsetHeaderHeight}px`;
		} else {
			positionStyle.top = `${coords.bottom}px`;
			positionStyle.maxHeight = popoverSettings.enableCustomSize && popoverSettings.maxHeight ?
				`${popoverSettings.maxHeight}px` : `${parseInt(containerStyle.height) - coords.bottom}px`;
		}

		this.mountedPopover.setCssStyles(positionStyle);
	}

	private unmount() {
		if (!this.mountedPopover) {
			return
		}
		this.mountedPopover.remove();
		this.mountedPopover = undefined;

		this.unregisterClosePopoverListeners();
	}

	// This uses internal non-exposed codemirror API to get cursor coordinates
	// Cursor coordinates seem to be relative to viewport
	private getCursorCoords(): Coordinates {
		const editor = this.app.workspace.activeEditor?.editor;
		// @ts-ignore
		return editor?.cm?.coordsAtPos(editor?.posToOffset(editor?.getCursor()), -1);
	}

	private registerClosePopoverListeners() {
		this.getActiveView()?.containerEl.addEventListener("keypress", this.close);
		this.getActiveView()?.containerEl.addEventListener("click", this.clickClose);
		
		if (this.cmEditor && typeof this.cmEditor === 'object' && this.cmEditor !== null && 'on' in this.cmEditor) {
			(this.cmEditor as { on: (event: string, callback: () => void) => void }).on("vim-keypress", this.close);
		}
		const scroller = this.getCmScroller();
		if (scroller) {
			scroller.addEventListener("scroll", this.close);
		}
	}

	private unregisterClosePopoverListeners() {
		this.getActiveView()?.containerEl.removeEventListener("keypress", this.close);
		this.getActiveView()?.containerEl.removeEventListener("click", this.clickClose);

		if (this.cmEditor && typeof this.cmEditor === 'object' && this.cmEditor !== null && 'off' in this.cmEditor) {
			(this.cmEditor as { off: (event: string, callback: () => void) => void }).off("vim-keypress", this.close);
		}
		const scroller = this.getCmScroller();
		if (scroller) {
			scroller.removeEventListener("scroll", this.close);
		}
	}

	private getCmScroller() {
		const scroller = document.getElementsByClassName("cm-scroller");
		if (scroller.length > 0) {
			return scroller[0];
		}
	}

	getPopoverElement() {
		return document.getElementById("definition-popover");
	}

	private getActiveView() {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}
}

// Mount definition popover
export function initDefinitionPopover(plugin: Plugin) {
	if (definitionPopover) {
		definitionPopover.cleanUp();
	}
	definitionPopover = new DefinitionPopover(plugin);
}

export function getDefinitionPopover() {
	return definitionPopover;
}
