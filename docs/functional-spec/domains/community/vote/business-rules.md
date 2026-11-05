# OBJ-VOTE — Chapter votes: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-VOTE` (domain `D-COMMUNITY`) |
| Name | Chapter votes |
| Business purpose | Let readers express appreciation for a chapter with one tap. Feed the chapter and story vote counters, rankings and author analytics. |
| User goals | Vote, or take a vote back. See how many votes a chapter has. |
| Actors / roles | Member (active account), Guest (sees count only), Story team (can vote like any reader, see Q-VOTE-01), service_role (reconciliation) |
| Related entities | `chapter_votes (user_id, chapter_id, created_at)`, `chapter_stats.votes`, `story_stats.votes`; RPC `set_chapter_vote`; trigger `chapter_votes_count` → `apply_chapter_vote_delta()`; `reconcile_vote_counts()`, `reconcile_counters()`, `counter_drift()` |
| Dependencies | OBJ-READ (button on [SCR-READ-01](../../reading/chapter-reader/screens/chapter-reader.md)), chapter readability [BR-READ-001](../../reading/chapter-reader/business-rules.md#br-read-001--chapter-readability), OBJ-STORY (story vote stat BR-STORY-013), OBJ-RANK (score = reads + 5 × votes), OBJ-STAT (votes per chapter / day), OBJ-AUTH (login redirect) |
| Screens | None of its own. The component lives on SCR-READ-01 (C11) |

### Rule index

| ID | Name | Status |
| --- | --- | --- |
| [BR-VOTE-001](#br-vote-001--one-vote-per-member-per-chapter) | One vote per member per chapter | Verified |
| [BR-VOTE-002](#br-vote-002--who-may-vote) | Who may vote | Verified |
| [BR-VOTE-003](#br-vote-003--idempotent-set-vote) | Idempotent set-vote | Verified |
| [BR-VOTE-004](#br-vote-004--unvoting) | Unvoting | Verified |
| [BR-VOTE-005](#br-vote-005--counter-maintenance) | Counter maintenance | Verified |
| [BR-VOTE-006](#br-vote-006--counter-reconciliation) | Counter reconciliation | Verified |
| [BR-VOTE-007](#br-vote-007--vote-visibility) | Vote visibility | Verified |
| [BR-VOTE-008](#br-vote-008--optimistic-ui-and-rollback) | Optimistic UI and rollback | Verified |
| [BR-VOTE-009](#br-vote-009--guests) | Guests | Verified |
| [BR-VOTE-010](#br-vote-010--per-account-state-and-render-gating) | Per-account state and render gating | Verified |
| [BR-VOTE-011](#br-vote-011--votes-feed-rankings-and-analytics) | Votes feed rankings and analytics | Verified |
| [BR-VOTE-012](#br-vote-012--vote-lifecycle-with-chapter-and-account) | Vote lifecycle with chapter and account | Verified / Inferred |

---

### BR-VOTE-001 — One vote per member per chapter
| Field | Value |
| --- | --- |
| Description | A member has at most one vote per chapter (PK `(user_id, chapter_id)`). Votes have no weight or type. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Repeated votes are absorbed (BR-VOTE-003). The story vote total is the sum of its chapters' votes. |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:182-187` |
| Status | Verified |

### BR-VOTE-002 — Who may vote
| Field | Value |
| --- | --- |
| Description | Voting requires a signed-in, **active** account that can read the chapter. |
| Preconditions | — |
| Conditions | Insert policy: `user_id = auth.uid() AND is_active_account() AND can_read_chapter(chapter_id)`. |
| Expected behavior | anon → refused at the privilege layer (no EXECUTE / no table grant). A token without a subject → **42501**. A chapter of a private story, an unpublished chapter or an unknown chapter → **42501** (RLS violation, so existence is not revealed). A suspended or deactivated account → 42501. The client shows "You can't vote for this chapter." for `forbidden`. |
| Exceptions | The story team passes `can_read_chapter` for **any** chapter status, so they can vote on their own chapters, including drafts, through the RPC (the UI only exposes published chapters) — Q-VOTE-01. |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:103-112,261-265`, `supabase/migrations/20261104000600_chapter_votes.sql:3-5,17-18,54-58`, `supabase/tests/120_votes.test.sql:43-51`, `supabase/tests/10_rls.test.sql:99`, `packages/features/src/reader/model/vote.ts:21-29` |
| Status | Verified (SQL test) |

### BR-VOTE-003 — Idempotent set-vote
| Field | Value |
| --- | --- |
| Description | `set_chapter_vote(p_chapter_id, p_voted)` sets the caller's vote to exactly `p_voted` and returns the chapter's vote count afterwards. |
| Preconditions | Authenticated. |
| Conditions | `p_voted` null → **22023**. |
| Expected behavior | `true` → `INSERT … ON CONFLICT DO NOTHING`. `false` → `DELETE` of the caller's row. Voting twice or unvoting twice changes nothing and returns the current count, so a retry after a lost response is harmless. SECURITY INVOKER: the caller's RLS applies. |
| Exceptions | Missing stats row → returns 0. |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261104000600_chapter_votes.sql:3-7,50-71`, `supabase/tests/120_votes.test.sql:54-84`, `packages/features/src/reader/api/vote.api.ts:27-31` |
| Status | Verified (SQL test) |

### BR-VOTE-004 — Unvoting
| Field | Value |
| --- | --- |
| Description | Removing a vote only requires owning the row. |
| Preconditions | — |
| Conditions | Delete policy: `user_id = auth.uid()`. No active-account or readability check. |
| Expected behavior | A member can withdraw a vote even after the chapter became unreadable or their account became inactive (through the RPC; the UI cannot reach a hidden chapter). The counter never goes below 0. |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:266`, `supabase/migrations/20261104000600_chapter_votes.sql:3-5,38-41`, `supabase/tests/120_votes.test.sql:75` |
| Status | Verified |

### BR-VOTE-005 — Counter maintenance
| Field | Value |
| --- | --- |
| Description | An AFTER INSERT/DELETE row trigger on `chapter_votes` moves `chapter_stats.votes` and `story_stats.votes` **in the same transaction** as the vote. |
| Preconditions | — |
| Conditions | INSERT → +1 (upsert of the stats rows). DELETE → `greatest(votes − 1, 0)`, UPDATE only (never inserts, since a cascade may be removing the row). |
| Expected behavior | Every path keeps the counters in step: RPC, direct insert/delete, cascade. A skipped insert (`ON CONFLICT DO NOTHING`) fires no trigger, which is what makes a repeat count once. |
| Exceptions | — |
| Related screens | SCR-READ-01 (count), SCR-STORY-01 (Votes stat) |
| Evidence | `supabase/migrations/20261104000600_chapter_votes.sql:11-15,23-48`, `supabase/tests/120_votes.test.sql:62,86,110` |
| Status | Verified (SQL test) |

### BR-VOTE-006 — Counter reconciliation
| Field | Value |
| --- | --- |
| Description | Drift is repaired by recomputing from `chapter_votes`. |
| Preconditions | service_role only. |
| Conditions | — |
| Expected behavior | `reconcile_vote_counts()` fixes `chapter_stats.votes` and `story_stats.votes` (all chapters, deleted ones included). `counter_drift()` reports differences (read-only). `reconcile_counters()` runs the vote, library and comment reconcilers daily at 03:41 (pg_cron). Counters never gate access, so short drift is harmless. |
| Exceptions | Only existing stats rows are corrected by the vote reconciler. |
| Related screens | — |
| Evidence | `supabase/migrations/20261104000600_chapter_votes.sql:73-108`, `supabase/migrations/20261104001200_counter_unification.sql:1-16,95-152`, `supabase/tests/120_votes.test.sql:96`, `supabase/tests/180_counter_unification.test.sql` |
| Status | Verified (SQL test) |

### BR-VOTE-007 — Vote visibility
| Field | Value |
| --- | --- |
| Description | Who voted is private. How many voted is public. |
| Preconditions | — |
| Conditions | `chapter_votes_own_read`: a user sees only their own rows. `chapter_stats_read`: visible wherever the chapter is visible (anon included). |
| Expected behavior | The client reads the count from `chapter_stats` and, for a member only, whether their own row exists. It cannot leak anyone else's vote. |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:263,366-367`, `packages/features/src/reader/api/vote.api.ts:5-25`, `supabase/tests/120_votes.test.sql:70`, `packages/features/src/reader/vote.test.tsx:73-92` |
| Status | Verified |

### BR-VOTE-008 — Optimistic UI and rollback
| Field | Value |
| --- | --- |
| Description | A press shows its effect at once: voted flips and the count ±1, never below 0. |
| Preconditions | Member. No toggle pending. |
| Conditions | The button is disabled while the mutation is pending, so answers cannot arrive out of order. |
| Expected behavior | Success → the state becomes (requested voted, **server count**), and the server count replaces the guess. Error → previous state restored + toast by kind: forbidden "You can't vote for this chapter.", network "No connection. Check your network and try again.", other "Couldn't vote. Please try again." No success toast. |
| Exceptions | The story page's Votes stat is not updated optimistically (it refreshes when its cache goes stale). |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/hooks/use-chapter-vote.ts:11-50`, `packages/features/src/reader/model/vote.ts:10-19`, `packages/features/src/reader/components/vote-button.tsx:24-30,40`, `packages/features/src/reader/strings.en.ts:70-80`, `packages/features/src/reader/vote.test.tsx:23-36,158-194` |
| Status | Verified (WBS 4.1 runtime, 1.5 s latency) |

### BR-VOTE-009 — Guests
| Field | Value |
| --- | --- |
| Description | Guests see the count and a "Sign in to vote" button. |
| Preconditions | `auth.status = unauthenticated`. |
| Conditions | — |
| Expected behavior | Click → `/login?next=<current chapter path>`, with no request made. After sign-in the reader returns to the chapter and must press again. `aria-pressed` is omitted for guests. |
| Exceptions | — |
| Related screens | SCR-READ-01, SCR-AUTH-01 Sign in (D-ACCOUNT) |
| Evidence | `packages/features/src/reader/components/vote-button.tsx:16-28,39,44`, `packages/features/src/reader/vote.test.tsx:148` |
| Status | Verified |

### BR-VOTE-010 — Per-account state and render gating
| Field | Value |
| --- | --- |
| Description | Vote state is cached under `["reader","vote",chapterId,userId|"guest"]`, so one account never sees another's state. |
| Preconditions | — |
| Conditions | While the session is `loading` the query is disabled and the button is not rendered. |
| Expected behavior | The button renders only once both the session and the count are known (no flicker between guest and member). |
| Exceptions | When the vote query fails, the button never renders and there is no retry (U-STORY-01). |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/keys.ts:5-6`, `packages/features/src/reader/hooks/use-chapter-vote.ts:23-28`, `packages/features/src/reader/components/vote-button.tsx:21`, `packages/features/src/reader/vote.test.tsx:196` |
| Status | Verified |

### BR-VOTE-011 — Votes feed rankings and analytics
| Field | Value |
| --- | --- |
| Description | Votes are an input to other objects. Those objects own how they use them. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Rankings: score = reads + **5 ×** votes over a time window, using `chapter_votes.created_at` (`BR-RANK-*`). Author analytics: votes per chapter and new votes per day (`BR-STAT-*`). Story page: Votes stat (BR-STORY-013). |
| Exceptions | — |
| Related screens | Rankings, author analytics, SCR-STORY-01 |
| Evidence | `supabase/migrations/20261104001500_rankings.sql:1-6,29-39`, `supabase/migrations/20261104002100_author_stats.sql:3-14,102-105` |
| Status | Verified |

### BR-VOTE-012 — Vote lifecycle with chapter and account
| Field | Value |
| --- | --- |
| Description | Votes follow the chapter row and the user row. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Chapter archived, unpublished or soft-deleted → vote rows and counters are **kept** (they still count in `story_stats.votes`). Chapter hard-deleted (cascade) or user deleted → vote rows cascade-delete and the trigger decrements without failing. |
| Exceptions | Account anonymisation (WP 6.4, not built) is not covered here. |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:183-184`, `supabase/migrations/20261104000600_chapter_votes.sql:13-15`, `supabase/tests/120_votes.test.sql:110` |
| Status | Verified (cascade) / Inferred (archived chapters keep counting) |
