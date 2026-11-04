// Tiptap (ProseMirror) document  <->  chapter_drafts.body.
//
// The body is a flat list of blocks, each with a PERMANENT block_id (the anchor of paragraph comments and reading
// progress). The editor document carries that id as the `blockId` attribute of every top-level node, so:
//   * a block that is edited keeps its id (the id lives on the node, not in its text);
//   * a block that is new gets a new id (UniqueID in the editor, or `newId` here as a fallback);
//   * a duplicate id (copy-paste of a block) keeps the first and renumbers the later ones.
// Text marks are stored as ranges over the block text in UTF-16 code units, the same unit the publish RPC and the
// reader use, with hard line breaks stored as "\n".
import { MARK_TYPES, splitByMarks, type MarkType, type TextMark } from "../../reader/index.ts";
import type { ChapterBlock, ChapterBody } from "@storynest/validation";

export interface EditorNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: { type: string }[];
  text?: string;
}

export const NODE = {
  doc: "doc",
  paragraph: "paragraph",
  heading: "heading",
  divider: "horizontalRule",
  image: "imageBlock",
  text: "text",
  lineBreak: "hardBreak",
} as const;

/** The only heading level the body can express (the body has a single "heading" type). */
export const HEADING_LEVEL = 2;
export const BLOCK_ID_ATTRIBUTE = "blockId";
export const STORAGE_KEY_ATTRIBUTE = "storageKey";

/** An editor document that holds something the body cannot represent. Saving it would lose data, so it is refused. */
export class UnsupportedContentError extends Error {
  constructor(readonly nodeType: string) {
    super(`The editor holds "${nodeType}", which a chapter body cannot store`);
    this.name = "UnsupportedContentError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isMarkType = (value: string): value is MarkType => (MARK_TYPES as readonly string[]).includes(value);

/** Text and mark ranges of a paragraph/heading node's inline content. */
function inlineToText(content: readonly EditorNode[] | undefined): { text: string; marks: TextMark[] } {
  let text = "";
  const marks: TextMark[] = [];
  const open: Partial<Record<MarkType, number>> = {};

  const close = (type: MarkType, at: number) => {
    const from = open[type];
    if (from === undefined) return;
    if (at > from) marks.push({ type, from, to: at });
    delete open[type];
  };

  for (const node of content ?? []) {
    let chunk: string;
    if (node.type === NODE.text) chunk = node.text ?? "";
    else if (node.type === NODE.lineBreak) chunk = "\n";
    else throw new UnsupportedContentError(node.type ?? "unknown");

    const active = new Set((node.marks ?? []).map((m) => m.type).filter(isMarkType));
    for (const type of MARK_TYPES) {
      if (active.has(type)) open[type] ??= text.length;
      else close(type, text.length);
    }
    text += chunk;
  }
  for (const type of MARK_TYPES) close(type, text.length);

  marks.sort((a, b) => a.from - b.from || MARK_TYPES.indexOf(a.type) - MARK_TYPES.indexOf(b.type) || a.to - b.to);
  return { text, marks };
}

/**
 * Editor document -> chapter body. `newId` supplies ids for nodes that have none (or a repeated one); the editor's
 * UniqueID extension normally assigns them first, so this is the safety net, not the main path.
 */
export function docToBody(doc: EditorNode, newId: () => string = () => crypto.randomUUID()): ChapterBody {
  const seen = new Set<string>();
  const idOf = (node: EditorNode): string => {
    const candidate = node.attrs?.[BLOCK_ID_ATTRIBUTE];
    let id = typeof candidate === "string" && UUID.test(candidate) ? candidate.toLowerCase() : newId();
    while (seen.has(id)) id = newId();
    seen.add(id);
    return id;
  };

  const blocks: ChapterBlock[] = [];
  for (const node of doc.content ?? []) {
    switch (node.type) {
      case NODE.paragraph: {
        const { text, marks } = inlineToText(node.content);
        blocks.push({ block_id: idOf(node), type: "paragraph", text, ...(marks.length > 0 ? { marks } : {}) });
        break;
      }
      case NODE.heading: {
        const { text, marks } = inlineToText(node.content);
        blocks.push({ block_id: idOf(node), type: "heading", text, ...(marks.length > 0 ? { marks } : {}) });
        break;
      }
      case NODE.divider:
        blocks.push({ block_id: idOf(node), type: "divider" });
        break;
      case NODE.image: {
        const key = node.attrs?.[STORAGE_KEY_ATTRIBUTE];
        if (typeof key !== "string" || key === "")
          throw new UnsupportedContentError("imageBlock without a storage key");
        blocks.push({ block_id: idOf(node), type: "image", image_storage_key: key });
        break;
      }
      default:
        throw new UnsupportedContentError(node.type ?? "unknown");
    }
  }
  return blocks;
}

function inlineNodes(text: string, marks: readonly TextMark[]): EditorNode[] {
  const nodes: EditorNode[] = [];
  for (const segment of splitByMarks(text, marks)) {
    const nodeMarks = segment.marks.map((type) => ({ type }));
    // "\n" is a hard break; everything between breaks is text (an empty text node is not allowed by the schema).
    const parts = segment.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) nodes.push({ type: NODE.lineBreak, ...(nodeMarks.length > 0 ? { marks: nodeMarks } : {}) });
      if (part !== "")
        nodes.push({ type: NODE.text, text: part, ...(nodeMarks.length > 0 ? { marks: nodeMarks } : {}) });
    });
  }
  return nodes;
}

/** Chapter body -> editor document (always at least one block: an editor cannot hold an empty document). */
export function bodyToDoc(body: readonly ChapterBlock[], newId: () => string = () => crypto.randomUUID()): EditorNode {
  const content: EditorNode[] = body.map((block): EditorNode => {
    const attrs = { [BLOCK_ID_ATTRIBUTE]: block.block_id };
    switch (block.type) {
      case "paragraph": {
        const inline = inlineNodes(block.text, block.marks ?? []);
        return { type: NODE.paragraph, attrs, ...(inline.length > 0 ? { content: inline } : {}) };
      }
      case "heading": {
        const inline = inlineNodes(block.text, block.marks ?? []);
        return {
          type: NODE.heading,
          attrs: { ...attrs, level: HEADING_LEVEL },
          ...(inline.length > 0 ? { content: inline } : {}),
        };
      }
      case "divider":
        return { type: NODE.divider, attrs };
      case "image":
        return { type: NODE.image, attrs: { ...attrs, [STORAGE_KEY_ATTRIBUTE]: block.image_storage_key } };
    }
  });
  if (content.length === 0) content.push({ type: NODE.paragraph, attrs: { [BLOCK_ID_ATTRIBUTE]: newId() } });
  return { type: NODE.doc, content };
}
