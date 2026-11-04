// TanStack Query keys of the notifications feature (private, per-user). The user is part of every key, so signing out and
// in as someone else can never show the previous account's notifications.
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (userId: string) => ["notifications", "list", userId] as const,
  unread: (userId: string) => ["notifications", "unread", userId] as const,
};
