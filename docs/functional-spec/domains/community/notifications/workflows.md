# OBJ-NOTI — In-app notifications: workflows

| ID | Name | Status |
| --- | --- | --- |
| WF-NOTI-01 | Followers are told about a new chapter | Verified (SQL test) |
| WF-NOTI-02 | A comment author is told about a reply | Verified (SQL test) |
| WF-NOTI-03 | Collaboration invitation and answer notices | Verified (SQL test) |
| WF-NOTI-04 | Receive a notification live (bell) | Verified |
| WF-NOTI-05 | Open a notification | Verified |
| WF-NOTI-06 | Mark all as read | Verified |
| WF-NOTI-07 | Browse older notifications | Verified |
| WF-NOTI-08 | Switch a notification type off / on | Verified (SQL test) |

### WF-NOTI-01 — Followers are told about a new chapter
| Field | Value |
| --- | --- |
| User goal | (Reader) know when a followed story continues |
| Trigger | Author publishes a chapter for the first time (OBJ-EDT), immediately or by schedule |
| Preconditions | Reader follows the story (WF-LIB-01) |
| Main flow | 1. `publish_chapter` writes outbox `chapter.published` in the publish transaction. 2. pg_cron runs `process_outbox` every minute. 3. Handler inserts one `chapter_published` per eligible follower (BR-NOTI-003). 4. Preference trigger drops it for followers who switched it off (BR-NOTI-007). 5. Realtime pushes the INSERT; bell badge +1 (WF-NOTI-04). |
| Alternative flows | A1 Re-publishing an edited chapter → no event. A2 Chapter unpublished before processing → nothing. |
| Exception flows | E1 Handler error → retry with backoff, dead-letter after 5 attempts (`BR-JOB-*`). |
| Success criteria | Each eligible follower has exactly one notification for the chapter |
| Postconditions | `notifications` rows; outbox event processed |
| Affected objects | OBJ-EDT, OBJ-JOB, OBJ-LIB, OBJ-NOTI, OBJ-SET |
| Related screens | SCR-NOTI-01 |
| Status | Verified (SQL test) — `supabase/tests/140_follows_saves.test.sql:71-72`, `supabase/tests/30_outbox.test.sql` |

### WF-NOTI-02 — A comment author is told about a reply
| Field | Value |
| --- | --- |
| User goal | (Commenter) know someone answered me |
| Trigger | Another reader posts a reply (WF-CMT-04) |
| Preconditions | Parent comment visible, parent author active |
| Main flow | 1. Trigger writes `comment.replied`. 2. Worker runs `notify_comment_replied` (BR-NOTI-004). 3. Preference trigger may drop it. 4. Realtime → badge. 5. Recipient opens it (WF-NOTI-05) → chapter URL with `#b-<block>` or `#comments`. |
| Alternative flows | A1 Self-reply, deleted/hidden reply or parent, unpublished chapter → nothing. |
| Exception flows | As WF-NOTI-01 E1. |
| Success criteria | One notification per reply for the parent's author |
| Postconditions | Notification with excerpt snapshot |
| Affected objects | OBJ-CMT, OBJ-JOB, OBJ-NOTI, OBJ-SET |
| Related screens | SCR-CMT-01, SCR-NOTI-01 |
| Status | Verified (SQL test) — `supabase/tests/170_comment_reply_notifications.test.sql` |

### WF-NOTI-03 — Collaboration invitation and answer notices
| Field | Value |
| --- | --- |
| User goal | (Invitee) see the invitation; (owner) learn the answer |
| Trigger | Owner invites (OBJ-TEAM); invitee accepts/declines in Studio |
| Preconditions | `BR-TEAM-*` |
| Main flow | 1. `invite_collaborator` inserts `collaboration_invited` for the invitee (always delivered). 2. Invitee clicks it → `/studio` → "My invitations" → accept/decline. 3. `respond_invitation` inserts `collaboration_accepted`/`declined` for the inviter (switchable). 4. Inviter clicks → `/studio/story/{id}/team`. |
| Alternative flows | A1 Owner cancels → no notification; the invitee's notice remains and leads to Studio with no pending invitation. |
| Exception flows | — |
| Success criteria | Both parties informed immediately (same transaction) |
| Postconditions | Notifications rows |
| Affected objects | OBJ-TEAM, OBJ-NOTI, OBJ-SET |
| Related screens | SCR-NOTI-01 |
| Status | Verified (SQL test) — `supabase/tests/250_user_settings.test.sql:63-92` |

### WF-NOTI-04 — Receive a notification live (bell)
| Field | Value |
| --- | --- |
| User goal | Notice news while browsing any page |
| Trigger | INSERT on `notifications` for me |
| Preconditions | Signed in; header rendered (every `(main)` page) |
| Main flow | 1. Bell subscribes `notifications:<uid>`. 2. INSERT event → invalidate list + unread queries. 3. Badge shows new count. |
| Alternative flows | A1 Connection dropped → on re-subscribe the missed rows are fetched. |
| Exception flows | E1 Unread query error → badge hidden (count treated as 0). |
| Success criteria | Badge updates without reload |
| Postconditions | — |
| Affected objects | OBJ-NOTI, OBJ-SHELL |
| Related screens | SCR-NOTI-01 (C01) |
| Status | Verified — `packages/features/src/notifications/notifications.test.tsx:338-384` |

### WF-NOTI-05 — Open a notification
| Field | Value |
| --- | --- |
| User goal | Go to what the notification is about |
| Trigger | Click/Enter on a list item |
| Preconditions | On `/notifications` |
| Main flow | 1. If unread: optimistic read + badge −1, `markRead([id])`. 2. Navigate to the link (BR-NOTI-002 table). |
| Alternative flows | A1 No link (unknown type / missing data) → only marks read. A2 Already read → navigates, sends nothing. |
| Exception flows | E1 Mark-read refused → state restored (navigation still happens). E2 Destination no longer exists (chapter slug changed, unpublished, story private) → reader 404 / not-found. |
| Success criteria | Destination opens; item read |
| Postconditions | `read_at` set |
| Affected objects | OBJ-NOTI, OBJ-READ, OBJ-STM/OBJ-TEAM (Studio) |
| Related screens | SCR-NOTI-01, SCR-CMT-01 |
| Status | Verified |

### WF-NOTI-06 — Mark all as read
| Field | Value |
| --- | --- |
| User goal | Clear the badge |
| Trigger | "Mark all as read" |
| Preconditions | Unread > 0 |
| Main flow | Optimistic all read + badge 0 → server update → toast "All notifications marked as read." |
| Alternative flows | — |
| Exception flows | E1 Refused → restore + error toast. |
| Success criteria | Unread count 0 after reload |
| Postconditions | All my `read_at` set |
| Affected objects | OBJ-NOTI |
| Related screens | SCR-NOTI-01 |
| Status | Verified |

### WF-NOTI-07 — Browse older notifications
| Field | Value |
| --- | --- |
| User goal | Find an older notice |
| Trigger | "Load more" |
| Preconditions | `hasNextPage` |
| Main flow | Next page after cursor of the last shown row; appended |
| Alternative flows | — |
| Exception flows | E1 Page fails → whole list switches to ErrorState with "Try again" (Inferred from `list.isError` precedence). |
| Success criteria | No duplicates/skips |
| Postconditions | — |
| Affected objects | OBJ-NOTI |
| Related screens | SCR-NOTI-01 |
| Status | Verified |

### WF-NOTI-08 — Switch a notification type off / on
| Field | Value |
| --- | --- |
| User goal | Stop (or resume) a kind of notice |
| Trigger | Toggle on `/settings` (OBJ-SET UI) |
| Preconditions | Signed in |
| Main flow | 1. User saves `user_settings.notify_*`. 2. From then on the BEFORE INSERT trigger drops that type for the user. |
| Alternative flows | A1 Switch back on → only future events are delivered (no back-fill). |
| Exception flows | — |
| Success criteria | No new rows of that type |
| Postconditions | — |
| Affected objects | OBJ-SET, OBJ-NOTI |
| Related screens | SCR-NOTI-01 (effect), settings screen (OBJ-SET) |
| Status | Verified (SQL test) |
