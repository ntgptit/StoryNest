// TanStack Query keys. Always build keys here so invalidation stays consistent.
export const announcementsKeys = {
  all: ["announcements"] as const,
  active: (kind: string, locale: string) => ["announcements", "active", kind, locale] as const,
  /** The moderator's full list; the account is part of the key so another account never sees it from cache. */
  manage: (userId: string) => ["announcements", "manage", userId] as const,
};
