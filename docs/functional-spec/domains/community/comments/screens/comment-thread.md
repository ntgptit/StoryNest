# SCR-CMT-01 — Comment thread (embedded panel)

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-CMT-01` |
| Business domain | [D-COMMUNITY Community & Engagement](../../overview.md) |
| Business object | [OBJ-CMT](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Comment thread (`CommentThread` widget) |
| Type | Embedded panel — no own route |
| Mounted in | (1) Chapter reader SCR-READ-01 (OBJ-READ) route `/story/[id]/[slug]/[chapterSlug]` (`apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx`), as `<section id="comments">` after the vote and report buttons: `packages/features/src/reader/screens/reader-screen.tsx:117-124` (chapter scope, newest first). (2) Same reader, bottom `Sheet` opened from the trailing button of each paragraph/heading: `packages/features/src/reader/components/reader-blocks.tsx:64-76` (paragraph scope, oldest first). |
| Component files | `packages/features/src/comments/components/comment-thread.tsx`, `comment-item.tsx`, `comment-composer.tsx`; hooks `packages/features/src/comments/hooks/use-comments.ts`; API `packages/features/src/comments/api/comments.api.ts`; model `packages/features/src/comments/model/comment.ts` |
| Roles | Guest (read), signed-in reader (write/reply/like/edit/delete own), story owner & co-author (hide/unhide), moderator (sees hidden) |
| Access guard | None at route level (reader is public); data guarded by `can_read_chapter` + `comment_listable` |
| Workflows | WF-CMT-01 … WF-CMT-10 ([workflows](../workflows.md)); entry for WF-NOTI-02 |
| Rules | BR-CMT-001 … BR-CMT-021 ([business rules](../business-rules.md)) |

## B. Components

| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-CMT-01-C01 | Section heading | "Comments" `h2`, section `aria-label` "Comments", anchor `#comments`, `scroll-mt-20` | `reader-screen.tsx:117-124` |
| SCR-CMT-01-C02 | Paragraph comment button | Trailing icon button on paragraph/heading, count when > 0, name "Comment on this paragraph (N)"; 50% opacity until hover/focus | `reader-blocks.tsx:42-59` |
| SCR-CMT-01-C03 | Paragraph sheet | Bottom sheet with three heights (peek / half / full, opens at half, drag the top or use the grabber button, pulled down closes), title "Comment on this paragraph", description = excerpt; also opened from the reader's quote tools | `reader-blocks.tsx`, `packages/ui/src/widgets/detent-sheet.tsx` |
| SCR-CMT-01-C04 | Composer | Textarea (sr-only label "Write a comment"/"Write a reply"), placeholder "Share your thoughts…", counter from 8,000 chars, inline error `role="alert"`, "Post"/"Posting…" (spinner) and, once the comment is in, a drawn check with "Posted" for 2 s (SubmitButton; it never delays the comment, which is already in the list; announced politely), optional "Cancel" | `comment-composer.tsx` |
| SCR-CMT-01-C05 | Guest sign-in link | Outline button "Sign in to comment" → `/login?next=` | `comment-thread.tsx:57-61` |
| SCR-CMT-01-C06 | Comment list | `ul` "Comment list"; skeleton ×2 while loading; empty text; ErrorState | `comment-thread.tsx:63-86` |
| SCR-CMT-01-C07 | Comment item | `article` named by author; header (name, relative time, "(edited)", ⋯ menu); hidden note; body (`whitespace-pre-line`); action row | `comment-item.tsx:99-238` |
| SCR-CMT-01-C08 | Item menu | ⋯ "Comment options": Edit, Delete (own visible); Hide comment / Unhide comment (manager) | `comment-item.tsx:109-129` |
| SCR-CMT-01-C09 | Like button | Heart + "N likes", `aria-pressed` | `comment-item.tsx:157-169` |
| SCR-CMT-01-C10 | Reply button & reply composer | "Reply" (`aria-expanded`), indented composer. On touch, swiping a top-level comment right by 60 px (a reply arrow fills behind it) opens the same composer (Lucian 078); replies, a guest and hidden comments get no swipe, and the Reply button stays the way for mouse, keyboard and screen readers | `comment-item.tsx`, `ui/widgets/swipe-to-reply.tsx` |
| SCR-CMT-01-C11 | Report button | `ReportButton kind="comment"` label "Report" (OBJ-MOD) | `comment-item.tsx:182-184` |
| SCR-CMT-01-C12 | Replies toggle & list | "View N replies"/"Hide replies", `ul` "Replies", "Load more replies" | `comment-item.tsx:204-270` |
| SCR-CMT-01-C13 | Placeholder | "This comment was deleted." | `comment-item.tsx:101-102` |
| SCR-CMT-01-C14 | Delete confirm dialog | "Delete this comment?" destructive confirm | `comment-item.tsx:220-237` |
| SCR-CMT-01-C15 | Load more | "Load more comments"/"Loading…" | `comment-thread.tsx:88-99` |
| SCR-CMT-01-C16 | Spoiler cover | `||text||` in a body renders covered until pressed (BR-CMT-022); the composer's helper line shows the hint | `comment-item.tsx` (`CommentBody`), `comment-composer.tsx`, `packages/ui/src/widgets/spoiler-text.tsx` |
| SCR-CMT-01-C17 | Reactions (Lucian 077, batch 4 · community4) | Under a visible comment: a chip per reaction that has any (emoji + count, `aria-pressed` when mine, named "Laugh, 3 people, including you") and a smiley "Add a reaction" that opens a picker (dialog, 6 emoji, arrow keys, Esc/outside press closes, focus returns). A chip pops only when the reader changes it (BR-CMT-023) | `comment-item.tsx`, `ui/widgets/reaction-bar.tsx` |
| SCR-CMT-01-C18 | Mention list (Lucian 268, batch 4 · community4) | The composer is a combobox: `@` opens a listbox under the @ ("Type the name of someone to mention" until a letter is typed; "Nobody by that name"), ↑/↓, Enter/Tab or press inserts `@username `, Esc closes; mentions get a soft mark; "Mentioning" shows the picked people. In a body, mentions are marked spans (BR-CMT-024) | `comment-composer.tsx`, `ui/widgets/mention-textarea.tsx` |

## C. User actions & system responses

| Field | SCR-CMT-01-A01 Load / page the thread |
| --- | --- |
| Trigger | Thread mounted; "Load more comments" |
| Preconditions | Session status known |
| Expected behavior | `list_comments` 21 rows; first 20 shown; button while more exist |
| State change | Infinite query pages appended |
| Validation | — |
| Error behavior | ErrorState with "Try again" (refetch) |
| Navigation | None |
| Evidence | `use-comments.ts:36-49`, `comment-thread.tsx:63-99` |

| Field | SCR-CMT-01-A02 Post a comment |
| --- | --- |
| Trigger | "Post" (submit) |
| Preconditions | Signed in |
| Expected behavior | Trimmed text sent with stable id; toast "Comment posted."; field cleared |
| State change | Chapter comment caches invalidated |
| Validation | Empty / > 10,000 → inline message, no request |
| Error behavior | Inline message by kind (BR-CMT-020); text & id kept |
| Navigation | None |
| Evidence | `comment-thread.tsx:44-60`, `comment-composer.tsx:44-63` |

| Field | SCR-CMT-01-A03 Open a paragraph thread |
| --- | --- |
| Trigger | Paragraph comment button |
| Preconditions | — |
| Expected behavior | Sheet opens with that block's thread; closing resets |
| State change | Local `open` block |
| Validation | — |
| Error behavior | As A01 inside the sheet |
| Navigation | None (URL unchanged) |
| Evidence | `reader-blocks.tsx:36`, `:53`, `:64-76` |

| Field | SCR-CMT-01-A04 Reply |
| --- | --- |
| Trigger | "Reply" → composer → "Post" |
| Preconditions | Signed in; top-level visible comment |
| Expected behavior | Reply posted in parent's block; composer closes; replies expand |
| State change | Caches invalidated; outbox event |
| Validation | As A02 |
| Error behavior | Inline in reply composer |
| Navigation | None |
| Evidence | `comment-item.tsx:189-202` |

| Field | SCR-CMT-01-A05 Show / hide replies, load more replies |
| --- | --- |
| Trigger | "View N replies" / "Hide replies" / "Load more replies" |
| Preconditions | `replyCount > 0` |
| Expected behavior | Replies oldest first, 20 per page |
| State change | Local toggle; replies query |
| Validation | — |
| Error behavior | Red line "Couldn't load comments" (no retry) |
| Navigation | None |
| Evidence | `comment-item.tsx:204-218`, `:242-270` |

| Field | SCR-CMT-01-A06 Like / unlike |
| --- | --- |
| Trigger | Heart button |
| Preconditions | Signed in (else → A11) |
| Expected behavior | Immediate toggle, server count applied |
| State change | Optimistic cache update; rollback on error |
| Validation | — |
| Error behavior | Toast with mapped message |
| Navigation | None |
| Evidence | `comment-item.tsx:69-78`, `use-comments.ts:146-177` |

| Field | SCR-CMT-01-A07 Edit own comment |
| --- | --- |
| Trigger | ⋯ → "Edit" → "Save" |
| Preconditions | Own, visible |
| Expected behavior | Toast "Edit saved."; composer closes |
| State change | Caches invalidated |
| Validation | As A02 + spam check server-side |
| Error behavior | Inline in edit composer |
| Navigation | None |
| Evidence | `comment-item.tsx:138-151` |

| Field | SCR-CMT-01-A08 Delete own comment |
| --- | --- |
| Trigger | ⋯ → "Delete" → confirm |
| Preconditions | Own, visible |
| Expected behavior | Toast "Comment deleted."; comment removed or placeholder |
| State change | Caches invalidated (on settle) |
| Validation | — |
| Error behavior | Error toast; dialog remains open |
| Navigation | None |
| Evidence | `comment-item.tsx:220-237`, `use-comments.ts:113-126` |

| Field | SCR-CMT-01-A09 Hide / unhide (story manager) |
| --- | --- |
| Trigger | ⋯ → "Hide comment" / "Unhide comment" |
| Preconditions | Owner/co-author; visible (hide) or author-hidden (unhide) |
| Expected behavior | Toast "Comment hidden." / "Comment unhidden."; note shown |
| State change | Caches invalidated |
| Validation | — |
| Error behavior | Error toast (PT409 moderator-hidden / deleted) |
| Navigation | None |
| Evidence | `comment-item.tsx:80-87`, `:125-126` |

| Field | SCR-CMT-01-A10 Report |
| --- | --- |
| Trigger | "Report" |
| Preconditions | Not own; visible |
| Expected behavior | Report dialog (OBJ-MOD) |
| State change | — |
| Validation | OBJ-MOD |
| Error behavior | OBJ-MOD |
| Navigation | None |
| Evidence | `comment-item.tsx:182-184` |

| Field | SCR-CMT-01-A11 Guest sign-in |
| --- | --- |
| Trigger | "Sign in to comment" or heart as guest |
| Preconditions | Guest |
| Expected behavior | Go to `/login?next=<pathname>` |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/login` (returns to chapter top; `#comments`/paragraph not kept) |
| Evidence | `comment-thread.tsx:38`, `comment-item.tsx:67-73` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Nothing (composer/sign-in hidden) while session loads; queries wait for `ready` — `comment-thread.tsx:43-61`, `use-comments.ts:47` |
| Loading | Implemented | 2 skeleton rows `aria-busy`; replies "Loading…"; load-more "Loading…" — `comment-thread.tsx:70-75`, `comment-item.tsx:244` |
| Empty | Implemented | "No comments yet. Be the first." / "No comments on this paragraph yet." — `comment-thread.tsx:76-77` |
| Populated | Implemented | List + paging — `comment-thread.tsx:78-99` |
| Validation error | Implemented | Inline under textarea, `aria-invalid` — `comment-composer.tsx:73-88` |
| Request error | Implemented | ErrorState + retry (list); inline (composer); toast (like/hide/delete); replies: text without retry — Recommended: add retry to reply list |
| Success | Implemented | Toasts for post/edit/delete/hide/unhide; **no toast for a reply** (U-CMT-03) |
| Disabled | Implemented | Composer disabled while sending; like disabled while pending — `comment-composer.tsx:76`, `comment-item.tsx:164` |
| Unauthorized | Implemented | Guest sign-in link; no menu for non-owners; managers only see hide/unhide — `comment-item.tsx:61-66` |
| Offline | Implemented (generic) | Network errors mapped to "No connection…"; no offline queue — `model/comment.ts:144-145` |
| Unsaved changes | Missing | Cancel on edit/reply or closing the sheet discards typed text without warning — Recommended for long comments |
| Live updates | Not applicable (not in scope) | Others' new comments appear only after refetch (window focus/remount); see F-CMT-03 |

## E. Acceptance criteria

- SCR-CMT-01-AC01 Given a guest on a published chapter, when the thread loads, then visible comments are listed and a "Sign in to comment" link is shown instead of the composer.
- SCR-CMT-01-AC02 Given a signed-in active reader, when they post "  Hay  ", then one comment "Hay" appears, the toast "Comment posted." shows and the field is cleared.
- SCR-CMT-01-AC03 Given the composer is empty or whitespace, when "Post" is pressed, then "Please enter some text." is shown and no request is sent.
- SCR-CMT-01-AC04 Given a text over 10,000 characters, when "Post" is pressed, then "The comment is too long (10,000 characters max)." is shown.
- SCR-CMT-01-AC05 Given a send failed with a network error, when the reader retries, then the same id is sent and at most one comment exists.
- SCR-CMT-01-AC06 Given a comment with 3 links, when posted, then the composer keeps the text and shows the spam message.
- SCR-CMT-01-AC07 Given 10 comments in the last 10 minutes, when an 11th is posted, then "You're commenting too fast. Wait a moment and try again." is shown.
- SCR-CMT-01-AC08 Given 25 chapter comments, when the thread loads, then 20 newest show and "Load more comments" loads the remaining 5 without duplicates.
- SCR-CMT-01-AC09 Given a paragraph button is pressed, when the sheet opens, then only that paragraph's comments show, oldest first, and a new comment raises the margin count.
- SCR-CMT-01-AC10 Given a reply, when it is viewed, then it has no "Reply" button, and replying to a reply via API fails with 22023.
- SCR-CMT-01-AC11 Given my comment, when I delete it after confirming, then it disappears (or becomes "This comment was deleted." if it has replies) and its replies stay.
- SCR-CMT-01-AC12 Given someone else's comment, when I open the thread, then no ⋯ menu is shown and a "Report" button is.
- SCR-CMT-01-AC13 Given I am the story owner, when I hide a reader's comment, then other readers no longer see it and I see "You hid this comment. Other readers can't see it." with "Unhide comment".
- SCR-CMT-01-AC14 Given a moderator hid a comment on my story, when I open its menu, then there is no "Unhide comment" and the note says "A moderator hid this comment. You can't unhide it."
- SCR-CMT-01-AC15 Given a like is refused by the server, when it fails, then the heart and count revert and an error toast shows.
- SCR-CMT-01-AC16 Given a reply notification link with `#comments` or `#b-<block>`, when opened, then the reader scrolls to the comments section or the paragraph (Inferred: native anchor scroll; not runtime-verified).
- SCR-CMT-01-AC17 [Proposed] Given a comment that was hidden and unhidden without a text change, when listed, then it is not marked "(edited)" (F-CMT-01).
- SCR-CMT-01-AC18 [Proposed] Given a reply notification for a paragraph thread, when opened, then the paragraph sheet opens with the parent's replies expanded and the reply highlighted (U-NOTI-01).
- SCR-CMT-01-AC19 [Proposed] Given a guest presses "Sign in to comment" in a paragraph sheet, when they return after sign-in, then the reader is at the same paragraph/thread (U-CMT-02).
- SCR-CMT-01-AC21 Given a comment "End: ||the butler did it||", when listed, then "the butler did it" is covered by a button "Spoiler, tap to show" and is shown after a press or Enter; the stored body keeps the bars.
- SCR-CMT-01-AC20 [Proposed] Given a touch device, when the paragraph comment button is tapped, then its target is at least 24×24 CSS px (U-CMT-01).

## F. Findings referenced

F-CMT-01, F-CMT-02, F-CMT-03, F-CMT-04, U-CMT-01, U-CMT-02, U-CMT-03, U-CMT-04, U-NOTI-01, F-NOTI-02 (reported by the analysis
run; to be merged into `audits/`).

## G. Open questions

- Q-CMT-01 — Should suspended accounts be able to edit or delete their own comments (posting and liking are blocked)?
- Q-CMT-02 — Should comment threads update live (Realtime) or offer a sort toggle (newest/oldest/most liked)?
