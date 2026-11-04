// TanStack Query keys of the studio feature (private, per-user data: never prefetched on the server).
export const studioKeys = {
  all: ["studio"] as const,
  stories: (userId: string) => ["studio", "stories", userId] as const,
  deleted: (userId: string) => ["studio", "deleted", userId] as const,
  story: (storyId: string) => ["studio", "story", storyId] as const,
};
