# OBJ-PROG — Reading progress & read counting: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-PROG` |
| Name | Reading progress (position, completion, continue reading) and read counting (deduplicated reads) |
| Business purpose | Bring a signed-in reader back to where they stopped. Count genuine reads (guests and members) for stats and rankings without inflating them on refresh. |
| User goals | "Continue where I left off". Authors: trustworthy read counts. |
| Actors / roles | Member (progress + reads), Guest (reads only, via an anonymous id), System jobs (pg_cron `aggregate_reads` every minute, `purge_read_events` daily) |
| Related entities | `user_chapter_progress`, `user_story_progress`, `chapter_read_events`, `chapter_stats.reads`, `story_stats.reads`; RPCs `save_reading_progress`, `record_chapter_read`, `aggregate_reads`, `purge_read_events`; localStorage `storynest.anonymousReaderId` |
| Dependencies | OBJ-READ (tracker mounted in SCR-READ-01, block anchors), OBJ-STORY (published list, CTA), OBJ-LIB (library "Reading" tab reads `user_story_progress`, `BR-LIB-*`), OBJ-RANK / OBJ-STAT / OBJ-REC (consume read events and counters), OBJ-JOB (cron) |
| Screens | None of its own: [SCR-READ-01](../chapter-reader/screens/chapter-reader.md), [SCR-STORY-01](../story/screens/story-page.md), SCR-LIB-01 |

### Rule index

| ID | Name | Status |
| --- | --- | --- |
| [BR-PROG-001](#br-prog-001--progress-is-for-signed-in-readers-only) | Progress is for signed-in readers only | Verified |
| [BR-PROG-002](#br-prog-002--position-model) | Position model | Verified |
| [BR-PROG-003](#br-prog-003--server-validates-every-save) | Server validates every save | Verified |
| [BR-PROG-004](#br-prog-004--completion-is-sticky) | Completion is sticky | Verified |
| [BR-PROG-005](#br-prog-005--story-pointer--last-opened-chapter) | Story pointer = last opened chapter | Verified |
| [BR-PROG-006](#br-prog-006--write-throttling-and-flush) | Write throttling and flush | Verified |
| [BR-PROG-007](#br-prog-007--restore-on-open) | Restore on open | Verified |
| [BR-PROG-008](#br-prog-008--continue-reading-target) | Continue reading target | Verified |
| [BR-PROG-009](#br-prog-009--progress-privacy-and-deletion) | Progress privacy and deletion | Verified |
| [BR-PROG-010](#br-prog-010--read-unit-and-dedupe) | Read unit and dedupe | Verified |
| [BR-PROG-011](#br-prog-011--read-eligibility) | Read eligibility | Verified |
| [BR-PROG-012](#br-prog-012--client-dwell-before-a-read-is-reported) | Client dwell before a read is reported | Verified |
| [BR-PROG-013](#br-prog-013--anonymous-reader-id) | Anonymous reader id | Verified |
| [BR-PROG-014](#br-prog-014--read-aggregation) | Read aggregation | Verified |
| [BR-PROG-015](#br-prog-015--retention-and-account-deletion) | Retention and account deletion | Verified |

---

### BR-PROG-001 — Progress is for signed-in readers only
| Field | Value |
| --- | --- |
| Description | Only authenticated users have saved positions and a "continue" pointer. |
| Preconditions | — |
| Conditions | `auth.status === 'authenticated'` |
| Expected behavior | Guests: no progress query, no write, no restore, "Start reading" only. The RPC is granted only to `authenticated` and raises 42501 without `auth.uid()`. |
| Exceptions | Guests still count as reads (BR-PROG-010). Guest progress is not kept locally (proposal F-PROG-04). |
| Related screens | SCR-READ-01, SCR-STORY-01 |
| Evidence | `packages/features/src/progress/hooks/use-progress.ts:10-32`, `packages/features/src/progress/hooks/use-reading-tracker.ts:58`, `supabase/migrations/20261104000000_save_reading_progress.sql:32-34,69-70`, `packages/features/src/progress/progress.test.tsx:238` |
| Status | Verified |

### BR-PROG-002 — Position model
| Field | Value |
| --- | --- |
| Description | A position = (`lastBlockId`, `percent`). The block is the last one whose top edge has passed 30 % of the viewport height. The percent is the **document** scroll ratio, 0..100 with one decimal. |
| Preconditions | Member in the reader. |
| Conditions | No block above the line → `lastBlockId = null`. Page not scrollable → percent 0. |
| Expected behavior | Measured on open and on every animation frame after a scroll. |
| Exceptions | Because the percent is measured over the whole page (comments, vote, nav included), it does not equal "share of chapter text read" (F-PROG-01). |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/progress/hooks/use-reading-tracker.ts:19-28,76-88`, `packages/features/src/progress/model/progress.ts:24-45,61-76`, `packages/ui/src/widgets/reading-progress.tsx:7-12` |
| Status | Verified |

### BR-PROG-003 — Server validates every save
| Field | Value |
| --- | --- |
| Description | `save_reading_progress(chapter, percent, block?)` decides what the position refers to. |
| Preconditions | Authenticated. |
| Conditions | Chapter not `published`, deleted or not readable by RLS → **PT404** (existence not revealed). Percent null or outside 0..100 → **22023**. |
| Expected behavior | `last_version_id` = the chapter's **current** published version (the client cannot choose). `last_block_id` is stored only if that block belongs to that version, otherwise NULL. One transaction upserts both `user_chapter_progress` and `user_story_progress`. Runs as SECURITY INVOKER, so RLS applies (own rows; `can_read_chapter` / `can_read_story` on write). |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261104000000_save_reading_progress.sql:1-67`, `supabase/migrations/20261103000100_auth_and_rls.sql:336-341`, `supabase/tests/60_progress.test.sql:50-110` |
| Status | Verified (SQL test) |

### BR-PROG-004 — Completion is sticky
| Field | Value |
| --- | --- |
| Description | A chapter is *completed* when a save has `percent ≥ 95`. `completed_at` is set once and never cleared by later, lower saves. |
| Preconditions | — |
| Conditions | `c_completed_percent = 95` (SQL) = `READING_COMPLETED_PERCENT` (client). |
| Expected behavior | Completed chapters reopen at the top (BR-PROG-007) and make "continue" point to the next chapter (BR-PROG-008). |
| Exceptions | See F-PROG-01: 95 % of the page may never be reached. |
| Related screens | SCR-READ-01, SCR-STORY-01 |
| Evidence | `supabase/migrations/20261104000000_save_reading_progress.sql:10,26,55,60`, `packages/features/src/progress/model/progress.ts:1-2`, `supabase/tests/60_progress.test.sql:76`, `packages/features/src/progress/progress.test.tsx:30` |
| Status | Verified |

### BR-PROG-005 — Story pointer = last opened chapter
| Field | Value |
| --- | --- |
| Description | Every save sets `user_story_progress.current_chapter_id` to the saved chapter and updates `last_read_at`. |
| Preconditions | — |
| Conditions | The tracker saves immediately when a chapter opens ("opening a chapter already makes it the current one"). |
| Expected behavior | The pointer is the **most recently opened** chapter, not the furthest one. Re-opening an earlier chapter moves it back (Q-PROG-01). Library "Reading" sorts by `last_read_at` (`BR-LIB-007`). |
| Exceptions | — |
| Related screens | SCR-READ-01, SCR-STORY-01, SCR-LIB-01 |
| Evidence | `supabase/migrations/20261104000000_save_reading_progress.sql:63-66`, `packages/features/src/progress/hooks/use-reading-tracker.ts:88`, `supabase/tests/60_progress.test.sql:91`, `packages/features/src/library/api/library.api.ts:19-34` |
| Status | Verified |

### BR-PROG-006 — Write throttling and flush
| Field | Value |
| --- | --- |
| Description | While scrolling, at most one write per **5 s**: a leading write, then one trailing write with the newest position. The same position is never written twice. |
| Preconditions | Member in the reader; the saved progress query has settled (success or error). |
| Conditions | Tab hidden, `pagehide`, or the tracker unmounting (navigating to another chapter or away). |
| Expected behavior | Pending position flushed immediately. A failed write keeps the last-saved marker unchanged, so the next push retries. Failures never interrupt reading. |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/progress/model/progress-writer.ts:12-68`, `packages/features/src/progress/model/progress.ts:4-5`, `packages/features/src/progress/hooks/use-reading-tracker.ts:58,65-100`, `packages/features/src/progress/progress.test.tsx:84-129,302` |
| Status | Verified |

### BR-PROG-007 — Restore on open
| Field | Value |
| --- | --- |
| Description | When a member opens a chapter, the saved position is restored before anything is written. |
| Preconditions | Authenticated; the progress query is resolved (`staleTime 0`, `gcTime 0`: always fresh). |
| Conditions | Restore only if: no URL hash **and** the chapter is not completed **and** (`lastBlockId` set or percent > 0). |
| Expected behavior | Scroll to the saved block (`scrollIntoView start`). If the block no longer exists (republished), fall back to percent × scrollable height. |
| Exceptions | A deep-link hash wins (BR-READ-007). A completed chapter opens at the top. Layout shifts from late-loading images may offset the restore (WBS 2.5 "not verified"). |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/progress/model/progress.ts:31-35`, `packages/features/src/progress/hooks/use-reading-tracker.ts:30-39,65-70`, `packages/features/src/progress/hooks/use-progress.ts:10-21`, `packages/features/src/progress/progress.test.tsx:257,267` |
| Status | Verified |

### BR-PROG-008 — Continue reading target
| Field | Value |
| --- | --- |
| Description | On the story page, the continue target is computed from `user_story_progress.current_chapter_id`, that chapter's `completed_at`, and the published chapter list. |
| Preconditions | Member. Story progress and chapter list loaded. |
| Conditions | No progress → none. Current chapter not in the published list (archived, unpublished, deleted) → none. Current not completed → **that chapter**. Completed → **the next published chapter**, or none if it was the last. |
| Expected behavior | Target found → CTA "Continue reading · Chapter N" (vi "Đọc tiếp · Chương N"). None → "Start reading" (BR-STORY-012). |
| Exceptions | The library computes its "Continue with chapter N" differently: always the current chapter (F-PROG-02). The cache key is not user-scoped (F-PROG-03). |
| Related screens | SCR-STORY-01, SCR-LIB-01 |
| Evidence | `packages/features/src/progress/model/progress.ts:47-59`, `packages/features/src/progress/api/progress.api.ts:39-53`, `packages/features/src/story/screens/story-screen.tsx:61-66,107`, `packages/features/src/progress/strings.en.ts:2`, `packages/features/src/story/story.test.tsx:352-369` |
| Status | Verified |

### BR-PROG-009 — Progress privacy and deletion
| Field | Value |
| --- | --- |
| Description | Progress rows are strictly private: each user reads and writes only their own rows. |
| Preconditions | — |
| Conditions | RLS `FOR ALL USING (user_id = auth.uid())`. Inserts also need `can_read_story` / `can_read_chapter`. |
| Expected behavior | Other users (and anon) see nothing. A user may delete their own rows. The library's "remove from Reading" deletes `user_story_progress` only (`BR-LIB-011`). |
| Exceptions | — |
| Related screens | SCR-LIB-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:330-341`, `supabase/tests/60_progress.test.sql:112-116`, `packages/features/src/library/api/library.api.ts:64-66`, `packages/features/src/progress/keys.ts:1` (never prefetched on the server) |
| Status | Verified (SQL test) |

### BR-PROG-010 — Read unit and dedupe
| Field | Value |
| --- | --- |
| Description | A **read** = one reader × one chapter × one UTC day. |
| Preconditions | — |
| Conditions | Reader = `auth.uid()` when signed in (any `p_anon_id` is ignored), otherwise the anonymous id. |
| Expected behavior | `record_chapter_read` inserts an event `ON CONFLICT (chapter_id, reader_id, read_day) DO NOTHING` and returns `true` only when a new read was counted. Refreshing or reopening the same day never adds a read. The next UTC day counts again. |
| Exceptions | Reads by the author or team count too (no exclusion, Q-PROG-02). |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261104000100_chapter_reads.sql:7-11,22-34,41-69`, `supabase/tests/70_reads.test.sql:60-83`, `packages/features/src/progress/api/progress.api.ts:55-71` |
| Status | Verified (SQL test; WBS 2.6 runtime) |

### BR-PROG-011 — Read eligibility
| Field | Value |
| --- | --- |
| Description | Only chapters the caller could read are counted. |
| Preconditions | — |
| Conditions | The chapter must be `published`, not deleted, and `can_read_chapter` true → otherwise **PT404**. Neither a user nor an anon id → **22023**. |
| Expected behavior | Granted to `anon` and `authenticated`. The events table itself has RLS enabled with no policies or grants (reachable only through the functions). |
| Exceptions | Known limitation: anon ids are client-chosen, so a script can inflate reads (accepted, sql:13-14). |
| Related screens | — |
| Evidence | `supabase/migrations/20261104000100_chapter_reads.sql:13-17,38-39,50-62,117-120`, `supabase/tests/70_reads.test.sql:42-58` |
| Status | Verified (SQL test) |

### BR-PROG-012 — Client dwell before a read is reported
| Field | Value |
| --- | --- |
| Description | The client reports a read only after the chapter has been on screen for **10 s with the tab visible**. |
| Preconditions | Session status known (not `loading`), so a member is never first counted as a guest. |
| Conditions | Hiding the tab cancels the timer, and becoming visible restarts it from zero. Leaving the chapter before 10 s → no report. |
| Expected behavior | One report per reader+chapter per page session (in-memory set). A failed report is forgotten so a later visit can retry. Errors never surface. |
| Exceptions | Server dedupe (BR-PROG-010) still applies across reloads. |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/progress/hooks/use-read-recorder.ts:10-48`, `packages/features/src/progress/model/progress.ts:7-8`, `packages/features/src/progress/reads.test.tsx:93-185` |
| Status | Verified |

### BR-PROG-013 — Anonymous reader id
| Field | Value |
| --- | --- |
| Description | A random UUID identifying a **browser**, not a person, stored in localStorage `storynest.anonymousReaderId`. It is sent only for guests. |
| Preconditions | Guest. |
| Conditions | Stored value not a UUID → replaced. Storage blocked → in-memory for the page (that guest may be counted again on the next visit). |
| Expected behavior | Stable across reloads on the same browser. No cookie and no server issuance (WBS 2.6 chose localStorage over the cookie in the WP title). |
| Exceptions | Not merged with the account when the guest signs in. |
| Related screens | — |
| Evidence | `packages/features/src/progress/model/anonymous-reader.ts:1-25`, `packages/features/src/progress/reads.test.tsx:20-42`, WBS 2.6 "Đã làm" note |
| Status | Verified |

### BR-PROG-014 — Read aggregation
| Field | Value |
| --- | --- |
| Description | Read counters are **never** written per request. `aggregate_reads` (pg_cron every minute, service_role) folds unaggregated events into `chapter_stats.reads` and `story_stats.reads` in one statement and marks them `aggregated_at`. |
| Preconditions | pg_cron present (otherwise a NOTICE tells ops to schedule externally). |
| Conditions | Batch ≤ 5000, `FOR UPDATE SKIP LOCKED`. |
| Expected behavior | A re-run adds nothing (idempotent). Overlapping runs take different batches. Displayed reads therefore lag by up to about 1 minute. |
| Exceptions | `reads` is **not** part of `reconcile_counters` / `counter_drift` (WBS 4.8 "Chưa làm"). Rankings and author stats read the events and counters (`BR-RANK-*`, `BR-STAT-*`). |
| Related screens | SCR-STORY-01 (Reads stat) |
| Evidence | `supabase/migrations/20261104000100_chapter_reads.sql:71-103,122-131`, `supabase/tests/70_reads.test.sql:76-101`, `supabase/migrations/20261104001200_counter_unification.sql:95-140`, WBS 4.8 note |
| Status | Verified (SQL test) |

### BR-PROG-015 — Retention and account deletion
| Field | Value |
| --- | --- |
| Description | Aggregated read events older than 90 days are purged daily (03:41 UTC). Pending events are kept whatever their age. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | `reader_id` has no FK to `app_users`, so events (and the counts) survive account anonymisation or deletion. Progress rows cascade-delete with the user, the story or the chapter (FKs `ON DELETE CASCADE`). |
| Exceptions | — |
| Related screens | — |
| Evidence | `supabase/migrations/20261104000100_chapter_reads.sql:26-28,105-115,130`, `supabase/migrations/20261103000000_init_schema.sql:258-280`, `supabase/tests/70_reads.test.sql:104` |
| Status | Verified |
