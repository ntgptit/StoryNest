# D-COMMUNITY — Community & Engagement: overview

## Purpose

Everything readers do *with* a chapter and with each other besides reading it: vote for a chapter, discuss it (chapter
and paragraph comments, replies, likes, author moderation) and be told about what happened while they were away
(in-app notifications). The domain feeds the public counters (votes, comments) used by discovery and rankings and the
notification inbox used by every signed-in user.

## Actors

| Actor | Role in this domain |
| --- | --- |
| Guest | Reads comments and vote counts; any write sends them to `/login?next=…` |
| Reader (signed in, active account) | Votes, comments, replies, likes; edits/deletes own comments; receives notifications |
| Story owner / co-author | Hides and unhides comments on their story (not editors) |
| Moderator | Sees hidden comments, hides/restores via OBJ-MOD; exempt from comment rate limits |
| System | Triggers (counters, outbox events, abuse guard, preference filter), outbox worker (pg_cron every minute), Supabase Realtime |

## Business objects

| ID | Name | Folder | Screens | Rules / workflows |
| --- | --- | --- | --- | --- |
| `OBJ-VOTE` | Chapter votes | [`vote/`](vote/) | — (vote button embedded in the chapter reader, OBJ-READ) | [business rules](vote/business-rules.md) · [workflows](vote/workflows.md) |
| `OBJ-CMT` | Comments (chapter & paragraph comments, replies, likes, author moderation) | [`comments/`](comments/) | [SCR-CMT-01 Comment thread](comments/screens/comment-thread.md) — embedded panel in the chapter reader (end-of-chapter section `#comments` and paragraph bottom sheet) | [business rules](comments/business-rules.md) (BR-CMT-001…021) · [workflows](comments/workflows.md) (WF-CMT-01…10) |
| `OBJ-NOTI` | In-app notifications | [`notifications/`](notifications/) | [SCR-NOTI-01 Notifications](notifications/screens/notifications.md) `/notifications`, incl. the header bell | [business rules](notifications/business-rules.md) (BR-NOTI-001…017) · [workflows](notifications/workflows.md) (WF-NOTI-01…08) |

## Event → notification map (summary)

Full table with suppression rules and link checks: [BR-NOTI-002](notifications/business-rules.md#br-noti-002--event-catalogue).

| Event | Notification | Recipient |
| --- | --- | --- |
| First publish of a chapter (OBJ-EDT) | `chapter_published` | Followers of the story (OBJ-LIB) |
| Reply to a comment (OBJ-CMT) | `comment_replied` | Author of the parent comment |
| Collaboration invitation (OBJ-TEAM) | `collaboration_invited` (not switchable) | Invitee |
| Invitation answered (OBJ-TEAM) | `collaboration_accepted` / `collaboration_declined` | Inviter |
| Vote, like, new comment on my story, follow, hide | none | — |

## Cross-domain dependencies

| Depends on | What | Reference |
| --- | --- | --- |
| D-READING / OBJ-READ | Hosts the vote button and both comment panels; `can_read_chapter`; block anchors `b-<id>` and `#comments` | `packages/features/src/reader/screens/reader-screen.tsx:113-124`, `packages/features/src/reader/components/reader-blocks.tsx` |
| D-READING / OBJ-STORY | Story visibility rules (`BR-STORY-*`); story page shows comment/vote counters | — |
| D-LIBRARY / OBJ-LIB | Story follows are the audience of `chapter_published` | [BR-LIB-001](../library/library/business-rules.md#br-lib-001--follow-and-save-are-independent) |
| D-STUDIO / OBJ-EDT, OBJ-TEAM | Publishing emits `chapter.published`; invitations produce notices | `BR-EDT-*`, `BR-TEAM-*` |
| D-TRUST / OBJ-MOD, OBJ-ABU | Report button, moderator hide precedence; comment rate limits and spam filter | `BR-MOD-*`, `BR-ABU-*` |
| D-ACCOUNT / OBJ-SET, OBJ-AUTH | Notification switches UI; sign-in redirect | `BR-SET-*`, `BR-AUTH-*` |
| D-PLATFORM / OBJ-JOB, OBJ-SHELL | Outbox worker, counter reconcile job; header hosts the bell | `BR-JOB-*` |

## Domain-level open questions

- Q-CMT-01 — Should suspended accounts be able to edit/delete their own comments? (posting, liking and hiding already require an active account)
- Q-CMT-02 — Should threads update live or offer a sort toggle?
- Q-NOTI-01 — Notification retention period (nothing is ever purged today).
- Q-NOTI-02 — Should `chapter_published` for mature stories reach followers without age confirmation?
- Q-NOTI-03 — Which additional events should notify (new comment on my story, my comment hidden, new follower, new chapter from a followed author)? WBS 4.7, 5.4 and 6.2 list them as not done.
