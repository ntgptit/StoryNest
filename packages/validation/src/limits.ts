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
  announcementTitle: 80,
  announcementBody: 280,
  announcementLink: 500,
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

// Audience insights (the author-only aggregate RPCs of batch 4). Mirrors the constants in the migrations: the server
// refuses anything outside them with 22023, and suppresses groups under `minGroupSize` readers.
export const AUDIENCE_LIMITS = {
  /** author_story_daily_range: the range must lie in the last 90 days (read events are purged after that). */
  maxRangeDays: 90,
  /** author_reader_cohorts: weeks of cohorts. */
  maxCohortWeeks: 12,
  /** Cohorts / read sources under this many readers come back without counts. */
  minGroupSize: 5,
  /** author_comment_terms: months and terms per month. */
  maxTermMonths: 12,
  maxTermsPerMonth: 50,
  /** A term must come from at least this many different commenters. */
  minTermCommenters: 2,
} as const;

// Public trends of batch 4 (ranking_history, trending_searches).
export const TREND_LIMITS = {
  maxHistoryDays: 30,
  maxHistoryStories: 20,
  maxTrendingTerms: 20,
  /** A search term needs this many different searchers in a 7-day window to be listed. */
  minTrendingSearchers: 3,
  /** Same bounds as search_prepare: normalised query length. */
  searchQuery: { min: 3, max: 100 },
} as const;

/** Lower edges (words) of the Discover length buckets of story_length_histogram; the last bucket is open-ended. */
export const STORY_LENGTH_EDGES = [0, 2_000, 10_000, 30_000, 60_000, 100_000, 200_000, 400_000] as const;
// Limits a server function enforces (CHECKs or abuse_limits defaults); the client checks them first for a quick answer.
export const SERVER_LIMITS = {
  /** Longest highlight range, in UTF-16 code units (chapter_highlights CHECK). */
  highlightLength: 2_000,
  /** Star rating range (story_ratings CHECK). */
  ratingMin: 1,
  ratingMax: 5,
  /** People one comment can notify by @mention (abuse_limits.comment_max_mentions default). */
  mentionsPerComment: 10,
} as const;
