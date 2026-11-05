// Public API of the "story" feature: the story page (info + chapter list).
export { StoryScreen } from "./screens/story-screen.tsx";
export { StoryPeekProvider } from "./components/story-peek.tsx";
export { prefetchStory } from "./queries.ts";
export {
  chapterHref,
  isIndexable,
  STORY_META_DESCRIPTION_LENGTH,
  storyMetaDescription,
  type StoryDetail,
} from "./model/story-detail.ts";
export { storyText } from "./strings.ts";
export { storyHref } from "../discovery/index.ts";
export { useStory, useStoryChapters } from "./hooks/use-story.ts";
export type { ChapterListItem } from "./model/story-detail.ts";
export { storyKeys } from "./keys.ts";
export { setStoryFollow, setStorySave } from "./api/library.api.ts";
export {
  chapterRanges,
  isLongStory,
  rangeIndexOf,
  LONG_STORY_CHAPTERS,
  type ChapterRange,
} from "./model/chapter-ranges.ts";
