/* Lucian UX/UI Prompt #128 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#128 */ // token-check-ignore: element number in the required license line, not a colour
// Find and replace inside the chapter editor: a pure matcher over the ProseMirror document, the replacement as one
// transaction (one undo step), and a small Tiptap extension that keeps the search in plugin state and draws the
// matches as decorations (nothing is written into the document to highlight them).
import { Extension, type CommandProps } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export interface TextRange {
  from: number;
  to: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
}

/**
 * Stands in for a leaf inside a text block (a hard line break). One UTF-16 unit, like the leaf's one position, so a
 * string offset maps 1:1 onto a document position; a query typed in a one-line input can never contain it.
 */
const LEAF = "￼";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every match of `query` in the document, in document order. The search runs over the whole text of each text block
 * (paragraph, heading), so a word whose letters carry different marks ("re**nam**e") is still one match; it never
 * runs across two blocks, and blocks without text (images, dividers) are skipped, so a match can never cover them.
 * Case-insensitive matching uses the regular expression's case folding, which keeps offsets equal to positions.
 */
export function findMatches(doc: PMNode, query: string, { caseSensitive }: SearchOptions): TextRange[] {
  if (query === "") return [];
  const pattern = new RegExp(escapeRegExp(query), caseSensitive ? "gu" : "giu");
  const matches: TextRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, undefined, LEAF);
    const start = pos + 1; // inside the block
    for (const found of text.matchAll(pattern)) {
      if (found[0] === "") continue;
      matches.push({ from: start + found.index, to: start + found.index + found[0].length });
    }
    return false; // nothing searchable inside a text block's inline content besides its text
  });
  return matches;
}

/**
 * Replaces `ranges` (from findMatches on `tr.doc`) with `replacement` in this one transaction, last match first so
 * the earlier positions stay valid. The new text keeps the marks the matched text started with; an empty replacement
 * deletes the matches. Returns the ranges the replacement text now occupies, in document order.
 */
export function replaceRanges(tr: Transaction, ranges: readonly TextRange[], replacement: string): TextRange[] {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const { from, to } = sorted[index] as TextRange;
    if (replacement === "") {
      tr.delete(from, to);
      continue;
    }
    const $from = tr.doc.resolve(from);
    const marks = $from.marksAcross(tr.doc.resolve(to)) ?? $from.marks();
    tr.replaceWith(from, to, tr.doc.type.schema.text(replacement, marks));
  }
  // Where each replacement ended up: shifted by the length change of every earlier one.
  const delta = replacement.length;
  let shift = 0;
  return sorted.map(({ from, to }) => {
    const at = from + shift;
    shift += delta - (to - from);
    return { from: at, to: at + delta };
  });
}

// ---- Tiptap extension ---------------------------------------------------------------------------------------------

export interface FindReplaceState {
  open: boolean;
  query: string;
  caseSensitive: boolean;
  matches: TextRange[];
  /** Index of the current match in `matches`, or -1 when there is none. */
  current: number;
  /** What the last replace wrote, briefly highlighted; cleared by the next change. */
  replaced: TextRange[];
  /** Counts every request to open (Mod-F included, also while already open): the panel then focuses its field. */
  requests: number;
}

type Meta =
  | { kind: "open"; query?: string }
  | { kind: "close" }
  | { kind: "search"; query: string; caseSensitive: boolean }
  | { kind: "goto"; index: number }
  | { kind: "replaced"; ranges: TextRange[]; current: number };

export const findReplaceKey = new PluginKey<FindReplaceState>("findReplace");

const EMPTY: FindReplaceState = {
  open: false,
  query: "",
  caseSensitive: false,
  matches: [],
  current: -1,
  replaced: [],
  requests: 0,
};

const clampIndex = (index: number, count: number) => (count === 0 ? -1 : Math.min(Math.max(index, 0), count - 1));

/** The match at or after `pos` (wrapping to the first): where a new search starts from the cursor. */
function indexFrom(matches: readonly TextRange[], pos: number): number {
  if (matches.length === 0) return -1;
  const at = matches.findIndex((match) => match.to > pos);
  return at === -1 ? 0 : at;
}

function nextState(previous: FindReplaceState, tr: Transaction): FindReplaceState {
  const meta = tr.getMeta(findReplaceKey) as Meta | undefined;
  if (meta?.kind === "open") {
    const query = meta.query ?? previous.query;
    const matches = findMatches(tr.doc, query, previous);
    return {
      ...previous,
      open: true,
      query,
      matches,
      current: indexFrom(matches, tr.selection.from),
      replaced: [],
      requests: previous.requests + 1,
    };
  }
  if (meta?.kind === "close") return { ...previous, open: false, matches: [], current: -1, replaced: [] };
  if (meta?.kind === "search") {
    const matches = findMatches(tr.doc, meta.query, meta);
    return {
      ...previous,
      query: meta.query,
      caseSensitive: meta.caseSensitive,
      matches,
      current: indexFrom(matches, tr.selection.from),
      replaced: [],
    };
  }
  if (meta?.kind === "goto") return { ...previous, current: clampIndex(meta.index, previous.matches.length) };
  if (!previous.open) return previous;
  if (meta?.kind === "replaced") {
    const matches = findMatches(tr.doc, previous.query, previous);
    return { ...previous, matches, current: clampIndex(meta.current, matches.length), replaced: meta.ranges };
  }
  if (!tr.docChanged) return previous;
  // Typing elsewhere while the panel is open: the matches follow the text.
  const matches = findMatches(tr.doc, previous.query, previous);
  return { ...previous, matches, current: clampIndex(previous.current, matches.length), replaced: [] };
}

function decorationsOf(doc: PMNode, search: FindReplaceState): DecorationSet {
  if (!search.open || (search.matches.length === 0 && search.replaced.length === 0)) return DecorationSet.empty;
  const decorations = search.matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class: index === search.current ? "find-match find-match-current" : "find-match",
    }),
  );
  for (const range of search.replaced) {
    if (range.to > range.from) decorations.push(Decoration.inline(range.from, range.to, { class: "find-replaced" }));
  }
  return DecorationSet.create(doc, decorations);
}

/** Moves the selection onto a match and scrolls it into view (focus stays where it is, e.g. in the find field). */
function selectMatch(tr: Transaction, match: TextRange | undefined): Transaction {
  if (!match) return tr;
  return tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findReplace: {
      /** Opens the panel; with a one-block text selection, that text becomes the query. */
      openFindReplace: () => ReturnType;
      closeFindReplace: () => ReturnType;
      setFindQuery: (query: string, caseSensitive: boolean) => ReturnType;
      findNext: () => ReturnType;
      findPrevious: () => ReturnType;
      /** Replaces the current match and moves on to the next one. */
      replaceCurrent: (replacement: string) => ReturnType;
      /** Replaces every match in one transaction: a single undo brings them all back. */
      replaceAll: (replacement: string) => ReturnType;
    };
  }
}

export function findReplaceState(state: EditorState): FindReplaceState {
  return findReplaceKey.getState(state) ?? EMPTY;
}

/** Selected text worth searching for: inside one block, on one line. */
function selectedQuery(state: EditorState): string | undefined {
  const { from, to, empty } = state.selection;
  if (empty) return undefined;
  const $from = state.doc.resolve(from);
  if (!$from.sameParent(state.doc.resolve(to)) || !$from.parent.isTextblock) return undefined;
  const text = state.doc.textBetween(from, to, undefined, LEAF);
  return text.includes(LEAF) ? undefined : text;
}

export const FindReplace = Extension.create({
  name: "findReplace",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindReplaceState>({
        key: findReplaceKey,
        state: {
          init: () => EMPTY,
          apply: (tr, previous) => nextState(previous, tr),
        },
        props: {
          decorations: (state) => decorationsOf(state.doc, findReplaceState(state)),
        },
      }),
    ];
  },

  addCommands() {
    const step =
      (direction: 1 | -1) =>
      () =>
      ({ state, tr, dispatch }: CommandProps) => {
        const search = findReplaceState(state);
        const count = search.matches.length;
        if (!search.open || count === 0) return false;
        const index = search.current === -1 ? 0 : (search.current + direction + count) % count;
        if (dispatch) dispatch(selectMatch(tr.setMeta(findReplaceKey, { kind: "goto", index }), search.matches[index]));
        return true;
      };

    return {
      openFindReplace:
        () =>
        ({ state, tr, dispatch }) => {
          const query = selectedQuery(state);
          if (dispatch) dispatch(tr.setMeta(findReplaceKey, { kind: "open", ...(query ? { query } : {}) }));
          return true;
        },
      closeFindReplace:
        () =>
        ({ state, tr, dispatch }) => {
          if (!findReplaceState(state).open) return false;
          if (dispatch) dispatch(tr.setMeta(findReplaceKey, { kind: "close" }));
          return true;
        },
      setFindQuery:
        (query, caseSensitive) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(findReplaceKey, { kind: "search", query, caseSensitive }));
          return true;
        },
      findNext: step(1),
      findPrevious: step(-1),
      replaceCurrent:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const search = findReplaceState(state);
          const match = search.matches[search.current];
          if (!search.open || !match) return false;
          if (dispatch) {
            const ranges = replaceRanges(tr, [match], replacement);
            // The match after it slides into the same index once this one is gone (unless the replacement matches).
            const after = findMatches(tr.doc, search.query, search);
            const next = indexFrom(after, (ranges[0] as TextRange).to);
            tr.setMeta(findReplaceKey, { kind: "replaced", ranges, current: next });
            dispatch(selectMatch(tr, after[next]));
          }
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const search = findReplaceState(state);
          if (!search.open || search.matches.length === 0) return false;
          if (dispatch) {
            const ranges = replaceRanges(tr, search.matches, replacement);
            dispatch(tr.setMeta(findReplaceKey, { kind: "replaced", ranges, current: 0 }));
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-f": () => {
        this.editor.commands.openFindReplace();
        return true; // instead of the browser's own find, which cannot see past the editor's own rendering
      },
      Escape: () => this.editor.commands.closeFindReplace(),
    };
  },
});
