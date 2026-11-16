import { Editor } from "obsidian";
import { EditorView } from "@codemirror/view";
import { definitionMarker, PhraseInfo } from "src/editor/decoration";
import { normaliseWord } from "./text";

export { normaliseWord };

// Returns the marked name under the cursor of this editor, or an empty string.
// Each editor has its own list of marked names, so split panes do not mix.
export function getMarkedWordUnderCursor(editor: Editor) {
	// @ts-expect-error, cm is not in the public API
	const view = editor.cm as EditorView | undefined;
	const phrases = view?.plugin(definitionMarker)?.markedPhrases ?? [];
	const currWord = getWordByOffset(phrases, editor.posToOffset(editor.getCursor()));
	return normaliseWord(currWord);
}

// Binary search over phrases sorted by position
function getWordByOffset(markedPhrases: PhraseInfo[], offset: number): string {
	let start = 0;
	let end = markedPhrases.length - 1;

	while (start <= end) {
		const mid = Math.floor((start + end) / 2);
		const currPhrase = markedPhrases[mid];
		if (offset >= currPhrase.from && offset <= currPhrase.to) {
			return currPhrase.phrase;
		}
		if (offset < currPhrase.from) {
			end = mid - 1;
		} else {
			start = mid + 1;
		}
	}
	return "";
}
