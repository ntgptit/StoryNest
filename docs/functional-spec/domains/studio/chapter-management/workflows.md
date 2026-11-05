# OBJ-CHM — Chapter management: workflows

| ID | Name | Status |
| --- | --- | --- |
| WF-CHM-01 | Add a chapter | Verified |
| WF-CHM-02 | Reorder chapters | Verified |
| WF-CHM-03 | Change a chapter's URL slug | Verified |
| WF-CHM-04 | Archive / unarchive a chapter | Verified |
| WF-CHM-05 | Delete / restore a chapter | Verified |
| WF-CHM-06 | Open a chapter for writing (cross-screen → OBJ-EDT) | Verified |

### WF-CHM-01 — Add a chapter
| Field | Value |
| --- | --- |
| User goal | Start a new chapter at the end of the story |
| Trigger | "Add chapter" form at the bottom of SCR-CHM-01 (always visible, also on an empty story) |
| Preconditions | Role on the story; active account; story not deleted |
| Main flow | 1. Type "Chapter title"; slug fills in. 2. "Add chapter" ("Adding…"). 3. `create_chapter` appends at max+1 with a draft holding the title. 4. Toast "Chapter added."; form cleared, new id prepared. 5. List reloads with the new Draft row |
| Alternative flows | A1 Slug typed by hand. A2 Continue with WF-CHM-06 to write it |
| Exception flows | E1 Validation → field messages ("Please enter a chapter title.", slug format). E2 Slug taken → slug field. E3 Story deleted / no role → toast "Chapter not found.". E4 Network → toast; retry reuses the id (lost-response case F-STM-04) |
| Success criteria | One new chapter, status draft, last position |
| Postconditions | Invisible to readers until published (OBJ-EDT) |
| Affected objects | OBJ-CHM, OBJ-EDT (draft) |
| Related screens | SCR-CHM-01 |
| Status | Verified — `chapter-manager-screen.tsx:360-444` |

### WF-CHM-02 — Reorder chapters
| Field | Value |
| --- | --- |
| User goal | Put chapters in reading order |
| Trigger | "Move up" / "Move down" icon buttons on a live row |
| Preconditions | Role on the story; ≥ 2 live chapters |
| Main flow | 1. Click arrow. 2. New order rendered immediately. 3. `reorder_chapters` with the full live order. 4. List reloaded |
| Alternative flows | A1 Deleted chapters are not movable and stay after the live ones |
| Exception flows | E1 Order stale (someone added/deleted meanwhile) → previous order restored, toast "The chapter list was changed elsewhere…", reload. E2 Network → rollback + toast |
| Success criteria | Positions are 1..n in the chosen order |
| Postconditions | Reader TOC follows the new order (OBJ-STORY) |
| Affected objects | OBJ-CHM |
| Related screens | SCR-CHM-01 |
| Status | Verified — `use-chapter-management.ts:57-86`, `chapter-management.test.tsx:349-416` |

### WF-CHM-03 — Change a chapter's URL slug
| Field | Value |
| --- | --- |
| User goal | Fix a chapter address |
| Trigger | "Change URL slug" on a live row |
| Preconditions | Role on the story |
| Main flow | 1. Dialog "Change chapter URL slug" with the current slug. 2. Edit, "Save URL slug". 3. Slug updated. 4. Toast "URL slug changed.", dialog closes, list reloads |
| Alternative flows | A1 Same slug → dialog just closes. A2 "Cancel" / Esc closes |
| Exception flows | E1 Format → field error. E2 Taken → field "This story already has a chapter with this URL slug.". E3 Other → toast |
| Success criteria | New slug stored |
| Postconditions | Old `/story/{id}/{slug}/{oldChapterSlug}` links return 404 (no redirect) |
| Affected objects | OBJ-CHM, OBJ-READ, OBJ-SEO |
| Related screens | SCR-CHM-01 |
| Status | Verified — `components/rename-slug-dialog.tsx:26-101` |

### WF-CHM-04 — Archive / unarchive a chapter
| Field | Value |
| --- | --- |
| User goal | Hide a chapter from readers without deleting it, and bring it back later |
| Trigger | "Archive" / "Unarchive" on a live row |
| Preconditions | Owner or co-author |
| Main flow | Archive: 1. Confirm dialog. 2. `archive_chapter` → status archived, published pointer and schedule cleared. 3. Toast "Chapter archived.". Unarchive: 1. Click (no confirm). 2. Status draft. 3. Toast "Unarchived. The chapter is back to draft." 4. To be visible again the chapter must be published from the editor (WF-EDT-*) |
| Alternative flows | — |
| Exception flows | E1 Status changed elsewhere → PT409 toast "The chapter's status has changed…". E2 Archived chapter publish attempt → PT409 (BR-CHM-009) |
| Success criteria | Archived chapter invisible to readers; versions kept |
| Postconditions | — |
| Affected objects | OBJ-CHM, OBJ-EDT |
| Related screens | SCR-CHM-01, SCR-EDT-01 |
| Status | Verified |

### WF-CHM-05 — Delete / restore a chapter
| Field | Value |
| --- | --- |
| User goal | Remove a chapter, with a way back |
| Trigger | "Delete" (live row) / "Restore" (deleted row) |
| Preconditions | Owner or co-author (UI) |
| Main flow | Delete: 1. Confirm "Delete this chapter?". 2. `deleted_at` set. 3. Toast "Chapter deleted."; row moves to the end with "Deleted" badge. Restore: 1. Click. 2. `deleted_at` cleared. 3. Toast "Chapter restored."; row returns at its stored position |
| Alternative flows | A1 Restored chapter that was published is immediately live again |
| Exception flows | E1 Failure → toast, dialog stays open |
| Success criteria | Deleted chapter hidden from everyone but managers; nothing lost |
| Postconditions | Position gap may remain (BR-CHM-011) |
| Affected objects | OBJ-CHM |
| Related screens | SCR-CHM-01 |
| Status | Verified |

### WF-CHM-06 — Open a chapter for writing
| Field | Value |
| --- | --- |
| User goal | Write or edit a chapter's content |
| Trigger | "Write" on a live row |
| Preconditions | Role on the story |
| Main flow | Navigate to `/studio/story/{id}/chapter/{chapterId}` (SCR-EDT-01); continue in OBJ-EDT workflows |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | Editor opens the chapter's draft |
| Postconditions | — |
| Affected objects | OBJ-CHM → OBJ-EDT |
| Related screens | SCR-CHM-01 → SCR-EDT-01 |
| Status | Verified — `components/chapter-row.tsx:180-182` |
