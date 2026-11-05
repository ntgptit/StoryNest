# OBJ-VOTE — Workflows

| ID | Name | Status |
| --- | --- | --- |
| [WF-VOTE-01](#wf-vote-01--vote-or-unvote-a-chapter) | Vote or unvote a chapter | Verified |
| [WF-VOTE-02](#wf-vote-02--guest-wants-to-vote) | Guest wants to vote | Verified |
| [WF-VOTE-03](#wf-vote-03--reconcile-vote-counters-system) | Reconcile vote counters (system) | Verified |

---

### WF-VOTE-01 — Vote or unvote a chapter
| Field | Value |
| --- | --- |
| User goal | Show appreciation for a chapter (or take it back). |
| Trigger | A member presses "Vote for this chapter" / "Remove vote" below "— End of chapter —" on SCR-READ-01. |
| Preconditions | Signed in, active account, chapter readable ([BR-VOTE-002](business-rules.md#br-vote-002--who-may-vote)). Vote state loaded. |
| Main flow | 1. The UI flips at once: heart filled or empty, "N votes" ±1, the button disabled ([BR-VOTE-008](business-rules.md#br-vote-008--optimistic-ui-and-rollback)). 2. `set_chapter_vote(chapter, voted)` inserts or deletes the row ([BR-VOTE-003](business-rules.md#br-vote-003--idempotent-set-vote)). 3. The trigger moves the chapter and story counters in the same transaction ([BR-VOTE-005](business-rules.md#br-vote-005--counter-maintenance)). 4. The RPC returns the chapter count, which replaces the optimistic count, and the button is enabled again. |
| Alternative flows | A1 A repeat or a lost response followed by a retry → no change, same count. A2 Another reader voted meanwhile → the server count shows their vote too. |
| Exception flows | E1 42501 (inactive account / chapter hidden meanwhile) → rollback + "You can't vote for this chapter.". E2 Network → rollback + "No connection. Check your network and try again.". E3 Other → rollback + "Couldn't vote. Please try again.". |
| Success criteria | The count after a refresh equals the count shown (WBS 4.1 acceptance). |
| Postconditions | `chapter_votes` row present or absent. `chapter_stats.votes` and `story_stats.votes` updated. Rankings and analytics pick it up on their next refresh. |
| Affected objects | OBJ-VOTE, OBJ-STORY (stat), OBJ-RANK, OBJ-STAT |
| Related screens | SCR-READ-01 |
| Status | Verified (`vote.test.tsx`, `120_votes.test.sql`; WBS 4.1 runtime) |

### WF-VOTE-02 — Guest wants to vote
| Field | Value |
| --- | --- |
| User goal | Vote without being signed in yet. |
| Trigger | A guest presses "Sign in to vote". |
| Preconditions | `auth.status = unauthenticated`. |
| Main flow | 1. Navigate to `/login?next=<encoded chapter path>` with no request made ([BR-VOTE-009](business-rules.md#br-vote-009--guests)). 2. Sign in (D-ACCOUNT, `BR-AUTH-*`). 3. Return to the chapter. The button now shows "Vote for this chapter" with the member's state. 4. The member presses it → WF-VOTE-01. |
| Alternative flows | The guest already has an account with a vote → the button shows "Remove vote". |
| Exception flows | Sign-in abandoned → stays on the login screen. |
| Success criteria | Back on the same chapter after sign-in. |
| Postconditions | None until the member presses again (the vote is not replayed). |
| Affected objects | OBJ-VOTE, OBJ-AUTH |
| Related screens | SCR-READ-01, login screen |
| Status | Verified (`vote.test.tsx:148`) |

### WF-VOTE-03 — Reconcile vote counters (system)
| Field | Value |
| --- | --- |
| User goal | (System) The displayed counts equal the real number of votes. |
| Trigger | pg_cron `storynest-reconcile-counters` daily at 03:41, or an operator calls `counter_drift()` / `reconcile_counters()` as service_role. |
| Preconditions | service_role. |
| Main flow | 1. `counter_drift()` lists counters whose stored value ≠ `count(chapter_votes)` (chapter and story scope). 2. `reconcile_vote_counts()` rewrites the differing `chapter_stats.votes` / `story_stats.votes`. 3. It returns the number of rows corrected. |
| Alternative flows | No drift → 0 rows. |
| Exception flows | pg_cron missing → NOTICE; run it externally. |
| Success criteria | `counter_drift()` is empty afterwards (WBS 4.8 acceptance). |
| Postconditions | Counters corrected. |
| Affected objects | OBJ-VOTE, OBJ-JOB |
| Related screens | — |
| Status | Verified (`120_votes.test.sql:96`, `180_counter_unification.test.sql`) |
