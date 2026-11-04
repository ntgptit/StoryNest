// TanStack Query keys of the progress feature (private, per-user data: never prefetched on the server).
export const progressKeys = {
  all: ["progress"] as const,
  chapter: (chapterId: string) => ["progress", "chapter", chapterId] as const,
  story: (storyId: string) => ["progress", "story", storyId] as const,
};
