// TanStack Query keys of the settings feature. The account is part of the key, so an account switch never shows
// the previous account's settings.
export const settingsKeys = {
  all: ["settings"] as const,
  account: (userId: string) => ["settings", "account", userId] as const,
  language: (userId: string) => ["settings", "language", userId] as const,
  notificationTypes: (userId: string) => ["settings", "notificationTypes", userId] as const,
};
