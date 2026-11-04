import { mergeAttributes, Node, type AnyExtension } from "@tiptap/core";
import { UniqueID } from "@tiptap/extension-unique-id";
import StarterKit from "@tiptap/starter-kit";
import { BLOCK_ID_ATTRIBUTE, HEADING_LEVEL, NODE, STORAGE_KEY_ATTRIBUTE } from "./body-converter.ts";

/**
 * An uploaded picture as a block of its own. It is an atom (not editable text) holding only the storage key; the
 * picker that inserts one arrives with Storage (WBS WP 0.0/3.3), but chapters that already contain images must load
 * and save without losing them, so the node exists now.
 */
export const ImageBlock = Node.create({
  name: NODE.image,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      [STORAGE_KEY_ATTRIBUTE]: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-storage-key"),
        renderHTML: (attributes) => ({ "data-storage-key": attributes[STORAGE_KEY_ATTRIBUTE] }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-image-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-image-block": "" }, HTMLAttributes)];
  },
});

/**
 * Exactly what a chapter body can hold: paragraphs, one heading level, bold/italic/underline/strike, hard breaks,
 * dividers and image blocks. Everything else StarterKit offers is switched off so the editor cannot produce content
 * the body would have to drop. Every top-level block gets a permanent id (UniqueID): new blocks get a fresh uuid, a
 * pasted copy of a block gets a new one while the original keeps its id.
 */
export function editorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [HEADING_LEVEL] },
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      codeBlock: false,
      code: false,
      link: false,
    }),
    ImageBlock,
    UniqueID.configure({
      attributeName: BLOCK_ID_ATTRIBUTE,
      types: [NODE.paragraph, NODE.heading, NODE.divider, NODE.image],
      generateID: () => crypto.randomUUID(),
    }),
  ];
}
