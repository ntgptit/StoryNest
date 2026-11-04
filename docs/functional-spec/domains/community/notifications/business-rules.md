# OBJ-NOTI — In-app notifications: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-NOTI` |
| Name | In-app notifications (list, unread badge, realtime, event → notification rules) |
| Business purpose | Bring readers back when something they care about happens (new chapter of a followed story, a reply, a collaboration invitation or answer) |
| User goals | Notice news without polling; open the thing a notification is about in one click; clear the unread badge |
| Actors / roles | Signed-in user (recipient: read, mark read, delete via API) · System producers: outbox worker (`process_outbox`), collaboration RPCs · Guest (no access) |
| Related entities | Table `notifications` (`recipient_id`, `actor_id`, `event_type`, `story_id`, `chapter_id`, `comment_id`, `payload`, `dedupe_key`, `read_at`); `outbox_events`; `user_settings.notify_*`; functions `private.notify_chapter_published`, `private.notify_comment_replied`, `private.handle_outbox_event`, `public.process_outbox`, `invite_collaborator`, `respond_invitation`, `notification_enabled`, trigger `notifications_respect_settings`; Realtime publication `supabase_realtime` |
| Dependencies | OBJ-JOB (outbox worker, pg_cron every minute — `BR-JOB-*`), OBJ-LIB (story follows — [BR-LIB-001](../../library/library/business-rules.md#br-lib-001--follow-and-save-are-independent)), OBJ-CMT (reply event — [BR-CMT-021](../comments/business-rules.md#br-cmt-021--reply-event-emission)), OBJ-TEAM (invitations — `BR-TEAM-*`), OBJ-SET (preference switches UI — `BR-SET-*`), OBJ-EDT (publishing emits `chapter.published` — `BR-EDT-*`), OBJ-SHELL (header hosts the bell) |
| Screens | [SCR-NOTI-01 Notifications](screens/notifications.md) `/notifications` (with header bell component) |
| Source | `supabase/migrations/20261103000300_outbox_worker_and_cron.sql`, `…000200_publish_chapter_rpc.sql:202-210`, `…001000_notifications_realtime.sql`, `…001100_comment_reply_notifications.sql`, `…000500_collaboration_invitations.sql`, `…001900_user_settings.sql`; `packages/features/src/notifications/**` |
| WBS | WP 4.6 (in-app, realtime), 4.7 (reply + invitation types), 6.3 (preferences), 6.7 push (not started) |

Rule summary

| ID | Rule | Status |
| --- | --- | --- |
| BR-NOTI-001 | Server-side creation, private to the recipient | Verified (SQL test) |
| BR-NOTI-002 | Event catalogue (which event produces which notification) | Verified |
| BR-NOTI-003 | `chapter_published` | Verified (SQL test) |
| BR-NOTI-004 | `comment_replied` | Verified (SQL test) |
| BR-NOTI-005 | `collaboration_invited` | Verified (SQL test) |
| BR-NOTI-006 | `collaboration_accepted` / `collaboration_declined` | Verified (SQL test) |
| BR-NOTI-007 | Suppression by the recipient's preferences | Verified (SQL test) |
| BR-NOTI-008 | Delivery timing and retries | Verified |
| BR-NOTI-009 | Idempotency (dedupe key per recipient) | Verified (SQL test) |
| BR-NOTI-010 | List order and paging | Verified |
| BR-NOTI-011 | Unread count and bell badge | Verified |
| BR-NOTI-012 | Mark one read on open | Verified |
| BR-NOTI-013 | Mark all read | Verified |
| BR-NOTI-014 | Realtime updates and reconnect catch-up | Verified |
| BR-NOTI-015 | Text and destination link per type | Verified |
| BR-NOTI-016 | Unknown types and missing data | Verified |
| BR-NOTI-017 | Channels not built (push, e-mail) | Documented |

## 2. Rules

### BR-NOTI-001 — Server-side creation, private to the recipient
| Field | Value |
| --- | --- |
| Description | Notifications are inserted only by server code (worker, SECURITY DEFINER RPCs). A user may read, mark read (`read_at` only) and delete only their own rows. Guests have no access. |
| Preconditions | — |
| Conditions | Grants: `SELECT, DELETE` + `UPDATE (read_at)` to `authenticated`; no INSERT grant. RLS `recipient_id = auth.uid()` on select/update/delete. Client also filters `recipient_id = userId` ("second fence"). |
| Expected behavior | Client cannot forge, edit payload or recipient, nor see others' notifications. |
| Exceptions | Delete is allowed by RLS but not offered in the UI (F-NOTI-03). |
| Related screens | SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:343-349`, `supabase/tests/160_notifications_rls.test.sql:20-40`, `packages/features/src/notifications/api/notifications.api.ts:19-24` |
| Status | Verified (SQL test) |

### BR-NOTI-002 — Event catalogue
| Field | Value |
| --- | --- |
| Description | Exactly five notification types exist today. Each is produced by one path. |
| Preconditions | — |
| Conditions | See table below. |
| Expected behavior | — |
| Exceptions | Any other outbox event type is dead-lettered (`22023` "unknown outbox event type"). |
| Related screens | SCR-NOTI-01 |
| Evidence | `packages/features/src/notifications/model/notification.ts:6-12`, `supabase/migrations/20261104001100_comment_reply_notifications.sql:70-81` |
| Status | Verified |

| `event_type` | Produced by | When | Recipient | Not produced when | Switchable (OBJ-SET) | Dedupe key | Destination (link check) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `chapter_published` | Worker handler `notify_chapter_published` for outbox event `chapter.published` | First publish of a chapter (re-publishing an edit is silent) | Every follower of the story with an active, non-deleted account | Recipient is the publisher; chapter no longer published/deleted at processing; story deleted, private, or draft | Yes `notify_chapter_published` | `chapter_published:<chapter>` | `/story/{storyId}/{story_slug}/{chapter_slug}` — route exists; stale story slug redirects; **stale chapter slug → 404** (F-NOTI-01) |
| `comment_replied` | Worker handler `notify_comment_replied` for outbox event `comment.replied` | Insert of a reply | Author of the parent comment (active account) | Reply or parent not visible/deleted at processing; self-reply; chapter not published / story deleted | Yes `notify_comment_replied` | `comment_replied:<reply>` | Same chapter URL + `#b-<block_id>` (paragraph) or `#comments` — anchors exist (`block-view.tsx:16`, `reader-screen.tsx:118`); sheet/reply not opened (U-NOTI-01); stale chapter slug → 404 |
| `collaboration_invited` | `invite_collaborator` (same transaction) | Owner invites a user | Invitee | — | **No** (always delivered) | `collab-invite:<invitation>` | `/studio` — Studio shows "My invitations" with accept/decline (`studio-screen.tsx:127`); after the invitation is answered/cancelled the link leads to nothing specific |
| `collaboration_accepted` | `respond_invitation` (same transaction) | Invitee accepts | Inviter | — | Yes `notify_collaboration_answers` | `collab-reply:<invitation>` | `/studio/story/{storyId}/team` — route exists |
| `collaboration_declined` | `respond_invitation` | Invitee declines | Inviter | — | Yes `notify_collaboration_answers` | `collab-reply:<invitation>` | `/studio/story/{storyId}/team` — route exists |

### BR-NOTI-003 — `chapter_published`
| Field | Value |
| --- | --- |
| Description | When a chapter is published for the first time, each active follower of the story (except the publisher) gets one notification. |
| Preconditions | `publish_chapter` with `v_first` writes outbox `chapter.published` (dedupe `chapter.published:<chapter>`). |
| Conditions | At processing time: chapter `published`, not deleted; story not deleted, visibility `public`/`unlisted`, status ≠ `draft`; follower `account_status='active'` and not deleted; follower ≠ actor. |
| Expected behavior | Payload: `story_title`, `chapter_title` (published version), `chapter_sort_order`, `chapter_slug`, `story_slug`. Text: `"<story>" just published chapter <n>: <title>`. Saving a story (without following) produces nothing. |
| Exceptions | Unpublished before the worker runs → nothing (returns 0). No filter for mature content vs. the follower's age confirmation (Q-NOTI-02). Author-follow (OBJ-AUTHOR) produces no notification. |
| Related screens | SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:202-210`, `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:31-56`, `supabase/tests/140_follows_saves.test.sql:71-72`, `supabase/tests/30_outbox.test.sql`, `packages/features/src/notifications/strings.en.ts:24-25` |
| Status | Verified (SQL test) |

### BR-NOTI-004 — `comment_replied` (someone replied to my comment)
| Field | Value |
| --- | --- |
| Description | The author of a comment is told when someone else replies to it. |
| Preconditions | Outbox `comment.replied` from BR-CMT-021. |
| Conditions | At processing time: reply and parent `visible` and not deleted; replier ≠ parent author; parent author active; chapter `published`, not deleted; story not deleted; chapter has a published version. |
| Expected behavior | Payload: `story_title`, `story_slug`, `chapter_title`, `chapter_slug`, `chapter_sort_order`, `block_id`, `parent_comment_id`, `excerpt` (= `left(btrim(reply.body), 140)`). Text: `<actor> replied to your comment: "<excerpt>"` (or without excerpt). `comment_id` = reply id. |
| Exceptions | The excerpt is a snapshot: if the reply is later deleted or hidden, the notification still shows it (F-NOTI-02). Archived chapter → nothing. |
| Related screens | SCR-NOTI-01, SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104001100_comment_reply_notifications.sql:9-15`, `:42-68`, `supabase/tests/170_comment_reply_notifications.test.sql:53-125`, `packages/features/src/notifications/model/notification.ts:90-101` |
| Status | Verified (SQL test) |

### BR-NOTI-005 — `collaboration_invited`
| Field | Value |
| --- | --- |
| Description | An invitee is notified in the same transaction as the invitation; this type cannot be switched off. |
| Preconditions | `invite_collaborator` succeeded (rules in `BR-TEAM-*`). |
| Conditions | Payload `invitation_id`, `story_title`, `role`. Not routed through the outbox by deliberate decision (WBS 4.7 note). |
| Expected behavior | Text: `<actor> invited you to co-author "<story>"`; link `/studio` where pending invitations are answered. |
| Exceptions | Text always says "co-author" even when the role is `editor` (payload `role` is not used in the text). Cancelling the invitation does not remove the notification. |
| Related screens | SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:98-101`, `:16`, `supabase/migrations/20261104001900_user_settings.sql:12`, `:50-56`, `supabase/tests/250_user_settings.test.sql:58`, `:88`, `packages/features/src/notifications/model/notification.ts:102-103`, `packages/features/src/notifications/strings.en.ts:28`, `docs/WBS.md:195` |
| Status | Verified (SQL test) |

### BR-NOTI-006 — `collaboration_accepted` / `collaboration_declined`
| Field | Value |
| --- | --- |
| Description | The inviter is told the invitee's answer. |
| Preconditions | `respond_invitation` succeeded. |
| Conditions | Type by answer; payload `invitation_id`, `story_title`, `role`; dedupe `collab-reply:<invitation>`; suppressed when the inviter switched off `notify_collaboration_answers`. |
| Expected behavior | Text `<actor> accepted/declined your invitation to co-author "<story>"`; link `/studio/story/{id}/team`. |
| Exceptions | — |
| Related screens | SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261104000500_collaboration_invitations.sql:142-147`, `supabase/tests/250_user_settings.test.sql:92`, `packages/features/src/notifications/model/notification.ts:104-113` |
| Status | Verified (SQL test) |

### BR-NOTI-007 — Suppression by the recipient's preferences
| Field | Value |
| --- | --- |
| Description | A BEFORE INSERT trigger drops any notification whose type the recipient switched off, whatever function created it. The switches are edited on `/settings` (OBJ-SET, `BR-SET-*`). |
| Preconditions | — |
| Conditions | `notification_enabled(user, type)`: `chapter_published` ↔ `notify_chapter_published`; `comment_replied` ↔ `notify_comment_replied`; `collaboration_accepted`/`declined` ↔ `notify_collaboration_answers`; any other type (incl. `collaboration_invited`, unknown) → on. No settings row → all on. |
| Expected behavior | Dropped rows are never stored; turning the switch on later does not back-fill. |
| Exceptions | Not callable by clients. |
| Related screens | SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261104001900_user_settings.sql:11-14`, `:46-74`, `supabase/tests/250_user_settings.test.sql:57-92`, `packages/features/src/settings/model/settings.ts:24-50` |
| Status | Verified (SQL test) |

### BR-NOTI-008 — Delivery timing and retries
| Field | Value |
| --- | --- |
| Description | Outbox-based types (`chapter_published`, `comment_replied`) arrive when the worker runs (pg_cron every minute), with at-least-once delivery, exponential backoff and dead-letter after 5 attempts (mechanics: `BR-JOB-*`). Collaboration types are immediate. |
| Preconditions | pg_cron available (otherwise external scheduling required). |
| Conditions | Rules are evaluated at processing time, not at event time. |
| Expected behavior | Typical latency ≤ ~1 min (WBS observed ~45 s). |
| Exceptions | — |
| Related screens | SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:70-103`, `:138-140`, `docs/WBS.md:195` |
| Status | Verified |

### BR-NOTI-009 — Idempotency
| Field | Value |
| --- | --- |
| Description | `UNIQUE (recipient_id, dedupe_key)` + `ON CONFLICT DO NOTHING` make re-processing harmless. |
| Preconditions | — |
| Conditions | Keys per BR-NOTI-002. |
| Expected behavior | A replayed event creates nothing new. |
| Exceptions | — |
| Related screens | — |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:286-299`, `supabase/tests/170_comment_reply_notifications.test.sql:69-72` |
| Status | Verified (SQL test) |

### BR-NOTI-010 — List order and paging
| Field | Value |
| --- | --- |
| Description | Newest first by `(created_at, id)`, 20 per page, keyset cursor keeping the server timestamp text. |
| Preconditions | Signed in. |
| Conditions | Query asks 21 rows; `hasMore` when 21 returned. `staleTime: 0`. |
| Expected behavior | "Load more" / "Loading…" while more pages exist. |
| Exceptions | No retention: rows are never purged (F-NOTI-03). |
| Related screens | SCR-NOTI-01 |
| Evidence | `packages/features/src/notifications/api/notifications.api.ts:19-37`, `packages/features/src/notifications/model/notification.ts:119-139`, `packages/features/src/notifications/hooks/use-notifications.ts:19-31` |
| Status | Verified |

### BR-NOTI-011 — Unread count and bell badge
| Field | Value |
| --- | --- |
| Description | The header bell (signed-in only) links to `/notifications`, shows a badge with the unread count ("9+" above nine) and an accessible name "Notifications, N unread". |
| Preconditions | `auth.status = authenticated` (guest: nothing rendered, no channel). |
| Conditions | Count = `count exact, head` of rows with `read_at IS NULL`. |
| Expected behavior | Badge hidden at 0. |
| Exceptions | — |
| Related screens | SCR-NOTI-01 (C01) |
| Evidence | `packages/features/src/notifications/components/notification-bell.tsx:10-38`, `packages/features/src/notifications/api/notifications.api.ts:40-48`, `packages/features/src/notifications/model/notification.ts:141-144`, `packages/features/src/shell/components/site-header.tsx:20` |
| Status | Verified |

### BR-NOTI-012 — Mark one read on open
| Field | Value |
| --- | --- |
| Description | Clicking an unread notification marks it read and (if it has a link) navigates to its destination. |
| Preconditions | Item unread (already-read items send nothing). |
| Conditions | Update only `recipient_id = me AND read_at IS NULL AND id IN (...)`, so the first read time is kept. |
| Expected behavior | Optimistic: item shows as read and badge decreases at once; on refusal both revert; then all notification queries refresh. |
| Exceptions | Item without link is a `<button>` that only marks read. |
| Related screens | SCR-NOTI-01 |
| Evidence | `packages/features/src/notifications/screens/notifications-screen.tsx:91-122`, `packages/features/src/notifications/hooks/use-notifications.ts:90-137`, `packages/features/src/notifications/api/notifications.api.ts:51-61`, `packages/features/src/notifications/notifications.test.tsx:407-426` |
| Status | Verified |

### BR-NOTI-013 — Mark all read
| Field | Value |
| --- | --- |
| Description | "Mark all as read" sets `read_at` on all of my unread notifications (all pages, server-side). |
| Preconditions | Unread count > 0 (button disabled otherwise and while pending). |
| Conditions | Optimistic for loaded pages + badge 0; rollback on error. |
| Expected behavior | Toast "All notifications marked as read."; error toast on failure. |
| Exceptions | — |
| Related screens | SCR-NOTI-01 |
| Evidence | `packages/features/src/notifications/screens/notifications-screen.tsx:33-46`, `packages/features/src/notifications/hooks/use-notifications.ts:139-177`, `packages/features/src/notifications/api/notifications.api.ts:63-71` |
| Status | Verified |

### BR-NOTI-014 — Realtime updates and reconnect catch-up
| Field | Value |
| --- | --- |
| Description | While the bell is mounted, a Realtime channel `notifications:<uid>` listens to INSERTs filtered on `recipient_id`; each event refreshes the list and the badge. After a drop (`CLOSED`/`TIMED_OUT`/`CHANNEL_ERROR`) the next `SUBSCRIBED` refetches what was missed. Signing out/unmounting removes the channel. |
| Preconditions | `notifications` in publication `supabase_realtime` (conditional migration). RLS restricts delivery to the recipient. |
| Conditions | Only INSERT events (marking read elsewhere is picked up on the next refetch). |
| Expected behavior | Badge rises without reload. |
| Exceptions | — |
| Related screens | SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261104001000_notifications_realtime.sql:1-20`, `packages/features/src/notifications/hooks/use-notifications.ts:50-84`, `packages/features/src/notifications/notifications.test.tsx:338-384`, `supabase/tests/160_notifications_rls.test.sql:44` |
| Status | Verified |

### BR-NOTI-015 — Text and destination link per type
| Field | Value |
| --- | --- |
| Description | `describeNotification` builds the line and link from the payload (see table in BR-NOTI-002). Actor name = display name, or username when blank, or "Someone". |
| Preconditions | — |
| Conditions | Link needs `story_id` + slugs (chapter/reply) or `story_id` (team). |
| Expected behavior | Unread items are bold with a dot and an sr-only "Unread:" prefix; each shows relative time in the current locale. |
| Exceptions | Links are frozen at event time (F-NOTI-01). |
| Related screens | SCR-NOTI-01 |
| Evidence | `packages/features/src/notifications/model/notification.ts:39-117`, `packages/features/src/notifications/screens/notifications-screen.tsx:97-111` |
| Status | Verified |

### BR-NOTI-016 — Unknown types and missing data
| Field | Value |
| --- | --- |
| Description | A type this client does not know shows "You have a new notification." without a link; a known type missing link fields keeps its text but has no link. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | List never breaks on new server types. |
| Exceptions | — |
| Related screens | SCR-NOTI-01 |
| Evidence | `packages/features/src/notifications/model/notification.ts:68-71`, `:114-115`, `packages/features/src/notifications/notifications.test.tsx:108` |
| Status | Verified |

### BR-NOTI-017 — Channels not built (push, e-mail)
| Field | Value |
| --- | --- |
| Description | Only in-app notifications exist. Push (WP 6.7) is not started; e-mail has no infrastructure and no switch. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | — |
| Exceptions | — |
| Related screens | — |
| Evidence | `docs/WBS.md:221`, `docs/WBS.md:225`, `supabase/migrations/20261104001900_user_settings.sql:12-13` |
| Status | Documented |
