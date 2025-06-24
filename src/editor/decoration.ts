import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginSpec,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { DEF_DECORATION_CLS, getDecorationAttrs } from "./common";
import { getDefFileManager } from "src/core/def-file-manager";
import { LineScanner } from "./definition-search";
import { PTreeNode } from "./prefix-tree";

// Information of phrase that can be used to add decorations within the editor
interface PhraseInfo {
	from: number;
	to: number;
	phrase: string;
}

let markedPhrases: PhraseInfo[] = [];

export function getMarkedPhrases(): PhraseInfo[] {
	return markedPhrases;
}

// View plugin to mark definitions
export class DefinitionMarker implements PluginValue {
	decorations: DecorationSet;
	editorView: EditorView;

	constructor(view: EditorView) {
		this.editorView = view;
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged || update.focusChanged) {
			this.decorations = this.buildDecorations(update.view);
			return
		}
	}

	public forceUpdate() {
		this.decorations = this.buildDecorations(this.editorView);
		return;
	}

	destroy() {}

	buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const phraseInfos: PhraseInfo[] = [];

		for (let { from, to } of view.visibleRanges) {
			const text = view.state.sliceDoc(from, to);
			phraseInfos.push(...scanText(text, from));
		}

		phraseInfos.forEach(wordPos => {
			const companyName = getDefFileManager().getPersonCompany(wordPos.phrase);
			const attributes = getDecorationAttrs(wordPos.phrase, companyName);
			builder.add(wordPos.from, wordPos.to, Decoration.mark({
				class: DEF_DECORATION_CLS,
				attributes: attributes,
			}));
		});

		markedPhrases = phraseInfos;
		return builder.finish();
	}
}

// Scan text and return phrases and their positions that require decoration
export function scanText(text: string, offset: number, pTree?: PTreeNode): PhraseInfo[] {
	let phraseInfos: PhraseInfo[] = [];
	const lines = text.split(/\r?\n/);
	let internalOffset = offset;
	const lineScanner = new LineScanner(pTree);

	lines.forEach(line => {
		phraseInfos.push(...lineScanner.scanLine(line, internalOffset));
		// Additional 1 char for \n char
		internalOffset += line.length + 1;
	});

	// Decorations need to be sorted to prefer longer matches over shorter ones
	// First sort by phrase length (longer first), then by position
	phraseInfos.sort((a, b) => {
		if (a.phrase.length !== b.phrase.length) {
			return b.phrase.length - a.phrase.length;
		}
		return a.from - b.from;
	});
	return removeSubsetsAndIntersects(phraseInfos)
}

function removeSubsetsAndIntersects(phraseInfos: PhraseInfo[]): PhraseInfo[] {
	const finalResults: PhraseInfo[] = [];

	for (const phraseInfo of phraseInfos) {
		// Check if this phrase overlaps with any already accepted phrase
		const hasOverlap = finalResults.some(existing =>
			(phraseInfo.from < existing.to && phraseInfo.to > existing.from)
		);

		if (!hasOverlap) {
			finalResults.push(phraseInfo);
		}
	}

	// Sort final results by position for consistent output
	return finalResults.sort((a, b) => a.from - b.from);
}

const pluginSpec: PluginSpec<DefinitionMarker> = {
	decorations: (value: DefinitionMarker) => value.decorations,
};

export const definitionMarker = ViewPlugin.fromClass(
	DefinitionMarker,
	pluginSpec
);

