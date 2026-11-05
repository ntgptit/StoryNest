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
| Code | `packages/features/src/analytics/{api/analytics.api.ts,hooks/use-analytics.ts,model/stats.ts,components/daily-chart.tsx,components/reads-heatmap.tsx,screens/story-stats-screen.tsx,keys.ts}`; `packages/ui/src/widgets/{synced-small-multiples,calendar-heatmap,funnel-steps,scatter-picker,rolling-number}.tsx`; `supabase/migrations/20261104002100_author_stats.sql` |
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
| BR-STAT-011 | Read-through funnel | Verified |
| BR-STAT-012 | Publish-day flags | Verified |
| BR-STAT-013 | Reads heatmap (last 90 days) | Verified |
| BR-STAT-014 | Zooming the daily charts | Verified |
| BR-STAT-015 | Chapters compared (scatter) | Verified |
| BR-STAT-016 | Custom date range | Verified (local PostgreSQL only) |
| BR-STAT-017 | Weekly reader cohorts | Verified (local PostgreSQL only) |
| BR-STAT-018 | Signed-in versus guest reads | Verified (local PostgreSQL only) |
| BR-STAT-019 | What readers say (comment terms) | Verified (local PostgreSQL only) |
| BR-STAT-020 | Where readers come from | Verified (local PostgreSQL only) |

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
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:25-63`; `packages/features/src/analytics/model/stats.ts:51-63`; `packages/features/src/analytics/screens/story-stats-screen.tsx:182-237` |
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
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:59-62`; `packages/features/src/analytics/model/stats.ts:88-93`; `packages/features/src/analytics/analytics.test.tsx:106` |
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
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:68-120`; `packages/features/src/analytics/model/stats.ts:42-46`; `packages/features/src/analytics/screens/story-stats-screen.tsx:56-58,108-122`; `packages/features/src/analytics/analytics.test.tsx:491` |
| Status | Verified |

### BR-STAT-005 — Totals of the selected range
| Field | Value |
| --- | --- |
| Description | "In the selected range": Reads, New likes, New comments = sums of the daily series |
| Preconditions | Daily series loaded |
| Conditions | Not derived from the per-chapter table (which is all-time) |
| Expected behavior | Locale-formatted numbers (`formatCount`). On a range switch each tile's digits roll to the new range's total (shared `RollingNumber` widget; Lucian 047/098), never on first load, and they jump with reduced motion; the rolling digits are `aria-hidden` and screen readers read the formatted number once |
| Exceptions | — |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/model/stats.ts:81-86`; `packages/features/src/analytics/screens/story-stats-screen.tsx:62,108-125` |
| Status | Verified |

### BR-STAT-006 — Freshness and history limits
| Field | Value |
| --- | --- |
| Description | Daily reads exist only for the last 90 days (read events are purged after counting); the series counts a read at once, `chapter_stats` up to about a minute later (aggregation job) |
| Preconditions | — |
| Conditions | Screen note: "Daily reads are only available for the last 90 days. Days are in UTC." (the note now continues with chart-interaction hints; changed by PR #60) |
| Expected behavior | Per-chapter and daily numbers may briefly disagree |
| Exceptions | No export, no per-chapter-per-day breakdown (WBS 6.5 "Chưa làm") |
| Related screens | SCR-STAT-01 |
| Evidence | `supabase/migrations/20261104002100_author_stats.sql:13-18`; `packages/features/src/analytics/strings.en.ts:27`; `docs/WBS.md` WP 6.5 |
| Status | Documented |

### BR-STAT-007 — Error handling on the stats screen
| Field | Value |
| --- | --- |
| Description | Errors are classified once for the three requests (chapters, then the selected daily series, then the 90-day heatmap series) |
| Preconditions | — |
| Conditions | forbidden → "You can't view these statistics" / "Only the story owner and co-authors can view statistics."; notFound → "Story not found" / "The story doesn't exist or you don't manage it."; anything else → "Couldn't load statistics" + "Try again" (refetch all three). Requests are not retried automatically |
| Expected behavior | Header and "Back to Studio" stay visible on the generic error; not on forbidden/notFound |
| Exceptions | A non-UUID id gives the generic error instead of not-found (F-STM-06, Inferred) |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/screens/story-stats-screen.tsx:54-60,77-86`; `packages/features/src/analytics/hooks/use-analytics.ts:23,34`; `packages/features/src/analytics/analytics.test.tsx:536,544` |
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
| Description | Three small multiples (Reads, Likes, Comments: the three series `author_story_daily` returns) on one day axis. Before drawing, `alignDaily` puts the points on one sorted, gap-free UTC axis (a duplicate day is added up, a missing day is 0, a malformed day is dropped), so index i is the same day in every chart. Each chart has its own scale: bar height = value ÷ that series' busiest day, a non-zero value at least 2% tall, zero empty; a dashed line marks the series' mean over the range. A shared cursor (pointer, touch, ←/→/Home/End/Esc on a focused chart) shows that day's value and the change from the day before in every chart and announces the day in a polite live region; with no cursor the latest day is shown. The figure's caption is the text summary ("30-day chart: n reads, n likes, n comments"); a "Show as table" toggle lists the same numbers |
| Preconditions | Daily series loaded |
| Conditions | All-zero range → "No activity in this range yet." instead of a chart. Each chart keeps 90 bar slots (the longest range) counted back from the latest day, so switching ranges morphs the bars that stay instead of replacing them; the previous range stays on screen while the next loads (`placeholderData`). Colours `--chart-1..3` only |
| Expected behavior | No chart library; motion only on a range change, a zoom (BR-STAT-014) or a scatter axis/filter change (BR-STAT-015), never on first render; reduced motion clamps it |
| Exceptions | — (U-STAT-02 resolved) |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/components/daily-chart.tsx`; `packages/ui/src/widgets/synced-small-multiples.tsx`; `packages/features/src/analytics/model/stats.ts` (`alignDaily`, `formatDay`); `packages/features/src/analytics/analytics.test.tsx`; `packages/ui/src/widgets/stats-widgets.test.tsx` |
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
| Evidence | `packages/features/src/analytics/keys.ts:1-7`; `packages/features/src/analytics/analytics.test.tsx:124` |
| Status | Verified |

### BR-STAT-011 — Read-through funnel
| Field | Value |
| --- | --- |
| Description | "Read-through by chapter" answers "where do readers stop?" from the per-chapter rows of BR-STAT-002 only (`readThroughFunnel`, pure). One step per published chapter in reading order (`sort_order`). For step i with reads `r_i` (all-time, one reader × chapter × UTC day): **of first** = `r_i ÷ r_1` (null when `r_1 = 0`); **from previous** = `r_i ÷ r_(i−1)` (the BR-STAT-003 retention; null for step 1 or when `r_(i−1) = 0`); **drop-off** = `1 − from previous` (null when from previous is null; negative = more reads than the chapter before, shown as "+x%", never clamped); **overall** = of first of the last step (null with fewer than 2 chapters or `r_1 = 0`); **biggest drop** = the step with the largest positive drop-off, the earliest on a tie, none when no step loses reads; bar width = `r_i ÷ max r` (≥ 2% when non-zero) |
| Preconditions | BR-STAT-001; chapters loaded |
| Conditions | No published chapter → section hidden; every chapter 0 reads → "No reads yet to draw the funnel."; one chapter → one step and "Only one chapter so far…"; `r_1 = 0` → "Chapter 1 has no reads yet, so there is nothing to compare with." |
| Expected behavior | Steps are labelled as reads, never as readers: the note says a reader counts once per day and that recently published chapters have had less time to collect reads (so a low last step may be recency, not drop-off). Percentages are whole numbers. First 8 steps shown, "Show all n chapters" for the rest |
| Exceptions | Reads, not distinct readers: a reader who reads chapter 1 on two days counts twice, so the funnel is not a cohort and can widen. A unique-reader funnel needs a new RPC (out of scope) |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/model/stats.ts` (`readThroughFunnel`, `formatChange`, `formatPercent`); `packages/features/src/analytics/components/read-through-funnel.tsx`; `packages/ui/src/widgets/funnel-steps.tsx`; `packages/features/src/analytics/analytics.test.tsx` ("read-through funnel") |
| Status | Verified |

### BR-STAT-012 — Publish-day flags
| Field | Value |
| --- | --- |
| Description | The daily charts flag the UTC day each published chapter was **first** published (`chapters.first_published_at`, through the existing story chapter list `listStoryChapters` / `useStoryChapters`, which RLS `chapters_read` lets the owner and co-authors read via `story_role`). Several chapters on one day share one flag ("Chapters 3, 4 published") |
| Preconditions | Chapter list loaded |
| Conditions | Only days inside the range; drafts, scheduled and deleted chapters are not in the list; a chapter unpublished and published again keeps its first date |
| Expected behavior | If the chapter list fails, the chart is drawn without flags (no error shown) |
| Exceptions | The chapter list is cached per story, not per viewer (it is the public list of the story page) |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/model/stats.ts` (`publishedByDay`); `packages/features/src/analytics/screens/story-stats-screen.tsx`; `packages/features/src/story/api/story.api.ts` (`listStoryChapters`); `supabase/migrations/20261103000100_auth_and_rls.sql:103-112,232` |
| Status | Verified |

### BR-STAT-013 — Reads heatmap (last 90 days)
| Field | Value |
| --- | --- |
| Description | "Reads over the last 90 days" lays the reads of `author_story_daily(story, 90)` (90 is the RPC's maximum; the same cached query as the 90-day range) out as weeks × weekdays: one column per week, rows Monday to Sunday, UTC days (`weekColumns`, after `alignDaily`). Shade = `heatLevel`: 0 for no reads, else `ceil(4 × reads ÷ busiest day)` (1–4, `--chart-1` at 25/50/75/100%). The legend lists the whole-number range of each shade that can occur (`heatLegend`); a month label sits above the week where the month starts (the first week gets its own month unless a month starts within the next two weeks) |
| Preconditions | BR-STAT-001; 90-day series loaded |
| Conditions | Independent of the selected range. Every day 0 reads → "No reads in the last 90 days." (likes or comments alone do not draw a heatmap). Only reads are shaded; the picked day's line and each square's accessible name give reads, likes and comments (and "Chapter n published", BR-STAT-012) |
| Expected behavior | Note: squares are UTC days and reads count a reader once per chapter per day, not distinct readers. Keyboard grid with one tab stop; weekly table alternative |
| Exceptions | No per-chapter or per-hour breakdown (the RPC has neither) |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/model/stats.ts` (`heatLevel`, `heatLegend`, `weekColumns`, `weekdayNames`, `formatMonth`, `HEATMAP_DAYS`); `packages/features/src/analytics/components/reads-heatmap.tsx`; `packages/ui/src/widgets/calendar-heatmap.tsx`; `packages/features/src/analytics/analytics.test.tsx` ("reads heatmap model", "ReadsHeatmap") |
| Status | Verified |

### BR-STAT-014 — Zooming the daily charts
| Field | Value |
| --- | --- |
| Description | The shared day axis of the three small multiples can be zoomed to a window of at least 3 days (`MIN_ZOOM_DAYS`): by a mouse/pen drag, by Shift+←/→ then Enter, or by "Zoom in" (half the visible days around the picked day, `zoomInWindow`). Zoomed, each chart's scale and average are computed over the visible days only; the readout's "change from the day before" still uses the real previous day |
| Preconditions | BR-STAT-009; more than 3 days in the range |
| Conditions | A drag on touch scrubs the cursor (BR-STAT-009) and never zooms. A range switch drops the zoom. The table always lists the whole range |
| Expected behavior | Purely a view: nothing is requested and the totals stay those of the selected range |
| Exceptions | — |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/ui/src/widgets/synced-small-multiples.tsx`; `packages/ui/src/widgets/stats-widgets.test.tsx` ("SyncedSmallMultiples zoom") |
| Status | Verified |

### BR-STAT-015 — Chapters compared (scatter)
| Field | Value |
| --- | --- |
| Description | "Chapters compared" plots each published chapter as a dot from the BR-STAT-002 rows only (`chapterScatter`, pure): x = the chapter's all-time reads, y = a choice of **Likes per 100 reads** (`likes ÷ reads × 100`, default) or **Retention** (BR-STAT-003). The axes start at 0 and end at the largest plotted value. The optional filter "Fade chapters under n reads" fades (and makes unpickable) chapters with fewer than `ceil(0.1 × most-read chapter's reads)` reads (`lowReadsThreshold`, `LOW_READS_SHARE`), because their ratios swing a lot |
| Preconditions | BR-STAT-001; chapters loaded |
| Conditions | Section shown only when at least two chapters have reads. Likes per 100 reads leaves out chapters with 0 reads; Retention leaves out chapter 1 and any chapter after one with 0 reads; the summary says how many are left out. No filter when the threshold would be 1 read or less, or no plotted chapter is under it. Nothing plottable on the chosen axis → "No chapter can be plotted on this axis yet." |
| Expected behavior | Labelled as reads, never readers (note). Pressing a dot shows "Chapter n · title: n reads, n likes, <axis> <value>." in a polite live region. Switching the axis or toggling the filter is purely a view: nothing is requested, the dots glide to their new places (never on first render; reduced motion jumps) |
| Exceptions | Reads, not distinct readers, so likes per 100 reads is not a share of readers who liked |
| Related screens | SCR-STAT-01 |
| Evidence | `packages/features/src/analytics/model/stats.ts` (`chapterScatter`, `lowReadsThreshold`); `packages/features/src/analytics/components/chapter-scatter.tsx`; `packages/ui/src/widgets/scatter-picker.tsx` (Lucian #155); `packages/features/src/analytics/analytics.test.tsx` ("chapter scatter model", "ChapterScatter"); `packages/ui/src/widgets/stats-widgets.test.tsx` ("ScatterPicker") |
| Status | Verified |

### BR-STAT-016 — Custom date range
| Field | Value |
| --- | --- |
| Description | Besides 7/30/90 days, the range tabs offer **Custom**: a month calendar (Lucian #030) picks a first and a last UTC day; Apply replaces the preset for the totals (BR-STAT-005) and the daily charts (BR-STAT-009). Served by `author_story_daily_range(story_id, from, to)`, same rows and rules as `author_story_daily` |
| Preconditions | BR-STAT-001 |
| Conditions | from ≤ to, both inside the last 90 UTC days (today included), at most 90 days: days outside are disabled in the calendar and refused by the RPC (22023), because daily reads are purged after 90 days and an older day would show reads as 0. The heatmap stays on 90 days; the cohorts, split and sources use 90 days while a custom range is on |
| Expected behavior | The band follows the pointer or the arrow keys between the two picks; months slide sideways only when changed; the applied range shows as a link ("from – to (n days)") that reopens the calendar. A preset tab clears the custom range |
| Exceptions | Not persisted (local state, like the preset) |
| Related screens | SCR-STAT-01 |
| Evidence | `supabase/migrations/20261106030000_author_story_daily_range.sql` (also `private.story_audience_gate`, the owner/co-author rule shared by BR-STAT-016..020); `supabase/tests/450_audience_insights.test.sql`; `packages/ui/src/widgets/date-range-calendar.tsx`; `packages/features/src/analytics/model/insights.ts` (`rangeBounds`, `isValidRange`); `analytics/hooks/use-analytics.ts` (`useDailySeries`). Rollback: `DROP FUNCTION public.author_story_daily_range(uuid, date, date); DROP FUNCTION private.story_audience_gate(uuid);` (after the later insight functions) |
| Status | Verified on local PostgreSQL with the Supabase shim; not run against a Supabase project |

### BR-STAT-017 — Weekly reader cohorts
| Field | Value |
| --- | --- |
| Description | A cohort table (Lucian #161): one row per ISO week (Monday, UTC) of the last 8 weeks holding the readers who first read the story that week, one column per week after, each cell the share of the cohort that read any chapter that week. `author_reader_cohorts(story_id, weeks 1..12)` returns only counts per (cohort week, offset) |
| Preconditions | BR-STAT-001 |
| Conditions | A reader is one `chapter_read_events.reader_id` (an account, or one anonymous browser id). "First read" = first read still kept (events are purged after 90 days), computed over all kept events, so a reader from before the window is never new inside it. **Cohorts of 1–4 readers are suppressed** (NULL counts, `suppressed = true`), drawn as dashed empty cells, so an author cannot follow one known reader week by week; a week nobody started in is a cohort of 0 |
| Expected behavior | Press a cell to read "Started the week of d (n new readers) · k weeks later: p% still reading" in a polite live region; press again to clear. No reader id leaves the database |
| Exceptions | A reader whose real first read is older than 90 days counts as new; a guest on two browsers is two readers |
| Related screens | SCR-STAT-01 |
| Evidence | `20261106030100_reader_cohorts.sql`; `450_audience_insights.test.sql` (section 3b); `packages/ui/src/widgets/cohort-grid.tsx`; `analytics/components/audience-insights.tsx` (`ReaderCohorts`); `AUDIENCE_LIMITS.minGroupSize` in `packages/validation/src/limits.ts`. Rollback: `DROP FUNCTION public.author_reader_cohorts(uuid, integer);` |
| Status | Verified on local PostgreSQL; not run against Supabase |

### BR-STAT-018 — Signed-in versus guest reads
| Field | Value |
| --- | --- |
| Description | A 100-cell waffle chart (Lucian #326) of the reads of the selected window split by `chapter_read_events.is_anonymous`, with the number of distinct accounts and guest browsers. `author_reader_split(story_id, days 1..90)` returns four counts |
| Preconditions | BR-STAT-001 |
| Conditions | Window = the preset days (90 with a custom range). Cells by largest remainder so they add up to 100; no reads → "No reads in this range yet." |
| Expected behavior | On a window change only the cells that change hands flip, along a diagonal (22 ms apart), and the legend percentages roll; never on first render. Press a legend item to keep only that segment in focus |
| Exceptions | Aggregate only; the two read counts add up to the daily reads of the same days |
| Related screens | SCR-STAT-01 |
| Evidence | `20261106030200_reader_split.sql`; `450_audience_insights.test.sql` (3c); `packages/ui/src/widgets/waffle-chart.tsx`. Rollback: `DROP FUNCTION public.author_reader_split(uuid, integer);` |
| Status | Verified on local PostgreSQL; not run against Supabase |

### BR-STAT-019 — What readers say (comment terms)
| Field | Value |
| --- | --- |
| Description | A word cloud per month (Lucian #399) of the last 3 months: the 24 most frequent terms of the story's **visible** comments (status `visible`, not deleted, chapter not deleted), sized by how many comments contain them. `author_comment_terms(story_id, months 1..12, limit 1..50)` tokenises in SQL (`comment_tokens`: NFC, lower-case incl. Vietnamese capitals, split on whitespace / ASCII punctuation / digits, 2–30 characters) and drops the stopwords of `term_stopwords` (Vietnamese and English function words, URL pieces; administrator-editable, not readable by API roles) |
| Preconditions | BR-STAT-001 |
| Conditions | A term is listed only when **at least two different commenters** used it that month, so a word only one person wrote cannot be read back. No comment text, comment id or author id is returned. A word repeated in one comment counts once |
| Expected behavior | Switch month: words that stay glide (FLIP) and resize, new words pop in; press a word for "“term”: n comments · ±k vs last month / new this month" |
| Exceptions | Vietnamese is split by syllable; on a non-UTF-8 test cluster only ASCII is lower-cased (Supabase is UTF-8) |
| Related screens | SCR-STAT-01 |
| Evidence | `20261106030300_comment_terms.sql`; `450_audience_insights.test.sql` (section 4); `packages/ui/src/widgets/word-cloud.tsx`. Rollback: `DROP FUNCTION public.author_comment_terms(uuid, integer, integer); DROP FUNCTION public.comment_tokens(text); DROP TABLE public.term_stopwords;` |
| Status | Verified on local PostgreSQL (SQL_ASCII cluster); the UTF-8 lower-casing path is not exercised by the tests |

### BR-STAT-020 — Where readers come from
| Field | Value |
| --- | --- |
| Description | A three-stage Sankey (Lucian #153): per in-app source of each reader's first read in the window (BR-PROG-016), readers → read on (at least two different chapters in the window) → followed (signed-in readers who follow the story now). `author_read_sources(story_id, days 1..90)` |
| Preconditions | BR-STAT-001, BR-PROG-016 |
| Conditions | Sources with fewer than 5 readers come back with NULL counts (`suppressed`) and are listed only as "n sources … hidden"; reads recorded without a source group as "Unknown" |
| Expected behavior | Press a source to keep only its flow (its dashes march, not under reduced motion) and read "Search: n readers, n read on, n followed (p%)" |
| Exceptions | No referrer or other-site data exists, so there is no "external" channel |
| Related screens | SCR-STAT-01 |
| Evidence | `20261106030700_read_sources.sql`; `450_audience_insights.test.sql` (3d), `490_read_sources.test.sql`; `packages/ui/src/widgets/flow-sankey.tsx`. Rollback: see BR-PROG-016 |
| Status | Verified on local PostgreSQL; not run against Supabase |
