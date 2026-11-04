// TanStack Query keys of the reader feature. Server prefetch and client hooks must build keys here so they match.
export const readerKeys = {
  all: ["reader"] as const,
  chapter: (storyId: string, chapterSlug: string) => ["reader", "chapter", storyId, chapterSlug] as const,
};
