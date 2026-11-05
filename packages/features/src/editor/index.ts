// Public API of the "editor" feature: writing a chapter (the Tiptap editor and its body converter).
export { ChapterEditorScreen } from "./screens/chapter-editor-screen.tsx";
export { bodyToDoc, docToBody, UnsupportedContentError, type EditorNode } from "./model/body-converter.ts";
export { editorText } from "./strings.ts";
export { chapterDraftQueryOptions, editorKeys } from "./queries.ts";
export { getChapterDraft, saveChapterDraft, type ChapterDraft } from "./api/draft.api.ts";
export { clearBackup } from "./model/local-backup.ts";
export { useChapterDraft } from "./hooks/use-chapter-draft.ts";
// Publishing rules and flow, shared with the chapter manager's scheduled list.
export { usePublishFlow } from "./hooks/use-publishing.ts";
export {
  canPublish,
  canUnpublishChapter,
  formatLocalDateTime,
  localDateTimeValue,
  localZone,
  minLocalDateTime,
  scheduleInstant,
} from "./model/publishing.ts";
export type { ChapterPublishState, PublishRole } from "./api/publishing.api.ts";
