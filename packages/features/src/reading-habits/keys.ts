// TanStack Query keys of the reading-habits feature (private, per-user data: never prefetched on the server). The
// account is part of the key, so an account switch never shows the previous account's habits.
export const readingHabitsKeys = {
  all: ["reading-habits"] as const,
  account: (userId: string) => ["reading-habits", userId] as const,
};
