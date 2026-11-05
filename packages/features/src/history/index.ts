// Public API of the "history" feature: published versions of a chapter (view, compare, restore) and the draft preview.
export { HistoryScreen } from "./screens/history-screen.tsx";
export { PreviewScreen } from "./screens/preview-screen.tsx";
export { historyText } from "./strings.ts";
// The block comparison, shared with the editor's merge of an unsaved copy with the server draft.
export { bodyToReaderBlocks, diffBlocks, DIFF_STATUS } from "./model/history.ts";
