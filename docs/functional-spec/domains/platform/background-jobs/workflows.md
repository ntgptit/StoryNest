# OBJ-JOB — Background jobs: workflows

Rules: [business-rules.md](business-rules.md). No screens; all actors are system or operator.

## WF-JOB-01 — Outbox event lifecycle
| Field | Value |
| --- | --- |
| User goal | (System) perform a side effect exactly once from the user's point of view |
| Trigger | A producer inserts into `outbox_events` (first publish, comment reply) |
| Preconditions | Producer transaction commits |
| Main flow | 1. Event pending (`available_at = now()`). 2. ≤ 1 min later `process_outbox` locks it (SKIP LOCKED). 3. Handler runs (OBJ-NOTI). 4. `processed_at` set. 5. After 14 days the row is purged |
| Alternative flows | A1. Same `dedupe_key` emitted again → ignored at insert |
| Exception flows | E1. Handler fails → attempts+1, backoff 2/4/8/16 min. E2. 5th failure → dead letter (`failed_at`), kept indefinitely, no alert (F-JOB-02) |
| Success criteria | Each event processed once; retries create no duplicates |
| Postconditions | — |
| Affected objects | OBJ-JOB, OBJ-NOTI |
| Related screens | Notifications (D-COMMUNITY) |
| Status | Verified (`supabase/tests/30_outbox.test.sql`) |

## WF-JOB-02 — Scheduled chapter goes live
| Field | Value |
| --- | --- |
| User goal | Author's scheduled chapter is published at the chosen time |
| Trigger | Cron minute tick |
| Preconditions | Chapter `scheduled`, `scheduled_for <= now()` (BR-EDT-*) |
| Main flow | 1. `publish_due_chapters` takes ≤ 50 due chapters. 2. Publish core per chapter, actor = draft `updated_by`. 3. First publication emits `chapter.published` → WF-JOB-01 → followers notified |
| Alternative flows | — |
| Exception flows | E1. Publish fails (e.g. invalid body) → WARNING, chapter stays `scheduled` in the past, retried every minute indefinitely (F-JOB-01) |
| Success criteria | Published within ~1 minute of `scheduled_for` |
| Postconditions | Story status `ongoing` if it was a draft; stats rows exist |
| Affected objects | OBJ-JOB, OBJ-EDT, OBJ-NOTI |
| Related screens | Chapter editor, chapter manager (D-STUDIO) |
| Status | Verified (`supabase/tests/20_publish.test.sql`) |

## WF-JOB-03 — Read counting pipeline
| Field | Value |
| --- | --- |
| User goal | Read counts reflect real readers without slowing the reader page |
| Trigger | `record_chapter_read` (OBJ-PROG) appends an event; cron minute tick aggregates |
| Preconditions | — |
| Main flow | 1. Event inserted (deduped per reader/chapter/day). 2. `aggregate_reads` marks and sums ≤ 5000 events into chapter/story stats. 3. Daily purge after 90 days |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | No event counted twice or lost |
| Postconditions | Rankings pick up new reads at next refresh |
| Affected objects | OBJ-JOB, OBJ-PROG, OBJ-RANK |
| Related screens | Story page, ranking, author stats |
| Status | Verified (`supabase/tests/70_reads.test.sql`) |

## WF-JOB-04 — Ranking refresh
| Field | Value |
| --- | --- |
| User goal | Rankings stay fresh (≤ 5 min) |
| Trigger | Cron every 5 minutes |
| Preconditions | — |
| Main flow | 1. Advisory lock acquired. 2. `REFRESH MATERIALIZED VIEW CONCURRENTLY story_rankings`. 3. `ranking_state` updated |
| Alternative flows | A1. Previous refresh still running → returns `NULL`, nothing done |
| Exception flows | E1. Refresh error → cron run fails, previous data kept, no alert |
| Success criteria | `ranking_freshness().lag_seconds` ≤ ~300 |
| Postconditions | — |
| Affected objects | OBJ-JOB, OBJ-RANK |
| Related screens | Ranking (D-DISCOVERY) |
| Status | Verified (`supabase/tests/210_rankings.test.sql`) |

## WF-JOB-05 — Nightly maintenance
| Field | Value |
| --- | --- |
| User goal | Keep tables small and counters correct |
| Trigger | 03:17 UTC (`purge_outbox`), 03:41 UTC (`purge_read_events`, `reconcile_counters`) |
| Preconditions | — |
| Main flow | Purge processed outbox (> 14 d), purge aggregated read events (> 90 d), recompute vote/library/comment counters |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | `counter_drift()` empty after the run |
| Postconditions | — |
| Affected objects | OBJ-JOB |
| Related screens | — |
| Status | Verified |

## WF-JOB-06 — Re-queue a dead-lettered event (operator)
| Field | Value |
| --- | --- |
| User goal | Deliver an event after fixing its cause |
| Trigger | Operator inspects `outbox_events WHERE failed_at IS NOT NULL` |
| Preconditions | `service_role` / SQL access |
| Main flow | 1. Read `last_error`. 2. Fix cause. 3. `UPDATE outbox_events SET failed_at = NULL, attempts = 0, available_at = now() WHERE id = …`. 4. Next tick processes it |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | `processed_at` set |
| Postconditions | — |
| Affected objects | OBJ-JOB |
| Related screens | None (no admin UI) |
| Status | Documented in migration header (`supabase/migrations/20261103000300_outbox_worker_and_cron.sql:12-13`) |
