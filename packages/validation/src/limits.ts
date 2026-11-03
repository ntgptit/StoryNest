// Column lengths must equal the varchar limits in the schema (checked against the generated contract).
export const DB_LIMITS = {
  username: { min: 3, max: 30 }, // citext column: enforced by CHECK chk_username, not by a varchar length
  displayName: 100,
  storyTitle: 200,
  storySlug: 120,
  chapterTitle: 200,
  chapterSlug: 120,
  languageCode: 12,
  readingListTitle: 120,
  reportReason: 40,
  commentBody: 10_000,
} as const;

// Application-level guards (the database does not limit these). Tune freely; the server RPC accepts more.
export const APP_LIMITS = {
  bio: 1_000,
  synopsis: 5_000,
  reportDescription: 2_000,
  readingListDescription: 1_000,
  blocksPerChapter: 2_000,
  blockTextLength: 20_000,
  storageKey: 1_024,
} as const;
