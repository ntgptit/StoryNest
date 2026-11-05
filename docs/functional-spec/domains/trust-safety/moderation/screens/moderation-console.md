# SCR-MOD-01 — Moderation console

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | SCR-MOD-01 |
| Business domain | [D-TRUST Trust & Safety](../../overview.md) |
| Business object | [OBJ-MOD](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Moderation console (report queue) |
| Route | `/moderation` (protected prefix; `noindex`; disallowed in robots.txt) |
| Route file | `apps/web/src/app/(main)/moderation/page.tsx` (server guard), `apps/web/src/app/(main)/moderation/moderation-view.tsx` |
| Screen component | `packages/features/src/moderation/screens/moderation-screen.tsx`; card `packages/features/src/moderation/components/report-card.tsx` |
| Roles | Moderator only (BR-MOD-001, BR-MOD-020). Guest → login; member → 404 |
| Entry points | Avatar menu item "Moderation" (moderators only) — `packages/features/src/shell/components/user-menu.tsx:69-73`. No other link |
| Workflows | WF-MOD-02, WF-MOD-03, WF-MOD-04, WF-MOD-05 |
| Rules | BR-MOD-010…020 |

## B. Components

| ID | Component | Content / behaviour | Evidence |
| --- | --- | --- | --- |
| SCR-MOD-01-C01 | Page header | Title "Moderation"; description "The report queue. Every action is logged along with its reason." (`moderationText.console.title/description`) | `moderation-screen.tsx:51`, `strings.en.ts:40-41` |
| SCR-MOD-01-C02 | Queue tabs | "Pending" (open = pending + reviewing, oldest first) / "Resolved" (resolved + dismissed, newest first) (`console.tabs.open/closed`) | `moderation-screen.tsx:52-60`, `api/moderation.api.ts:33-47` |
| SCR-MOD-01-C03 | Report list | `InfiniteList` of cards, gap 3, "Load more" button + auto load; 20 per page | `moderation-screen.tsx:74-83`, `model/report.ts:34` |
| SCR-MOD-01-C04 | Card header badges | Kind ("Story/Chapter/Comment/Account"), status ("Pending/Under review/Resolved/Dismissed"), reason label; "N pending reports about this item" when N > 1 | `report-card.tsx:156-165`, `strings.en.ts:54,58,68-73` |
| SCR-MOD-01-C05 | Target preview | Title / comment excerpt (≤ 300 chars, line breaks kept); "Status: <state>" ("Visible/Hidden/Removed/Deleted/Active/Suspended/Deactivated"); "Open content" link when a target URL exists | `report-card.tsx:167-180`, `model/report.ts:121-127` |
| SCR-MOD-01-C06 | Report details | Reporter's description (if any); "Reported by <name>" | `report-card.tsx:182-185` |
| SCR-MOD-01-C07 | Content action buttons | One button by target + state: "Hide comment" / "Unhide comment", "Remove story" / "Restore story", "Suspend account" / "Reinstate account"; take-down buttons use the destructive variant; shown on open **and** closed reports | `report-card.tsx:187-205`, `model/report.ts:130-146` |
| SCR-MOD-01-C08 | Report action buttons | "Under review" (pending only), "Mark as resolved", "Dismiss report" (ghost) — open reports only | `report-card.tsx:206-242` |
| SCR-MOD-01-C09 | Reason dialog | Title = action label; label "Reason (required, will be logged)"; placeholder "Example: violates the harassment policy"; inline length error; `role="alert"` request error; "Cancel" / "Confirm" ("Working…") | `report-card.tsx:245-275`, `strings.en.ts:85-93` |
| SCR-MOD-01-C11 | Detail side panel (Lucian #273) | The report title is a button (a click on the card outside its controls too) that opens a right-hand panel (full width on phones) with the report's content, when it was reported and the same actions and reason dialog as the card; the card stays highlighted (`aria-current`). Arrows or J / K step to the next / previous loaded report ("i of n"), Esc or the close button closes. J/K are ignored while typing or in the reason dialog. A report that leaves the queue after an action is replaced by the one that took its place | `moderation-screen.tsx`, `components/report-card.tsx` (`variant="panel"`), `packages/ui/src/widgets/detail-panel.tsx` |
| SCR-MOD-01-C10 | Status views | Skeleton (`aria-busy`), error state, empty text, client-only sign-in prompt / "no access" empty state | `moderation-screen.tsx:24-40,62-73` |

## C. User actions & system responses

| Field | SCR-MOD-01-A01 — Open the console |
| --- | --- |
| Trigger | Navigate to `/moderation` (menu item or URL) |
| Preconditions | — |
| Expected behavior | Moderator: header, tabs, "Pending" queue loads. Guest: redirected to `/login?next=%2Fmoderation`. Member: 404 |
| State change | Query `["moderation","queue",<userId>,"open"]` |
| Validation | Server `requireUser` + `isModerator`; DB `is_moderator()` |
| Error behavior | Load failure → "Couldn't load the queue" / "Check your connection and try again." / "Try again" |
| Navigation | — |
| Evidence | `apps/web/src/app/(main)/moderation/page.tsx:12-20`, `apps/web/src/lib/auth/route-guard.ts:44`, `moderation-screen.tsx:21-47`, `hooks/use-moderation.ts:36-55` |

| Field | SCR-MOD-01-A02 — Switch tab |
| --- | --- |
| Trigger | Click "Pending" / "Resolved" |
| Preconditions | Moderator |
| Expected behavior | Loads (or shows cached) the other filter; skeleton while pending |
| State change | Local `filter` state; separate query key per filter (not in URL) |
| Validation | Only `open`/`closed` reachable |
| Error behavior | As A01 |
| Navigation | None (tab not deep-linkable) |
| Evidence | `moderation-screen.tsx:45-60`, `moderation.test.tsx:368` |

| Field | SCR-MOD-01-A03 — Load more |
| --- | --- |
| Trigger | "Load more" button / scroll |
| Preconditions | `hasNextPage` (server returned 21 rows) |
| Expected behavior | Next page appended after the last `(created_at, id)` |
| State change | Infinite query pages |
| Validation | — |
| Error behavior | A failed next page puts the infinite query in `error`; the screen checks `isError` before rendering items, so the whole list is replaced by the error state (Inferred from TanStack Query v5 semantics; not tested) |
| Navigation | — |
| Evidence | `model/report.ts:107-115`, `moderation-screen.tsx:74-83`, `moderation.test.tsx:396` |

| Field | SCR-MOD-01-A04 — Open the reported content |
| --- | --- |
| Trigger | "Open content" link |
| Preconditions | Story/chapter/comment has story id + slug; user has username |
| Expected behavior | Navigates to `/story/{id}/{slug}`, `/story/{id}/{slug}/{chapterSlug}` (chapter or comment) or `/author/{username}` in the same tab |
| State change | — |
| Validation | — |
| Error behavior | No link when a slug/username is missing |
| Navigation | Leaves the console (no "back to queue" affordance besides browser back) |
| Evidence | `model/report.ts:121-127`, `report-card.tsx:171-178` |

| Field | SCR-MOD-01-A05 — Start a content action |
| --- | --- |
| Trigger | Click a C07 button |
| Preconditions | Not busy |
| Expected behavior | Reason dialog opens titled with the action |
| State change | `pending = {kind: content, action}` |
| Validation | — |
| Error behavior | — |
| Navigation | Modal |
| Evidence | `report-card.tsx:188-205` |

| Field | SCR-MOD-01-A06 — Start a report action |
| --- | --- |
| Trigger | "Under review" / "Mark as resolved" / "Dismiss report" |
| Preconditions | Report open; "Under review" only when pending |
| Expected behavior | Reason dialog opens |
| State change | `pending = {kind: report, status}` |
| Validation | — |
| Error behavior | — |
| Navigation | Modal |
| Evidence | `report-card.tsx:206-242`, `moderation.test.tsx:465,493` |

| Field | SCR-MOD-01-A07 — Write the reason |
| --- | --- |
| Trigger | Typing in the textarea |
| Preconditions | Dialog open |
| Expected behavior | Inline "The reason must be at least 3 characters." once non-empty and < 3 (trimmed); "Confirm" disabled until 3–1000 |
| State change | `reason` |
| Validation | `checkReason` (BR-MOD-015); `maxLength=1000` |
| Error behavior | — |
| Navigation | — |
| Evidence | `report-card.tsx:128,252-259,270`, `model/report.ts:153-159` |

| Field | SCR-MOD-01-A08 — Confirm |
| --- | --- |
| Trigger | "Confirm" |
| Preconditions | Valid reason, not busy |
| Expected behavior | `moderate` or `resolve_report`; button "Working…", all card buttons disabled; success → toast "Done.", dialog closes, reason cleared, all moderation queries refetch (card moves tab / shows new state) |
| State change | DB target + report + audit (BR-MOD-010…018) |
| Validation | Server re-validates everything |
| Error behavior | Message inside dialog (`role="alert"`), dialog stays open: forbidden "You don't have permission to do this.", notFound "This item no longer exists.", conflict "The status has changed or the action doesn't apply. Please reload.", invalid "This action can't be applied to the selected item.", network "No connection. Check your network and try again.", other "Something went wrong. Please try again." Queue refetches even on error (`onSettled`) |
| Navigation | — |
| Evidence | `report-card.tsx:137-152,260-264`, `model/report.ts:185-202`, `hooks/use-moderation.ts:57-99`, `moderation.test.tsx:418,504` |

| Field | SCR-MOD-01-A09 — Cancel the dialog |
| --- | --- |
| Trigger | "Cancel", Esc, overlay click |
| Preconditions | — |
| Expected behavior | Dialog closes; reason and error cleared |
| State change | Mutations reset |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `report-card.tsx:130-135,245,267`, `moderation.test.tsx:522` |

| Field | SCR-MOD-01-A10 — Retry after a load error |
| --- | --- |
| Trigger | "Try again" |
| Preconditions | Query in error |
| Expected behavior | Refetch |
| State change | — |
| Validation | — |
| Error behavior | Error state again on failure |
| Navigation | — |
| Evidence | `moderation-screen.tsx:64-70`, `moderation.test.tsx:389` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | "Pending" tab selected (`moderation-screen.tsx:45`) |
| Loading | Implemented | Auth loading → skeleton h-64; queue pending → skeleton h-40 (`moderation-screen.tsx:24,62-63`) |
| Empty | Implemented | "No reports are pending." / "No reports have been handled yet." plain text (`moderation-screen.tsx:71-72`) |
| Populated | Implemented | Cards (C04–C08) |
| Validation error | Implemented | Reason length inline message (`report-card.tsx:259`) |
| Request error | Implemented | Load: ErrorState + retry. Action: in-dialog alert (A08) |
| Success | Implemented | Toast "Done." + refetch |
| Disabled | Implemented | All action buttons disabled while a mutation of this card runs; Confirm disabled for invalid reason (`report-card.tsx:127,200,270`) |
| Unauthorized | Implemented | Server 404 for non-moderators, login redirect for guests; client fallbacks for other hosts (`page.tsx:18-20`, `moderation-screen.tsx:25-40`) |
| Offline | Implemented (generic) | Load error text mentions the connection; action error "No connection…" |
| Unsaved changes | Not applicable / Recommended | Closing the dialog discards a typed reason without warning (acceptable: short text) |
| Stale item (acted on by another moderator) | Implemented (partial) | Conflict message + refetch; no live update of the queue (no realtime) |

## E. Acceptance criteria

- **SCR-MOD-01-AC01** Given a moderator, when they open `/moderation`, then the "Pending" tab lists open reports oldest first, 20 at a time. *(Verified)*
- **SCR-MOD-01-AC02** Given a signed-in non-moderator, when they open `/moderation`, then they get a 404 and no queue request is made. *(Verified, `page.test.tsx:30-33`)*
- **SCR-MOD-01-AC03** Given a guest, when they open `/moderation`, then they are redirected to `/login?next=%2Fmoderation`. *(Verified)*
- **SCR-MOD-01-AC04** Given an open comment report on a visible comment, when the moderator chooses "Hide comment", writes "harassment confirmed" and confirms, then the comment is hidden, every open report on it becomes Resolved, an audit row with that reason exists, and the toast "Done." appears. *(Verified)*
- **SCR-MOD-01-AC05** Given the reason dialog, when the trimmed reason has fewer than 3 characters, then Confirm stays disabled and "The reason must be at least 3 characters." is shown. *(Verified)*
- **SCR-MOD-01-AC06** Given a chapter report, when the moderator chooses "Remove story", then the story (not the chapter) is removed and the reports on the story and its chapters close. *(Verified)*
- **SCR-MOD-01-AC07** Given a report already closed by another moderator, when "Mark as resolved" is confirmed, then the dialog shows "The status has changed or the action doesn't apply. Please reload." and stays open. *(Verified)*
- **SCR-MOD-01-AC08** Given a report in "Under review", then the "Under review" button is not offered. *(Verified)*
- **SCR-MOD-01-AC09** Given a Resolved report whose story a moderator removed, when "Restore story" is confirmed with a reason, then the story is visible again and the report stays Resolved. *(Verified)*
- **SCR-MOD-01-AC10** Given a moderator account as the reported user, when "Suspend account" is confirmed, then "This action can't be applied to the selected item." is shown and nothing changes. *(Verified)*
- **SCR-MOD-01-AC11** Given the queue fails to load, when "Try again" is pressed, then the queue is requested again. *(Verified)*
- **SCR-MOD-01-AC12** `[Proposed]` Given a story or chapter report whose target was deleted by its author, then no "Restore story" button is offered (F-MOD-03).
- **SCR-MOD-01-AC13** `[Proposed]` Given any card, then it shows when the report was filed and, for comments, who wrote the comment; closed cards show who closed them and when (U-MOD-01).
- **SCR-MOD-01-AC14** `[Proposed]` Given a destructive action dialog, then it states the consequence (e.g. "The account will no longer be able to post, comment or report") before Confirm (U-MOD-01).
- **SCR-MOD-01-AC15** `[Proposed]` Given the console, when the moderator filters by status (pending / under review / resolved / dismissed) or target kind, then only matching reports are listed and the filter is kept in the URL (U-MOD-02).
- **SCR-MOD-01-AC17** Given three open reports, when I open the second, then the panel shows "2 of 3" with its actions; J shows the third, K twice the first, Esc closes the panel and no card is highlighted any more.
- **SCR-MOD-01-AC18** Given the panel is open, when I resolve the report (with a reason), then the panel moves on to the report now at its place in the queue.
- **SCR-MOD-01-AC16** `[Proposed]` Given a target, when the moderator opens its history, then the audit rows for that target are listed with actor, action, reason and time (F-MOD-07).

## F. Findings referenced
F-MOD-03, F-MOD-04, F-MOD-07, U-MOD-01, U-MOD-02.

## G. Open questions
Q-MOD-02 (role latency), Q-MOD-03 (chapter-level removal), Q-MOD-04 (taking over an author-hidden comment).
