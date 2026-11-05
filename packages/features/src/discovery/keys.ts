// TanStack Query keys of the discovery feature. Server prefetch and client hooks must build keys here so they match.
import type { WordRange } from "./model/story-length.ts";

export interface LatestStoriesFilter {
  /** Category slug; a root category includes its sub-categories. Omit for all. */
  categorySlug?: string | undefined;
  /** BCP-47 language code stored on the story (e.g. "vi"). Omit for all languages. */
  language?: string | undefined;
  /** Tag slug. Combines with the category filter. Omit for all. */
  tagSlug?: string | undefined;
  /** Only the stories of this author (user id). Omit for all. */
  authorId?: string | undefined;
  includeMature?: boolean | undefined;
  /** Story length in words (story_stats.word_count). Omit for any length. */
  words?: WordRange | undefined;
  pageSize?: number | undefined;
}

export const discoveryKeys = {
  all: ["discovery"] as const,
  categories: () => ["discovery", "categories"] as const,
  popularTags: (limit: number) => ["discovery", "popular-tags", limit] as const,
  latest: (filter: LatestStoriesFilter) =>
    [
      "discovery",
      "latest",
      {
        categorySlug: filter.categorySlug ?? null,
        language: filter.language ?? null,
        tagSlug: filter.tagSlug ?? null,
        authorId: filter.authorId ?? null,
        includeMature: filter.includeMature ?? false,
        words: filter.words ?? null,
        pageSize: filter.pageSize ?? DEFAULT_PAGE_SIZE,
      },
    ] as const,
  /** Head-only count of the same filter (the page size does not matter). */
  count: (filter: LatestStoriesFilter) =>
    [
      "discovery",
      "count",
      {
        categorySlug: filter.categorySlug ?? null,
        language: filter.language ?? null,
        tagSlug: filter.tagSlug ?? null,
        authorId: filter.authorId ?? null,
        includeMature: filter.includeMature ?? false,
        words: filter.words ?? null,
      },
    ] as const,
  /** Story counts per length bucket for the filters other than the length itself. */
  lengths: (filter: LatestStoriesFilter) =>
    [
      "discovery",
      "lengths",
      {
        categorySlug: filter.categorySlug ?? null,
        language: filter.language ?? null,
        tagSlug: filter.tagSlug ?? null,
        includeMature: filter.includeMature ?? false,
      },
    ] as const,
};

export const DEFAULT_PAGE_SIZE = 12;
