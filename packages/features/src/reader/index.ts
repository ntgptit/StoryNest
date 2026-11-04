// Public API of the "reader" feature: reading a published chapter.
export { ReaderScreen } from "./screens/reader-screen.tsx";
export { prefetchChapter } from "./queries.ts";
export {
  blockAnchor,
  COMMENTS_ANCHOR,
  toReaderBlocks,
  type BlockRow,
  type ChapterContent,
  type ReaderBlock,
} from "./model/chapter.ts";
export { BlockView } from "./components/block-view.tsx";
export { ReaderSettingsSheet } from "./components/reader-settings-sheet.tsx";
export { readerText } from "./strings.ts";
export { buildReaderBootstrapScript } from "./model/preferences.ts";
export { splitByMarks, MARK_TYPES, type MarkType, type TextMark } from "./model/chapter.ts";
