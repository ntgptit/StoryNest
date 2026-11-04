// Public API of the "reader" feature: reading a published chapter.
export { ReaderScreen } from "./screens/reader-screen.tsx";
export { prefetchChapter } from "./queries.ts";
export { blockAnchor, type ChapterContent } from "./model/chapter.ts";
export { readerText } from "./strings.ts";
export { buildReaderBootstrapScript } from "./model/preferences.ts";
export { splitByMarks, MARK_TYPES, type MarkType, type TextMark } from "./model/chapter.ts";
