# OBJ-CMT — Comments: workflows

All workflows run inside [SCR-CMT-01 Comment thread](screens/comment-thread.md), which is mounted twice in the chapter
reader (OBJ-READ, `/story/[id]/[slug]/[chapterSlug]`): the chapter thread at the end of the chapter and a paragraph
thread in a bottom sheet.

| ID | Name | Status |
| --- | --- | --- |
| WF-CMT-01 | Read the comments of a chapter | Verified |
| WF-CMT-02 | Post a chapter comment | Verified |
| WF-CMT-03 | Comment on a paragraph | Verified |
| WF-CMT-04 | Reply to a comment (and notify its author) | Verified |
| WF-CMT-05 | Like / unlike a comment | Verified |
| WF-CMT-06 | Edit my comment | Verified |
| WF-CMT-07 | Delete my comment | Verified |
| WF-CMT-08 | Story author hides / unhides a comment | Verified |
| WF-CMT-09 | Guest tries to interact | Verified |
| WF-CMT-10 | Report a comment | Verified (hand-off to OBJ-MOD) |

### WF-CMT-01 — Read the comments of a chapter
| Field | Value |
| --- | --- |
| User goal | See what other readers said about the chapter |
| Trigger | Reader scrolls to the end of a chapter, or follows a `#comments` link (e.g. from a notification) |
| Preconditions | Chapter readable (BR-CMT-001) |
| Main flow | 1. Reader screen renders the `<section id="comments">` with heading "Comments". 2. `CommentThread` waits for the session to be known, then calls `list_comments(chapter, NULL, newest_first=true, limit 21)`. 3. Skeletons while pending. 4. Up to 20 top-level comments render newest first with author, relative time, "(edited)", like count, and "View N replies" when replies exist. 5. "Load more comments" fetches the next page by cursor. 6. "View N replies" loads replies oldest first; "Load more replies" pages them; "Hide replies" collapses. |
| Alternative flows | A1 No comments → "No comments yet. Be the first." A2 Removed parent with replies → placeholder (BR-CMT-008). A3 Viewer is author/manager of a hidden comment → text + note (BR-CMT-015). |
| Exception flows | E1 List load fails → ErrorState "Couldn't load comments" + "Try again". E2 Replies fail → inline "Couldn't load comments" (no retry button). E3 Chapter not readable → empty list (reader itself shows not-found, OBJ-READ). |
| Success criteria | Every listable comment reachable by paging, none duplicated |
| Postconditions | None (read only) |
| Affected objects | OBJ-CMT, OBJ-READ |
| Related screens | SCR-CMT-01 |
| Status | Verified (`packages/features/src/comments/components/comment-thread.tsx:21-102`, `supabase/tests/130_comments.test.sql:196-213`) |

### WF-CMT-02 — Post a chapter comment
| Field | Value |
| --- | --- |
| User goal | Share an opinion on the chapter |
| Trigger | Signed-in reader types in "Share your thoughts…" and presses "Post" |
| Preconditions | Active account; chapter readable (BR-CMT-002) |
| Main flow | 1. Client trims and validates (BR-CMT-003). 2. Button shows "Posting…", field disabled. 3. `post_comment(id, chapter, NULL, NULL, body)` with the id kept for this text. 4. Server applies abuse guard (BR-CMT-017), duplicate checks (BR-CMT-006), inserts; counter +1 (BR-CMT-016). 5. Toast "Comment posted."; field cleared; new id generated; chapter caches (lists, replies, counts) invalidated and refetched. |
| Alternative flows | A1 Same text resubmitted within 30 s / retry with same id → server returns the existing comment; UI behaves as success. |
| Exception flows | E1 Validation → inline message, nothing sent. E2 Spam / rate limit / forbidden / network → inline message, text and id kept for retry. |
| Success criteria | Exactly one comment created; visible at the top of the thread after reload |
| Postconditions | `comments` row `visible`; stats +1 |
| Affected objects | OBJ-CMT, OBJ-ABU, OBJ-STORY (stat) |
| Related screens | SCR-CMT-01 |
| Status | Verified (`packages/features/src/comments/components/comment-thread.tsx:44-60`, `packages/features/src/comments/hooks/use-comments.ts:83-96`, `packages/features/src/comments/comments.test.tsx:292-358`) |

### WF-CMT-03 — Comment on a paragraph
| Field | Value |
| --- | --- |
| User goal | React to a specific paragraph |
| Trigger | Reader taps the small comment icon at the end of a paragraph or heading |
| Preconditions | Chapter readable |
| Main flow | 1. Bottom sheet opens: title "Comment on this paragraph", description = paragraph excerpt (≤ 120 chars). 2. `CommentThread` scoped to `blockId`, oldest first. 3. Posting follows WF-CMT-02 with `p_block_id`. 4. Margin count refreshes. |
| Alternative flows | A1 No comments → "No comments on this paragraph yet." |
| Exception flows | As WF-CMT-02; unknown block → "Invalid content…" |
| Success criteria | Comment appears in the paragraph thread and the margin count increases |
| Postconditions | `comments.block_id` set |
| Affected objects | OBJ-CMT, OBJ-READ |
| Related screens | SCR-CMT-01 (sheet variant) |
| Status | Verified (`packages/features/src/reader/components/reader-blocks.tsx:35-76`, `packages/features/src/comments/comments.test.tsx:367`, `:566-590`) |

### WF-CMT-04 — Reply to a comment (and notify its author)
| Field | Value |
| --- | --- |
| User goal | Answer another reader |
| Trigger | "Reply" on a visible top-level comment |
| Preconditions | Signed in, active; parent visible (BR-CMT-005) |
| Main flow | 1. Composer "Write a reply" opens indented under the comment, focused. 2. Submit → `post_comment(id, chapter, parent.block, parent.id, body)`. 3. Trigger writes `comment.replied` outbox event (BR-CMT-021). 4. Composer closes; replies expand; caches refresh. 5. Within ~1 min the worker creates the parent author's `comment_replied` notification (WF-NOTI-02). |
| Alternative flows | A1 Cancel closes the composer. |
| Exception flows | E1 Parent deleted/hidden meanwhile → "This comment can't be changed right now." (PT409). E2 As WF-CMT-02. |
| Success criteria | Reply listed under the parent; parent's reply count +1; parent's author notified unless suppressed |
| Postconditions | Reply row; outbox event; later a notification |
| Affected objects | OBJ-CMT, OBJ-NOTI, OBJ-JOB |
| Related screens | SCR-CMT-01, SCR-NOTI-01 |
| Status | Verified (`packages/features/src/comments/components/comment-item.tsx:193-206`; no success toast for replies, see U-CMT-03) |

### WF-CMT-05 — Like / unlike a comment
| Field | Value |
| --- | --- |
| User goal | Show appreciation |
| Trigger | Heart button |
| Preconditions | Signed in, active (BR-CMT-011) |
| Main flow | 1. Optimistic toggle in every list containing the comment. 2. `set_comment_like`. 3. Server count replaces the guess. |
| Alternative flows | — |
| Exception flows | E1 Refused → previous state restored, error toast. |
| Success criteria | Count consistent after reload |
| Postconditions | `comment_likes` row inserted/deleted |
| Affected objects | OBJ-CMT |
| Related screens | SCR-CMT-01 |
| Status | Verified (`packages/features/src/comments/hooks/use-comments.ts:146-177`) |

### WF-CMT-06 — Edit my comment
| Field | Value |
| --- | --- |
| User goal | Fix a typo or rephrase |
| Trigger | ⋯ menu → "Edit" on own visible comment |
| Preconditions | BR-CMT-009 |
| Main flow | 1. Text replaced by composer prefilled, autofocus, "Save" / "Cancel". 2. `edit_comment`. 3. Toast "Edit saved."; composer closes; "(edited)" shown after reload. |
| Alternative flows | A1 Cancel discards changes without confirmation. |
| Exception flows | E1 Spam / validation / PT404 → inline message, composer stays. |
| Success criteria | New text stored trimmed |
| Postconditions | `body`, `updated_at` changed |
| Affected objects | OBJ-CMT, OBJ-ABU |
| Related screens | SCR-CMT-01 |
| Status | Verified (`packages/features/src/comments/components/comment-item.tsx:140-153`, `packages/features/src/comments/comments.test.tsx:478`) |

### WF-CMT-07 — Delete my comment
| Field | Value |
| --- | --- |
| User goal | Remove what I wrote |
| Trigger | ⋯ menu → "Delete" |
| Preconditions | BR-CMT-010 |
| Main flow | 1. Confirm dialog "Delete this comment?". 2. Confirm → `delete_comment`. 3. Toast "Comment deleted."; lists refresh; counter −1. |
| Alternative flows | A1 Cancel. A2 Comment had replies → placeholder remains. |
| Exception flows | E1 Hidden by moderator → "This comment can't be changed right now." toast. |
| Success criteria | Comment gone for others; replies kept |
| Postconditions | `status='deleted'`, `deleted_at` set |
| Affected objects | OBJ-CMT |
| Related screens | SCR-CMT-01 |
| Status | Verified (`packages/features/src/comments/components/comment-item.tsx:224-241`, `packages/features/src/comments/comments.test.tsx:496`) |

### WF-CMT-08 — Story author hides / unhides a comment
| Field | Value |
| --- | --- |
| User goal | Keep my story's discussion clean |
| Trigger | Owner/co-author opens ⋯ on a comment in their story's chapter |
| Preconditions | `can_moderate_comments(chapter)` (cached 5 min); BR-CMT-014 |
| Main flow | 1. "Hide comment" → `set_comment_hidden(id, true)` → toast "Comment hidden."; others now see placeholder/nothing; manager sees "You hid this comment…". 2. Later "Unhide comment" → `set_comment_hidden(id, false)` → "Comment unhidden." |
| Alternative flows | A1 Moderator had hidden it → no Unhide option; note "A moderator hid this comment. You can't unhide it." |
| Exception flows | E1 Comment deleted meanwhile / moderator re-hid → PT409 toast. E2 Lost role → 42501 toast. |
| Success criteria | Hidden comment not visible to readers; counters adjusted |
| Postconditions | `comments.status`, `comment_hides` row |
| Affected objects | OBJ-CMT, OBJ-MOD (precedence) |
| Related screens | SCR-CMT-01 |
| Status | Verified (`packages/features/src/comments/comments.test.tsx:619-687`, `supabase/tests/240_comment_moderation_by_author.test.sql`) |

### WF-CMT-09 — Guest tries to interact
| Field | Value |
| --- | --- |
| User goal | Comment or like without an account |
| Trigger | "Sign in to comment" or the heart button |
| Preconditions | Not signed in |
| Main flow | 1. Navigate to `/login?next=<chapter path>`. 2. After sign-in (OBJ-AUTH) return to the chapter. 3. User scrolls back to the thread. |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | User returns to the same chapter signed in |
| Postconditions | Session established |
| Affected objects | OBJ-AUTH |
| Related screens | SCR-CMT-01 |
| Status | Verified (hash not preserved — U-CMT-02) |

### WF-CMT-10 — Report a comment
| Field | Value |
| --- | --- |
| User goal | Flag abusive content to moderators |
| Trigger | "Report" on someone else's visible comment |
| Preconditions | BR-CMT-018 |
| Main flow | Hand-off to the report flow of OBJ-MOD (`submit_report('comment', …)`). |
| Alternative flows | — |
| Exception flows | Owned by OBJ-MOD (`BR-MOD-*`, rate limit `BR-ABU-*`). |
| Success criteria | Report stored |
| Postconditions | `content_reports` row |
| Affected objects | OBJ-MOD |
| Related screens | SCR-CMT-01 |
| Status | Verified (entry point only) |
