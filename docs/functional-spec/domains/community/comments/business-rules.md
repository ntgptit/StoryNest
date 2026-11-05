# OBJ-CMT — Comments: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-CMT` |
| Name | Comments (chapter-level and paragraph/inline comments, replies, likes, author moderation) |
| Business purpose | Let readers discuss a chapter as a whole or one paragraph, while letting the story's managers and moderators keep the discussion clean |
| User goals | Read what others think; post, reply, like; fix or remove my own words; (story owner/co-author) hide abusive comments on my story |
| Actors / roles | Guest (read only) · Signed-in reader with an active account (write, reply, like, edit/delete own) · Story owner and co-author (hide/unhide on their story) · Editor collaborator (no moderation) · Moderator (sees and changes everything, via OBJ-MOD) · System (counters, outbox) |
| Related entities | Tables `comments`, `comment_likes`, `comment_hides`, `chapter_stats.comments`, `story_stats.comments`, `outbox_events`. Type `comment_card`. RPCs `list_comments`, `list_replies`, `comment_counts_by_block`, `post_comment`, `edit_comment`, `delete_comment`, `set_comment_like`, `set_comment_hidden`, `can_moderate_comments`. Triggers `comments_check_parent`, `comments_count`, `comments_record_hide`, `comments_guard_abuse`, `comments_emit_reply`, `comments_touch` |
| Dependencies | OBJ-READ (chapter reader hosts the thread; `can_read_chapter`), OBJ-ABU (rate limits, spam filter — `BR-ABU-*`), OBJ-MOD (report button, moderator hide/restore — `BR-MOD-*`), OBJ-NOTI (reply notification — [BR-NOTI-004](../notifications/business-rules.md#br-noti-004--comment_replied-someone-replied-to-my-comment)), OBJ-JOB (outbox worker, counter reconcile job — `BR-JOB-*`), OBJ-AUTH (sign-in redirect) |
| Screens | [SCR-CMT-01 Comment thread](screens/comment-thread.md) (embedded panel in the chapter reader, OBJ-READ) |
| Source | `supabase/migrations/20261104000700_comments.sql`, `…001800_comment_moderation_by_author.sql`, `…001200_counter_unification.sql`, `…002200_abuse_limits.sql`, `…001100_comment_reply_notifications.sql`; `packages/features/src/comments/**` |
| WBS | WP 4.2 (comments), 4.8 (counters), 6.2 (author moderation), 6.8 (abuse limits, partial) |

Rule summary

| ID | Rule | Status |
| --- | --- | --- |
| BR-CMT-001 | Who can read comments | Verified (SQL test) |
| BR-CMT-002 | Who can post | Verified (SQL test) |
| BR-CMT-003 | Comment text length and trimming | Verified (SQL test) |
| BR-CMT-004 | Chapter scope vs paragraph scope | Verified (SQL test) |
| BR-CMT-005 | One level of replies, reply inherits parent's paragraph | Verified (SQL test) |
| BR-CMT-006 | Duplicate-post protection | Verified (SQL test) |
| BR-CMT-007 | Ordering and pagination | Verified (SQL test) |
| BR-CMT-008 | Placeholder for a removed parent | Verified (SQL test) |
| BR-CMT-009 | Edit own comment and the "edited" mark | Verified (SQL test) |
| BR-CMT-010 | Soft delete own comment | Verified (SQL test) |
| BR-CMT-011 | Likes | Verified (SQL test) |
| BR-CMT-012 | Per-paragraph comment counts (margin badges) | Verified (SQL test) |
| BR-CMT-013 | Visibility of a hidden comment | Verified (SQL test) |
| BR-CMT-014 | Story author moderation (hide / unhide) | Verified (SQL test) |
| BR-CMT-015 | Hidden-state notices per viewer | Verified |
| BR-CMT-016 | Comment counters | Verified (SQL test) |
| BR-CMT-017 | Abuse limits as applied to comments | Verified (SQL test) |
| BR-CMT-018 | Reporting a comment | Verified |
| BR-CMT-019 | Guest interaction | Verified |
| BR-CMT-020 | Error contract and messages | Verified |
| BR-CMT-021 | Reply event emission | Verified (SQL test) |

## 2. Rules

### BR-CMT-001 — Who can read comments
| Field | Value |
| --- | --- |
| Description | Comments are readable by anyone (including guests) who can read the chapter. A row is "listable" when the chapter is readable AND (it is visible and not deleted, OR the caller is its author and it is hidden, OR it is hidden and the caller manages the story, OR the caller is a moderator). |
| Preconditions | `can_read_chapter(chapter_id)` is true (published chapter of a non-deleted public/unlisted non-draft story, or the caller has a story role, or is a moderator — owned by `BR-READ-*`/`BR-STORY-*`). |
| Conditions | Evaluated per row by `comment_listable()`; guests have no uid so the author test reads as "no" (`coalesce(..., false)`). |
| Expected behavior | `list_comments` returns nothing (no error) for an unreadable chapter; non-listable rows are either omitted or turned into a placeholder (BR-CMT-008). Author name, text and author id are blanked on non-listable cards. |
| Exceptions | Editor collaborators see hidden comments only as placeholders (not managers). |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104001800_comment_moderation_by_author.sql:68-77`, `supabase/migrations/20261104000700_comments.sql:150-152`, `:100-130`, `supabase/migrations/20261103000100_auth_and_rls.sql:269-271`, `supabase/tests/130_comments.test.sql:80-84`, `supabase/tests/240_comment_moderation_by_author.test.sql:95-104` |
| Status | Verified (SQL test) |

### BR-CMT-002 — Who can post
| Field | Value |
| --- | --- |
| Description | Only a signed-in user with an active account who can read the chapter may post a comment or reply. |
| Preconditions | `auth.uid()` set; `is_active_account()`; `can_read_chapter(chapter_id)`. |
| Conditions | `post_comment` is SECURITY INVOKER, so the `comments_insert` RLS policy applies on top of the RPC checks. |
| Expected behavior | Guest → `42501`; suspended account → refused; chapter of a private story → refused. The UI shows the composer only to signed-in users (guests get a "Sign in to comment" link, BR-CMT-019). |
| Exceptions | Moderators and service-role writes are exempt from abuse limits (BR-CMT-017), not from these checks. |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:197-210`, `supabase/migrations/20261103000100_auth_and_rls.sql:274-276`, `supabase/tests/130_comments.test.sql:57-63`, `packages/features/src/comments/components/comment-thread.tsx:43-61` |
| Status | Verified (SQL test) |

### BR-CMT-003 — Comment text length and trimming
| Field | Value |
| --- | --- |
| Description | A comment (or edit) is trimmed and must have 1–10,000 characters. |
| Preconditions | — |
| Conditions | Client: `checkBody` trims and compares with `DB_LIMITS.commentBody` (10,000). Server: `btrim` + length check in `post_comment`/`edit_comment`, and table CHECK `length(btrim(body)) BETWEEN 1 AND 10000`. |
| Expected behavior | Empty → "Please enter some text." (`commentText.validation.empty`); too long → "The comment is too long (10,000 characters max)." (`validation.tooLong`); nothing is sent. A character counter `used/max` appears once the text reaches 80% of the limit. Stored text is trimmed. |
| Exceptions | Server returns `22023` if a client bypasses the check. |
| Related screens | SCR-CMT-01 |
| Evidence | `packages/features/src/comments/model/comment.ts:116-126`, `packages/features/src/comments/components/comment-composer.tsx:14`, `:44-51`, `:80-88`, `packages/validation/src/limits.ts:12`, `supabase/migrations/20261104000700_comments.sql:211-213`, `:260-262`, `supabase/migrations/20261103000000_init_schema.sql:207`, `packages/features/src/comments/strings.en.ts:59` |
| Status | Verified (SQL test) |

### BR-CMT-004 — Chapter scope vs paragraph scope
| Field | Value |
| --- | --- |
| Description | A comment belongs to a chapter and optionally to one paragraph (`block_id`, the permanent block anchor). Chapter-level threads and paragraph threads are separate lists. |
| Preconditions | For a paragraph comment the block must belong to the same chapter. |
| Conditions | `list_comments(p_block_id NULL)` returns only chapter-level comments; with a block id only that paragraph's. In the reader only `paragraph` and `heading` blocks get a comment button (not images or dividers). |
| Expected behavior | Unknown block or a block of another chapter → `22023` "unknown paragraph". Chapter-level thread sits at the end of the chapter (`#comments`); paragraph thread opens in a bottom sheet. |
| Exceptions | Block ids are never recycled (FK `ON DELETE RESTRICT`), so anchors stay valid across versions. |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:155-160`, `:222-225`, `supabase/migrations/20261103000000_init_schema.sql:116`, `:203-204`, `packages/features/src/reader/components/reader-blocks.tsx:42-59`, `supabase/tests/130_comments.test.sql:66-67`, `:89-90` |
| Status | Verified (SQL test) |

### BR-CMT-005 — One level of replies; reply inherits the parent's paragraph
| Field | Value |
| --- | --- |
| Description | Replies are one level deep. A reply belongs to a top-level comment of the same chapter and sits in the parent's paragraph whatever block id the client sent. |
| Preconditions | Parent exists in the same chapter, is `visible` and not deleted. |
| Conditions | Enforced by RPC and by trigger `comments_check_parent` on every insert path. |
| Expected behavior | Reply to a reply → `22023`; parent of another chapter / unknown → `PT404`; parent deleted or hidden → `PT409`. UI: "Reply" only on visible top-level comments for signed-in users; replies never show a Reply button; after a successful reply the composer closes and the replies expand. |
| Exceptions | — |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:35-62`, `:215-221`, `supabase/tests/130_comments.test.sql:95-105`, `:137-139`, `packages/features/src/comments/components/comment-item.tsx:170-181`, `:189-202`, `packages/features/src/comments/comments.test.tsx:441`, `:464` |
| Status | Verified (SQL test) |

### BR-CMT-006 — Duplicate-post protection
| Field | Value |
| --- | --- |
| Description | A post is idempotent on its client-generated id, and the same text from the same author in the same place within 30 seconds returns the first comment instead of a duplicate. |
| Preconditions | Client generates an id per text being sent (`newId()`), kept across retries and renewed only after success. |
| Conditions | Same id + same author → returns id; same id used by another author → `PT409`; same body/chapter/block/parent within 30 s → returns the earlier id. |
| Expected behavior | Retrying after a lost response or double-submitting never creates two comments. Failed send keeps the text and the id. |
| Exceptions | A retry is also not counted against the rate limit (BR-CMT-017). |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:227-247`, `packages/features/src/comments/components/comment-composer.tsx:41`, `:55-58`, `supabase/tests/130_comments.test.sql:70-76`, `packages/features/src/comments/comments.test.tsx:309`, `:339` |
| Status | Verified (SQL test) |

### BR-CMT-007 — Ordering and pagination
| Field | Value |
| --- | --- |
| Description | Chapter thread: newest first. Paragraph thread: oldest first. Replies: oldest first. Keyset paging on `(created_at, id)`. |
| Preconditions | — |
| Conditions | Client page size 20 (`COMMENTS_PAGE_SIZE`), asks for 21 rows to know whether more exist; server clamps limit to 1–51. The cursor keeps the server's timestamp text (microseconds). |
| Expected behavior | "Load more comments" / "Load more replies" buttons appear while more exist and show "Loading…" while fetching; no row duplicated or skipped across pages, including ties. |
| Exceptions | No UI to change the sort order (the `newestFirst` prop exists, not exposed). |
| Related screens | SCR-CMT-01 |
| Evidence | `packages/features/src/comments/components/comment-thread.tsx:24`, `:88-99`, `packages/features/src/comments/model/comment.ts:83-104`, `packages/features/src/comments/api/comments.api.ts:15-29`, `supabase/migrations/20261104000700_comments.sql:148`, `:153-185`, `supabase/tests/130_comments.test.sql:196-213` |
| Status | Verified (SQL test) |

### BR-CMT-008 — Placeholder for a removed parent
| Field | Value |
| --- | --- |
| Description | A deleted or hidden top-level comment that still has listable replies is shown as a placeholder (no text, no author) so its replies keep context; with no listable replies left it disappears. |
| Preconditions | Caller cannot list the parent (BR-CMT-001). |
| Conditions | Card status becomes `deleted`, body/author null. |
| Expected behavior | UI draws "This comment was deleted." (`item.deletedPlaceholder`) in italics, with no actions; the replies toggle remains. Deleted replies simply disappear. |
| Exceptions | A comment hidden by a moderator is shown to other readers with the same "deleted" wording (the reason is not revealed). |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:159`, `supabase/migrations/20261104001800_comment_moderation_by_author.sql:95-106`, `packages/features/src/comments/components/comment-item.tsx:101-102`, `supabase/tests/130_comments.test.sql:133-145` |
| Status | Verified (SQL test) |

### BR-CMT-009 — Edit own comment and the "edited" mark
| Field | Value |
| --- | --- |
| Description | Only the author may edit, and only while the comment is `visible` and not deleted. The card says "(edited)" when `updated_at` is more than 1 s after `created_at`. |
| Preconditions | Signed in; own comment; visible. |
| Conditions | `edit_comment` trims and re-validates length (BR-CMT-003) and is spam-checked (BR-CMT-017). `updated_at` is set by `comments_touch` on **any** UPDATE (also status changes). |
| Expected behavior | Edit opens the composer in place with the current text, "Save"/"Saving…"; success → toast "Edit saved." and the thread reloads. Others' or hidden/deleted comments → `PT404`. |
| Exceptions | Known defect: a hide→unhide by the story author, or saving unchanged text, also produces "(edited)" (see F-CMT-01). No `is_active_account` check on edit (see F-CMT-02). |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:250-268`, `supabase/migrations/20261104001800_comment_moderation_by_author.sql:108`, `supabase/migrations/20261103000000_init_schema.sql:374-378`, `:385`, `packages/features/src/comments/components/comment-item.tsx:63`, `:108`, `:138-151`, `supabase/tests/130_comments.test.sql:113-121`, `:156` |
| Status | Verified (SQL test) |

### BR-CMT-010 — Soft delete own comment
| Field | Value |
| --- | --- |
| Description | The author may delete their own visible comment. Deletion is soft (`status='deleted'`, `deleted_at`), repeating is harmless. |
| Preconditions | Signed in; own comment. |
| Conditions | Visible → deleted. Already deleted → no-op. Hidden by a moderator or story author → `PT409` "hidden by a moderator". Not own / unknown → `PT404`. |
| Expected behavior | UI asks first: "Delete this comment?" / "The comment will disappear from the page. Its replies will be kept."; success → toast "Comment deleted."; failure → error toast and the dialog stays. Replies remain; parent becomes a placeholder (BR-CMT-008). Counter drops (BR-CMT-016). |
| Exceptions | No undo/restore for the author. |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:270-292`, `packages/features/src/comments/components/comment-item.tsx:117-124`, `:220-237`, `packages/features/src/comments/strings.en.ts:49-50`, `supabase/tests/130_comments.test.sql:125-131`, `:155` |
| Status | Verified (SQL test) |

### BR-CMT-011 — Likes
| Field | Value |
| --- | --- |
| Description | A signed-in active user can like/unlike any comment they can list; the count is public, each viewer's own flag is private. |
| Preconditions | Signed in, active account, comment listable. |
| Conditions | `set_comment_like(id, liked)` is idempotent and returns the count; `NULL` flag → `22023`; unknown/unlistable → `PT404`. |
| Expected behavior | UI toggles at once in every cached list showing that comment (not the margin counts), then takes the server count; refusal restores the previous state and shows an error toast. Button is disabled while pending; `aria-pressed` reflects state; label "Like"/"Unlike". Guests: label "Sign in to like" → login (BR-CMT-019). |
| Exceptions | Liking one's own comment is allowed. Placeholders have no like button. |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:294-319`, `packages/features/src/comments/hooks/use-comments.ts:128-177`, `packages/features/src/comments/model/comment.ts:106-110`, `packages/features/src/comments/components/comment-item.tsx:69-78`, `:157-169`, `supabase/tests/130_comments.test.sql:163-181`, `packages/features/src/comments/comments.test.tsx:386-432` |
| Status | Verified (SQL test) |

### BR-CMT-012 — Per-paragraph comment counts
| Field | Value |
| --- | --- |
| Description | Each commentable paragraph shows how many listable comments (replies included) it has. |
| Preconditions | Chapter readable. |
| Conditions | One `comment_counts_by_block(chapter)` call per chapter; count respects BR-CMT-001 per viewer. |
| Expected behavior | The trailing button shows the count beside the icon when > 0; its accessible name is "Comment on this paragraph (N)" / "Comment on this paragraph". Counts refresh after any comment write in the chapter. |
| Exceptions | The SQL assertion that hidden comments are excluded from others' counts is vacuous (see F-CMT-04). |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104000700_comments.sql:187-194`, `packages/features/src/comments/api/comments.api.ts:44-52`, `packages/features/src/reader/components/reader-blocks.tsx:35`, `:50-59`, `packages/features/src/comments/strings.en.ts:55`, `supabase/tests/130_comments.test.sql:91`, `:108` |
| Status | Verified (SQL test) |

### BR-CMT-013 — Visibility of a hidden comment
| Field | Value |
| --- | --- |
| Description | A hidden comment stays visible (with its text) to its author, the story's managers and moderators; everyone else sees a placeholder or nothing. The card status says who hid it: `hidden` (moderator) or `author_hidden` (story author). |
| Preconditions | `status='hidden'`. |
| Conditions | "Hidden by author" only when `comment_hides.source='author'`; a hidden comment without such a row counts as a moderator's. |
| Expected behavior | Author cannot edit, delete or unhide a moderator-hidden comment (`PT404`/`PT409`). Client maps `author_hidden` → status `hidden` + `hiddenBy='author'`. |
| Exceptions | — |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104001800_comment_moderation_by_author.sql:10-18`, `:101-106`, `packages/features/src/comments/model/comment.ts:45-55`, `supabase/tests/130_comments.test.sql:149-159` |
| Status | Verified (SQL test) |

### BR-CMT-014 — Story author moderation (hide / unhide)
| Field | Value |
| --- | --- |
| Description | The story owner and co-authors (not editors) may hide a visible comment on their story and unhide one they hid. A moderator's hide cannot be undone by the story author. |
| Preconditions | Signed in, active; `can_moderate_comments(chapter)` (owner or co_author); comment readable. |
| Conditions | `set_comment_hidden(id, hidden)` (SECURITY DEFINER, idempotent) returns `visible`/`author_hidden`/`hidden`. Deleted → `PT409`; moderator-hidden + unhide → `PT409`; not a manager → `42501`; unknown → `PT404`. Every status change writes/clears `comment_hides` via trigger; a moderator re-hide overrides to `moderator`. Authors have no direct UPDATE right to `hidden`. |
| Expected behavior | Comment menu (⋯ "Comment options") shows "Hide comment" on visible comments and "Unhide comment" only on author-hidden ones; toast "Comment hidden." / "Comment unhidden."; refusal → error toast; lists reload. Counter −1 on hide, +1 on unhide. |
| Exceptions | The commenter is not notified of the hide (WBS 6.2 "Chưa làm"; F-NOTI-04). A manager may hide their own comment through this menu (UI offers it since `canHide` does not exclude own). |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104001800_comment_moderation_by_author.sql:25-66`, `:118-162`, `packages/features/src/comments/hooks/use-comments.ts:179-205`, `packages/features/src/comments/components/comment-item.tsx:54-66`, `:80-87`, `:125-126`, `supabase/tests/240_comment_moderation_by_author.test.sql:67-113`, `docs/WBS.md:220` |
| Status | Verified (SQL test) |

### BR-CMT-015 — Hidden-state notices per viewer
| Field | Value |
| --- | --- |
| Description | A hidden comment shown to a privileged viewer carries a note explaining who hid it. |
| Preconditions | Card status `hidden`. |
| Conditions | Author-hidden: manager sees "You hid this comment. Other readers can't see it."; commenter sees "The story's author hid this comment. Only you and the author can see it." Moderator-hidden: manager (not own) sees "A moderator hid this comment. You can't unhide it."; commenter sees "A moderator hid this comment. Only you can see it." |
| Expected behavior | Rendered as `role="note"` box above the text; no Reply/Report on hidden comments. |
| Exceptions | Moderators viewing via the reader get the commenter-style text. |
| Related screens | SCR-CMT-01 |
| Evidence | `packages/features/src/comments/components/comment-item.tsx:89-93`, `:132-136`, `packages/features/src/comments/strings.en.ts:40-43`, `packages/features/src/comments/comments.test.tsx:634-672` |
| Status | Verified |

### BR-CMT-016 — Comment counters
| Field | Value |
| --- | --- |
| Description | `chapter_stats.comments` and `story_stats.comments` count comments (replies included) with status `visible`. |
| Preconditions | — |
| Conditions | AFTER INSERT/DELETE/UPDATE OF status trigger moves both counters in the same transaction; text edits do not; a chapter being deleted is skipped; never below 0. Daily `reconcile_counters()` (03:41) repairs drift (job owned by `BR-JOB-*`). |
| Expected behavior | Hide/delete −1; unhide/restore +1. Story page "Comments" stat reads `story_stats` (OBJ-STORY). |
| Exceptions | — |
| Related screens | — (shown on story page, OBJ-STORY) |
| Evidence | `supabase/migrations/20261104001200_counter_unification.sql:19-57`, `:138`, `:152`, `supabase/tests/240_comment_moderation_by_author.test.sql:63`, `:91`, `docs/WBS.md:196` |
| Status | Verified (SQL test) |

### BR-CMT-017 — Abuse limits as applied to comments
| Field | Value |
| --- | --- |
| Description | Every new comment (any insert path) is rate-limited and spam-checked; edits that change text are spam-checked only. Thresholds and mechanics are owned by `BR-ABU-*` (`abuse_limits`: 10 per 600 s, 200 per day, > 2 links, > 20 identical characters in a row). |
| Preconditions | Caller signed in and not a moderator (moderators, service role, worker and seed are exempt). |
| Conditions | Rate count includes replies and deleted comments (deleting gives no new allowance). A retry of an existing id is not counted. Spam → `22023` with HINT `spam`; limit → `PT429` with HINT = limit code. |
| Expected behavior | Composer keeps the text and shows inline: spam → "The comment was rejected because it looks like spam (too many links or repeated characters)."; rate limit → "You're commenting too fast. Wait a moment and try again." |
| Exceptions | The 30-second duplicate check (BR-CMT-006) runs before the insert, so a resubmitted duplicate is neither counted nor spam-checked. |
| Related screens | SCR-CMT-01 |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:1-18`, `:76-117`, `packages/features/src/comments/model/comment.ts:128-149`, `packages/features/src/_shared/errors.ts:90`, `packages/validation/src/rpc.ts:32`, `packages/features/src/comments/strings.en.ts:65-66`, `docs/WBS.md:226` |
| Status | Verified (SQL test) |

### BR-CMT-018 — Reporting a comment
| Field | Value |
| --- | --- |
| Description | A "Report" button is offered on visible comments that are not the viewer's own. Report submission rules are owned by `BR-MOD-*`. |
| Preconditions | Comment visible; viewer is not its author. |
| Conditions | — |
| Expected behavior | `ReportButton kind="comment"` (label "Report") opens the report flow (OBJ-MOD). |
| Exceptions | Not shown on hidden comments or placeholders. |
| Related screens | SCR-CMT-01 |
| Evidence | `packages/features/src/comments/components/comment-item.tsx:182-184`, `supabase/migrations/20261104002200_abuse_limits.sql:149-155`, `packages/features/src/comments/comments.test.tsx:536` |
| Status | Verified |

### BR-CMT-019 — Guest interaction
| Field | Value |
| --- | --- |
| Description | Guests can read every listable comment. Writing and liking send them to sign in and back. |
| Preconditions | `auth.status = unauthenticated`. |
| Conditions | Composer replaced by an outline button "Sign in to comment" → `/login?next=<current pathname>`; Like → same redirect; Reply is not shown; no moderation query is made. |
| Expected behavior | After sign-in the user returns to the chapter path (hash/scroll position is not kept, see U-CMT-02). While the session is loading neither composer nor sign-in link is shown, and list queries wait. |
| Exceptions | — |
| Related screens | SCR-CMT-01 |
| Evidence | `packages/features/src/comments/components/comment-thread.tsx:38`, `:43-61`, `packages/features/src/comments/components/comment-item.tsx:67-73`, `:170`, `packages/features/src/comments/hooks/use-comments.ts:30-33`, `:183-187`, `packages/features/src/comments/comments.test.tsx:241`, `:432` |
| Status | Verified |

### BR-CMT-020 — Error contract and messages
| Field | Value |
| --- | --- |
| Description | RPC errors map to fixed user messages. |
| Preconditions | — |
| Conditions | `42501` → "You can't comment here."; `PT404` → "This comment no longer exists or you don't have access to it."; `PT409` → "This comment can't be changed right now."; `22023` → "Invalid content. Please check it and try again." (spam variant per BR-CMT-017); `PT429` → rate-limited text; network → "No connection. Check your network and try again."; other → "Something went wrong. Please try again." |
| Expected behavior | Composer errors render inline (`role="alert"`); like/hide/delete errors render as toasts. List load failure → ErrorState "Couldn't load comments" with "Try again"; reply list failure → small red "Couldn't load comments" line (no retry). |
| Exceptions | — |
| Related screens | SCR-CMT-01 |
| Evidence | `packages/features/src/comments/model/comment.ts:131-149`, `packages/features/src/comments/strings.en.ts:60-69`, `packages/features/src/comments/components/comment-thread.tsx:63-69`, `packages/features/src/comments/components/comment-item.tsx:242-245`, `supabase/migrations/20261104000700_comments.sql:26-28` |
| Status | Verified |

### BR-CMT-021 — Reply event emission
| Field | Value |
| --- | --- |
| Description | Inserting a reply (any path) writes outbox event `comment.replied` in the same transaction; the notification itself is produced by the worker per [BR-NOTI-004](../notifications/business-rules.md#br-noti-004--comment_replied-someone-replied-to-my-comment). |
| Preconditions | `parent_comment_id IS NOT NULL`. |
| Conditions | Dedupe key `comment.replied:<reply id>`; a top-level comment writes no event. |
| Expected behavior | One event per reply; re-emission is a no-op. |
| Exceptions | — |
| Related screens | — |
| Evidence | `supabase/migrations/20261104001100_comment_reply_notifications.sql:24-39`, `supabase/tests/170_comment_reply_notifications.test.sql:44-51`, `:72`, `:120` |
| Status | Verified (SQL test) |
