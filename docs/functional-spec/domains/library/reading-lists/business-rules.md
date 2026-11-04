# OBJ-LIST — Reading lists: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-LIST` |
| Name | Reading lists (named, ordered shelves of stories; private / unlisted / public) |
| Business purpose | Let readers curate themed collections and share them by link |
| User goals | Group stories; order them; share a list; add a story to several lists from its page |
| Actors / roles | Owner (signed in, active account to create) · Other signed-in reader / guest (read unlisted or public lists) · System (limit triggers) |
| Related entities | Tables `reading_lists` (`title` varchar 120, `description`, `visibility`, `updated_at`), `reading_list_items` (`sort_order`, `added_at`). RPCs `add_story_to_list`, `reorder_list_items`. Triggers `reading_lists_limit`, `reading_list_items_limit`, `reading_lists_touch` |
| Dependencies | OBJ-STORY (`can_read_story` decides which stories may be added and shown — `BR-STORY-*`), OBJ-LIB (Lists tab inside SCR-LIB-01), OBJ-HOME (`StoryCard`), OBJ-SEO (list pages `noindex`) |
| Screens | [SCR-LIST-01 Reading list](screens/reading-list.md) `/lists/[id]`; components mounted elsewhere: My lists (Library tab), Add-to-list sheet (story page), List form dialog |
| Source | `supabase/migrations/20261104000900_reading_lists.sql`, `supabase/migrations/20261103000100_auth_and_rls.sql:301-327`; `packages/features/src/lists/**` |
| WBS | WP 4.5 |

Rule summary

| ID | Rule | Status |
| --- | --- | --- |
| BR-LIST-001 | Visibility: private / unlisted / public | Verified (SQL test) |
| BR-LIST-002 | Only the owner changes a list | Verified (SQL test) |
| BR-LIST-003 | List name and description | Verified |
| BR-LIST-004 | Limits: 100 lists, 500 stories per list | Verified (SQL test) |
| BR-LIST-005 | Idempotent creation | Verified |
| BR-LIST-006 | Adding a story | Verified (SQL test) |
| BR-LIST-007 | Removing a story | Verified (SQL test) |
| BR-LIST-008 | Order and reordering | Verified (SQL test) |
| BR-LIST-009 | Which stories a list shows | Verified (SQL test) |
| BR-LIST-010 | My lists overview | Verified |
| BR-LIST-011 | Add-to-list sheet | Verified |
| BR-LIST-012 | Deleting a list | Verified |
| BR-LIST-013 | Error messages | Verified |
| BR-LIST-014 | List page access and presentation | Verified |

## 2. Rules

### BR-LIST-001 — Visibility: private / unlisted / public
| Field | Value |
| --- | --- |
| Description | `private` — only the owner can read it. `unlisted` — anyone (incl. guests) with the id/link can read it; it must not be listed anywhere. `public` — everyone can read it. Default `private`. |
| Preconditions | — |
| Conditions | RLS `reading_lists_read`: `owner_id = auth.uid() OR visibility IN ('public','unlisted')`. Items readable when the list is readable (and BR-LIST-009). |
| Expected behavior | Form hints: "Only you can see it." / "Anyone with the link can see it. It isn't listed anywhere." / "Everyone can see it."; labels "Private" / "Anyone with the link" / "Public". |
| Exceptions | An unlisted list can still be enumerated by a direct query (RLS cannot require knowing the id); pages that list lists must filter `visibility='public'` themselves (migration note; F-LIST-03). No page lists other people's public lists yet. |
| Related screens | SCR-LIST-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:301-302`, `supabase/migrations/20261103000000_init_schema.sql:240-250`, `supabase/migrations/20261104000900_reading_lists.sql:17-18`, `supabase/tests/150_reading_lists.test.sql:53-62`, `packages/features/src/lists/strings.en.ts:16-21` |
| Status | Verified (SQL test) |

### BR-LIST-002 — Only the owner changes a list
| Field | Value |
| --- | --- |
| Description | Only the owner can rename, change visibility, delete, add, remove or reorder. Creating requires an active account. |
| Preconditions | Signed in. |
| Conditions | RLS insert `owner_id = auth.uid() AND is_active_account()`; update/delete `owner_id = auth.uid()`; items insert/update/delete require list ownership; RPCs lock the list row `WHERE owner_id = auth.uid()` → `PT404` otherwise. Column grants limit updates to `title, description, visibility` and items to `sort_order`. |
| Expected behavior | Non-owners (signed in or guest) see no controls on the list page. |
| Exceptions | — |
| Related screens | SCR-LIST-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:303-327`, `supabase/migrations/20261104000900_reading_lists.sql:62-65`, `:96-99`, `supabase/tests/150_reading_lists.test.sql:49`, `:66-67`, `:89`, `packages/features/src/lists/screens/list-screen.tsx:70`, `packages/features/src/lists/lists.test.tsx:460`, `:546` |
| Status | Verified (SQL test) |

### BR-LIST-003 — List name and description
| Field | Value |
| --- | --- |
| Description | Name required, trimmed, ≤ 120 characters. Description optional, trimmed, ≤ 1,000 characters. |
| Preconditions | — |
| Conditions | Name: DB `varchar(120)` + CHECK `length(btrim(title)) > 0`; client `checkListForm`. Description: **client-only** limit (`APP_LIMITS.readingListDescription`; DB column is unbounded `text`). |
| Expected behavior | Errors under the field: "Please enter a list name." / "The list name can be up to 120 characters." / "The description can be up to 1,000 characters."; hint "Up to 1,000 characters." |
| Exceptions | The add-to-list sheet's quick "Create and add" silently ignores a name over 120 characters (U-LIST-02). |
| Related screens | SCR-LIST-01 (form dialog), Add-to-list sheet |
| Evidence | `packages/features/src/lists/model/list.ts:94-103`, `packages/validation/src/limits.ts:10`, `:20`, `supabase/migrations/20261103000000_init_schema.sql:242`, `:249`, `packages/features/src/lists/components/list-form-dialog.tsx:52-57`, `:79-101`, `packages/features/src/lists/strings.en.ts:27`, `:35-39` |
| Status | Verified |

### BR-LIST-004 — Limits: 100 lists, 500 stories per list
| Field | Value |
| --- | --- |
| Description | A reader may own at most 100 lists; a list may hold at most 500 stories. |
| Preconditions | — |
| Conditions | BEFORE INSERT triggers (SECURITY DEFINER, so hidden items count too) raise `PT409`. |
| Expected behavior | UI shows the conflict message (BR-LIST-013). |
| Exceptions | — |
| Related screens | SCR-LIST-01, Add-to-list sheet, My lists |
| Evidence | `supabase/migrations/20261104000900_reading_lists.sql:25-49`, `supabase/tests/150_reading_lists.test.sql` (limits section), `packages/features/src/lists/strings.en.ts:83` |
| Status | Verified (SQL test) |

### BR-LIST-005 — Idempotent creation
| Field | Value |
| --- | --- |
| Description | A list is created under a client-generated id that stays the same while that form is being sent; a repeat insert (23505) is treated as success. |
| Preconditions | — |
| Conditions | Id renewed only after success (sheet) / per dialog instance (form). |
| Expected behavior | Retrying after a lost answer never creates two lists. Toast "List created." |
| Exceptions | — |
| Related screens | My lists, Add-to-list sheet |
| Evidence | `packages/features/src/lists/api/lists.api.ts:74-88`, `packages/features/src/lists/components/list-form-dialog.tsx:47`, `packages/features/src/lists/components/add-to-list-button.tsx:68`, `:118-123`, `packages/features/src/lists/lists.test.tsx:247`, `:356` |
| Status | Verified |

### BR-LIST-006 — Adding a story
| Field | Value |
| --- | --- |
| Description | `add_story_to_list(list, story)` appends the story at the end (`max(sort_order)+1`) and returns its position; an already-listed story keeps its place. |
| Preconditions | Signed in; caller owns the list; story readable by the caller (`can_read_story` in the items insert policy). |
| Conditions | SECURITY INVOKER; list row locked `FOR UPDATE` so concurrent appends take turns; touches `reading_lists.updated_at`. Not owner → `PT404`; private story → `42501`. |
| Expected behavior | Sheet toast `Added to "<name>".` |
| Exceptions | — |
| Related screens | Add-to-list sheet |
| Evidence | `supabase/migrations/20261104000900_reading_lists.sql:51-80`, `supabase/migrations/20261103000100_auth_and_rls.sql:316-319`, `supabase/tests/150_reading_lists.test.sql:49`, `packages/features/src/lists/api/lists.api.ts:107-109` |
| Status | Verified (SQL test) |

### BR-LIST-007 — Removing a story
| Field | Value |
| --- | --- |
| Description | The owner removes a story with a direct delete of the item (RLS). |
| Preconditions | Owner. |
| Conditions | No confirmation; does not touch `updated_at`. |
| Expected behavior | List page toast "Removed from the list."; sheet toast `Removed from "<name>".`; all list queries refresh. |
| Exceptions | Others' deletes affect 0 rows. |
| Related screens | SCR-LIST-01, Add-to-list sheet |
| Evidence | `packages/features/src/lists/api/lists.api.ts:111-113`, `packages/features/src/lists/screens/list-screen.tsx:164-180`, `supabase/migrations/20261103000100_auth_and_rls.sql:325-327`, `supabase/tests/150_reading_lists.test.sql:67`, `packages/features/src/lists/lists.test.tsx:555` |
| Status | Verified (SQL test) |

### BR-LIST-008 — Order and reordering
| Field | Value |
| --- | --- |
| Description | Stories are shown by `sort_order` ascending. The owner moves a story one place up/down; the client sends the complete new order. |
| Preconditions | Owner. |
| Conditions | `reorder_list_items(list, ids[])`: ids must be exactly the list's stories **as the caller sees them** (RLS) — otherwise `PT409` "the list changed since it was read"; null/duplicate → `22023`; not owner → `PT404`. Positions become 1..n; `updated_at` touched. |
| Expected behavior | New order shown at once; on refusal the old order is restored and the error toast shown; list reloads either way. Up disabled on first, down on last, all disabled while a move is pending. Buttons named "Move up: <title>" / "Move down: <title>". |
| Exceptions | If the list holds a soft-deleted story the owner can still read (e.g. their own), the client omits it but the server counts it → every reorder is refused (F-LIST-01). |
| Related screens | SCR-LIST-01 |
| Evidence | `supabase/migrations/20261104000900_reading_lists.sql:82-112`, `packages/features/src/lists/model/list.ts:73-82`, `packages/features/src/lists/hooks/use-lists.ts:151-181`, `packages/features/src/lists/screens/list-screen.tsx:79-83`, `:144-163`, `supabase/tests/150_reading_lists.test.sql:77-89`, `packages/features/src/lists/lists.test.tsx:504-545` |
| Status | Verified (SQL test) |

### BR-LIST-009 — Which stories a list shows
| Field | Value |
| --- | --- |
| Description | A list shows only the stories the viewer can read, in stored order; soft-deleted stories are dropped by the client. |
| Preconditions | List readable. |
| Conditions | `reading_list_items_read` requires `can_read_story(story_id)`; client `toListItems` drops rows whose story is null or has `deleted_at`. |
| Expected behavior | A story that became private/removed disappears silently — for the owner too (no placeholder, unlike the Library — F-LIST-02); the data is kept and the story reappears at its old position if it becomes readable again. Count on the page = shown stories. |
| Exceptions | Hidden items still count toward the 500 limit and towards the "N stories" count in My lists when the owner can read them (own deleted stories). |
| Related screens | SCR-LIST-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:311-313`, `packages/features/src/lists/model/list.ts:63-71`, `packages/features/src/lists/screens/list-screen.tsx:118`, `supabase/tests/150_reading_lists.test.sql:69-75`, `packages/features/src/lists/lists.test.tsx:88` |
| Status | Verified (SQL test) |

### BR-LIST-010 — My lists overview
| Field | Value |
| --- | --- |
| Description | The Library "Lists" tab shows all my lists, most recently changed first, each with its story count, "Updated <relative>" and a visibility badge, linking to `/lists/{id}`; "New list" opens the form dialog. |
| Preconditions | Signed in. |
| Conditions | `reading_lists` where `owner_id = me`, embedded `reading_list_items(count)` (RLS-filtered), ordered `updated_at DESC`; no paging (≤ 100 by BR-LIST-004). |
| Expected behavior | Empty: "You don't have any lists yet" / "Group stories on the same theme into a list to read or share."; error with "Try again". |
| Exceptions | Adding/reordering touch `updated_at`, removing a story does not. |
| Related screens | SCR-LIB-01 (Lists tab), SCR-LIST-01 |
| Evidence | `packages/features/src/lists/api/lists.api.ts:18-29`, `packages/features/src/lists/components/my-lists.tsx:16-100`, `packages/features/src/lists/strings.en.ts:4-15`, `packages/features/src/lists/lists.test.tsx:340-390` |
| Status | Verified |

### BR-LIST-011 — Add-to-list sheet
| Field | Value |
| --- | --- |
| Description | On the story page, "Add to list" opens a bottom sheet listing my lists as toggle buttons (pressed = contains the story) plus a quick "New list name" + "Create and add". |
| Preconditions | Guest → `/login?next=<path>` instead of the sheet. Lists and membership load only when the sheet opens. |
| Conditions | Membership = items of this story among *my* list ids (other people's public lists excluded). Toggle → add or remove; all toggles disabled while one runs. Quick create always makes a **private** list with empty description, then adds the story; same id survives a failed attempt. |
| Expected behavior | Toasts `Added to "<name>".` / `Removed from "<name>".`; empty: "You don't have any lists yet. Create your first one below."; load error: "Couldn't load your lists" + "Try again". |
| Exceptions | Name > 120 chars in quick create → nothing happens (no message, U-LIST-02). |
| Related screens | Story page (OBJ-STORY) |
| Evidence | `packages/features/src/lists/components/add-to-list-button.tsx:22-165`, `packages/features/src/lists/api/lists.api.ts:53-68`, `packages/features/src/lists/hooks/use-lists.ts:52-62`, `packages/features/src/story/components/story-actions.tsx:58`, `packages/features/src/lists/lists.test.tsx:393-458` |
| Status | Verified |

### BR-LIST-012 — Deleting a list
| Field | Value |
| --- | --- |
| Description | The owner deletes a list after confirmation; its items cascade; stories are unaffected. |
| Preconditions | Owner. |
| Conditions | Direct delete; zero affected rows → `notFound`. |
| Expected behavior | Dialog "Delete this list?" / "The list will be gone. The stories in it are not affected."; success → toast "List deleted." and navigation to `/library` (opens on the Reading tab). Failure → error toast, dialog stays. |
| Exceptions | No undo. |
| Related screens | SCR-LIST-01 |
| Evidence | `packages/features/src/lists/api/lists.api.ts:101-104`, `packages/features/src/lists/screens/list-screen.tsx:207-225`, `supabase/migrations/20261103000000_init_schema.sql:254`, `packages/features/src/lists/lists.test.tsx:585` |
| Status | Verified |

### BR-LIST-013 — Error messages
| Field | Value |
| --- | --- |
| Description | `forbidden` → "You can't do this."; `notFound` → "This list no longer exists."; `conflict` → "The list changed or reached its limit (100 lists, 500 stories per list). It has been reloaded."; network → "No connection…"; other → "Something went wrong. Please try again." |
| Preconditions | — |
| Conditions | Form dialog shows the message inline (`role="alert"`); other actions use toasts. |
| Expected behavior | — |
| Exceptions | One message covers both "changed elsewhere" and "limit reached" (U-LIST-03). |
| Related screens | SCR-LIST-01, My lists, Add-to-list sheet |
| Evidence | `packages/features/src/lists/model/list.ts:105-118`, `packages/features/src/lists/strings.en.ts:80-86`, `packages/features/src/lists/components/list-form-dialog.tsx:122-126` |
| Status | Verified |

### BR-LIST-014 — List page access and presentation
| Field | Value |
| --- | --- |
| Description | `/lists/{id}` is open to guests; RLS decides. A list that does not exist or is private to someone else shows the same "List not found" / "This list doesn't exist or is private." |
| Preconditions | — |
| Conditions | Page metadata: generic title "Danh sách đọc", `robots: noindex` (until the SEO work). Owner sees visibility badge + "Back to library"; others see "<name>'s list". |
| Expected behavior | — |
| Exceptions | No share/copy-link action (U-LIST-01). |
| Related screens | SCR-LIST-01 |
| Evidence | `apps/web/src/app/(main)/lists/[id]/page.tsx:7-14`, `packages/features/src/lists/api/lists.api.ts:32-50`, `packages/features/src/lists/screens/list-screen.tsx:65-67`, `:109-123`, `packages/features/src/lists/lists.test.tsx:484` |
| Status | Verified |
