# OBJ-STAT — Author analytics: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-STAT` |
| Name | Author analytics (story statistics) |
| Business purpose | Show a story's managers how many people read, like and comment, per day and per chapter, and where readers drop off |
| User goals | See the trend over 7/30/90 days; spot the chapter where readers stop |
| Actors / roles | Owner, co-author (editor excluded) |
| Related entities | RPCs `author_chapter_stats(story)`, `author_story_daily(story, days)`; tables `chapter_stats`, `chapter_read_events`, `chapter_votes`, `comments`, `chapter_versions`; index `idx_chapter_read_events_story_day` |
| Code | `packages/features/src/analytics/{api/analytics.api.ts,hooks/use-analytics.ts,model/stats.ts,components/daily-chart.tsx,screens/story-stats-screen.tsx,keys.ts}`; `supabase/migrations/20261104002100_author_stats.sql` |
| Dependencies | OBJ-PROG (read events / read counting), OBJ-VOTE, OBJ-CMT, OBJ-JOB (stats aggregation job, event purge) |

| Rule | Name | Status |
| --- | --- | --- |
| BR-STAT-001 | Who may see statistics | Verified |
| BR-STAT-002 | Per-chapter figures | Verified |
| BR-STAT-003 | Retention | Verified |
| BR-STAT-004 | Daily series and ranges | Verified |
| BR-STAT-005 | Totals of the selected range | Verified |
| BR-STAT-006 | Freshness and history limits | Documented |
| BR-STAT-007 | Error handling on the stats screen | Verified |
| BR-STAT-008 | Entry point visibility | Verified |
| BR-STAT-009 | Chart drawing | Verified |
| BR-STAT-010 | Figures never cross accounts | Verified |

## 2. Rules

### BR-STAT-001 — Who may see statistics
| Field | Value |
| --- | --- |
| Description | Only the owner and co-authors read a story's figures |
| Preconditions | Signed in |
| Conditions | Not signed in → 42501; no role on the story or story missing → PT404 (existence not revealed); editor → 42501. Story deletion is not checked (figures of a soft-deleted story stay visible to its managers) |
| Expected behavior | — |
| Exceptions | — |
| Related screens | SCR-STAT-01 |
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:10-11,38-48,73-88`; `supabase/tests/270_author_stats.test.sql:121,173` |
| Status | Verified |

### BR-STAT-002 — Per-chapter figures
| Field | Value |
| --- | --- |
| Description | One row per **published, non-deleted** chapter in reading order (`sort_order`, then id) with reads, votes ("Likes") and comments taken from `chapter_stats` — the same counters shown everywhere else |
| Preconditions | BR-STAT-001 |
| Conditions | Title = title of the published version, else the slug; draft, scheduled, archived and deleted chapters are excluded; "Chapter n" = `sort_order` (may have gaps, BR-CHM-011) |
| Expected behavior | Table columns: Chapter, Reads (with relative bar), Likes, Comments, Retention. Empty: "No chapters have been published yet." |
| Exceptions | Rows without id/slug are dropped client-side |
| Related screens | SCR-STAT-01 |
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:25-63`; `packages/features/src/analytics/model/stats.ts:49-61`; `packages/features/src/analytics/screens/story-stats-screen.tsx:138-193` |
| Status | Verified |

### BR-STAT-003 — Retention
| Field | Value |
| --- | --- |
| Description | Retention of a chapter = its reads ÷ reads of the previous published chapter (rounded to 4 decimals); NULL for the first chapter or when the previous one has 0 reads. Drop-off = 1 − retention (WBS 6.5) |
| Preconditions | — |
| Conditions | Displayed as a whole percent; values above 100% are shown as they are; NULL shows "—" |
| Expected behavior | Note under the table: "“Retention” is the chapter's reads compared with the previous chapter." |
| Exceptions | — |
| Related screens | SCR-STAT-01 |
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:59-62`; `packages/features/src/analytics/model/stats.ts:86-91`; `packages/features/src/analytics/analytics.test.tsx:91` |
| Status | Verified |

### BR-STAT-004 — Daily series and ranges
| Field | Value |
| --- | --- |
| Description | One point per UTC day for the last `days` days, today included, zero-filled: reads (from read events), new votes, new **visible** comments |
| Preconditions | BR-STAT-001 |
| Conditions | `days` 1–90 (else 22023). UI ranges 7 / 30 / 90 days, default 30, as tabs "Time range" |
| Expected behavior | Switching a tab requests that window (separately cached per range) |
| Exceptions | A withdrawn vote or a hidden comment leaves the series like it leaves the counters (WBS 6.5) |
| Related screens | SCR-STAT-01 |
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:68-120`; `packages/features/src/analytics/model/stats.ts:42-46`; `packages/features/src/analytics/screens/story-stats-screen.tsx:50-52,92-106`; `packages/features/src/analytics/analytics.test.tsx:252` |
| Status | Verified |

### BR-STAT-005 — Totals of the selected range
| Field | Value |
| --- | --- |
| Description | "In the selected range": Reads, New likes, New comments = sums of the daily series |
| Preconditions | Daily series loaded |
| Conditions | Not derived from the per-chapter table (which is all-time) |
| Expected behavior | Locale-formatted numbers |
| Exceptions | — |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/model/stats.ts:79-84`; `packages/features/src/analytics/screens/story-stats-screen.tsx:62,108-125` |
| Status | Verified |

### BR-STAT-006 — Freshness and history limits
| Field | Value |
| --- | --- |
| Description | Daily reads exist only for the last 90 days (read events are purged after counting); the series counts a read at once, `chapter_stats` up to about a minute later (aggregation job) |
| Preconditions | — |
| Conditions | Screen note: "Daily reads are only available for the last 90 days. Days are in UTC." |
| Expected behavior | Per-chapter and daily numbers may briefly disagree |
| Exceptions | No export, no per-chapter-per-day breakdown (WBS 6.5 "Chưa làm") |
| Related screens | SCR-STAT-01 |
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:13-18`; `packages/features/src/analytics/strings.en.ts:28`; `docs/WBS.md` WP 6.5 |
| Status | Documented |

### BR-STAT-007 — Error handling on the stats screen
| Field | Value |
| --- | --- |
| Description | Errors are classified once for both requests (chapter error first) |
| Preconditions | — |
| Conditions | forbidden → "You can't view these statistics" / "Only the story owner and co-authors can view statistics."; notFound → "Story not found" / "The story doesn't exist or you don't manage it."; anything else → "Couldn't load statistics" + "Try again" (refetch both). Requests are not retried automatically |
| Expected behavior | Header and "Back to Studio" stay visible on the generic error; not on forbidden/notFound |
| Exceptions | A non-UUID id gives the generic error instead of not-found (F-STM-06, Inferred) |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/screens/story-stats-screen.tsx:54-60,77-86`; `packages/features/src/analytics/hooks/use-analytics.ts:23,34`; `packages/features/src/analytics/analytics.test.tsx:276,284` |
| Status | Verified |

### BR-STAT-008 — Entry point visibility
| Field | Value |
| --- | --- |
| Description | "Stats" is offered on Studio rows to owner and co-author only |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Editors reaching the URL directly see the no-access state |
| Exceptions | — |
| Related screens | SCR-STM-01, SCR-STAT-01 |
| Evidence | `packages/features/src/studio/screens/studio-screen.tsx:83-91` |
| Status | Verified |

### BR-STAT-009 — Chart drawing
| Field | Value |
| --- | --- |
| Description | One bar per day, height = reads relative to the busiest day; a non-zero value is at least 2% tall; zero is empty; the whole chart is one `role="img"` with a text summary ("30-day chart: n reads, n likes, n comments"); per-day value only in a `title` tooltip |
| Preconditions | Daily series loaded |
| Conditions | All-zero range → "No activity in this range yet." instead of a chart |
| Expected behavior | No chart library |
| Exceptions | Per-day values not reachable by keyboard/touch/screen reader (U-STAT-02) |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/components/daily-chart.tsx:10-33`; `packages/features/src/analytics/model/stats.ts:92-96`; `packages/features/src/analytics/analytics.test.tsx:100,131,263` |
| Status | Verified |

### BR-STAT-010 — Figures never cross accounts
| Field | Value |
| --- | --- |
| Description | Query keys include the viewer id, so switching account never shows another account's cached figures |
| Preconditions | — |
| Conditions | `["analytics", "chapters"|"daily", userId, storyId, (days)]` |
| Expected behavior | — |
| Exceptions | — |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/keys.ts:1-7`; `packages/features/src/analytics/analytics.test.tsx:109` |
| Status | Verified |
