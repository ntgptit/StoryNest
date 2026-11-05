# OBJ-LIST — Reading lists: workflows

| ID | Name | Status |
| --- | --- | --- |
| WF-LIST-01 | Create a list from the Library | Verified |
| WF-LIST-02 | Add a story to lists / take it out (story page sheet) | Verified |
| WF-LIST-03 | Create a list and add the story in one step | Verified |
| WF-LIST-04 | View a list (owner, other reader, guest) | Verified |
| WF-LIST-05 | Edit a list's name, description, visibility | Verified |
| WF-LIST-06 | Reorder stories | Verified |
| WF-LIST-07 | Remove a story from a list | Verified |
| WF-LIST-08 | Delete a list | Verified |
| WF-LIST-09 | Share a list by link | Inferred (no dedicated UI) |

### WF-LIST-01 — Create a list from the Library
| Field | Value |
| --- | --- |
| User goal | Start a new themed collection |
| Trigger | Library → "Lists" tab → "New list" |
| Preconditions | Signed in, active account, < 100 lists |
| Main flow | 1. Dialog "New list": List name, Description, Visibility (default Private; hint text follows the selection). 2. "Create list" → validate (BR-LIST-003) → insert with client id. 3. Dialog closes, toast "List created.", My lists refreshes (new list first). |
| Alternative flows | A1 Cancel / Esc / overlay closes the dialog; typed values are lost. |
| Exception flows | E1 Validation → messages under fields. E2 Limit/conflict/network → inline `role="alert"` message, dialog stays, same id reused on retry. |
| Success criteria | Exactly one list created |
| Postconditions | `reading_lists` row |
| Affected objects | OBJ-LIST |
| Related screens | SCR-LIB-01 (Lists tab), SCR-LIST-01-C07 dialog |
| Status | Verified — `packages/features/src/lists/components/my-lists.tsx:37-100`, `packages/features/src/lists/lists.test.tsx:358` |

### WF-LIST-02 — Add a story to lists / take it out
| Field | Value |
| --- | --- |
| User goal | File the story under one or more lists |
| Trigger | Story page → "Add to list" |
| Preconditions | Signed in (guest → login) |
| Main flow | 1. Bottom sheet "Add to list" loads my lists and which contain this story. 2. Tap an unpressed list → `add_story_to_list` (appended at the end) → toast `Added to "<name>".` 3. Tap a pressed list → item deleted → `Removed from "<name>".` 4. Membership and counts refresh. |
| Alternative flows | A1 No lists → "You don't have any lists yet. Create your first one below." → WF-LIST-03. |
| Exception flows | E1 Load fails → "Couldn't load your lists" + "Try again". E2 Toggle fails → error toast (500 limit → conflict text). |
| Success criteria | Membership matches after reopening |
| Postconditions | `reading_list_items` row inserted/deleted; list `updated_at` touched on add |
| Affected objects | OBJ-LIST, OBJ-STORY |
| Related screens | Story page (OBJ-STORY), SCR-LIST-01-C09 |
| Status | Verified — `packages/features/src/lists/components/add-to-list-button.tsx:65-171`, `packages/features/src/lists/lists.test.tsx:404-442` |

### WF-LIST-03 — Create a list and add the story in one step
| Field | Value |
| --- | --- |
| User goal | New list for this story without leaving the page |
| Trigger | Sheet → "New list name" → "Create and add" |
| Preconditions | Name non-empty (button disabled otherwise) |
| Main flow | 1. Insert private list with the prepared id. 2. Add the story. 3. Toast `Added to "<name>".`; field cleared; new id prepared. |
| Alternative flows | — |
| Exception flows | E1 Add fails after create → error toast; retry reuses the id (create tolerated as duplicate) and adds again. E2 Name > 120 → silently ignored (U-LIST-02). |
| Success criteria | One new private list containing the story |
| Postconditions | List + item |
| Affected objects | OBJ-LIST |
| Related screens | Story page sheet |
| Status | Verified — `packages/features/src/lists/components/add-to-list-button.tsx:118-135`, `packages/features/src/lists/lists.test.tsx:444` |

### WF-LIST-04 — View a list
| Field | Value |
| --- | --- |
| User goal | Read the stories in a list |
| Trigger | My lists row, or a shared `/lists/{id}` link |
| Preconditions | List readable (BR-LIST-001) |
| Main flow | 1. Skeleton. 2. Header with title and description; owner: Edit / Delete list, visibility badge, "Back to library"; visitor: "<name>'s list". 3. "N stories" and the story grid in stored order. |
| Alternative flows | A1 Empty list → owner: 'Open a story and choose "Add to list" to get started.'; visitor: "Stories you add will show up here." |
| Exception flows | E1 Private (not mine) or nonexistent → "List not found". E2 Load error → ErrorState + "Try again". |
| Success criteria | Stories visible in order, only readable ones |
| Postconditions | — |
| Affected objects | OBJ-LIST |
| Related screens | SCR-LIST-01 |
| Status | Verified — `packages/features/src/lists/screens/list-screen.tsx:36-186` |

### WF-LIST-05 — Edit a list
| Field | Value |
| --- | --- |
| User goal | Rename, describe, change who sees it |
| Trigger | List page → "Edit" (owner) |
| Preconditions | Owner |
| Main flow | 1. Dialog "Edit list" prefilled. 2. "Save changes" → update. 3. Toast "Changes saved."; page refreshes. |
| Alternative flows | A1 Change to Unlisted/Public makes the link work for others immediately; to Private makes it "List not found" for them. |
| Exception flows | E1 Validation → field messages. E2 Not found (deleted elsewhere) → inline "This list no longer exists." |
| Success criteria | New values after reload |
| Postconditions | Row updated, `updated_at` touched |
| Affected objects | OBJ-LIST |
| Related screens | SCR-LIST-01 |
| Status | Verified — `packages/features/src/lists/screens/list-screen.tsx:235-252`, `packages/features/src/lists/lists.test.tsx:585` |

### WF-LIST-06 — Reorder stories
| Field | Value |
| --- | --- |
| User goal | Put the stories in my preferred order |
| Trigger | Owner presses ↑ / ↓ under a story |
| Preconditions | Owner; ≥ 2 stories |
| Main flow | 1. New order shown at once. 2. `reorder_list_items(list, full order)`. 3. List reloads. |
| Alternative flows | — |
| Exception flows | E1 List changed elsewhere → PT409 → old order back + conflict toast. E2 List contains a soft-deleted story the owner can read → always PT409 (F-LIST-01). |
| Success criteria | Order kept after reload |
| Postconditions | `sort_order` 1..n |
| Affected objects | OBJ-LIST |
| Related screens | SCR-LIST-01 |
| Status | Verified — `packages/features/src/lists/hooks/use-lists.ts:151-181` |

### WF-LIST-07 — Remove a story from a list
| Field | Value |
| --- | --- |
| User goal | Take a story out |
| Trigger | "Remove from list" (list page) or untoggle in the sheet |
| Preconditions | Owner |
| Main flow | Delete item → toast "Removed from the list." → reload |
| Alternative flows | — |
| Exception flows | E1 Error toast. |
| Success criteria | Story gone from the list |
| Postconditions | Item deleted |
| Affected objects | OBJ-LIST |
| Related screens | SCR-LIST-01 |
| Status | Verified |

### WF-LIST-08 — Delete a list
| Field | Value |
| --- | --- |
| User goal | Remove a list I no longer need |
| Trigger | "Delete list" (owner) |
| Preconditions | Owner |
| Main flow | 1. Confirm "Delete this list?". 2. Delete. 3. Toast "List deleted."; navigate to `/library` (Reading tab). |
| Alternative flows | A1 Cancel. |
| Exception flows | E1 Error toast; dialog stays. |
| Success criteria | List and items gone; shared link shows "List not found" |
| Postconditions | Rows deleted (cascade) |
| Affected objects | OBJ-LIST |
| Related screens | SCR-LIST-01, SCR-LIB-01 |
| Status | Verified |

### WF-LIST-09 — Share a list by link
| Field | Value |
| --- | --- |
| User goal | Let a friend see my list |
| Trigger | Owner sets visibility to "Anyone with the link" or "Public", then copies the browser URL |
| Preconditions | Visibility not private |
| Main flow | 1. Edit → visibility. 2. Copy `/lists/{id}` from the address bar (no copy/share button). 3. Recipient (even a guest) opens it read-only. |
| Alternative flows | — |
| Exception flows | E1 Still private → recipient sees "List not found". |
| Success criteria | Recipient sees the list without controls |
| Postconditions | — |
| Affected objects | OBJ-LIST |
| Related screens | SCR-LIST-01 |
| Status | Inferred (sharing relies on the URL; U-LIST-01) |
