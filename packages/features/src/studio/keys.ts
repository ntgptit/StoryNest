// TanStack Query keys of the studio feature (private, per-user data: never prefetched on the server).
export const studioKeys = {
  all: ["studio"] as const,
  stories: (userId: string) => ["studio", "stories", userId] as const,
  deleted: (userId: string) => ["studio", "deleted", userId] as const,
  story: (storyId: string) => ["studio", "story", storyId] as const,
  chapters: (storyId: string) => ["studio", "chapters", storyId] as const,
  collaborators: (storyId: string) => ["studio", "collaborators", storyId] as const,
  storyInvitations: (storyId: string) => ["studio", "story-invitations", storyId] as const,
  myInvitations: (userId: string) => ["studio", "my-invitations", userId] as const,
};
