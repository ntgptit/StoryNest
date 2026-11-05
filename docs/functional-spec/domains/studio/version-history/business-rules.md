# OBJ-HIST — Version history & preview: business rules

Domain: `D-STUDIO` · Folder: `domains/studio/version-history` · Screens:
[SCR-HIST-01 Version history](screens/version-history.md), [SCR-HIST-02 Chapter preview](screens/chapter-preview.md)
· Workflows: [workflows.md](workflows.md)

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-HIST` |
| Name | Version history & preview |
| Business purpose | Give the story team a read-only record of every published version of a chapter, a block-level comparison, a safe way to bring an old version back into the working draft, and a reader-faithful preview of the unpublished draft. |
| User goals | See what was published when and by whom; see what changed; undo a bad edit by restoring an earlier version; check how the draft will look to readers before publishing. |
| Actors / roles | Signed-in owner, co_author, editor (`BR-TEAM-*`; all may restore because all may edit the draft). Moderators can read versions in the database but the screens require the draft (see `BR-HIST-001`). |
| Related entities | `chapter_versions`, `chapter_version_blocks`, `chapters.published_version_id`, `chapter_drafts`, `app_users` (version author). No own RPC or migration (WBS 3.9). |
| Dependencies | `BR-EDT-*` (draft save with revision, local backup, publish creates versions), `BR-READ-*` (`BlockView`, `ReaderSettingsSheet`, `reader-text` typography, block-to-reader mapping). |

### Rule index

| ID | Rule | Status |
| --- | --- | --- |
| BR-HIST-001 | History and preview access | Verified |
| BR-HIST-002 | Published versions are immutable | Verified (SQL test) |
| BR-HIST-003 | Version list | Verified |
| BR-HIST-004 | Read-only version view with the reader's rendering | Verified |
| BR-HIST-005 | Block-level comparison | Verified |
| BR-HIST-006 | Restore a version into the draft | Verified |
| BR-HIST-007 | Draft preview as readers will see it | Verified |
| BR-HIST-008 | Caching of version content | Verified |
| BR-HIST-009 | History error messages | Verified |

## 2. Rules

### BR-HIST-001 — History and preview access
| Field | Value |
| --- | --- |
| Description | Both screens are for people who may edit the chapter. |
| Preconditions | Routes `…/chapter/{chapterId}/history` and `…/preview`, protected by `requireUser`. |
| Conditions | Versions: RLS `chapter_versions_read` / `chapter_version_blocks_read` = `can_edit_chapter` OR moderator OR live version. Both screens also load the draft (RLS `can_edit_chapter`) and require `draft.storyId = {id}`. |
| Expected behavior | No draft (no role, unknown id, other story) → "Chapter not found" / "The chapter doesn't exist or you don't have access to it." Anonymous → login redirect. |
| Exceptions | A moderator can read every version via the API but sees "Chapter not found" here (no draft access). Load failure of draft or versions → "Couldn't load the history" + "Try again" (preview uses the same error text). |
| Related screens | SCR-HIST-01, SCR-HIST-02 |
| Evidence | `apps/web/src/app/(main)/studio/story/[id]/chapter/[chapterId]/history/page.tsx:13`, `…/preview/page.tsx:13`, `supabase/migrations/20261103000100_auth_and_rls.sql:254-258`, `packages/features/src/history/screens/history-screen.tsx:52-71`, `packages/features/src/history/screens/preview-screen.tsx:43-58`, `packages/features/src/history/strings.en.ts:52-57`, test `history.test.tsx:381,503` |
| Status | Verified |

### BR-HIST-002 — Published versions are immutable
| Field | Value |
| --- | --- |
| Description | Once `published_at` is set, a version and its blocks can never be changed or deleted; an edit means a new version. |
| Preconditions | Version written only by the publish core (`BR-EDT-020`). |
| Conditions | Trigger `chapter_version_immutable` (BEFORE UPDATE/DELETE on `chapter_versions`) raises when `OLD.published_at` is not null. Trigger `chapter_version_blocks_immutable` (BEFORE INSERT/UPDATE/DELETE) raises when the version is published, and forbids moving blocks between versions. Clients have SELECT only (no write grants); `version_no` unique per chapter; blocks FK to `chapter_blocks` with `ON DELETE RESTRICT`. |
| Expected behavior | History shows exactly what readers saw for each version. Unpublish and restore never touch versions. |
| Exceptions | Inferred: because published versions cannot be deleted, a hard delete of a chapter/story that has versions would be blocked by the trigger; chapters and stories are soft-deleted instead (`BR-CHM-*`, `BR-STM-*`). |
| Related screens | SCR-HIST-01 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:137-176,392-421`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:47-64,165-184`, `supabase/migrations/20261103000100_auth_and_rls.sql:4-9,173-176`, test `supabase/tests/20_publish.test.sql:84-106`; WBS 3.9 acceptance "Khôi phục tạo draft mới, không sửa version cũ (bất biến)" |
| Status | Verified (SQL test) |

### BR-HIST-003 — Version list
| Field | Value |
| --- | --- |
| Description | All published versions of the chapter, newest first, each with number, title, word count, published time and author. |
| Preconditions | BR-HIST-001. |
| Conditions | Sorted by `version_no` desc. `live` = `id = chapters.published_version_id`. Author = `display_name`, or `username` when blank. Published time shown relative ("Published 3 days ago"). No pagination (all versions fetched). |
| Expected behavior | Each entry is a toggle button (`aria-pressed`) labelled "Version {n}", with badge "Currently visible to readers" on the live one, "(untitled)" for an empty title, "{n} words · Published … · by {name}". The newest is selected by default. No versions → empty state "This chapter hasn't been published yet" / "Each time you publish, a version is created that you can review here." |
| Exceptions | After unpublish no version is live (no badge). |
| Related screens | SCR-HIST-01 |
| Evidence | `packages/features/src/history/api/history.api.ts:6-22`, `packages/features/src/history/model/history.ts:27-44`, `packages/features/src/history/screens/history-screen.tsx:103,116-142`, `packages/features/src/history/strings.en.ts:6-17`, tests `history.test.tsx:104,214,286` |
| Status | Verified |

### BR-HIST-004 — Read-only version view with the reader's rendering
| Field | Value |
| --- | --- |
| Description | The selected version is shown read-only with the reader's own `BlockView`. |
| Preconditions | A version selected. |
| Conditions | Blocks read in `sort_order`; unknown block types skipped (`toReaderBlocks`). Images use the public `chapter-images` URL resolver from the web app. |
| Expected behavior | "Content" mode: H2 version title + blocks; "This version has no content." when empty. No inputs, no editing. Loading → skeleton; error → retry. |
| Exceptions | Images without a resolvable URL are not rendered (reader behaviour, `BR-READ-*`). |
| Related screens | SCR-HIST-01 |
| Evidence | `packages/features/src/history/api/history.api.ts:24-36`, `packages/features/src/reader/model/chapter.ts:77-79`, `packages/features/src/history/screens/history-screen.tsx:179,188-198,269-278`, `apps/web/src/app/(main)/studio/story/[id]/chapter/[chapterId]/history/history-view.tsx:8`, `apps/web/src/lib/covers.ts:18-22`, tests `history.test.tsx:223,286,301` |
| Status | Verified |

### BR-HIST-005 — Block-level comparison
| Field | Value |
| --- | --- |
| Description | "Compare" shows what the selected version has relative to a base: the current saved draft (default) or another version. |
| Preconditions | Version blocks loaded; base blocks loaded (draft is already in memory). |
| Conditions | Blocks matched by permanent `block_id`: present in both and equal → same; present in both but different (type, text, marks; image key) → changed; only in the selected version → added; only in the base → removed, listed right after the block that preceded it. Pure moves are not reported (order follows the selected version). Title is not compared. Base list excludes the selected version itself. |
| Expected behavior | Caption "Compared with {base}, version {n} has the following changes."; summary "{a} paragraph(s) added, {r} removed, {c} changed" (`aria-live`); each non-same block has a badge Added / Removed / Changed; removed blocks struck through; changed text blocks show the previous text struck through with sr-only "Before:". Identical → "The two versions are identical." |
| Exceptions | The draft used as base is the one loaded when the screen opened (not refetched); unsaved editor text is not part of it (F-EDT-02). Counters say "paragraphs" for images/dividers too (U-HIST-01). |
| Related screens | SCR-HIST-01 |
| Evidence | `packages/features/src/history/model/history.ts:90-154`, `packages/features/src/history/screens/history-screen.tsx:176-198,234-259,293-338`, `packages/features/src/history/strings.en.ts:21-33`, tests `history.test.tsx:70,87,98,309,322` |
| Status | Verified |

### BR-HIST-006 — Restore a version into the draft
| Field | Value |
| --- | --- |
| Description | Copies a version's title and blocks into the working draft; it never edits a version and never publishes. |
| Preconditions | Owner/co_author/editor; confirmation "Restore this version to the draft?" ("The current draft will be replaced with the content of this version. Old versions and the published version stay unchanged; readers only see it when you publish again."). |
| Conditions | 1. Blocks → body keeping every `block_id` and mark; must pass `chapterBodySchema` (e.g. an empty version fails) else 22023 → "This version's content can't be restored." 2. Draft re-read now; 3. saved with `expected_revision` = that fresh revision (CAS, `BR-EDT-008`), title = version title. 4. Local device backup for the chapter deleted. 5. Draft query invalidated. |
| Expected behavior | Toast and inline status "Restored to draft." with link "Open editor". `chapter_drafts.revision` +1; version count and live version unchanged (WBS 3.9 browser check). Double submit prevented by the dialog's pending lock. |
| Exceptions | Conflict (save landed between re-read and write) → "The draft was just edited elsewhere. Reopen the editor and restore again." Draft missing → "Chapter not found." The previous draft content is overwritten with no undo, and an unsaved local backup is discarded (F-HIST-01). An editor tab open elsewhere will hit a conflict on its next save (`BR-EDT-013`). |
| Related screens | SCR-HIST-01, SCR-EDT-01 |
| Evidence | `packages/features/src/history/hooks/use-history.ts:32-62`, `packages/features/src/history/model/history.ts:64-86`, `packages/features/src/history/screens/history-screen.tsx:184-186,221-236,280-297`, `packages/ui/src/widgets/confirm-dialog.tsx:38-66`, `packages/features/src/history/strings.en.ts:41-51,58-65`, tests `history.test.tsx:66,331,352,363` |
| Status | Verified |

### BR-HIST-007 — Draft preview as readers will see it
| Field | Value |
| --- | --- |
| Description | The **saved** draft drawn with the reader's components, typography (`reader-text`, `--reader-measure`) and the reader's display settings sheet. Read-only; nothing is published. |
| Preconditions | BR-HIST-001. |
| Conditions | Draft re-read fresh (`useChapterDraft`, `staleTime 0`). Body → reader blocks keeping ids. |
| Expected behavior | Sticky bar: "Back to editor" + reader settings. Note (`role="note"`): "This is a draft, exactly as readers will see it when you publish. No one can see it yet." H1 = draft title, then blocks; never-written draft → "The draft has no content yet." |
| Exceptions | Differences from the reader page (`BR-READ-*`): no "Chapter {n}" label, no story title link, no TOC, no end-of-chapter marker/vote/comments/report, no adult gate, no paragraph comment buttons. Unsaved editor text is not shown (F-EDT-02, U-HIST-02). |
| Related screens | SCR-HIST-02 |
| Evidence | `packages/features/src/history/screens/preview-screen.tsx:15-80`, `packages/features/src/history/model/history.ts:50-62`, `packages/features/src/reader/screens/reader-screen.tsx:71-121`, `packages/features/src/history/strings.en.ts:59-64`, tests `history.test.tsx:465,503` |
| Status | Verified |

### BR-HIST-008 — Caching of version content
| Field | Value |
| --- | --- |
| Description | Because versions are immutable, a version's blocks are cached for the whole session; the list and the draft are always re-read. |
| Preconditions | — |
| Conditions | `versionBlocksQueryOptions.staleTime = Infinity`; versions list `staleTime 0`; draft `staleTime 0, gcTime 0`. |
| Expected behavior | Switching back to a viewed version or comparing against it needs no request. |
| Exceptions | — |
| Related screens | SCR-HIST-01 |
| Evidence | `packages/features/src/history/queries.ts:15-22`, `packages/features/src/history/hooks/use-history.ts:13-30`, `packages/features/src/editor/hooks/use-chapter-draft.ts:12-23` |
| Status | Verified |

### BR-HIST-009 — History error messages
| Field | Value |
| --- | --- |
| Description | Restore failures are shown as a toast chosen by error kind; raw server text is never shown. |
| Preconditions | Restore failed. |
| Conditions | conflict → "The draft was just edited elsewhere. Reopen the editor and restore again."; forbidden → "You don't have permission to restore this chapter."; notFound → "Chapter not found."; invalid → "This version's content can't be restored."; network → "No connection. Check your network and try again."; other → "Something went wrong. Please try again." |
| Expected behavior | Dialog stays open after a failure; no success message. |
| Exceptions | `restore.nothingToRestore` ("This version has no content to restore.") exists in strings but is unused; an empty version shows the generic invalid message. |
| Related screens | SCR-HIST-01 |
| Evidence | `packages/features/src/history/model/history.ts:89-105`, `packages/features/src/history/screens/history-screen.tsx:292-295`, `packages/features/src/history/strings.en.ts:50,58-65`, test `history.test.tsx:129,352` |
| Status | Verified |

### BR-HIST-012 — Branching version history (batch 4, Lucian 177)
| Field | Value |
| --- | --- |
| Description | `chapter_versions.parent_version_id` records the version the draft descended from when it was published; `chapter_drafts.base_version_id` is that base (server-owned, no client grant) |
| Preconditions | Restore: owner / co-author / editor via `restore_chapter_version(version_id, expected_revision)` |
| Conditions | Triggers on `chapter_versions` set the parent (draft base, else latest version) and move the base to the new version; the publish core is unchanged, so what is published is unchanged. Restore copies the version into the draft on the server, revision + 1, base = that version (PT409 stale revision, PT404 unknown / no role, 22023 missing revision / no draft) |
| Expected behavior | History shows a branch graph (main line = live version, side branches below), "Continued from version n" on branched versions, and restoring then publishing starts a new branch |
| Exceptions | Versions published before this migration have no stored parent (immutable rows, not back-filled) and read as linear |
| Related screens | SCR-HIST-01 |
| Evidence | `supabase/migrations/20261106040300_branching_version_history.sql`; `supabase/tests/515_branching_history.test.sql`; `packages/features/src/history/hooks/use-history.ts`; `packages/ui/src/widgets/branch-graph.tsx`; `packages/features/src/history/history.test.tsx` |
| Status | Verified (SQL test, unit test). Supersedes the client-side restore write described in BR-EDT-019/020 (restore now goes through the RPC; error texts unchanged) |
