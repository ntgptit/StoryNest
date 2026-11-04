// Public API of the "editor" feature: writing a chapter (the Tiptap editor and its body converter).
export { ChapterEditorScreen } from "./screens/chapter-editor-screen.tsx";
export { bodyToDoc, docToBody, UnsupportedContentError, type EditorNode } from "./model/body-converter.ts";
export { editorText } from "./strings.ts";
