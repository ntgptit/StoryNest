// TanStack Query keys of the studio feature (private, per-user data: never prefetched on the server).
export const studioKeys = {
  all: ["studio"] as const,
  stories: (userId: string) => ["studio", "stories", userId] as const,
};
