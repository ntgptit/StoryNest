# OBJ-CHM — Chapter management: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-CHM` |
| Name | Chapter management |
| Business purpose | Keep a story's table of contents right: which chapters exist, in what order, under which URL slug, and whether each is live, archived or deleted — safely under concurrent edits (decision D5) |
| User goals | Add a chapter; put chapters in reading order; fix a chapter address; take a chapter off the shelf without losing it; delete and restore |
| Actors / roles | Owner, co-author (everything), editor (add, reorder, rename slug, write). Matrix: [BR-TEAM-010](../collaboration/business-rules.md#br-team-010--studio-role-permission-matrix) |
| Related entities | Tables `chapters` (`UNIQUE (story_id, slug)`, deferrable `uq_chapter_position (story_id, sort_order)`), `chapter_drafts`; RPCs `create_chapter`, `reorder_chapters`, `archive_chapter`, `unarchive_chapter`; trigger `chapters_archived_guard` |
| Code | `packages/features/src/studio/{screens/chapter-manager-screen.tsx,components/rename-slug-dialog.tsx,api/chapters.api.ts,hooks/use-chapter-management.ts,model/studio-chapter.ts}`, `packages/validation/src/chapter.ts`, `supabase/migrations/20261104000400_chapter_management.sql` |
| Dependencies | OBJ-STM (story must exist and not be deleted), OBJ-EDT (chapter content, publish/unpublish), OBJ-READ (reader visibility) |

| Rule | Name | Status |
| --- | --- | --- |
| BR-CHM-001 | Chapter list content and order | Verified |
| BR-CHM-002 | Creating a chapter | Verified |
| BR-CHM-003 | Chapter slug unique per story | Verified |
| BR-CHM-004 | Slug proposal from the chapter title | Verified |
| BR-CHM-005 | Reordering chapters | Verified |
| BR-CHM-006 | Renaming a chapter slug | Verified |
| BR-CHM-007 | Archiving a chapter | Verified |
| BR-CHM-008 | Unarchiving a chapter | Verified |
| BR-CHM-009 | An archived chapter cannot be published or scheduled | Verified |
| BR-CHM-010 | Soft delete and restore of a chapter | Verified (RLS gap) |
| BR-CHM-011 | Chapter numbering and gaps | Verified |
| BR-CHM-012 | Reader effect of chapter states | Verified |
| BR-CHM-013 | Role gating in the chapter manager | Verified |
| BR-CHM-014 | Error mapping | Verified |
| BR-CHM-015 | Refresh after a chapter change | Verified |

## 2. Rules

### BR-CHM-001 — Chapter list content and order
| Field | Value |
| --- | --- |
| Description | The manager lists every chapter of the story the user works on: drafts, scheduled, published, archived and soft-deleted |
| Preconditions | User has a role on the story (else "Story not found") |
| Conditions | Columns id, slug, sort_order, status, scheduled_for, deleted_at, updated_at, draft title (`chapter_drafts(title)`). Order: live chapters by `sort_order` (then id), deleted chapters after them. Unknown status shown as draft; empty title shown "(untitled)" |
| Expected behavior | Each row: "Chapter n" (position), title (struck through if deleted), status badge (Draft/Scheduled/Published/Archived), "Deleted" badge, `/slug` |
| Exceptions | The scheduled date (`scheduled_for`) is loaded but not shown (U-CHM-01). No pagination |
| Related screens | SCR-CHM-01 |
| Evidence | `packages/features/src/studio/api/chapters.api.ts:6-21`; `packages/features/src/studio/model/studio-chapter.ts:28-55`; `packages/features/src/studio/screens/chapter-manager-screen.tsx:134-156`; `packages/features/src/studio/chapter-management.test.tsx:64,72,268` |
| Status | Verified |

### BR-CHM-002 — Creating a chapter
| Field | Value |
| --- | --- |
| Description | "Add chapter" appends a draft chapter with its title at the next position |
| Preconditions | Owner, co-author or editor; active account; story exists and is not deleted |
| Conditions | `create_chapter(story, title, slug, id)`: title trimmed 1–200, slug `^[a-z0-9]+(-[a-z0-9]+)*$` ≤ 120 (same rules in `chapterFormSchema` client-side); story row locked (`FOR UPDATE`) so concurrent appends serialize; position = max(sort_order)+1 over all chapters incl. deleted; draft row with title created in the same transaction. Id generated client-side once per form fill, reused on retry, renewed after success |
| Expected behavior | Toast "Chapter added."; form cleared; list refreshed |
| Exceptions | 42501 not active; 22023 bad input; PT404 story missing/deleted/no role (shown as "Chapter not found."); 23505 slug taken → slug field. A retry after a lost response hits the primary key (23505) and is shown as "slug taken" (F-STM-04) |
| Related screens | SCR-CHM-01 |
| Evidence | `supabase/migrations/20261104000400_chapter_management.sql:29-58`; `packages/features/src/studio/api/chapters.api.ts:23-34`; `packages/features/src/studio/screens/chapter-manager-screen.tsx:360-384`; `packages/validation/src/chapter.ts:13-29`; `supabase/tests/100_chapter_management.test.sql:48`; `supabase/scripts/concurrency-checks.sh` (WBS 3.4); `packages/features/src/studio/chapter-management.test.tsx:390,408,423` |
| Status | Verified |

### BR-CHM-003 — Chapter slug unique per story
| Field | Value |
| --- | --- |
| Description | Two chapters of one story cannot share a slug (deleted chapters included) |
| Preconditions | Create or rename |
| Conditions | `UNIQUE (story_id, slug)`; a 23505 conflict on chapters is always treated as the slug |
| Expected behavior | Slug field shows "This story already has a chapter with this URL slug." |
| Exceptions | — |
| Related screens | SCR-CHM-01 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:109`; `packages/features/src/studio/model/studio-chapter.ts:168-173`; `packages/features/src/studio/strings.en.ts:117` |
| Status | Verified |

### BR-CHM-004 — Slug proposal from the chapter title
| Field | Value |
| --- | --- |
| Description | In the add form the slug follows the title (same `slugFromTitle` as stories) until the slug field is edited; reset after each successful add |
| Preconditions | — |
| Conditions | — |
| Expected behavior | "Chương 1" → `chuong-1` (Inferred from `slugify`) |
| Exceptions | — |
| Related screens | SCR-CHM-01 |
| Evidence | `packages/features/src/studio/screens/chapter-manager-screen.tsx:365,375-377,404-411,428-430` |
| Status | Verified |

### BR-CHM-005 — Reordering chapters
| Field | Value |
| --- | --- |
| Description | Chapters move one place up or down; the server receives the complete new order of the live chapters |
| Preconditions | Owner, co-author or editor; active account; story not deleted |
| Conditions | `reorder_chapters(story, ids[])` must list each non-deleted chapter exactly once (missing, duplicate, foreign or deleted id → 22023); positions renumbered 1..n, deleted chapters keep their relative order after them; unique key deferred during the update; story row locked. Client: first chapter cannot move up, last cannot move down; both buttons disabled while a reorder runs |
| Expected behavior | New order shown immediately (optimistic), list reloaded afterwards |
| Exceptions | Refused (stale list) → old order restored + toast "The chapter list was changed elsewhere. It has been reloaded, please try again." |
| Related screens | SCR-CHM-01 |
| Evidence | `supabase/migrations/20261104000400_chapter_management.sql:60-99`; `packages/features/src/studio/hooks/use-chapter-management.ts:57-86`; `packages/features/src/studio/model/studio-chapter.ts:66-92`; `packages/features/src/studio/screens/chapter-manager-screen.tsx:105-109,177-196`; `supabase/tests/100_chapter_management.test.sql:64-92`; `packages/features/src/studio/chapter-management.test.tsx:310,332,365,377` |
| Status | Verified |

### BR-CHM-006 — Renaming a chapter slug
| Field | Value |
| --- | --- |
| Description | "Change URL slug" opens a dialog that updates only `chapters.slug` (the title lives in the draft) |
| Preconditions | Chapter not deleted (button hidden for deleted ones); any role (RLS `chapters_update` = any story role) |
| Conditions | Client validates `chapterSlugFormSchema`; unchanged slug closes the dialog without a request; zero updated rows → notFound. The database checks only length/uniqueness, not the slug format, on this path |
| Expected behavior | Toast "URL slug changed."; dialog closes |
| Exceptions | Old chapter links stop working — there is no redirect for chapter slugs (dialog text: "Old links to this chapter will stop working."); F-CHM-03 proposes one |
| Related screens | SCR-CHM-01 |
| Evidence | `packages/features/src/studio/api/chapters.api.ts:49-53`; `packages/features/src/studio/components/rename-slug-dialog.tsx:26-64`; `supabase/migrations/20261103000100_auth_and_rls.sql:236-240`; `packages/features/src/studio/strings.en.ts:41-46`; `packages/features/src/studio/chapter-management.test.tsx:198,437` |
| Status | Verified |

### BR-CHM-007 — Archiving a chapter
| Field | Value |
| --- | --- |
| Description | Archive takes a chapter away from readers without deleting it |
| Preconditions | Owner or co-author; active account; chapter not deleted and not already archived |
| Conditions | `archive_chapter`: status → `archived`, `published_version_id` and `scheduled_for` cleared (like unpublish); versions kept |
| Expected behavior | Confirm "Archive this chapter?" / "The chapter will be hidden from readers but not deleted. You can unarchive and publish it again." → toast "Chapter archived." |
| Exceptions | Editor → 42501; already archived → PT409 ("The chapter's status has changed. Reload and try again.") |
| Related screens | SCR-CHM-01 |
| Evidence | `supabase/migrations/20261104000400_chapter_management.sql:101-124`; `packages/features/src/studio/screens/chapter-manager-screen.tsx:220-229,267-283`; `supabase/tests/100_chapter_management.test.sql:103`; `packages/features/src/studio/chapter-management.test.tsx:452` |
| Status | Verified |

### BR-CHM-008 — Unarchiving a chapter
| Field | Value |
| --- | --- |
| Description | "Unarchive" returns an archived chapter to draft (it is not re-published automatically) |
| Preconditions | Owner or co-author; chapter archived |
| Conditions | `unarchive_chapter`: status → `draft` |
| Expected behavior | No confirmation; toast "Unarchived. The chapter is back to draft." |
| Exceptions | Not archived → PT409; editor → 42501 |
| Related screens | SCR-CHM-01 |
| Evidence | `supabase/migrations/20261104000400_chapter_management.sql:126-147`; `packages/features/src/studio/components/chapter-row.tsx:186-202`, `packages/features/src/studio/screens/chapter-manager-screen.tsx:194-200`; `supabase/tests/100_chapter_management.test.sql:121` |
| Status | Verified |

### BR-CHM-009 — An archived chapter cannot be published or scheduled
| Field | Value |
| --- | --- |
| Description | Any path that would set an archived chapter to `published`/`scheduled` is refused (PT409); unarchive first |
| Preconditions | `OLD.status = 'archived'` |
| Conditions | Trigger on `chapters` status updates (covers publish now, schedule, due job) |
| Expected behavior | Publishing UI hides publish for archived chapters (OBJ-EDT) |
| Exceptions | — |
| Related screens | SCR-CHM-01, SCR-EDT-01 |
| Evidence | `supabase/migrations/20261104000400_chapter_management.sql:149-161`; `packages/features/src/editor/model/publishing.ts:11-13` |
| Status | Verified |

### BR-CHM-010 — Soft delete and restore of a chapter
| Field | Value |
| --- | --- |
| Description | "Delete" sets `chapters.deleted_at` after confirmation; "Restore" clears it without confirmation. Never a hard delete |
| Preconditions | UI: owner or co-author |
| Conditions | Direct UPDATE of `deleted_at`; RLS `chapters_update` allows **any** story role (owner, co-author, editor). Status, published pointer and schedule are not touched |
| Expected behavior | Delete: "Delete this chapter?" / "The chapter will be hidden from everyone. You can restore it later." → toast "Chapter deleted."; row moves to the end, struck through, "Deleted" badge, only "Restore" offered. Restore → toast "Chapter restored." |
| Exceptions | Documented rule "biên tập viên … không lưu trữ hay xóa" (WBS 3.4) is UI-only for delete/restore: an editor can soft-delete or restore through the API (F-CHM-01). 0 rows → "Chapter not found." |
| Related screens | SCR-CHM-01 |
| Evidence | `packages/features/src/studio/api/chapters.api.ts:55-65`; `supabase/migrations/20261103000100_auth_and_rls.sql:235-240`; `packages/features/src/studio/screens/chapter-manager-screen.tsx:158-175,230-238,267-283`; `packages/features/src/studio/chapter-management.test.tsx:466,482`; `docs/WBS.md` WP 3.4 |
| Status | Verified (RLS weaker than documented rule) |

### BR-CHM-011 — Chapter numbering and gaps
| Field | Value |
| --- | --- |
| Description | "Chapter n" is the stored `sort_order`; after a delete there may be a gap until the next reorder renumbers 1..n |
| Preconditions | — |
| Conditions | Screen note: "Chapters are numbered in order; after a deletion there may be a gap until you reorder them." |
| Expected behavior | Same numbers are used by the stats table (BR-STAT-002) |
| Exceptions | — |
| Related screens | SCR-CHM-01, SCR-STAT-01 |
| Evidence | `packages/features/src/studio/strings.en.ts:62`; `packages/features/src/studio/components/chapter-row.tsx:132`, `packages/features/src/studio/screens/chapter-manager-screen.tsx:265`; `docs/WBS.md` WP 3.4 |
| Status | Verified |

### BR-CHM-012 — Reader effect of chapter states
| Field | Value |
| --- | --- |
| Description | Readers see a chapter only when it is `published`, not deleted, and its story is readable (BR-STM-019). Collaborators see every chapter |
| Preconditions | — |
| Conditions | `can_read_chapter` |
| Expected behavior | Draft, scheduled, archived and deleted chapters are invisible to readers. Restoring a deleted chapter that was published makes it live again immediately (status untouched) — Inferred from BR-CHM-010 |
| Exceptions | — |
| Related screens | SCR-CHM-01; reader (OBJ-READ) |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:103-112` |
| Status | Verified |

### BR-CHM-013 — Role gating in the chapter manager
| Field | Value |
| --- | --- |
| Description | `canManage = role !== 'editor'`: archive/unarchive/delete/restore are shown only to owner and co-author; add, move, rename slug and "Write" to everyone with a role |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Editor rows: Move up/down, Write, Change URL slug; deleted rows show nothing for an editor |
| Exceptions | See BR-CHM-010 for the delete gap |
| Related screens | SCR-CHM-01 |
| Evidence | `packages/features/src/studio/screens/chapter-manager-screen.tsx:78,92-93,158-175,203-240`; `packages/features/src/studio/chapter-management.test.tsx:482` |
| Status | Verified |

### BR-CHM-014 — Error mapping
| Field | Value |
| --- | --- |
| Description | RPC/RLS errors are shown by kind |
| Preconditions | — |
| Conditions | forbidden → "You don't have permission to do this."; notFound → "Chapter not found."; conflict (PT409) → "The chapter's status has changed. Reload and try again."; invalid (22023) → "The chapter list was changed elsewhere. It has been reloaded, please try again."; network → "No connection…"; else generic |
| Expected behavior | Toast for list actions; slug conflicts on the field |
| Exceptions | 22023 from `create_chapter` (bad title/slug that passed the client) would also show the "list was changed" text — Inferred |
| Related screens | SCR-CHM-01 |
| Evidence | `packages/features/src/studio/model/studio-chapter.ts:175-191`; `packages/features/src/studio/strings.en.ts:116-122` |
| Status | Verified |

### BR-CHM-015 — Refresh after a chapter change
| Field | Value |
| --- | --- |
| Description | Every chapter mutation reloads the story's studio chapter list, the Studio list (chapter count) and public story caches |
| Preconditions | — |
| Conditions | Invalidate `studioKeys.chapters(story)`, `studioKeys.all`, `storyKeys.all` (on success for create/rename, on settle for reorder/archive/delete) |
| Expected behavior | The screen always ends on the server's truth |
| Exceptions | — |
| Related screens | SCR-CHM-01, SCR-STM-01 |
| Evidence | `packages/features/src/studio/hooks/use-chapter-management.ts:31-131` |
| Status | Verified |

### BR-CHM-016 — Story parts (volumes) and the parts tree (batch 4, Lucian 102)
| Field | Value |
| --- | --- |
| Description | A story has optional parts (`story_parts`, title 1..120 chars, at most 100 per story); a chapter may be in one part of the same story (`chapters.part_id`, composite FK `fk_chapter_part`) |
| Preconditions | Add / rename: owner, co-author or editor (active account for add). Delete: owner or co-author. Move a chapter: team (existing `chapters_update` + column grant) |
| Conditions | Reading order stays `chapters.sort_order`; screens head each run of consecutive chapters of one part with the part's name (`partRuns`). Deleting a part sets its chapters' `part_id` to null (`ON DELETE SET NULL (part_id)`). Publishing RPCs never read `part_id` |
| Expected behavior | The chapter manager shows a tree (folders = parts, files = chapters, empty parts listed after) with a part picker per chapter, add / rename / delete part. Readers see part names in the story page list and the reader contents |
| Exceptions | 101st part → PT409 "A story can have at most 100 parts"; part of another story → 23503; blank title refused client-side before sending |
| Related screens | SCR-CHM-01, SCR-STORY-01, SCR-READ-01 |
| Evidence | `supabase/migrations/20261106040000_story_parts.sql` (rollback block at its top); `supabase/tests/500_story_parts.test.sql`; `packages/features/src/_shared/parts.ts`; `packages/features/src/studio/components/parts-panel.tsx`; `packages/features/src/studio/chapter-management.test.tsx` (parts tree) |
| Status | Verified (SQL test, unit test); not run on a real Supabase project |
