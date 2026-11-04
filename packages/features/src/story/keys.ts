// TanStack Query keys of the story feature. Server prefetch and client hooks must build keys here so they match.
export const storyKeys = {
  all: ["story"] as const,
  detail: (storyId: string) => ["story", "detail", storyId] as const,
  chapters: (storyId: string) => ["story", "chapters", storyId] as const,
};
