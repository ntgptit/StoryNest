import { mergeAttributes, Node, type AnyExtension } from "@tiptap/core";
import { UniqueID } from "@tiptap/extension-unique-id";
import StarterKit from "@tiptap/starter-kit";
import { BLOCK_ID_ATTRIBUTE, HEADING_LEVEL, NODE, STORAGE_KEY_ATTRIBUTE } from "./body-converter.ts";
import { FindReplace } from "./find-replace.ts";

/**
 * An uploaded picture as a block of its own. It is an atom (not editable text) holding only the storage key. When
 * `imageUrl` can turn the key into an address the block shows the picture, otherwise an empty frame (a chapter that
 * already contains images must still load and save without losing them).
 */
export function createImageBlock(imageUrl?: (key: string) => string | null) {
  return Node.create({
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
    renderHTML({ node, HTMLAttributes }) {
      const attributes = mergeAttributes({ "data-image-block": "" }, HTMLAttributes);
      const key = node.attrs[STORAGE_KEY_ATTRIBUTE];
      const url = typeof key === "string" && imageUrl ? imageUrl(key) : null;
      return url ? ["figure", attributes, ["img", { src: url, alt: "", draggable: "false" }]] : ["figure", attributes];
    },
  });
}

export const ImageBlock = createImageBlock();

/**
 * Exactly what a chapter body can hold: paragraphs, one heading level, bold/italic/underline/strike, hard breaks,
 * dividers and image blocks. Everything else StarterKit offers is switched off so the editor cannot produce content
 * the body would have to drop. Every top-level block gets a permanent id (UniqueID): new blocks get a fresh uuid, a
 * pasted copy of a block gets a new one while the original keeps its id.
 */
export function editorExtensions(options: { imageUrl?: (key: string) => string | null } = {}): AnyExtension[] {
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
    createImageBlock(options.imageUrl),
    UniqueID.configure({
      attributeName: BLOCK_ID_ATTRIBUTE,
      types: [NODE.paragraph, NODE.heading, NODE.divider, NODE.image],
      generateID: () => crypto.randomUUID(),
    }),
    // Find and replace: decorations only, it never adds anything to the document a body would have to store.
    FindReplace,
  ];
}
