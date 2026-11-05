// Public API of the "progress" feature: remembering where a signed-in reader is (chapter position, story pointer).
export { useReadingTracker } from "./hooks/use-reading-tracker.ts";
export { useReadRecorder } from "./hooks/use-read-recorder.ts";
export { useChapterProgress, useStoryProgress } from "./hooks/use-progress.ts";
export { READING_COMPLETED_PERCENT, resolveContinueChapter, type StoryProgress } from "./model/progress.ts";
export { progressText } from "./strings.ts";
export { currentReadSource, markReadSource, READ_SOURCE_TTL_MS } from "./model/read-source.ts";
export { getAnonymousReaderId } from "./model/anonymous-reader.ts";
