// TanStack Query keys of the discovery feature. Server prefetch and client hooks must build keys here so they match.
export interface LatestStoriesFilter {
  /** Category slug; a root category includes its sub-categories. Omit for all. */
  categorySlug?: string | undefined;
  /** BCP-47 language code stored on the story (e.g. "vi"). Omit for all languages. */
  language?: string | undefined;
  /** Tag slug. Combines with the category filter. Omit for all. */
  tagSlug?: string | undefined;
  includeMature?: boolean | undefined;
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
        includeMature: filter.includeMature ?? false,
        pageSize: filter.pageSize ?? DEFAULT_PAGE_SIZE,
      },
    ] as const,
};

export const DEFAULT_PAGE_SIZE = 12;
