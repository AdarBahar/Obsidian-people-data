import { MarkdownPostProcessor } from "obsidian";
import { getDefFileManager } from "src/core/def-file-manager";
import { getSettings } from "src/settings";
import { DEF_DECORATION_CLS, getDecorationAttrs } from "./common";
import { LineScanner, PhraseInfo } from "./definition-search";

// Text inside these elements gets no decoration
const SKIP_SELECTOR = [
	"code", "pre", "a", "kbd", "script", "style",
	".math", ".frontmatter", ".internal-link", ".external-link", ".tag",
	`.${DEF_DECORATION_CLS}`,
].join(",");

export const postProcessor: MarkdownPostProcessor = (element, context) => {
	if (!getSettings().enableInReadingView) {
		return;
	}

	// People files and the popover (which renders notes with the path of a people file)
	// get no decorations, the same as in the editor
	const defManager = getDefFileManager();
	if (context.sourcePath && defManager.isDefPath(context.sourcePath)) {
		return;
	}

	rebuildHTML(element);
}

const rebuildHTML = (parent: Node) => {
	// Copy the list, because the loop replaces child nodes
	const children = Array.from(parent.childNodes);
	for (const childNode of children) {
		if (childNode.nodeType === Node.ELEMENT_NODE) {
			if (!(childNode as Element).matches(SKIP_SELECTOR)) {
				rebuildHTML(childNode);
			}
			continue;
		}
		if (childNode.nodeType !== Node.TEXT_NODE || !childNode.textContent || childNode.textContent === "\n") {
			continue;
		}

		const currText = childNode.textContent;
		const phraseInfos = new LineScanner().scanLine(currText);
		if (phraseInfos.length === 0) {
			continue;
		}

		// Sort by 'from' ascending, then 'to' descending, so longer names win
		phraseInfos.sort((a, b) => a.from - b.from || b.to - a.to);

		let currCursor = 0;
		const newContainer = createSpan();
		phraseInfos.forEach(phraseInfo => {
			if (phraseInfo.from < currCursor) {
				// Subset or intersect phrases are ignored
				return;
			}
			newContainer.appendText(currText.slice(currCursor, phraseInfo.from));
			appendDecorationSpan(newContainer, phraseInfo, currText);
			currCursor = phraseInfo.to;
		});
		newContainer.appendText(currText.slice(currCursor));
		childNode.replaceWith(newContainer);
	}
}

function appendDecorationSpan(container: HTMLElement, phraseInfo: PhraseInfo, currText: string) {
	const person = getDefFileManager().get(phraseInfo.phrase);
	container.createSpan({
		cls: DEF_DECORATION_CLS,
		attr: getDecorationAttrs(phraseInfo.phrase, person?.companyName, person?.companyColor),
		text: currText.slice(phraseInfo.from, phraseInfo.to),
	});
}
