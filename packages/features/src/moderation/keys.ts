// TanStack Query keys of the moderation feature. The moderator is part of the key, so an account switch never shows
// another account's queue.
export const moderationKeys = {
  all: ["moderation"] as const,
  mine: (userId: string) => ["moderation", "mine", userId] as const,
  history: (targetId: string) => ["moderation", "history", targetId] as const,
  queue: (userId: string, filter: string) => ["moderation", "queue", userId, filter] as const,
};
