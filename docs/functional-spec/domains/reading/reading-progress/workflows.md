# OBJ-PROG — Workflows

| ID | Name | Status |
| --- | --- | --- |
| [WF-PROG-01](#wf-prog-01--save-progress-while-reading) | Save progress while reading | Verified |
| [WF-PROG-02](#wf-prog-02--restore-position-on-reopen) | Restore position on reopen | Verified |
| [WF-PROG-03](#wf-prog-03--continue-reading) | Continue reading (story page / library) | Verified |
| [WF-PROG-04](#wf-prog-04--count-a-read) | Count a read (guest or member) | Verified |
| [WF-PROG-05](#wf-prog-05--aggregate-and-purge-read-events-system) | Aggregate and purge read events (system) | Verified |

---

### WF-PROG-01 — Save progress while reading
| Field | Value |
| --- | --- |
| User goal | Not lose my place. |
| Trigger | A member opens a chapter, scrolls, hides the tab, or leaves the chapter. |
| Preconditions | Authenticated. The chapter is readable and published. |
| Main flow | 1. The tracker waits for the saved-progress query to settle (BR-PROG-007 runs first). 2. It measures the position on open and saves it immediately (leading write), which makes this chapter the story's current chapter (BR-PROG-005). 3. On scroll (rAF) it pushes positions; at most one write per 5 s, the newest wins, duplicates are skipped (BR-PROG-006). 4. The RPC validates and stores the version and block (BR-PROG-003), and completion at ≥ 95 % (BR-PROG-004). 5. On tab hide, `pagehide` or unmount, the pending position is flushed. |
| Alternative flows | Block not in the current version → stored as NULL, percent kept. |
| Exception flows | RPC error (network, PT404) → ignored, retried on the next push. Reading is never interrupted. |
| Success criteria | After a reload the reader is back at the same block (WBS 2.5 runtime: 238→228 px). |
| Postconditions | `user_chapter_progress` and `user_story_progress` upserted. |
| Affected objects | OBJ-PROG, OBJ-READ |
| Related screens | SCR-READ-01 |
| Status | Verified (`progress.test.tsx:220-320`, `60_progress.test.sql`) |

### WF-PROG-02 — Restore position on reopen
| Field | Value |
| --- | --- |
| User goal | Reopen a chapter where I stopped. |
| Trigger | A member opens a chapter they have progress in. |
| Preconditions | Authenticated. Progress exists, the chapter is not completed, the URL has no hash. |
| Main flow | 1. Fresh progress fetch (`staleTime 0`). 2. If the saved block exists in the DOM → scroll it to the top; otherwise scroll to the saved percent. 3. Saving then resumes (WF-PROG-01) without overwriting the restored position with "top of page". |
| Alternative flows | Completed chapter → opens at the top. Deep link `#b-…` / `#comments` → the hash wins. Progress query error → no restore, saving still starts. |
| Exception flows | — |
| Success criteria | The visible block equals the saved block (± layout shifts). |
| Postconditions | — |
| Affected objects | OBJ-PROG |
| Related screens | SCR-READ-01 |
| Status | Verified (`progress.test.tsx:257-300`) |

### WF-PROG-03 — Continue reading
| Field | Value |
| --- | --- |
| User goal | Resume a story in one tap. |
| Trigger | A member opens SCR-STORY-01 or the library "Reading" tab (SCR-LIB-01). |
| Preconditions | Authenticated. |
| Main flow | **Story page**: 1. `getStoryProgress` reads `current_chapter_id`, then that chapter's `completed_at`. 2. `resolveContinueChapter` picks the current chapter, or the next one if completed (BR-PROG-008). 3. The CTA shows "Continue reading · Chapter N" → SCR-READ-01, which restores the position (WF-PROG-02). **Library**: the "Reading" list (sorted by `last_read_at`) shows "Continue with chapter N" → current chapter (owned by `BR-LIB-*`). |
| Alternative flows | No progress, the chapter is gone, or the last chapter is finished → "Start reading". |
| Exception flows | Progress query error → "Start reading". |
| Success criteria | One tap lands at the right chapter and position. |
| Postconditions | — |
| Affected objects | OBJ-PROG, OBJ-STORY, OBJ-LIB |
| Related screens | SCR-STORY-01, SCR-LIB-01 → SCR-READ-01 |
| Status | Verified. Inconsistency between the two entry points: F-PROG-02 |

### WF-PROG-04 — Count a read
| Field | Value |
| --- | --- |
| User goal | (Author / platform) Reads reflect real readers. |
| Trigger | A chapter stays open and visible for 10 s. |
| Preconditions | Session state known. The chapter is readable. |
| Main flow | 1. `useReadRecorder` starts a 10 s timer while `visibilityState === 'visible'` (BR-PROG-012). 2. On expiry: a guest gets or creates the anonymous id (BR-PROG-013); a member sends none. 3. `record_chapter_read` inserts the event, deduplicated per reader × chapter × UTC day (BR-PROG-010). 4. The key is remembered for this page session. |
| Alternative flows | Tab hidden → timer reset. Leave before 10 s → nothing sent. Same chapter again in this page session → nothing sent. |
| Exception flows | RPC error → forgotten, so a later visit retries. PT404 for an unreadable chapter. |
| Success criteria | Refresh does not add reads. A new day does. |
| Postconditions | One `chapter_read_events` row (pending aggregation). |
| Affected objects | OBJ-PROG |
| Related screens | SCR-READ-01 |
| Status | Verified (`reads.test.tsx`, `70_reads.test.sql`; WBS 2.6 runtime) |

### WF-PROG-05 — Aggregate and purge read events (system)
| Field | Value |
| --- | --- |
| User goal | (System) Keep counters current and the events table small. |
| Trigger | pg_cron `storynest-aggregate-reads` every minute; `storynest-purge-read-events` daily at 03:41. |
| Preconditions | pg_cron available (otherwise an external runner is required). |
| Main flow | 1. Lock up to 5000 pending events (`SKIP LOCKED`). 2. Mark them aggregated and add per-chapter and per-story counts to `chapter_stats.reads` / `story_stats.reads` in the same statement. 3. Daily: delete aggregated events older than 90 days. |
| Alternative flows | Overlapping runs process disjoint batches. |
| Exception flows | Job failure → events stay pending and are counted on the next run (no loss). |
| Success criteria | The counters equal the number of aggregated events. Nothing is counted twice. |
| Postconditions | Updated counters. Ranking materialised views pick them up on their own schedule (`BR-RANK-*`). |
| Affected objects | OBJ-PROG, OBJ-RANK, OBJ-STAT, OBJ-JOB |
| Related screens | SCR-STORY-01 (Reads), discovery and analytics screens |
| Status | Verified (SQL test) |
