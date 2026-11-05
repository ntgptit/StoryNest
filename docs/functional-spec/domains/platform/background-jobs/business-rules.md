# OBJ-JOB — Background jobs (outbox, cron): business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-JOB` |
| Name | Scheduled database jobs (pg_cron) and the transactional outbox worker |
| Business purpose | Do deferred work reliably without blocking user requests: scheduled publishing, notifications with side effects, counters, rankings, data retention |
| User goals | (Indirect) scheduled chapters go live on time; followers get notified once; read counts and rankings stay fresh |
| Actors / roles | `pg_cron` (runs as the migration owner), `service_role` (only role allowed to call job functions), Operator (re-queues dead letters) |
| Related entities | `outbox_events` (`event_type`, `aggregate_id`, `payload`, `dedupe_key` unique, `attempts`, `available_at`, `last_error`, `failed_at`, `processed_at`), `chapter_read_events`, `story_rankings` (materialized view), `ranking_state`, `chapter_stats`, `story_stats`, `cron.job` |
| Code | `supabase/migrations/20261103000200_publish_chapter_rpc.sql`, `20261103000300_outbox_worker_and_cron.sql`, `20261104000100_chapter_reads.sql`, `20261104001100_comment_reply_notifications.sql`, `20261104001200_counter_unification.sql`, `20261104001500_rankings.sql` |
| Dependencies | OBJ-NOTI (what each event produces — BR-NOTI-*), OBJ-EDT (publish/schedule rules — BR-EDT-*), OBJ-PROG (read counting — BR-PROG-*), OBJ-RANK (ranking formula — BR-RANK-*), OBJ-VOTE/OBJ-CMT/OBJ-LIB (counter triggers) |
| WBS | Section 0 "Outbox worker + cron" ✅; 8.2 monitoring ⬜ (`docs/WBS.md:16,251`) |

No screen. Event handlers (which event → which notification, who is excluded) are owned by
[OBJ-NOTI](../../community/notifications/business-rules.md); this object only owns delivery, scheduling and retention.

## 2. Job schedule

| Job name (`cron.job`) | Schedule (UTC) | Function | Batch | Migration |
| --- | --- | --- | --- | --- |
| `storynest-publish-due-chapters` | every minute | `publish_due_chapters()` | 50 | `20261103000300_outbox_worker_and_cron.sql:138` |
| `storynest-process-outbox` | every minute | `process_outbox()` | 100 | `…_outbox_worker_and_cron.sql:139` |
| `storynest-purge-outbox` | 03:17 daily | `purge_outbox()` (14 days) | all | `…_outbox_worker_and_cron.sql:140` |
| `storynest-aggregate-reads` | every minute | `aggregate_reads()` | 5000 | `20261104000100_chapter_reads.sql:129` |
| `storynest-purge-read-events` | 03:41 daily | `purge_read_events()` (90 days) | all | `…_chapter_reads.sql:130` |
| `storynest-reconcile-counters` | 03:41 daily | `reconcile_counters()` | all | `20261104001200_counter_unification.sql:152` |
| `storynest-refresh-rankings` | every 5 minutes | `refresh_rankings()` | all | `20261104001500_rankings.sql:133` |

## 3. Rules

### BR-JOB-001 — Scheduler registration
| Field | Value |
| --- | --- |
| Description | Each job is registered with `cron.schedule(name, …)` (upsert by name, re-running a migration never duplicates) |
| Preconditions | Migration applied |
| Conditions | If the `cron` schema is unavailable the migration only raises a `NOTICE` and the jobs must be run by another runner |
| Expected behavior | Seven jobs as in §2 |
| Exceptions | Nothing at runtime detects that jobs are missing (F-JOB-02) |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:122-141`, `supabase/migrations/20261104000100_chapter_reads.sql:122-131`, `supabase/migrations/20261104001200_counter_unification.sql:146-153`, `supabase/migrations/20261104001500_rankings.sql:127-134`, `supabase/tests/30_outbox.test.sql:33` |
| Status | Verified (SQL test for the three outbox jobs); pg_cron active on dev per `docs/WBS.md:120` |

### BR-JOB-002 — Only `service_role` runs jobs
| Field | Value |
| --- | --- |
| Description | `publish_due_chapters`, `process_outbox`, `purge_outbox`, `aggregate_reads`, `purge_read_events`, `reconcile_counters`, `refresh_rankings` have EXECUTE revoked from `PUBLIC`, `anon`, `authenticated` |
| Preconditions | — |
| Conditions | Client call → `42501` |
| Expected behavior | — |
| Exceptions | Read-only `ranking_freshness()` is callable by anon/authenticated |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:340-344`, `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:116-120`, `supabase/migrations/20261104000100_chapter_reads.sql:116-120`, `supabase/migrations/20261104001200_counter_unification.sql:141-144`, `supabase/migrations/20261104001500_rankings.sql:121-125`, `supabase/tests/30_outbox.test.sql:47` |
| Status | Verified (SQL test) |

### BR-JOB-003 — Outbox: at-least-once, idempotent
| Field | Value |
| --- | --- |
| Description | Producers insert an event in the same transaction as the change; `dedupe_key` is unique so a second emission is a no-op; handlers must be idempotent (notifications carry a per-recipient dedupe key) |
| Preconditions | — |
| Conditions | Worker picks events with `processed_at IS NULL AND failed_at IS NULL AND available_at <= now()`, oldest first, `FOR UPDATE SKIP LOCKED` (parallel runs never share an event), up to 100 per run; each event in its own sub-transaction |
| Expected behavior | Success → `processed_at = now()`, `last_error = NULL` |
| Exceptions | — |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:1-16,70-103`, `supabase/tests/30_outbox.test.sql` |
| Status | Verified (SQL test) |

### BR-JOB-004 — Outbox retry, backoff and dead letter
| Field | Value |
| --- | --- |
| Description | A failing event is retried with exponential backoff and dead-lettered after 5 attempts |
| Preconditions | Handler raised an exception |
| Conditions | Attempt *n*: `available_at = now() + 2^min(n, 8)` minutes (2, 4, 8, 16 min…); `last_error` = message + SQLSTATE (≤ 500 chars); `n ≥ 5` → `failed_at = now()` |
| Expected behavior | Dead letters are never retried automatically and never purged; operator re-queues with `UPDATE outbox_events SET failed_at = NULL, attempts = 0, available_at = now() WHERE id = …` |
| Exceptions | Unknown `event_type` raises `22023` → follows the same path (a typo cannot loop forever) |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:9-13,58-68,90-99`, `supabase/tests/30_outbox.test.sql:93-124` |
| Status | Verified (SQL test) |

### BR-JOB-005 — Event types
| Field | Value |
| --- | --- |
| Description | Two outbox event types exist; their effects are defined by OBJ-NOTI |
| Preconditions | — |
| Conditions | `chapter.published` — emitted by the publish core **only on first publication** of a chapter (re-publishing an edit is silent), key `chapter.published:<chapter>`, payload `story_id, chapter_id, version_id, published_by`. `comment.replied` — emitted by trigger `comments_emit_reply` after INSERT of a comment with `parent_comment_id`, key `comment.replied:<reply>`, payload `chapter_id, parent_comment_id, replied_by` |
| Expected behavior | Handler dispatch in `private.handle_outbox_event` |
| Exceptions | Collaboration invitation/answer notifications are inserted directly in the RPC transaction, not via the outbox |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:202-210`, `supabase/migrations/20261104001100_comment_reply_notifications.sql:16-38,70-81` |
| Status | Verified |

### BR-JOB-006 — Outbox retention
| Field | Value |
| --- | --- |
| Description | Processed events older than 14 days are deleted daily |
| Preconditions | — |
| Conditions | `processed_at IS NOT NULL AND processed_at < now() - 14 days` |
| Expected behavior | Returns rows deleted |
| Exceptions | Dead letters and pending events are kept |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:105-114`, `supabase/tests/30_outbox.test.sql:138` |
| Status | Verified (SQL test) |

### BR-JOB-007 — Scheduled publishing job
| Field | Value |
| --- | --- |
| Description | Every minute, up to 50 chapters with `status = 'scheduled' AND scheduled_for <= now()` (not deleted) are published, oldest first, through the same core as manual publishing (validation, version snapshot, stats rows, outbox) |
| Preconditions | Chapter scheduled (BR-EDT-*) |
| Conditions | Attributed to the draft's `updated_by` (last person who saved the draft) |
| Expected behavior | Count of published chapters returned |
| Exceptions | One failing chapter is logged as `WARNING` and skipped; it is retried every minute with **no attempt limit, no dead letter and no author-visible signal** (F-JOB-01) |
| Related screens | Chapter editor / chapter manager (D-STUDIO) |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:309-335`, `supabase/tests/20_publish.test.sql` |
| Status | Verified |

### BR-JOB-008 — Read aggregation and retention
| Field | Value |
| --- | --- |
| Description | Read events (one per reader × chapter × UTC day, BR-PROG-*) are folded into `chapter_stats.reads` / `story_stats.reads` every minute in batches of 5000, marked `aggregated_at` in the same statement (never counted twice); aggregated events older than 90 days are deleted daily |
| Preconditions | — |
| Conditions | Pending events are never purged regardless of age |
| Expected behavior | Read counters lag requests by ≤ ~1 minute |
| Exceptions | The 90-day window bounds the "month" ranking and author daily stats |
| Related screens | — |
| Evidence | `supabase/migrations/20261104000100_chapter_reads.sql:1-19,71-131`, `supabase/tests/70_reads.test.sql` |
| Status | Verified (SQL test) |

### BR-JOB-009 — Ranking refresh
| Field | Value |
| --- | --- |
| Description | `story_rankings` is refreshed `CONCURRENTLY` every 5 minutes (readers never blocked); an advisory lock makes an overlapping run return `NULL` instead of queueing; `ranking_state` records time, duration, row count |
| Preconditions | — |
| Conditions | Formula and filters are BR-RANK-* |
| Expected behavior | `ranking_freshness()` exposes `refreshed_at`, `lag_seconds`, `duration_ms`, `row_count` |
| Exceptions | Visibility filters are applied live at read time, so only numbers lag |
| Related screens | Ranking page (D-DISCOVERY) |
| Evidence | `supabase/migrations/20261104001500_rankings.sql:1-19,52-79,111-134`, `supabase/tests/210_rankings.test.sql` |
| Status | Verified (SQL test) |

### BR-JOB-010 — Counter reconciliation
| Field | Value |
| --- | --- |
| Description | Counters are moved by triggers in the same transaction as the change; a daily job recomputes votes, library (followers/saves) and comment counters from source tables and repairs drift |
| Preconditions | — |
| Conditions | `counter_drift()` is a read-only report (service_role) |
| Expected behavior | Returns number of corrected rows |
| Exceptions | Reads are not reconciled (they come from events) |
| Related screens | — |
| Evidence | `supabase/migrations/20261104001200_counter_unification.sql:1-16,135-153`, `supabase/tests/180_counter_unification.test.sql` |
| Status | Verified (SQL test) |

### BR-JOB-011 — Observability
| Field | Value |
| --- | --- |
| Description | Failures are visible only as `RAISE WARNING` in Postgres logs, `outbox_events.last_error/failed_at`, and `ranking_state`; no alerting for dead letters or failed cron runs |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Documented as WP 8.2 (Sentry, Supabase logs, alerts on dead letters and cron failures) — not started |
| Exceptions | — |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:98`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:330`, `docs/WBS.md:251` |
| Status | Documented — F-JOB-02 |
