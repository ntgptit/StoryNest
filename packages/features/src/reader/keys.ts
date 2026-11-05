// TanStack Query keys of the reader feature. Server prefetch and client hooks must build keys here so they match.
export const readerKeys = {
  all: ["reader"] as const,
  chapter: (storyId: string, chapterSlug: string) => ["reader", "chapter", storyId, chapterSlug] as const,
  /** My vote and the count of one chapter. The user is part of the key: another account must never see my state. */
  vote: (chapterId: string, userId: string | null) => ["reader", "vote", chapterId, userId ?? "guest"] as const,
  /** My personal highlights in a chapter (never anyone else's: the user is part of the key). */
  highlightsOf: (chapterId: string) => ["reader", "highlights", chapterId] as const,
  highlights: (chapterId: string, userId: string | null) =>
    ["reader", "highlights", chapterId, userId ?? "guest"] as const,
};
