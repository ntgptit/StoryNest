// TanStack Query keys of the story feature. Server prefetch and client hooks must build keys here so they match.
export const storyKeys = {
  all: ["story"] as const,
  detail: (storyId: string) => ["story", "detail", storyId] as const,
  chapters: (storyId: string) => ["story", "chapters", storyId] as const,
  /** Whether I follow / saved this story. The user is part of the key: another account must never see my state. */
  library: (storyId: string, userId: string | null) => ["story", "library", storyId, userId ?? "guest"] as const,
  /** The rating summary and my stars (the user is part of the key). */
  rating: (storyId: string, userId: string | null) => ["story", "rating", storyId, userId ?? "guest"] as const,
};
