# OBJ-RANK — Rankings — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-RANK |
| Name | Rankings (top stories per period) |
| Business purpose | Surface the most read and voted stories today / this week / this month / all time |
| User goals | See what is popular now; share a period link |
| Actors / roles | Guest, Member (same list); service role / pg_cron (refresh) |
| Related entities | Materialized view `story_rankings` (private), table `ranking_state`; RPCs `refresh_rankings` (service role), `top_stories`, `ranking_freshness`; sources `chapter_read_events` (OBJ-PROG), `chapter_votes` (OBJ-VOTE), `story_stats` |
| Dependencies | BR-PROG-* (read dedupe), BR-VOTE-*, BR-STORY-*, BR-MAT-*, BR-MOD-*, BR-JOB-* (cron) |
| Code | `supabase/migrations/20261104001500_rankings.sql`, `packages/features/src/ranking/**`, `apps/web/src/app/(main)/ranking/*` |

## 2. Rules

### BR-RANK-001 — Score and time windows
| Field | Value |
| --- | --- |
| Description | Score = reads + 5 × votes. Windows: `day` = reads whose `read_day` is today **(UTC)**; `week` = last 7 days; `month` = last 30 days; `all` = running totals from `story_stats` |
| Preconditions | — |
| Conditions | Reads counted from `chapter_read_events.read_day` (calendar days); votes from `chapter_votes.created_at > now() - N days` (rolling hours) |
| Expected behavior | A story with zero reads and votes in the window is not ranked |
| Exceptions | For `day`, reads reset at 00:00 UTC (07:00 in Vietnam) while votes are a rolling 24 h → U-RANK-01 |
| Related screens | SCR-RANK-01 |
| Evidence | `supabase/migrations/20261104001500_rankings.sql:3-6,22-45`, `docs/WBS.md:208`, `supabase/tests/210_rankings.test.sql` |
| Status | Verified (SQL test) |

### BR-RANK-002 — Snapshot refreshed every 5 minutes without blocking readers
| Field | Value |
| --- | --- |
| Description | `refresh_rankings()` runs `REFRESH MATERIALIZED VIEW CONCURRENTLY`, skips if another refresh holds the advisory lock (returns NULL), records `refreshed_at` (start), `duration_ms`, `row_count` |
| Preconditions | pg_cron job `storynest-refresh-rankings` `*/5 * * * *`; otherwise a NOTICE asks for an external runner |
| Conditions | Only `service_role` may execute it; view and state table have no client grants |
| Expected behavior | Numbers lag by ≤ ~5 minutes |
| Exceptions | Without cron the ranking never updates (freshness note shows the age) |
| Related screens | SCR-RANK-01 |
| Evidence | `20261104001500_rankings.sql:47-80,121-134` |
| Status | Verified |

### BR-RANK-003 — Live eligibility on top of the snapshot
| Field | Value |
| --- | --- |
| Description | `top_stories` (SECURITY DEFINER) joins the live `stories` table: public, not draft, not deleted, owner active and not deleted, mature only on opt-in |
| Preconditions | — |
| Conditions | `includeMature = useShowMature()` (part of the key) |
| Expected behavior | A story made private/deleted/suspended disappears immediately; only its numbers lag |
| Exceptions | — |
| Related screens | SCR-RANK-01 |
| Evidence | `20261104001500_rankings.sql:13-16,98-107`, `ranking/hooks/use-ranking.ts:13-31`, `ranking/keys.ts:5` |
| Status | Verified (SQL test) |

### BR-RANK-004 — Order and position
| Field | Value |
| --- | --- |
| Description | Order score DESC, reads DESC, story id; `rank_position` is a continuous row number across pages |
| Preconditions | — |
| Conditions | Position computed after eligibility filtering |
| Expected behavior | Page 2 starts at position 13 |
| Exceptions | A story dropped by the card query (vanished between requests) leaves a gap in visible numbering |
| Related screens | SCR-RANK-01 |
| Evidence | `20261104001500_rankings.sql:98-110`, `ranking/model/ranking.ts:73-90`, `ranking/ranking.test.tsx:332` |
| Status | Verified |

### BR-RANK-005 — Paging limits
| Field | Value |
| --- | --- |
| Description | `limit` 1–50, `offset` 0–200, period ∈ {day, week, month, all}, otherwise `22023`; client pages 12 at a time with one extra row and stops when next offset > 200 |
| Preconditions | — |
| Conditions | — |
| Expected behavior | At most 204 ranked stories reachable; end shows "You've reached the end of the ranking." |
| Exceptions | — |
| Related screens | SCR-RANK-01 |
| Evidence | `20261104001500_rankings.sql:88-96`, `ranking/model/ranking.ts:7-29`, `ranking/api/ranking.api.ts:27-62`, `ranking/ranking.test.tsx:97,180` |
| Status | Verified |

### BR-RANK-006 — Period in the URL
| Field | Value |
| --- | --- |
| Description | `/ranking?period=<day|week|month|all>`; default `week` (omitted from URL); unknown value → week |
| Preconditions | — |
| Conditions | Tab change **replaces** the history entry |
| Expected behavior | Each period has its own link and cache |
| Exceptions | — |
| Related screens | SCR-RANK-01 |
| Evidence | `apps/web/src/app/(main)/ranking/page.tsx:11-14`, `ranking/model/ranking.ts:3-18`, `ranking/screens/ranking-screen.tsx:45`, `ranking/ranking.test.tsx:80,90,285` |
| Status | Verified |

### BR-RANK-007 — Freshness note
| Field | Value |
| --- | --- |
| Description | `ranking_freshness()` (anon + authenticated) returns `refreshed_at`, `lag_seconds`, `duration_ms`, `row_count`; the page shows "Updated <relative time>" |
| Preconditions | — |
| Conditions | Cached 60 s |
| Expected behavior | Note hidden when no row or on failure |
| Exceptions | — |
| Related screens | SCR-RANK-01 |
| Evidence | `20261104001500_rankings.sql:113-119`, `ranking/hooks/use-ranking.ts:33-41`, `ranking/screens/ranking-screen.tsx:54-58`, `ranking/ranking.test.tsx:299,308` |
| Status | Verified |

### BR-RANK-008 — Ranked card
| Field | Value |
| --- | --- |
| Description | Home card (BR-HOME-009) with a rank badge and a line "<reads> reads · <votes> votes" earned inside the period |
| Preconditions | — |
| Conditions | Card's own counters are all-time `story_stats` |
| Expected behavior | Two sets of numbers per card (period vs total) |
| Exceptions | Badge `aria-label` "Rank N" sits on a generic `span` and overlaps the card's "18+" badge position → U-RANK-02 |
| Related screens | SCR-RANK-01 |
| Evidence | `ranking/screens/ranking-screen.tsx:93-123`, `ranking/strings.en.ts:8-9`, `packages/ui/src/widgets/story-card.tsx:60-66` |
| Status | Verified |
