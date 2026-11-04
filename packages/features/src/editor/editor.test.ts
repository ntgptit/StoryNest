import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { chapterBodySchema, countWords, type ChapterBlock } from "@storynest/validation";
import { bodyToDoc, docToBody, UnsupportedContentError, type EditorNode } from "./model/body-converter.ts";
import { editorExtensions } from "./model/extensions.ts";

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
  const editor = new Editor({ extensions: editorExtensions(), content: bodyToDoc(body) });
  editors.push(editor);
  return editor;
};
const bodyOf = (editor: Editor) => docToBody(editor.getJSON() as EditorNode);
const ids = (body: readonly ChapterBlock[]) => body.map((b) => b.block_id);
/** Block ids as the editor itself holds them (not the converter's fallback), so UniqueID is what is tested. */
const liveIds = (editor: Editor) => ((editor.getJSON().content ?? []) as EditorNode[]).map((n) => n.attrs?.blockId);
afterEach(() => editors.splice(0).forEach((e) => e.destroy()));

const SAMPLE: ChapterBlock[] = [
  { block_id: id(1), type: "heading", text: "Tiêu đề" },
  {
    block_id: id(2),
    type: "paragraph",
    text: "Xin chào thế giới",
    marks: [
      { type: "bold", from: 0, to: 4 },
      { type: "italic", from: 5, to: 9 },
    ],
  },
  { block_id: id(3), type: "divider" },
  { block_id: id(4), type: "paragraph", text: "Dòng một\nDòng hai" },
  { block_id: id(5), type: "image", image_storage_key: "19000000-0000-4000-8000-000000000001/a.png" },
  { block_id: id(6), type: "paragraph", text: "" },
];

describe("body <-> editor document", () => {
  it("round-trips a body without losing text, marks, ids or block types", () => {
    expect(docToBody(bodyToDoc(SAMPLE))).toEqual(SAMPLE);
  });

  it("round-trips through a real editor too (the schema may normalise, the body must not change)", () => {
    expect(bodyOf(make(SAMPLE))).toEqual(SAMPLE);
  });

  it("merges a mark that runs across differently formatted text and keeps overlapping marks", () => {
    const body: ChapterBlock[] = [
      {
        block_id: id(1),
        type: "paragraph",
        text: "abcdef",
        marks: [
          // the normalised order: by start, then by mark type
          { type: "bold", from: 0, to: 4 },
          { type: "underline", from: 1, to: 2 },
          { type: "italic", from: 2, to: 6 },
          { type: "strike", from: 5, to: 6 },
        ],
      },
    ];
    expect(docToBody(bodyToDoc(body))).toEqual(body);
    expect(bodyOf(make(body))).toEqual(body);
  });

  it("counts UTF-16 code units, so a mark after an emoji lands on the right characters", () => {
    const body: ChapterBlock[] = [
      { block_id: id(1), type: "paragraph", text: "😀 ok", marks: [{ type: "bold", from: 3, to: 5 }] },
    ];
    const back = docToBody(bodyToDoc(body));
    expect(back).toEqual(body);
    expect(back[0]).toMatchObject({ text: "😀 ok" });
  });

  it("writes headings as level 2, the only level the editor offers", () => {
    const doc = bodyToDoc([{ block_id: id(1), type: "heading", text: "T" }]);
    expect(doc.content?.[0]?.attrs?.level).toBe(2);
    const editor = make([{ block_id: id(1), type: "heading", text: "T" }]);
    expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(2);
  });

  it("a body with no block becomes one empty paragraph with a fresh id (an editor cannot be empty)", () => {
    const doc = bodyToDoc([], () => id(9));
    expect(doc.content).toHaveLength(1);
    expect(docToBody(doc)).toEqual([{ block_id: id(9), type: "paragraph", text: "" }]);
  });

  it("gives a block without a valid id a new one, and renumbers a repeated id (the first keeps it)", () => {
    let n = 100;
    const doc: EditorNode = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { blockId: id(1) }, content: [{ type: "text", text: "a" }] },
        { type: "paragraph", attrs: { blockId: id(1) }, content: [{ type: "text", text: "b" }] },
        { type: "paragraph", attrs: { blockId: "not-a-uuid" } },
        { type: "paragraph" },
      ],
    };
    const body = docToBody(doc, () => id(n++));
    expect(ids(body)).toEqual([id(1), id(100), id(101), id(102)]);
    expect(new Set(ids(body)).size).toBe(4);
  });

  it("refuses content a body cannot store instead of dropping it silently", () => {
    expect(() => docToBody({ type: "doc", content: [{ type: "codeBlock" }] })).toThrow(UnsupportedContentError);
    expect(() => docToBody({ type: "doc", content: [{ type: "paragraph", content: [{ type: "mention" }] }] })).toThrow(
      UnsupportedContentError,
    );
    expect(() => docToBody({ type: "doc", content: [{ type: "imageBlock", attrs: { blockId: id(1) } }] })).toThrow(
      UnsupportedContentError,
    );
  });

  it("always produces a body the draft schema accepts, and counts words like the publish RPC", () => {
    expect(chapterBodySchema.safeParse(bodyOf(make(SAMPLE))).success).toBe(true);
    expect(countWords(SAMPLE)).toBe(1 + 4 + 5); // heading, then "Xin chào thế giới", then the two lines
  });
});

describe("block ids in the live editor", () => {
  it("a new block gets a new id and the others keep theirs", () => {
    const editor = make(SAMPLE);
    const before = ids(bodyOf(editor));
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: "paragraph",
      content: [{ type: "text", text: "mới" }],
    });
    const after = bodyOf(editor);
    expect(ids(after).slice(0, before.length)).toEqual(before);
    expect(ids(after)).toHaveLength(before.length + 1);
    expect(new Set(ids(after)).size).toBe(ids(after).length);
    // the editor assigned it (not the converter's fallback): every node holds a real, unique id
    expect(liveIds(editor).every((value) => typeof value === "string")).toBe(true);
    expect(new Set(liveIds(editor)).size).toBe(liveIds(editor).length);
  });

  it("editing the text of a block keeps its id", () => {
    const editor = make(SAMPLE);
    editor.commands.setTextSelection({ from: 2, to: 4 });
    editor.commands.insertContent("XYZ");
    const after = bodyOf(editor);
    expect(ids(after)).toEqual(ids(SAMPLE));
    expect(after[0]).toMatchObject({ type: "heading" });
    expect((after[0] as { text: string }).text).not.toBe("Tiêu đề");
  });

  it("splitting a paragraph keeps the id on the first half and gives the second a new one", () => {
    const editor = make([{ block_id: id(1), type: "paragraph", text: "ab cd" }]);
    editor.commands.setTextSelection(3);
    editor.commands.splitBlock();
    const body = bodyOf(editor);
    expect(body).toHaveLength(2);
    expect(body[0]?.block_id).toBe(id(1));
    expect(body[1]?.block_id).not.toBe(id(1));
    expect(liveIds(editor)[0]).toBe(id(1));
    expect(typeof liveIds(editor)[1]).toBe("string"); // assigned by the editor itself
    expect(liveIds(editor)[1]).not.toBe(id(1));
  });

  it("pasting a copy of blocks gives the copy new ids while the originals keep theirs", () => {
    const editor = new Editor({
      element: document.body.appendChild(document.createElement("div")),
      extensions: editorExtensions(),
      content: bodyToDoc([
        { block_id: id(1), type: "paragraph", text: "one" },
        { block_id: id(2), type: "paragraph", text: "two" },
      ]),
    });
    editors.push(editor);
    // A real paste: the clipboard carries the editor's own HTML, including the data-blockid attributes.
    const html = editor.getHTML();
    expect(html).toContain(id(1));
    const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData?: unknown };
    event.clipboardData = {
      types: ["text/html"],
      getData: (type: string) => (type === "text/html" ? html : ""),
      files: [],
      items: [],
    };
    editor.commands.focus("end");
    editor.view.dom.dispatchEvent(event);

    const live = liveIds(editor);
    expect(live.length).toBeGreaterThan(2);
    expect(live.every((value) => typeof value === "string")).toBe(true);
    expect(new Set(live).size).toBe(live.length); // no id twice
    expect(live.slice(0, 2)).toEqual([id(1), id(2)]); // the originals kept theirs
    expect(new Set(ids(bodyOf(editor))).size).toBe(live.length);
  });

  it("deleting a block and undoing it brings the same id back, without touching the others", () => {
    const editor = make(SAMPLE);
    const before = ids(bodyOf(editor));
    editor.commands.setNodeSelection(0);
    editor.commands.deleteSelection();
    expect(ids(bodyOf(editor))).not.toContain(id(1));
    editor.commands.undo();
    expect(ids(bodyOf(editor))).toEqual(before);
    editor.commands.redo();
    expect(ids(bodyOf(editor))).not.toContain(id(1));
    editor.commands.undo();
    expect(ids(bodyOf(editor))).toEqual(before);
  });

  it("typing and undoing never changes the ids of the paragraphs that were not touched", () => {
    const editor = make(SAMPLE);
    const before = ids(bodyOf(editor));
    editor.commands.focus("end"); // inside the last paragraph
    editor.commands.insertContent("thêm");
    editor.commands.undo();
    editor.commands.redo();
    expect(ids(bodyOf(editor))).toEqual(before);
  });

  it("only offers what a body can store (no lists, quotes, code or links)", () => {
    const editor = make([{ block_id: id(1), type: "paragraph", text: "x" }]);
    const names = editor.extensionManager.extensions.map((e) => e.name);
    for (const unsupported of ["bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "code", "link"]) {
      expect(names).not.toContain(unsupported);
    }
    for (const supported of [
      "paragraph",
      "heading",
      "bold",
      "italic",
      "underline",
      "strike",
      "horizontalRule",
      "hardBreak",
      "imageBlock",
      "uniqueID",
    ]) {
      expect(names).toContain(supported);
    }
  });

  it("applies a mark to the selected text and the body records its range", () => {
    const editor = make([{ block_id: id(1), type: "paragraph", text: "abcdef" }]);
    editor.commands.setTextSelection({ from: 2, to: 5 });
    editor.commands.toggleBold();
    expect(bodyOf(editor)).toEqual([
      { block_id: id(1), type: "paragraph", text: "abcdef", marks: [{ type: "bold", from: 1, to: 4 }] },
    ]);
  });
});
