# SCR-LIST-01 — Reading list

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-LIST-01` |
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
| SCR-LIST-01-C01 | Page header | This page | Title = list title; description if non-empty; owner actions "Edit" (outline) and "Delete list" (ghost, destructive) | `list-screen.tsx:87-108` |
| SCR-LIST-01-C02 | Meta line | This page | Owner: visibility badge (lock / link / globe) + "Back to library"; visitor: "<name>'s list"; both: "N stories" | `list-screen.tsx:109-124` |
| SCR-LIST-01-C03 | Story grid | This page | `ul` "Stories in this list", 2/3/4 columns, `StoryCard` | `list-screen.tsx:133-186` |
| SCR-LIST-01-C04 | Owner item controls | This page | ↑ "Move up: <title>", ↓ "Move down: <title>" (icon buttons), "Remove from list" | `list-screen.tsx:142-182` |
| SCR-LIST-01-C05 | Empty / not-found / error | This page | EmptyState (owner/visitor variants), "List not found", ErrorState + retry; skeleton block while loading | `list-screen.tsx:54-67`, `:126-131` |
| SCR-LIST-01-C06 | Delete confirm dialog | This page | "Delete this list?" destructive | `list-screen.tsx:207-225` |
| SCR-LIST-01-C07 | List form dialog (`ListFormDialog`) | This page (edit mode, `list-screen.tsx:188-205`) and Library → Lists tab (create mode, `my-lists.tsx:84-100`) | Fields List name (Input), Description (Textarea + hint), Visibility (Select); description line shows the visibility hint; inline field errors; `role="alert"` failure; Cancel / "Create list" or "Save changes" / "Saving…" | `packages/features/src/lists/components/list-form-dialog.tsx:28-140` |
| SCR-LIST-01-C08 | My lists (`MyLists`) | Library page, "Lists" tab (`packages/features/src/library/screens/library-screen.tsx:61-63`) | "New list" button; rows (title, "N stories · Updated …", visibility badge) linking to `/lists/{id}`; empty / error / skeleton | `packages/features/src/lists/components/my-lists.tsx:29-102` |
| SCR-LIST-01-C09 | Add-to-list button & sheet (`AddToListButton`) | Story page action group (`packages/features/src/story/components/story-actions.tsx:58`) | Outline "Add to list" button; bottom sheet "Add to list" with toggle buttons per list (`aria-pressed`, count) and "New list name" + "Create and add" | `packages/features/src/lists/components/add-to-list-button.tsx:22-165` |

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
| Evidence | `use-lists.ts:40-49`, `lists.api.ts:32-50` |

| Field | SCR-LIST-01-A02 Edit list |
| --- | --- |
| Trigger | "Edit" → dialog → "Save changes" |
| Preconditions | Owner |
| Expected behavior | Toast "Changes saved."; dialog closes; page refreshes |
| State change | Row updated |
| Validation | BR-LIST-003 inline |
| Error behavior | Inline alert in dialog |
| Navigation | None |
| Evidence | `list-screen.tsx:188-205`, `list-form-dialog.tsx:52-68` |

| Field | SCR-LIST-01-A03 Move a story up/down |
| --- | --- |
| Trigger | ↑ / ↓ |
| Preconditions | Owner; not at the end in that direction; no move pending |
| Expected behavior | Order changes at once; saved |
| State change | Optimistic cache; `sort_order` |
| Validation | Server: exact set of ids |
| Error behavior | Old order restored + toast |
| Navigation | None |
| Evidence | `list-screen.tsx:79-83`, `:144-163` |

| Field | SCR-LIST-01-A04 Remove a story |
| --- | --- |
| Trigger | "Remove from list" |
| Preconditions | Owner |
| Expected behavior | Toast "Removed from the list."; grid refreshes |
| State change | Item deleted |
| Validation | — |
| Error behavior | Error toast |
| Navigation | None |
| Evidence | `list-screen.tsx:164-180` |

| Field | SCR-LIST-01-A05 Delete the list |
| --- | --- |
| Trigger | "Delete list" → confirm |
| Preconditions | Owner |
| Expected behavior | Toast "List deleted." |
| State change | List deleted |
| Validation | — |
| Error behavior | Error toast; dialog stays |
| Navigation | `/library` (Reading tab) |
| Evidence | `list-screen.tsx:207-225` |

| Field | SCR-LIST-01-A06 Open a story |
| --- | --- |
| Trigger | Story card |
| Preconditions | — |
| Expected behavior | Story page |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/story/{id}/{slug}` |
| Evidence | `list-screen.tsx:136-141` |

| Field | SCR-LIST-01-A07 Back to library |
| --- | --- |
| Trigger | "Back to library" (owner) |
| Preconditions | Owner |
| Expected behavior | Library opens (on Reading, not Lists — U-LIB-01) |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/library` |
| Evidence | `list-screen.tsx:119-123` |

| Field | SCR-LIST-01-A08 Create a list (C07 in My lists) |
| --- | --- |
| Trigger | "New list" → "Create list" |
| Preconditions | Signed in |
| Expected behavior | Toast "List created."; list appears first |
| State change | Row inserted (client id) |
| Validation | BR-LIST-003 |
| Error behavior | Inline alert, id reused |
| Navigation | None (stays on Lists tab) |
| Evidence | `my-lists.tsx:84-100` |

| Field | SCR-LIST-01-A09 Toggle a story in a list (C09) |
| --- | --- |
| Trigger | List toggle in the sheet |
| Preconditions | Signed in |
| Expected behavior | Added / removed toast; pressed state flips after refetch |
| State change | Item inserted/deleted |
| Validation | — |
| Error behavior | Error toast |
| Navigation | None |
| Evidence | `add-to-list-button.tsx:101-110`, `:133-153` |

| Field | SCR-LIST-01-A10 Create and add (C09) |
| --- | --- |
| Trigger | "Create and add" |
| Preconditions | Non-empty name |
| Expected behavior | Private list created with the story; toast |
| State change | List + item |
| Validation | Empty → button disabled; > 120 → silently ignored |
| Error behavior | Error toast; id kept |
| Navigation | None |
| Evidence | `add-to-list-button.tsx:112-129`, `:154-162` |

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
- SCR-LIST-01-AC17 [Proposed] Given an unlisted or public list, when I press "Copy link", then the list URL is copied and a toast confirms (U-LIST-01).
- SCR-LIST-01-AC18 [Proposed] Given a quick-create name over 120 characters, when I press "Create and add", then the name-too-long message is shown (U-LIST-02).

## F. Findings referenced

F-LIST-01, F-LIST-02, F-LIST-03, F-LIST-04, U-LIST-01, U-LIST-02, U-LIST-03, U-LIB-01 (scratchpad
`findings-community-library.md`).

## G. Open questions

- Q-LIST-01 — Should lists show placeholders for unavailable stories (as the Library does) or keep hiding them?
- Q-LIST-02 — Is API-level enumeration of `unlisted` lists acceptable, or must `unlisted` be truly link-only (RPC by id)?
