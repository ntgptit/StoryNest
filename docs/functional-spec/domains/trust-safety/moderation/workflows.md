# OBJ-MOD — Reports & moderation console — Workflows

### WF-MOD-01 — Report content or an account
| Field | Value |
| --- | --- |
| User goal | Flag a story, chapter, comment or person as inappropriate |
| Trigger | "Report" button (Flag icon) on the story page, at the end of a chapter, on another reader's visible comment, or on an author page |
| Preconditions | Target visible to the reporter (BR-MOD-005) |
| Main flow | 1. Member clicks "Report" (accessible name "Report story/chapter/comment/user"). 2. Dialog "Report content: <kind>" opens with "Tell us why this content isn't appropriate. A moderator will review it." 3. Member picks a reason (required) and optionally types details (≤ 2000). 4. "Submit report" → button shows "Sending…". 5. `submit_report` creates a `pending` report (BR-MOD-002…007). 6. Toast "Report sent. Thank you."; dialog closes and the form is cleared |
| Alternative flows | A1 Guest: step 1 navigates to `/login?next=<current pathname>`; after sign-in the member returns to the page and must click again. A2 Same open report already exists: step 5 returns it; same success toast (BR-MOD-007). A3 Cancel / Esc / overlay: dialog closes, form and error cleared |
| Exception flows | E1 Own content (story/chapter only reachable this way): 22023 → "You can't report your own content, or the information isn't valid." (F-MOD-01). E2 Target gone/hidden: PT404 → "This content no longer exists or you can't view it." E3 Limit reached: PT429 → "You've sent too many reports today. Please try again later." E4 Suspended: 42501 → "You can't submit a report right now." E5 Offline → "No connection. Check your network and try again." In all cases the dialog stays open with the inputs kept |
| Success criteria | One `pending` report per reporter and target; reporter sees confirmation |
| Postconditions | Report appears at the bottom of the moderators' "Pending" tab (oldest first) |
| Affected objects | OBJ-MOD, OBJ-ABU (quota) |
| Related screens | SCR-MOD-02, SCR-STORY-*, SCR-READ-*, SCR-AUTHOR-01, comment thread (OBJ-CMT) |
| Status | Verified (`moderation/components/report-button.tsx:31-143`, `moderation/moderation.test.tsx:263-326`, `docs/WBS.md:219` runtime note) |

### WF-MOD-02 — Triage the queue
| Field | Value |
| --- | --- |
| User goal | Moderator works through waiting reports and closes the ones that need no content action |
| Trigger | Avatar menu → "Moderation" → `/moderation` |
| Preconditions | Moderator (BR-MOD-020) |
| Main flow | 1. Console opens on "Pending" (open = pending + reviewing), oldest first, 20 per page. 2. Moderator reads a card (kind, status, reason, title/excerpt, state, details, "Reported by …", "N pending reports about this item"). 3. Optional: "Open content" opens the target page. 4. Moderator clicks "Under review" (pending only), "Mark as resolved" or "Dismiss report". 5. Reason dialog (title = action label) asks "Reason (required, will be logged)". 6. Confirm (enabled at ≥ 3 chars) → "Working…". 7. `resolve_report` updates status + audit row (BR-MOD-010). 8. Toast "Done."; dialog closes; every moderation query refetches; closed reports move to "Resolved" |
| Alternative flows | A1 "Load more" fetches the next keyset page. A2 Switch to "Resolved" (resolved + dismissed, newest first): report-level buttons are gone; content buttons remain (WF-MOD-04). A3 Cancel: dialog closes, reason discarded |
| Exception flows | E1 Already closed by someone else: PT409 → "The status has changed or the action doesn't apply. Please reload." inside the dialog; the queue refetches in the background. E2 Load failure → "Couldn't load the queue" with "Try again". E3 Role lost: 42501 → "You don't have permission to do this." |
| Success criteria | Every status change has an audit row with the reason |
| Postconditions | Report `reviewing` (still in Pending) or closed (in Resolved) |
| Affected objects | OBJ-MOD |
| Related screens | SCR-MOD-01 |
| Status | Verified (`moderation/components/report-card.tsx:52-220`, `moderation/hooks/use-moderation.ts:57-99`, `moderation/moderation.test.tsx:365-557`) |

### WF-MOD-03 — Act on the reported content
| Field | Value |
| --- | --- |
| User goal | Take harmful content down or stop an abusive account |
| Trigger | Destructive button on a card: "Hide comment", "Remove story" (story and chapter reports), "Suspend account" |
| Preconditions | Moderator; target in a state where the action applies (button shown per `contentActions`) |
| Main flow | 1. Moderator clicks the action. 2. Reason dialog; moderator writes the reason. 3. Confirm → `moderate(action, target, reason, report_id)` (chapter → story id). 4. DB changes the target, writes the audit row and resolves **all** open reports on that target (BR-MOD-017). 5. Toast "Done."; queue refetches; card(s) move to "Resolved" with the new state (Hidden / Removed / Suspended) |
| Alternative flows | A1 Repeat on an already-hidden comment: harmless, returns `hidden` (still audited) |
| Exception flows | E1 Story already removed / account not active / comment deleted: PT409 conflict text. E2 Moderator account targeted (or self): 22023 → "This action can't be applied to the selected item." E3 Target vanished: PT404 → "This item no longer exists." |
| Success criteria | Target state changed; reports closed; audit row with actor, action, target, report, reason |
| Postconditions | Readers no longer see the comment/story; suspended account cannot write (BR-MOD-016). Affected party gets no notification (BR-MOD-021) |
| Affected objects | OBJ-MOD, OBJ-CMT, OBJ-STORY/OBJ-STM, OBJ-AUTH |
| Related screens | SCR-MOD-01 |
| Status | Verified (`supabase/migrations/20261104002000_moderation.sql:339-434`, `supabase/tests/260_moderation.test.sql:160-246`) |

### WF-MOD-04 — Reverse a moderation action
| Field | Value |
| --- | --- |
| User goal | Undo a mistaken or appealed action |
| Trigger | "Unhide comment", "Restore story", "Reinstate account" on a card whose target is in the taken-down state (usually in "Resolved") |
| Preconditions | Moderator; for story/account the latest content action on the target is the moderator's own take-down (BR-MOD-012, BR-MOD-014) |
| Main flow | 1. Moderator opens "Resolved". 2. Clicks the reverse action, writes a reason, confirms. 3. `moderate(restore_*)` returns `visible` / `active`; audit row written. 4. Toast "Done."; card state updates |
| Alternative flows | — |
| Exception flows | E1 Story deleted by its author / account suspended outside the console / chapter deleted by author: PT409 conflict text (button is offered anyway, F-MOD-03). E2 Comment deleted by its author: no button (state `deleted`) |
| Success criteria | Content visible again / account active |
| Postconditions | Closed reports stay closed (not reopened). After a story restore the owner regains self delete/restore |
| Affected objects | OBJ-MOD, OBJ-CMT, OBJ-STM, OBJ-AUTH |
| Related screens | SCR-MOD-01 |
| Status | Verified (`moderation/model/report.ts:129-146`, `supabase/tests/260_moderation.test.sql:189-192,213-221,244-246`) |

### WF-MOD-05 — Reach `/moderation` without being a moderator
| Field | Value |
| --- | --- |
| User goal | (Unintended) a guest or member opens the URL |
| Trigger | Typed/bookmarked `/moderation` |
| Preconditions | — |
| Main flow | 1. Guest: proxy redirects to `/login?next=%2Fmoderation`; after sign-in → step 2. 2. Member: `requireUser` passes, `isModerator` false → `notFound()` (standard 404). No "Moderation" item in their menu |
| Alternative flows | Non-Next host: `ModerationScreen` shows "Sign in to continue. Sign in" or "You don't have access to this page / This page is for moderators." and requests nothing |
| Exception flows | Any direct RPC call is refused by the DB (42501) |
| Success criteria | No queue data is fetched for non-moderators |
| Postconditions | — |
| Affected objects | OBJ-MOD, OBJ-AUTH |
| Related screens | SCR-MOD-01 |
| Status | Verified (`apps/web/src/app/(main)/moderation/page.tsx:12-20`, `page.test.tsx:24-38`, `moderation/moderation.test.tsx:351-363`) |

### WF-MOD-06 — Affected party after an action (cross-screen)
| Field | Value |
| --- | --- |
| User goal | Commenter / story owner / account holder understands what happened |
| Trigger | Moderator action in WF-MOD-03 |
| Preconditions | — |
| Main flow | Commenter: opens the chapter, sees own comment with "A moderator hid this comment. Only you can see it." Story owner: readers get 404; in Studio the story is under "Deleted stories" ("Deleted <time>") with "Restore", which fails with "You don't have permission to do this." Suspended account: actions start failing with each feature's generic "forbidden" text |
| Alternative flows | Story managers see "A moderator hid this comment. You can't unhide it." on a moderator-hidden comment (OBJ-CMT) |
| Exception flows | — |
| Success criteria | **Not met**: no notification, no reason shown, no appeal path (F-MOD-02, F-MOD-06) |
| Postconditions | — |
| Affected objects | OBJ-MOD, OBJ-CMT, OBJ-STM, OBJ-NOTI |
| Related screens | Comment thread (OBJ-CMT), Studio list (OBJ-STM) |
| Status | Verified (code) — `packages/features/src/comments/components/comment-item.tsx:110-114`, `packages/features/src/studio/screens/studio-screen.tsx:154-200`, `packages/features/src/studio/model/story-form.ts:109-112`, `packages/features/src/studio/strings.en.ts:267-273,395` |
