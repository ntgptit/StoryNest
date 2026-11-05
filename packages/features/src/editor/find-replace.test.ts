import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import type { ChapterBlock } from "@storynest/validation";
import { bodyToDoc, docToBody, type EditorNode } from "./model/body-converter.ts";
import { editorExtensions } from "./model/extensions.ts";
import { findMatches, findReplaceState } from "./model/find-replace.ts";

// jsdom has no layout: ProseMirror measures the selection with these when it scrolls it into view.
const noRects = { length: 0, item: () => null, [Symbol.iterator]: function* () {} };
const zeroRect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
for (const proto of [Element.prototype, Range.prototype] as {
  getClientRects?: unknown;
  getBoundingClientRect?: unknown;
}[]) {
  proto.getClientRects ??= () => noRects;
  proto.getBoundingClientRect ??= () => zeroRect;
}

const id = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const editors: Editor[] = [];
const make = (body: ChapterBlock[]) => {
  const editor = new Editor({
    element: document.body.appendChild(document.createElement("div")),
    extensions: editorExtensions(),
    content: bodyToDoc(body),
  });
  editors.push(editor);
  return editor;
};
afterEach(() => editors.splice(0).forEach((e) => e.destroy()));

const bodyOf = (editor: Editor) => docToBody(editor.getJSON() as EditorNode);
const texts = (editor: Editor, ranges: { from: number; to: number }[]) =>
  ranges.map((range) => editor.state.doc.textBetween(range.from, range.to));

const SAMPLE: ChapterBlock[] = [
  { block_id: id(1), type: "heading", text: "Lan và vườn" },
  // "Lan" in bold, then "an" across a mark boundary: "L" plain + "an" italic.
  {
    block_id: id(2),
    type: "paragraph",
    text: "Lan gặp Lan\nở vườn",
    marks: [
      { type: "bold", from: 0, to: 3 },
      { type: "italic", from: 9, to: 11 },
    ],
  },
  { block_id: id(3), type: "image", image_storage_key: "5eed0000-0000-4000-8000-00000000d001/lan.webp" },
  { block_id: id(4), type: "divider" },
  { block_id: id(5), type: "paragraph", text: "LAN cuối" },
];

describe("findMatches", () => {
  it("finds every match in document order, across marks, ignoring case unless asked", () => {
    const editor = make(SAMPLE);
    const loose = findMatches(editor.state.doc, "lan", { caseSensitive: false });
    expect(texts(editor, loose)).toEqual(["Lan", "Lan", "Lan", "LAN"]);
    const strict = findMatches(editor.state.doc, "Lan", { caseSensitive: true });
    expect(strict).toHaveLength(3);
    // The third "Lan" is split over two text nodes (plain "L", italic "an"): still one match.
    const third = strict[2]!;
    expect(editor.state.doc.resolve(third.from).parent.textContent).toContain("Lan gặp Lan");
  });

  it("never matches across a line break or between blocks, and never inside an image or a divider", () => {
    const editor = make(SAMPLE);
    expect(findMatches(editor.state.doc, "Lan ở", { caseSensitive: false })).toEqual([]); // "\n" in between
    expect(findMatches(editor.state.doc, "vườnLan", { caseSensitive: false })).toEqual([]);
    // The image's storage key contains "lan": not text, not searched.
    expect(findMatches(editor.state.doc, "lan.webp", { caseSensitive: false })).toEqual([]);
  });

  it("treats the query as plain text, not a pattern, and finds nothing for an empty query", () => {
    const editor = make([{ block_id: id(1), type: "paragraph", text: "a.b (c) a+b" }]);
    expect(findMatches(editor.state.doc, ".", { caseSensitive: false })).toHaveLength(1);
    expect(findMatches(editor.state.doc, "(c)", { caseSensitive: false })).toHaveLength(1);
    expect(findMatches(editor.state.doc, "a+b", { caseSensitive: false })).toHaveLength(1);
    expect(findMatches(editor.state.doc, "", { caseSensitive: false })).toEqual([]);
  });

  it("folds Vietnamese capitals too (Đ/đ)", () => {
    const editor = make([{ block_id: id(1), type: "paragraph", text: "Đêm đen" }]);
    expect(findMatches(editor.state.doc, "đ", { caseSensitive: false })).toHaveLength(2);
    expect(findMatches(editor.state.doc, "đ", { caseSensitive: true })).toHaveLength(1);
  });
});

describe("FindReplace extension", () => {
  it("opens with the selected text as the query, counts matches and steps through them, wrapping", () => {
    const editor = make(SAMPLE);
    const [first] = findMatches(editor.state.doc, "Lan", { caseSensitive: true });
    editor.commands.setTextSelection({ from: first!.from, to: first!.to });
    editor.commands.openFindReplace();
    let search = findReplaceState(editor.state);
    expect(search).toMatchObject({ open: true, query: "Lan", current: 0 });
    expect(search.matches).toHaveLength(4);
    editor.commands.findPrevious();
    expect(findReplaceState(editor.state).current).toBe(3); // wrapped to the last
    editor.commands.findNext();
    search = findReplaceState(editor.state);
    expect(search.current).toBe(0);
    // The current match is selected (and scrolled to).
    expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe("Lan");
  });

  it("draws matches as decorations only: the saved body is untouched", () => {
    const editor = make(SAMPLE);
    editor.commands.openFindReplace();
    editor.commands.setFindQuery("lan", false);
    // Four matches; the one split over two marks ("L" + italic "an") is drawn in two pieces.
    const drawn = [...editor.view.dom.querySelectorAll(".find-match")].map((el) => el.textContent);
    expect(drawn).toEqual(["Lan", "Lan", "L", "an", "LAN"]);
    expect(editor.view.dom.querySelectorAll(".find-match-current")).toHaveLength(1);
    expect(bodyOf(editor)).toEqual(SAMPLE);
    editor.commands.closeFindReplace();
    expect(editor.view.dom.querySelectorAll(".find-match")).toHaveLength(0);
  });

  it("replaces all as one undoable step, keeps marks, block ids and the image", () => {
    const editor = make(SAMPLE);
    editor.commands.openFindReplace();
    editor.commands.setFindQuery("Lan", true);
    editor.commands.replaceAll("Mai");
    const body = bodyOf(editor);
    expect(body.map((b) => b.block_id)).toEqual(SAMPLE.map((b) => b.block_id));
    expect(body[0]).toMatchObject({ text: "Mai và vườn" });
    // Bold stays on the first word; the replaced cross-mark match takes the marks it started with (none).
    expect(body[1]).toEqual({
      block_id: id(2),
      type: "paragraph",
      text: "Mai gặp Mai\nở vườn",
      marks: [{ type: "bold", from: 0, to: 3 }],
    });
    expect(body[2]).toEqual(SAMPLE[2]);
    expect(body[4]).toMatchObject({ text: "LAN cuối" }); // case-sensitive: untouched
    expect(findReplaceState(editor.state).matches).toHaveLength(0);
    expect(editor.view.dom.querySelectorAll(".find-replaced")).toHaveLength(3);

    editor.commands.undo();
    expect(bodyOf(editor)).toEqual(SAMPLE); // one undo brings every match back
  });

  it("replaces the current match and moves to the next one; empty replacement deletes", () => {
    const editor = make([{ block_id: id(1), type: "paragraph", text: "a b a b a" }]);
    editor.commands.openFindReplace();
    editor.commands.setFindQuery("a", false);
    editor.commands.findNext(); // to the second "a"
    expect(findReplaceState(editor.state).current).toBe(1);
    editor.commands.replaceCurrent("X");
    expect(bodyOf(editor)[0]).toMatchObject({ text: "a b X b a" });
    let search = findReplaceState(editor.state);
    expect(search.matches).toHaveLength(2);
    expect(editor.state.doc.textBetween(search.matches[search.current]!.from, editor.state.doc.content.size)).toBe("a"); // the last one is now current
    editor.commands.replaceAll("");
    expect(bodyOf(editor)[0]).toMatchObject({ text: " b X b " });
    search = findReplaceState(editor.state);
    expect(search).toMatchObject({ current: -1, matches: [] });
  });

  it("keeps the matches in step with typing while open, and refuses to act when closed", () => {
    const editor = make([{ block_id: id(1), type: "paragraph", text: "mèo" }]);
    expect(editor.commands.replaceAll("x")).toBe(false);
    editor.commands.openFindReplace();
    editor.commands.setFindQuery("mèo", false);
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, " mèo");
    expect(findReplaceState(editor.state).matches).toHaveLength(2);
  });

  it("opens on Mod-F inside the text and closes on Escape", () => {
    const editor = make(SAMPLE);
    const key = (init: KeyboardEventInit) =>
      editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
    expect(key({ key: "f", ctrlKey: true })).toBe(false); // handled: the browser's own find is not opened
    expect(findReplaceState(editor.state).open).toBe(true);
    key({ key: "Escape" });
    expect(findReplaceState(editor.state).open).toBe(false);
  });
});
