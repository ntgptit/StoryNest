# SCR-LIST-01 — Reading list

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-LIST-01` |
| Business domain | [D-LIBRARY Library](../../overview.md) |
| Business object | [OBJ-LIST](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Reading list page (+ list form dialog, add-to-list sheet and My lists as components) |
| Route | `/lists/[id]` |
| Route files | `apps/web/src/app/(main)/lists/[id]/page.tsx` (no auth guard; title "Danh sách đọc"; `robots: noindex`), `apps/web/src/app/(main)/lists/[id]/list-view.tsx` |
| Screen component | `packages/features/src/lists/screens/list-screen.tsx` |
| Roles | Owner (full control) · Signed-in visitor / guest (read unlisted & public lists) |
| Navigation entry | Library → Lists tab → list row; shared link. No `/lists` index route. Not linked from author pages |
| Workflows | WF-LIST-01 … WF-LIST-09 ([workflows](../workflows.md)) |
| Rules | BR-LIST-001 … BR-LIST-014 ([business rules](../business-rules.md)) |

## B. Components

| ID | Component | Where mounted | Description | Evidence |
| --- | --- | --- | --- | --- |
| SCR-LIST-01-C01 | Page header | This page | Title = list title; description if non-empty; owner actions "Edit" (outline) and "Delete list" (ghost, destructive). Owner: the title is an inline editor (Lucian #033, `InlineEditTitle`): pressing it (or the pencil shown on hover / always on touch) turns it into a field "List name" with save (check, "Save name") and cancel; Enter or leaving the field saves through the same `useUpdateList` (description and visibility unchanged), Esc restores; the name rules are `checkListForm` (blank / over 120 refused, field shakes, reason under it); a failed save keeps the field open with the message; success toast "List renamed." and a short gleam. The edit dialog stays for description and visibility | `list-screen.tsx`, `packages/ui/src/widgets/inline-edit-title.tsx` |
| SCR-LIST-01-C02 | Meta line | This page | Owner: visibility badge (lock / link / globe) + "Back to library"; visitor: "<name>'s list"; both: "N stories" | `list-screen.tsx:109-124` |
| SCR-LIST-01-C03 | Story grid | This page | `ul` "Stories in this list", 2/3/4 columns, `StoryCard` | `list-screen.tsx:186-239` |
| SCR-LIST-01-C04 | Owner item controls | This page | ↑ "Move up: <title>", ↓ "Move down: <title>" (icon buttons), "Remove from list" | `list-screen.tsx:195-235` |
| SCR-LIST-01-C05 | Empty / not-found / error | This page | EmptyState (owner/visitor variants), "List not found", ErrorState + retry; skeleton block while loading | `list-screen.tsx:65-78`, `:126-131` |
| SCR-LIST-01-C06 | Delete confirm dialog | This page | "Delete this list?" destructive | `list-screen.tsx:207-225` |
| SCR-LIST-01-C07 | List form dialog (`ListFormDialog`) | This page (edit mode, `list-screen.tsx:188-205`) and Library → Lists tab (create mode, `my-lists.tsx:84-100`) | Fields List name (Input), Description (Textarea + hint), Visibility (Select, led by a padlock icon — Lucian #350, `PadlockIcon`, decorative — closed for private, its shackle lifts for unlisted / public on change); description line shows the visibility hint; inline field errors; `role="alert"` failure; Cancel / "Create list" or "Save changes" / "Saving…" | `packages/features/src/lists/components/list-form-dialog.tsx:28-140` |
| SCR-LIST-01-C08 | My lists (`MyLists`) | Library page, "Lists" tab (`packages/features/src/library/screens/library-screen.tsx:61-63`) | "New list" button; rows (cover pile, title, "N stories · Updated …", visibility badge) linking to `/lists/{id}`; empty / error / skeleton. Cover pile (Lucian #369, `CoverStack`, decorative): the first 3 readable, non-deleted stories' covers in list order (embedded `preview:reading_list_items` in the same My lists query, ordered and limited in the embed; blank card for no cover / empty list); fans out a little on row hover or focus, motion-safe only | `packages/features/src/lists/components/my-lists.tsx:29-102` |
| SCR-LIST-01-C11 | [owner] Drag to reorder (Lucian #255 / #317) | Under each story card, before the arrows | A grip (pointer and touch, hidden from assistive tech; the arrows stay the keyboard route) lifts the card; it takes the place of the card under the pointer and the others fly aside; the drop goes through the same `reorder_list_items` call as the arrows (optimistic, rolled back on refusal). Any order change flies the cards; nothing animates on load. Hint "Drag the handle under a story to reorder, or use the up and down buttons." | `list-screen.tsx`, `packages/ui/src/widgets/sortable-list.tsx` |
| SCR-LIST-01-C10 | Share button & dialog (`ShareButton` → `ShareDialog`, Lucian #254 / #008) | This page: header actions (owner: before Edit; visitor of a public/unlisted list: alone) | Dialog "Share “<title>”" with the absolute list link (canonical origin) in a read-only field, "Copy" that turns into a check, and "Share with another app" where `navigator.share` exists. Owner only: an access row "Who can open the link" (lock / link / globe icon, spins on change) with a Select over private / unlisted / public and the existing visibility hint as explanation; a change goes through the same `useUpdateList` as the edit dialog. A visitor never sees the access row, and no one but the owner is offered the link of a private list | `list-screen.tsx` (`ListShareButton`), `packages/features/src/share/components/share-button.tsx`, `packages/ui/src/widgets/share-dialog.tsx` |
| SCR-LIST-01-C09 | Add-to-list button & sheet (`AddToListButton`) | Story page action group (`packages/features/src/story/components/story-actions.tsx:58`) | Outline "Add to list" button; bottom sheet "Add to list" (three heights: peek / half / full, opens at half, drag the top or use the grabber button, pulled down closes) with toggle buttons per list (`aria-pressed`, count) and "New list name" + "Create and add" | `packages/features/src/lists/components/add-to-list-button.tsx:22-165` |

## C. User actions & system responses

| Field | SCR-LIST-01-A01 Open a list |
| --- | --- |
| Trigger | Navigate to `/lists/{id}` |
| Preconditions | — |
| Expected behavior | Loads list + items once the session is known |
| State change | — |
| Validation | — |
| Error behavior | "List not found" (private/nonexistent); ErrorState on failure |
| Navigation | — |
| Evidence | `use-lists.ts:40-49`, `lists.api.ts:38-56` |

| Field | SCR-LIST-01-A02 Edit list |
| --- | --- |
| Trigger | "Edit" → dialog → "Save changes" |
| Preconditions | Owner |
| Expected behavior | Toast "Changes saved."; dialog closes; page refreshes |
| State change | Row updated |
| Validation | BR-LIST-003 inline |
| Error behavior | Inline alert in dialog |
| Navigation | None |
| Evidence | `list-screen.tsx:280-297`, `list-form-dialog.tsx:53-69` |

| Field | SCR-LIST-01-A03 Move a story up/down |
| --- | --- |
| Trigger | ↑ / ↓ |
| Preconditions | Owner; not at the end in that direction; no move pending |
| Expected behavior | Order changes at once; saved |
| State change | Optimistic cache; `sort_order` |
| Validation | Server: exact set of ids |
| Error behavior | Old order restored + toast |
| Navigation | None |
| Evidence | `list-screen.tsx:154-158`, `:144-163` |

| Field | SCR-LIST-01-A04 Remove a story |
| --- | --- |
| Trigger | "Remove from list" |
| Preconditions | Owner |
| Expected behavior | Toast "Removed from the list." with "Undo"; grid refreshes. Undo puts the story back (`add_story_to_list`, at the end) and then sends the previous order (`reorder_list_items`); if the list changed meanwhile the order is refused and the story stays at the end. Toast "The story is back in the list." |
| State change | Item deleted |
| Validation | — |
| Error behavior | Error toast |
| Navigation | None |
| Evidence | `list-screen.tsx:209-225` |

| Field | SCR-LIST-01-A05 Delete the list |
| --- | --- |
| Trigger | "Delete list" → confirm |
| Preconditions | Owner |
| Expected behavior | Toast "List deleted." |
| State change | List deleted |
| Validation | — |
| Error behavior | Error toast; dialog stays |
| Navigation | `/library` (Reading tab) |
| Evidence | `list-screen.tsx:299-317` |

| Field | SCR-LIST-01-A06 Open a story |
| --- | --- |
| Trigger | Story card |
| Preconditions | — |
| Expected behavior | Story page |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/story/{id}/{slug}` |
| Evidence | `list-screen.tsx:233-238` |

| Field | SCR-LIST-01-A07 Back to library |
| --- | --- |
| Trigger | "Back to library" (owner) |
| Preconditions | Owner |
| Expected behavior | Library opens (on Reading, not Lists — U-LIB-01) |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/library` |
| Evidence | `list-screen.tsx:216-220` |

| Field | SCR-LIST-01-A08 Create a list (C07 in My lists) |
| --- | --- |
| Trigger | "New list" → "Create list" |
| Preconditions | Signed in |
| Expected behavior | Toast "List created."; list appears first |
| State change | Row inserted (client id) |
| Validation | BR-LIST-003 |
| Error behavior | Inline alert, id reused |
| Navigation | None (stays on Lists tab) |
| Evidence | `my-lists.tsx:100-116` |

| Field | SCR-LIST-01-A09 Toggle a story in a list (C09) |
| --- | --- |
| Trigger | List toggle in the sheet |
| Preconditions | Signed in |
| Expected behavior | Added / removed toast; pressed state flips after refetch |
| State change | Item inserted/deleted |
| Validation | — |
| Error behavior | Error toast |
| Navigation | None |
| Evidence | `add-to-list-button.tsx:107-116`, `:133-153` |

| Field | SCR-LIST-01-A10 Create and add (C09) |
| --- | --- |
| Trigger | "Create and add" |
| Preconditions | Non-empty name |
| Expected behavior | Private list created with the story; toast |
| State change | List + item |
| Validation | Empty → button disabled; > 120 → silently ignored |
| Error behavior | Error toast; id kept |
| Navigation | None |
| Evidence | `add-to-list-button.tsx:118-135`, `:154-162` |

| Field | SCR-LIST-01-A11 Share a list / change who can open it |
| --- | --- |
| Trigger | "Share" (C10) → "Copy" / "Share with another app"; owner: pick another access in the dialog |
| Preconditions | Owner (any visibility), or a visitor of a public / unlisted list |
| Expected behavior | Copy: link on the clipboard, check + "Copied" for 1.8 s, announced politely. Access change: shown at once, saved with the list's current title and description, toast `Changed to "<label>".`, then the reloaded list is shown |
| State change | Access change: `reading_lists.visibility` (same update as A02) |
| Validation | — |
| Error behavior | Clipboard blocked → toast "Couldn't copy. Select the link and copy it yourself."; refused access change → previous access back + error toast (`listErrorMessage`) |
| Navigation | None |
| Evidence | `list-screen.tsx`, `lists.test.tsx` (share tests), `share/share.test.tsx` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Query waits for session (`ready`) — `use-lists.ts:46` |
| Loading | Implemented | One large skeleton `aria-busy` (page); 2–3 row skeletons (sheet, My lists) |
| Empty | Implemented | Owner / visitor variants; sheet and My lists empty texts |
| Populated | Implemented | Grid in stored order |
| Validation error | Implemented | Dialog field errors (`aria-invalid`); sheet quick-create: Missing for > 120 (U-LIST-02) |
| Request error | Implemented | ErrorState (page/My lists), inline alert (dialog), toasts (actions), retry block (sheet) |
| Success | Implemented | Toasts for create/save/add/remove/delete |
| Disabled | Implemented | Move buttons at ends and while pending; toggles while pending; submit while sending |
| Unauthorized | Implemented | Private list → "List not found"; visitors get no controls; guest "Add to list" → login |
| Offline | Implemented (generic) | Network message |
| Unsaved changes | Missing | Closing the dialog discards edits without warning (Recommended for description edits) |
| Unavailable story in list | Missing | Silently hidden, even for the owner (F-LIST-02) |

## E. Acceptance criteria

- SCR-LIST-01-AC01 Given a private list, when another signed-in user or a guest opens its link, then "List not found" / "This list doesn't exist or is private." is shown.
- SCR-LIST-01-AC02 Given an unlisted list, when a guest opens its link, then the list and its readable stories are shown without any controls, with "<owner>'s list".
- SCR-LIST-01-AC03 Given I own the list, when I open it, then I see Edit, Delete list, the visibility badge and "Back to library".
- SCR-LIST-01-AC04 Given the create dialog with an empty name, when I press "Create list", then "Please enter a list name." is shown and nothing is sent.
- SCR-LIST-01-AC05 Given a name of 121 characters in the dialog, when I submit, then "The list name can be up to 120 characters." is shown.
- SCR-LIST-01-AC06 Given a create request whose answer was lost, when I retry, then only one list exists.
- SCR-LIST-01-AC07 Given stories A, B, C, when I press ↓ on A, then the order becomes B, A, C immediately and stays after reload.
- SCR-LIST-01-AC08 Given the list was changed in another tab, when I move a story, then the old order returns and the conflict message is shown.
- SCR-LIST-01-AC09 Given ↑ on the first story or ↓ on the last, then those buttons are disabled.
- SCR-LIST-01-AC10 Given I press "Delete list" and confirm, then the toast "List deleted." shows and I land on `/library`.
- SCR-LIST-01-AC11 Given the story page as a guest, when I press "Add to list", then I am sent to `/login?next=<story path>`.
- SCR-LIST-01-AC12 Given the sheet, when I tap a list that does not contain the story, then the story is appended at the end of that list and `Added to "<name>".` shows; tapping again removes it.
- SCR-LIST-01-AC13 Given I have 100 lists, when I create another, then the conflict message is shown and no list is created.
- SCR-LIST-01-AC14 Given a story in my public list becomes private, when a visitor opens the list, then that story is not shown and "N stories" excludes it.
- SCR-LIST-01-AC15 [Proposed] Given a story in my list is no longer available, when I (the owner) open the list, then a placeholder lets me remove it (F-LIST-02).
- SCR-LIST-01-AC16 [Proposed] Given my list contains my own deleted story, when I reorder, then the reorder succeeds (F-LIST-01).
- SCR-LIST-01-AC17 Given an unlisted or public list, when I press "Share" and then "Copy", then the absolute list URL is copied and the button turns into a check with "Copied" (announced to screen readers) (U-LIST-01).
- SCR-LIST-01-AC19 Given I own the list, when I open Share, then I see who can open the link with its explanation and can change it there; a visitor sees the link only, and a private list's link is shown to its owner alone.
- SCR-LIST-01-AC20 Given I own a list of three stories, when I drag the first card onto the third, then the order shows 2,3,1 at once and `reorder_list_items` receives it; a visitor sees no grip.
- SCR-LIST-01-AC18 [Proposed] Given a quick-create name over 120 characters, when I press "Create and add", then the name-too-long message is shown (U-LIST-02).

## F. Findings referenced

F-LIST-01, F-LIST-02, F-LIST-03, F-LIST-04, U-LIST-01, U-LIST-02, U-LIST-03, U-LIB-01 (reported by the analysis
run; to be merged into `audits/`).

## G. Open questions

- Q-LIST-01 — Should lists show placeholders for unavailable stories (as the Library does) or keep hiding them?
- Q-LIST-02 — Is API-level enumeration of `unlisted` lists acceptable, or must `unlisted` be truly link-only (RPC by id)?
