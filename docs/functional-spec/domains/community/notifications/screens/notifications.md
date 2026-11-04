# SCR-NOTI-01 — Notifications

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-NOTI-01` |
| Name | Notifications (page) + header notification bell (component C01) |
| Route | `/notifications` |
| Route files | `apps/web/src/app/(main)/notifications/page.tsx` (server: `requireUser("/notifications")`, metadata title "Thông báo", `robots: noindex`), `apps/web/src/app/(main)/notifications/notifications-view.tsx` |
| Screen component | `packages/features/src/notifications/screens/notifications-screen.tsx`; bell `packages/features/src/notifications/components/notification-bell.tsx` (mounted in `packages/features/src/shell/components/site-header.tsx:20`, i.e. on every `(main)` page) |
| Roles | Signed-in user only. Guest: proxy redirects to `/login?next=/notifications` (`apps/web/src/lib/auth/route-guard.ts:4-12`, `:42-44`) and `requireUser` re-checks; bell not rendered |
| Navigation entry | Header bell only (not in bottom nav or user menu) |
| Workflows | WF-NOTI-04, WF-NOTI-05, WF-NOTI-06, WF-NOTI-07; produced by WF-NOTI-01/02/03; filtered by WF-NOTI-08 |
| Rules | BR-NOTI-001 … BR-NOTI-017 ([business rules](../business-rules.md)) |

## B. Components

| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-NOTI-01-C01 | Header bell | Icon link to `/notifications`, round 36 px, badge (destructive colour, "9+" cap), accessible name "Notifications" / "Notifications, N unread"; owns the Realtime subscription | `notification-bell.tsx:10-38` |
| SCR-NOTI-01-C02 | Page header | Title "Notifications", description "New chapters, comment replies and collaboration invites.", action "Mark all as read" (outline, small) | `notifications-screen.tsx:29-48` |
| SCR-NOTI-01-C03 | Notification list | `ul` "Notification list"; each item a card link (or button when no link) with unread dot, bold text, sr-only "Unread:", relative time | `notifications-screen.tsx:66-72`, `:91-122` |
| SCR-NOTI-01-C04 | Loading skeleton | 4 rows `aria-busy` | `notifications-screen.tsx:57-62` |
| SCR-NOTI-01-C05 | Empty state | Icon BellOff, "No notifications yet" / "New chapters and invites will show up here." | `notifications-screen.tsx:63-64` |
| SCR-NOTI-01-C06 | Error state | "Couldn't load notifications" / "Check your connection and try again." / "Try again" | `notifications-screen.tsx:50-56` |
| SCR-NOTI-01-C07 | Load more | "Load more" / "Loading…" | `notifications-screen.tsx:75-86` |

## C. User actions & system responses

| Field | SCR-NOTI-01-A01 Open the page from the bell |
| --- | --- |
| Trigger | Click bell (any page) |
| Preconditions | Signed in |
| Expected behavior | Navigates to `/notifications`; first page loads newest first |
| State change | — |
| Validation | — |
| Error behavior | ErrorState + retry |
| Navigation | `/notifications` |
| Evidence | `notification-bell.tsx:22-37`, `use-notifications.ts:19-31` |

| Field | SCR-NOTI-01-A02 Open one notification |
| --- | --- |
| Trigger | Click/Enter on an item |
| Preconditions | — |
| Expected behavior | Unread → marked read optimistically, badge −1; then link followed |
| State change | `read_at` set; caches invalidated |
| Validation | — |
| Error behavior | Silent rollback of read state (no toast) |
| Navigation | Chapter / chapter `#anchor` / `/studio` / `/studio/story/{id}/team` (BR-NOTI-002) |
| Evidence | `notifications-screen.tsx:91-122`, `use-notifications.ts:90-137` |

| Field | SCR-NOTI-01-A03 Mark all as read |
| --- | --- |
| Trigger | "Mark all as read" |
| Preconditions | Unread > 0, not pending |
| Expected behavior | All shown as read, badge 0, toast "All notifications marked as read." |
| State change | Server update of all unread |
| Validation | — |
| Error behavior | Restore + toast ("No connection…" / "Couldn't complete that. Please try again.") |
| Navigation | None |
| Evidence | `notifications-screen.tsx:33-46` |

| Field | SCR-NOTI-01-A04 Load more |
| --- | --- |
| Trigger | "Load more" |
| Preconditions | More pages |
| Expected behavior | Next 20 appended |
| State change | Infinite query |
| Validation | — |
| Error behavior | ErrorState (Inferred) |
| Navigation | None |
| Evidence | `notifications-screen.tsx:75-86` |

| Field | SCR-NOTI-01-A05 Retry after load error |
| --- | --- |
| Trigger | "Try again" |
| Preconditions | Error state |
| Expected behavior | Refetch |
| State change | — |
| Validation | — |
| Error behavior | Stays in error |
| Navigation | None |
| Evidence | `notifications-screen.tsx:55` |

| Field | SCR-NOTI-01-A06 Receive live notification |
| --- | --- |
| Trigger | Server INSERT for me |
| Preconditions | Bell mounted |
| Expected behavior | List and badge refresh; after reconnect, missed rows fetched |
| State change | Queries invalidated |
| Validation | — |
| Error behavior | — |
| Navigation | None |
| Evidence | `use-notifications.ts:50-84` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Server guard; query disabled until user known — `use-notifications.ts:29` |
| Loading | Implemented | Skeleton ×4 — `notifications-screen.tsx:57-62` |
| Empty | Implemented | EmptyState — copy omits "comment replies" (description mentions chapters and invites only) |
| Populated | Implemented | List with unread styling |
| Validation error | Not applicable | No input |
| Request error | Implemented | ErrorState + retry (list); toast (mark all); mark-one rollback without message |
| Success | Implemented | Toast on mark all |
| Disabled | Implemented | "Mark all as read" disabled at 0 unread or pending; "Load more" disabled while fetching |
| Unauthorized | Implemented | Redirect to login (proxy + `requireUser`); RLS |
| Offline | Implemented (generic) | Network error message; Realtime catch-up after reconnect |
| Unsaved changes | Not applicable | — |
| Delete / clear | Missing | RLS allows delete; no UI (WBS 4.6 "Còn thiếu") — F-NOTI-03 |

## E. Acceptance criteria

- SCR-NOTI-01-AC01 Given a guest, when they open `/notifications`, then they are redirected to `/login?next=%2Fnotifications`.
- SCR-NOTI-01-AC02 Given a guest on any page, when the header renders, then no bell is shown and no Realtime channel opens.
- SCR-NOTI-01-AC03 Given 12 unread notifications, when the header renders, then the badge reads "9+" and the bell's name is "Notifications, 12 unread".
- SCR-NOTI-01-AC04 Given 25 notifications, when the page loads, then 20 newest are shown and "Load more" shows the other 5 in order.
- SCR-NOTI-01-AC05 Given an unread `chapter_published` item, when clicked, then it becomes read, the badge drops by one and the chapter opens at `/story/{id}/{slug}/{chapterSlug}`.
- SCR-NOTI-01-AC06 Given a `comment_replied` item for a paragraph, when clicked, then the chapter opens with `#b-<block_id>`; for a chapter comment with `#comments`.
- SCR-NOTI-01-AC07 Given a `collaboration_invited` item, when clicked, then `/studio` opens with the pending invitation; `collaboration_accepted`/`declined` open `/studio/story/{id}/team`.
- SCR-NOTI-01-AC08 Given an item of an unknown type, when rendered, then it reads "You have a new notification." and is not a link; clicking marks it read.
- SCR-NOTI-01-AC09 Given unread items, when "Mark all as read" succeeds, then all items show read, the badge disappears and the toast "All notifications marked as read." shows; when it fails, the unread state and badge return and an error toast shows.
- SCR-NOTI-01-AC10 Given 0 unread, when the page renders, then "Mark all as read" is disabled.
- SCR-NOTI-01-AC11 Given the page is open, when a new notification is inserted for me, then it appears and the badge increases without reload; given the socket dropped and reconnected, then notifications inserted meanwhile appear.
- SCR-NOTI-01-AC12 Given I switched off "replies to my comments", when someone replies, then no notification is stored, and none appears after switching it back on.
- SCR-NOTI-01-AC13 Given a reply to my own comment by myself, when the worker runs, then no notification is created.
- SCR-NOTI-01-AC14 [Proposed] Given the chapter's slug was renamed after the notification was created, when I open it, then I still reach the chapter (F-NOTI-01).
- SCR-NOTI-01-AC15 [Proposed] Given the reply was deleted or hidden after the notification was created, when I view the list, then its excerpt is no longer shown (F-NOTI-02).
- SCR-NOTI-01-AC16 [Proposed] Given a notification, when I choose "Delete", then it is removed from my list (F-NOTI-03).

## F. Findings referenced

F-NOTI-01, F-NOTI-02, F-NOTI-03, F-NOTI-04, U-NOTI-01, U-NOTI-02 (scratchpad `findings-community-library.md`).

## G. Open questions

- Q-NOTI-01 — Retention: how long should notifications be kept (no purge exists)?
- Q-NOTI-02 — Should `chapter_published` for a mature story be sent to followers who have not confirmed their age?
