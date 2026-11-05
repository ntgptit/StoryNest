# OBJ-EDT — Chapter editor, autosave & publishing: business rules

Domain: `D-STUDIO` · Folder: `domains/studio/chapter-editor` · Screen: [SCR-EDT-01 Chapter editor](screens/chapter-editor.md)
· Workflows: [workflows.md](workflows.md) · Findings: `F-EDT-*` / `U-EDT-*` (details: [functional gap analysis](../../../audits/functional-gap-analysis.md) / [UX gap analysis](../../../audits/ux-ui-gap-analysis.md)).

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-EDT` |
| Name | Chapter editor, autosave & publishing |
| Business purpose | Let a story's team write a chapter's working draft (rich text + pictures) without ever losing typed text, and turn that draft into an immutable published version now, at a scheduled time, or take it back offline. |
| User goals | Write and format a chapter; never lose work (offline, closed tab, second device); insert pictures; publish / republish / schedule / unpublish safely. |
| Actors / roles | Signed-in story **owner**, **co_author**, **editor** (role matrix owned by `BR-TEAM-*`). Publish & schedule: all three. Unpublish / cancel schedule: owner and co_author only. `service_role` cron (due-chapter job). |
| Related entities | Tables `chapter_drafts` (working draft, `revision` CAS token), `chapters` (`status`, `scheduled_for`, `published_version_id`, `first_published_at`), `chapter_blocks` (permanent block anchors), `chapter_versions` / `chapter_version_blocks` (snapshots, rules in `BR-HIST-002`), `outbox_events`, `chapter_stats`, `story_stats`; Storage bucket `chapter-images`. RPCs `publish_chapter`, `schedule_chapter`, `unpublish_chapter`, `publish_due_chapters`, `story_role`; private `validate_chapter_body`, `publish_chapter_core`; `is_valid_storage_key`, `can_write_story_image`. |
| Dependencies | `BR-TEAM-*` (roles), `BR-CHM-*` (chapter create/list/reorder/archive/delete; draft row is created by `create_chapter`), `BR-READ-*` (reader rendering of the published version), `BR-NOTI-*` (follower notification on first publish), `BR-JOB-*` (cron / outbox worker), `BR-HIST-*` (versions, preview, restore). |

### Rule index

| ID | Rule | Status |
| --- | --- | --- |
| BR-EDT-001 | Editor access | Verified |
| BR-EDT-002 | A draft body the editor cannot represent is never opened | Verified |
| BR-EDT-003 | Supported content set (Tiptap features) | Verified |
| BR-EDT-004 | Permanent block ids | Verified |
| BR-EDT-005 | Inline marks and line breaks encoding | Verified |
| BR-EDT-006 | Draft validation before any save | Verified |
| BR-EDT-007 | Word count | Verified |
| BR-EDT-008 | Optimistic lock on draft save (revision) | Verified |
| BR-EDT-009 | Autosave timing and status machine | Verified |
| BR-EDT-010 | Manual save | Verified |
| BR-EDT-011 | Local backup on this device | Verified |
| BR-EDT-012 | Leave-page protection | Verified |
| BR-EDT-013 | Two-device conflict handling | Verified |
| BR-EDT-014 | Picture preparation and upload (client) | Verified |
| BR-EDT-015 | `chapter-images` bucket policy | Verified |
| BR-EDT-016 | Image storage key validated at publish | Verified |
| BR-EDT-017 | Publishing authorization | Verified |
| BR-EDT-018 | Publish only the saved draft at the expected revision | Verified |
| BR-EDT-019 | Server-side publish validation | Verified |
| BR-EDT-020 | Effects of a publish | Verified |
| BR-EDT-021 | Scheduling and timezone handling | Verified |
| BR-EDT-022 | Due-chapter job | Verified |
| BR-EDT-023 | Unpublish / cancel schedule | Verified |
| BR-EDT-024 | Role- and state-based enablement of publish controls | Verified |
| BR-EDT-025 | Error mapping to messages | Verified |
| BR-EDT-026 | Double-submit protection | Verified |
| BR-EDT-027 | Keyboard shortcuts and input rules | Verified (library default) |
| BR-EDT-028 | Cache refresh after a publish action | Verified |

## 2. Rules

### BR-EDT-001 — Editor access
| Field | Value |
| --- | --- |
| Description | Only a signed-in user with a role on the story (owner, co_author, editor) can open a chapter's draft. |
| Preconditions | Route `/studio/story/{id}/chapter/{chapterId}`. |
| Conditions | (1) Anonymous → redirected to `/login?next=…` (proxy + `requireUser`). (2) Draft row hidden by RLS (`can_edit_chapter` = `story_role` not null) → query returns null. (3) Draft found but its chapter belongs to another story than `{id}`. |
| Expected behavior | (1) redirect; (2) and (3) show "Chapter not found" / "The chapter doesn't exist or you don't have permission to edit it." (`notFound`). Existence of the chapter is not revealed. |
| Exceptions | `can_edit_chapter` does not check `chapters.deleted_at` or `stories.deleted_at`, and `chapter_drafts` RLS does not check `is_active_account()`: drafts of soft-deleted chapters/stories and drafts of suspended accounts remain openable and savable (see F-EDT-07, F-EDT-10). |
| Related screens | SCR-EDT-01 |
| Evidence | `apps/web/src/app/(main)/studio/story/[id]/chapter/[chapterId]/page.tsx:13`, `apps/web/src/lib/auth/route-guard.ts:4-12`, `supabase/migrations/20261103000100_auth_and_rls.sql:115-120`, `…auth_and_rls.sql:247-252`, `packages/features/src/editor/api/draft.api.ts:16-24`, `packages/features/src/editor/screens/chapter-editor-screen.tsx:65-67`, `packages/features/src/editor/strings.en.ts:100-103`, test `editor-screen.test.tsx:287` |
| Status | Verified |

### BR-EDT-002 — A draft body the editor cannot represent is never opened
| Field | Value |
| --- | --- |
| Description | Opening a body the editor cannot represent and saving it back would silently overwrite data, so such a draft is refused. |
| Preconditions | Draft row readable. |
| Conditions | `body` is `[]` (never written) → accepted as empty. Any other body must pass `chapterBodySchema`. |
| Expected behavior | Invalid body → `AppError("invalid")` → empty state "Can't open the draft" / "The draft content is in a format that can't be read, so it wasn't opened to avoid overwriting data." No editor, no autosave. Empty body → editor shows one empty paragraph with a fresh block id. |
| Exceptions | Network/server failure → "Couldn't load the draft" + "Try again" (refetch). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/api/draft.api.ts:28-32`, `packages/features/src/editor/screens/chapter-editor-screen.tsx:51-64`, `packages/features/src/editor/model/body-converter.ts:161`, `packages/features/src/editor/strings.en.ts:104-108`, tests `editor-screen.test.tsx:118,259,271` |
| Status | Verified |

### BR-EDT-003 — Supported content set (Tiptap features)
| Field | Value |
| --- | --- |
| Description | The editor offers exactly what a chapter body can store: paragraph, one heading level (H2), bold, italic, underline, strikethrough, hard line break, divider (horizontal rule), image block, undo/redo. |
| Preconditions | Tiptap 3.32.2 StarterKit with blockquote, bullet/ordered list, list item, list keymap, code block, inline code and link switched off. |
| Conditions | Any node the body cannot store reaching `docToBody` (or an image block without a storage key). |
| Expected behavior | `UnsupportedContentError` → save refused with "Part of the content can't be saved. Remove it and try again." (status "Not saved: check the chapter title and content"). Nothing is silently dropped. Image block is an atom (selectable, draggable) that shows the picture from its public URL, or an empty frame when no URL can be built (key is kept). |
| Exceptions | Pasted HTML with lists/links/images is normalised by the ProseMirror schema before it reaches the converter (lists become paragraphs, links lose the link, external `<img>` is dropped) — Inferred from schema; not tested in repo. |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/extensions.ts:11-37,47-66`, `packages/features/src/editor/model/body-converter.ts:36-42,94-118`, `packages/features/src/editor/components/editor-toolbar.tsx:46-80`, tests `editor.test.ts:114,225`, `editor-screen.test.tsx:195` |
| Status | Verified |

### BR-EDT-004 — Permanent block ids
| Field | Value |
| --- | --- |
| Description | Every top-level block carries a permanent `block_id` (UUID) — the anchor of paragraph comments and reading progress. |
| Preconditions | `UniqueID` extension on paragraph, heading, horizontalRule, imageBlock with attribute `blockId`. |
| Conditions | Edit text → id kept. New block / split (second half) → new UUID. Paste a copy of blocks → copy gets new ids, originals keep theirs. Delete + undo → same id returns. Missing/invalid id or duplicate at save time → converter assigns a new UUID (first occurrence keeps the id). Ids are lower-cased. |
| Expected behavior | Saved body has unique, stable block ids; on publish they are inserted into `chapter_blocks` (never recycled). |
| Exceptions | A block id already belonging to another chapter is refused at publish (`BR-EDT-019`). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/body-converter.ts:1-9,83-91`, `packages/features/src/editor/model/extensions.ts:61-65`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:149-153,170-172`, tests `editor.test.ts:98,131,147,157,170,201,215` |
| Status | Verified |

### BR-EDT-005 — Inline marks and line breaks encoding
| Field | Value |
| --- | --- |
| Description | Marks (`bold`, `italic`, `underline`, `strike`) are stored as half-open `[from,to)` ranges in UTF-16 code units of the block text; hard breaks are stored as `"\n"`. |
| Preconditions | — |
| Conditions | A mark running across differently formatted text is merged into one range; overlapping marks are kept; marks are sorted by `from`, then type order, then `to`. Marks must lie within the text (`to ≤ text.length`, `to > from`). |
| Expected behavior | Round-trip body → editor → body is lossless (also through a real editor). Published as `chapter_version_blocks.rich_text = {"marks": [...]}`. |
| Exceptions | — |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/body-converter.ts:47-77,123-136`, `packages/validation/src/chapter-body.ts:7-26`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:179-180`, tests `editor.test.ts:49,53,57,76` |
| Status | Verified |

### BR-EDT-006 — Draft validation before any save
| Field | Value |
| --- | --- |
| Description | Nothing invalid reaches the server; the client schema is deliberately stricter than the RPC. |
| Preconditions | Autosave, manual save, publish-first save, restore (`BR-HIST-006`). |
| Conditions | Title trimmed, required, ≤ 200 chars. Body: ≥ 1 block, ≤ 2,000 blocks (`APP_LIMITS.blocksPerChapter`), block text ≤ 20,000 chars (`blockTextLength`), image key 1–1,024 chars, strict keys, `type` required, uuid ids, unique ids, marks within text. Save payload re-validated by `chapterDraftSaveSchema`. |
| Expected behavior | Blank title → "Please enter a chapter title."; > 200 → "The chapter title can be up to 200 characters."; body problems → "Part of the content can't be saved. Remove it and try again." Shown under the title field (`role="alert"`), autosave status `invalid`, no request sent; the next edit retries. |
| Exceptions | Title `<input maxLength=400>` allows typing past the 200 limit (U-EDT-02). There is no minimum content: one empty paragraph is a valid body (Q-EDT-01). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/draft-form.ts:6-26`, `packages/validation/src/chapter-body.ts:28-62`, `packages/validation/src/limits.ts:7,16-23`, `packages/validation/src/inputs.ts:61-66`, `packages/features/src/editor/api/draft.api.ts:55-60`, `packages/features/src/editor/screens/chapter-editor-screen.tsx:139-145,354,361-365`, `packages/features/src/editor/strings.en.ts:109-113`, tests `editor-screen.test.tsx:172,237` |
| Status | Verified |

### BR-EDT-007 — Word count
| Field | Value |
| --- | --- |
| Description | Words = whitespace-separated tokens of trimmed paragraph and heading text; images/dividers count 0. Same rule client (`countWords`) and server (`regexp_split_to_array(btrim(text), '\s+')`). |
| Preconditions | — |
| Conditions | Recomputed on every editor update; 0 when the document cannot be converted. |
| Expected behavior | Footer shows "{n} words" (locale formatted). Stored on publish as `chapter_versions.word_count`. |
| Exceptions | — |
| Related screens | SCR-EDT-01, SCR-HIST-01 |
| Evidence | `packages/validation/src/chapter-body.ts:68-77`, `packages/features/src/editor/model/draft-form.ts:28-34`, `packages/features/src/editor/screens/chapter-editor-screen.tsx:100,217-219,383`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:155-159`, test `editor.test.ts:124` |
| Status | Verified |

### BR-EDT-008 — Optimistic lock on draft save (revision)
| Field | Value |
| --- | --- |
| Description | A save only succeeds against the revision it was based on (compare-and-swap); it never overwrites newer work. |
| Preconditions | Editor holds `revision` from the loaded draft (or the last successful save). |
| Conditions | `UPDATE chapter_drafts SET title, body, revision = expected+1, updated_by = me WHERE chapter_id = … AND revision = expected`. |
| Expected behavior | 1 row → new revision kept in memory. 0 rows → `AppError("conflict", code "DRAFT_REVISION")` → `BR-EDT-013`. RLS `WITH CHECK` requires `updated_by = auth.uid()`. |
| Exceptions | 0 rows is also what an RLS-hidden row produces, so a collaborator whose role was revoked mid-session sees a "changed elsewhere" conflict rather than a permission message (F-EDT-03). |
| Related screens | SCR-EDT-01, SCR-HIST-01 |
| Evidence | `packages/features/src/editor/api/draft.api.ts:43-73`, `supabase/migrations/20261103000100_auth_and_rls.sql:247-252`, `supabase/migrations/20261103000000_init_schema.sql:127-134`, test `editor-screen.test.tsx:147` |
| Status | Verified |

### BR-EDT-009 — Autosave timing and status machine
| Field | Value |
| --- | --- |
| Description | The draft saves itself in the background, one request at a time. |
| Preconditions | Any change to title or body marks the autosaver dirty. |
| Conditions | Save 2 s after the last change; continuous typing cannot postpone longer than 10 s after the first unsaved change. One request in flight; edits during a save trigger another save 2 s after it ends. Failure (thrown: offline, server error) → status `error`, retry after 2 s doubling up to 30 s; an edit during `error` waits for the scheduled retry; browser `online` event → retry at once. `conflict` → stop all automatic saves until the editor is reloaded. `invalid` → no retry until the next edit. |
| Expected behavior | Footer status (`aria-live="polite"`): idle "" (or "Unsaved changes" when unsaved), dirty "Unsaved changes, will save automatically", saving "Saving…", saved "Saved", error "Couldn't save, retrying", conflict "Not saved: the draft was changed elsewhere", invalid "Not saved: check the chapter title and content". Autosaves are silent (no toast). |
| Exceptions | Permanent failures (`unauthenticated`, `forbidden`, server `invalid`) are also treated as retryable and retried indefinitely (F-EDT-03). The autosaver is created in `useEffect` so it survives React Strict Mode. |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/autosaver.ts:1-143`, `packages/features/src/editor/screens/chapter-editor-screen.tsx:137-192,252,382-385`, `packages/features/src/editor/strings.en.ts:13-21`, tests `autosaver.test.ts:27-156`, `editor-screen.test.tsx:311-361`; WBS WP 3.6 |
| Status | Verified |

### BR-EDT-010 — Manual save
| Field | Value |
| --- | --- |
| Description | "Save draft" saves immediately and confirms with a toast. |
| Preconditions | Editor ready. |
| Conditions | Disabled while status is `saving` or before the editor exists. |
| Expected behavior | Runs the same save attempt now (cancels the pending timer); on success toast "Draft saved."; button label "Saving…" while running. Invalid/conflict/failed outcomes show the same status as autosave and no success toast. |
| Exceptions | After a conflict the button stays enabled; pressing it re-sends against the stale revision and gets the conflict again (harmless). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/screens/chapter-editor-screen.tsx:117-118,159,282-285,386-388`, `packages/features/src/editor/model/autosaver.ts:130-133`, `packages/features/src/editor/strings.en.ts:9-11` |
| Status | Verified |

### BR-EDT-011 — Local backup on this device
| Field | Value |
| --- | --- |
| Description | Text typed but not yet on the server is kept in `localStorage` (`storynest.draftBackup.{chapterId}`) with the revision it was written on. |
| Preconditions | Browser storage available (all access is best-effort; failures are swallowed). |
| Conditions | Written 0.5 s after each change, on `beforeunload` with unsaved changes, when the tab is hidden, on a conflict, and on in-app unmount with unsaved changes. Cleared when a save leaves nothing unsaved, on "Discard", and by a history restore (`BR-HIST-006`). On read the value must parse and pass `chapterBodySchema`, else ignored. |
| Expected behavior | On open, if a backup exists and differs from the server title/body → banner "There's an unsaved version on this device" / "You typed this content at {time}, but it was never saved to the server." plus, when `baseRevision` < server revision, "That version is based on an older version of the draft: restoring it will overwrite newer changes." Buttons "Restore unsaved version" (replaces editor content, marks dirty → autosaves; toast "Unsaved version restored, saving automatically.") and "Discard unsaved version". |
| Exceptions | One key per chapter per browser: two tabs of the same browser share it (not verified, WBS 3.6). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/local-backup.ts:1-52`, `packages/features/src/editor/screens/chapter-editor-screen.tsx:110-135,158,186-192,265-273,309-333`, `packages/features/src/editor/strings.en.ts:23-30`, tests `autosaver.test.ts:175-209`, `editor-screen.test.tsx:410-461` |
| Status | Verified |

### BR-EDT-012 — Leave-page protection
| Field | Value |
| --- | --- |
| Description | Typed changes are never lost silently when leaving. |
| Preconditions | Unsaved edits exist (`edits ≠ savedEdits`). |
| Conditions | (a) Browser unload/reload/close → backup written + native `beforeunload` prompt. (b) Tab hidden → backup written + immediate save. (c) In-app navigation (Back to chapters, Preview, Version history, header links) → backup written only; no prompt, no save; the autosaver is disposed. |
| Expected behavior | (a)/(b) as stated; after (c) the text is offered back by the backup banner on return. |
| Exceptions | Path (c) means Preview shows the last saved draft and a History restore deletes the backup (F-EDT-02). |
| Related screens | SCR-EDT-01, SCR-HIST-01, SCR-HIST-02 |
| Evidence | `packages/features/src/editor/screens/chapter-editor-screen.tsx:238-263`, `packages/features/src/editor/strings.en.ts:22`, tests `editor-screen.test.tsx:382,399` |
| Status | Verified |

### BR-EDT-013 — Two-device conflict handling
| Field | Value |
| --- | --- |
| Description | When the draft was saved elsewhere after it was opened, the author's text stays on screen and nothing is overwritten. |
| Preconditions | Save returns `conflict` (`BR-EDT-008`). |
| Conditions | Draft query never refetches on window focus/reconnect (no document swap under the cursor); reload only on request. |
| Expected behavior | Backup written; autosave stops; alert "The draft was edited elsewhere" + description + "Load latest version". Reload refetches the draft and remounts the editor; the backup banner then offers the author's text on top of the newer version (with the older-base warning). |
| Exceptions | Banner text says "unsaved changes here will be lost" although they are offered back (U-EDT-01). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/screens/chapter-editor-screen.tsx:47-49,76-79,162-167,287,335-346`, `packages/features/src/editor/hooks/use-chapter-draft.ts:12-23`, `packages/features/src/editor/strings.en.ts:114-119`, tests `editor-screen.test.tsx:246,461` |
| Status | Verified |

### BR-EDT-014 — Picture preparation and upload (client)
| Field | Value |
| --- | --- |
| Description | A picked picture is checked, shrunk and re-encoded in the browser, uploaded to the story's folder, then inserted at the cursor as an image block. |
| Preconditions | Toolbar "Insert picture" → hidden file input (`accept=image/jpeg,image/png,image/webp`). |
| Conditions | Type must be JPEG/PNG/WebP; input ≤ 10 MB; shrunk to ≤ 1600 px wide keeping aspect (never enlarged); WebP q0.85, JPEG fallback. Key `<story_id>/<uuid>.<webp|jpg>` (`buildStorageKey`, name never from the file name), `upsert: false`, `cacheControl` 1 year. Button disabled and labelled "Uploading picture…" while uploading. Same file can be picked twice. |
| Expected behavior | Success → image block with `storageKey` inserted at the current selection (new block id). Errors (toast): type "Only JPG, PNG or WebP pictures can be inserted.", tooLarge "That picture is too large (10 MB at most).", unreadable "This picture could not be read. Try another one.", 400/413/415 "The server did not accept this picture. Try another one.", 401/403 "You are not allowed to insert pictures into this story.", network "No connection. Check your network and try again.", other "The picture could not be inserted. Please try again." |
| Exceptions | Uploaded objects are never deleted (unused, removed or aborted inserts stay in the bucket) — F-EDT-08. No alt text/caption (F-EDT-09). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/_shared/image-prepare.ts:3-5,53-90`, `packages/features/src/editor/hooks/use-chapter-image.ts:10-26`, `packages/features/src/editor/api/images.api.ts:6-35`, `packages/features/src/editor/model/image-messages.ts:6-14`, `packages/features/src/editor/screens/chapter-editor-screen.tsx:227-236`, `packages/features/src/editor/components/editor-toolbar.tsx:68-77,104-118`, `packages/utils/src/storage.ts:33-38`, `packages/features/src/editor/strings.en.ts:39-50`, tests `chapter-image.test.tsx:47-145` |
| Status | Verified |

### BR-EDT-015 — `chapter-images` bucket policy
| Field | Value |
| --- | --- |
| Description | Public bucket (read by URL), JPEG/PNG/WebP only, ≤ 5 MiB per object. Write/update/delete/list only through `can_write_story_image`. |
| Preconditions | — |
| Conditions | Caller signed in with an active account; key matches `<story_uuid>/<file>` (`is_valid_storage_key`, file name `[A-Za-z0-9][A-Za-z0-9._-]{0,199}`); caller's `story_role` on that story ∈ owner, co_author, editor. Non-uuid folder → false (never an error). |
| Expected behavior | Otherwise the upload is refused (HTTP 4xx → `BR-EDT-014` messages). |
| Exceptions | — |
| Related screens | SCR-EDT-01 |
| Evidence | `supabase/migrations/20261104002400_story_image_buckets.sql:23-67`, `supabase/migrations/20261104000300_storage_key_convention.sql:24-28`, test `supabase/tests/300_story_image_buckets.test.sql:41-75` |
| Status | Verified (SQL test) |

### BR-EDT-016 — Image storage key validated at publish
| Field | Value |
| --- | --- |
| Description | Drafts are permissive (autosave must never fail); every published image block must point into the chapter's own story folder. |
| Preconditions | Any publish path (now, scheduled, due job) inserts `chapter_version_blocks`. |
| Conditions | Trigger `chapter_version_blocks_image_key` (BEFORE INSERT): `is_valid_storage_key(image_storage_key, chapter.story_id)`. |
| Expected behavior | Foreign key (e.g. image block copy-pasted from another story) → SQLSTATE 22023 → whole publish rolled back → "The chapter isn't ready to publish: …" |
| Exceptions | The editor does not warn about a foreign key before publishing. |
| Related screens | SCR-EDT-01 |
| Evidence | `supabase/migrations/20261104000300_storage_key_convention.sql:11-16,37-55`, test `supabase/tests/90_storage_keys.test.sql`; WBS WP 3.3 |
| Status | Verified |

### BR-EDT-017 — Publishing authorization
| Field | Value |
| --- | --- |
| Description | Publish and schedule: owner, co_author, editor. Unpublish (and cancel schedule): owner, co_author. |
| Preconditions | RPC call by `authenticated`. |
| Conditions | Not signed in or inactive account → 42501. Chapter missing, soft-deleted, or caller has no role → PT404 (existence not revealed). Editor calling unpublish → 42501. `publish_due_chapters` executable by `service_role` only. |
| Expected behavior | As stated; the UI mirrors it (`BR-EDT-024`) using the DB's own `story_role`. |
| Exceptions | Role definitions: `BR-TEAM-*`. |
| Related screens | SCR-EDT-01 |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:11-16,217-232,243-253,285-298,337-344`, `packages/features/src/editor/api/publishing.api.ts:24-39`, tests `supabase/tests/20_publish.test.sql:59-82,142-151` |
| Status | Verified (SQL test) |

### BR-EDT-018 — Publish only the saved draft at the expected revision
| Field | Value |
| --- | --- |
| Description | Publish/schedule are always based on the saved draft; unsaved text is saved first and that exact revision is sent as `p_expected_revision`. |
| Preconditions | Publish or schedule button pressed. |
| Conditions | `ensureSaved()`: if unsaved edits exist → save now; returns the revision only if nothing is left unsaved, else null. Server: `p_expected_revision ≠ chapter_drafts.revision` → PT409. |
| Expected behavior | null → inline alert "The draft couldn't be saved, so it wasn't published. Check the chapter title and content and try again." and no RPC call. Stale revision (someone saved meanwhile) → PT409 → "The draft or chapter status was changed elsewhere. Reload the page and try again." |
| Exceptions | The save-first message is the same whether the cause is invalid content, conflict or offline (U-EDT-01). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/screens/chapter-editor-screen.tsx:275-280,379`, `packages/features/src/editor/components/publish-panel.tsx:64-88`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:140-143,263-266`, tests `publishing.test.tsx:277,323`, `supabase/tests/20_publish.test.sql:70` |
| Status | Verified |

### BR-EDT-019 — Server-side publish validation
| Field | Value |
| --- | --- |
| Description | The RPC is the authority on what can be published. |
| Preconditions | Authorized caller (`BR-EDT-017`); chapter row locked `FOR UPDATE`, story row locked. |
| Conditions → SQLSTATE | Story soft-deleted → 22023. No draft row → 22023. Blank title → 22023. Body not a non-empty array; block not an object; `block_id` missing/not uuid/duplicate; type not paragraph/heading/image/divider; paragraph/heading without string `text`; image without key; `marks` not array → 22023. A block id belonging to another chapter → 22023. Archived chapter → PT409 (trigger `chapters_archived_guard`). Schedule: status not draft/scheduled → PT409. |
| Expected behavior | Any failure rolls back the whole transaction (no partial version, no orphan `chapter_blocks`). |
| Exceptions | No minimum content (an empty paragraph publishes a 0-word chapter) — Q-EDT-01. |
| Related screens | SCR-EDT-01 |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:67-112,127-153,254-270`, `supabase/migrations/20261104000400_chapter_management.sql:17-19,150-161`, tests `supabase/tests/20_publish.test.sql:109-136,151` |
| Status | Verified (SQL test) |

### BR-EDT-020 — Effects of a publish
| Field | Value |
| --- | --- |
| Description | Publishing snapshots the draft into a new immutable version and makes it the live one. |
| Preconditions | Validation passed (`BR-EDT-019`). |
| Conditions | Version number = max(version_no)+1 for the chapter. |
| Expected behavior | Insert `chapter_versions` (title trimmed, word count, `created_by` = actor) → missing `chapter_blocks` rows → `chapter_version_blocks` in reading order → set `published_at` (immutable from then on, `BR-HIST-002`). Chapter: `status='published'`, `published_version_id` = new version, `first_published_at` kept or set, `scheduled_for` cleared. Story: `first_published_at` set once; `status` `draft` → `ongoing` (visibility unchanged). `chapter_stats`/`story_stats` rows ensured. First publish of the chapter only: outbox event `chapter.published` (dedupe key per chapter) → follower notification `BR-NOTI-*`; republish/unpublish+republish is silent. Returns the version id. UI toast "Chapter published." / "New version published." |
| Exceptions | Republishing an unchanged draft still creates a new identical version (F-EDT-06). |
| Related screens | SCR-EDT-01, SCR-HIST-01 |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:161-212`, `packages/features/src/editor/components/publish-panel.tsx:90-95`, tests `supabase/tests/20_publish.test.sql:24-56,84-106,169` |
| Status | Verified (SQL test) |

### BR-EDT-021 — Scheduling and timezone handling
| Field | Value |
| --- | --- |
| Description | A draft or scheduled chapter can be set to publish automatically at a future instant chosen in the user's local time. |
| Preconditions | "Schedule…" dialog, `datetime-local` picker with `min` = now + 1 minute (local), label "Your time zone: {IANA zone}" (browser zone). |
| Conditions | Client: empty/unparseable → "Please choose a publish time."; less than 60 s ahead → "Choose a time in the future."; value interpreted in the browser timezone and sent as UTC ISO instant with offset. Server: `p_scheduled_for ≤ now()` → 22023; status must be draft or scheduled (PT409 for published/archived); draft validated now (title, body, revision). |
| Expected behavior | `status='scheduled'`, `scheduled_for` set; dialog closes; toast "Publication scheduled."; badge "Scheduled for {date, time} ({zone})" formatted in the UI locale and browser zone. The snapshot is taken from the draft **as it is at the due time** (dialog: "…using the draft as it is then"). Re-scheduling a scheduled chapter replaces the time. |
| Exceptions | Schedule is offered for published chapters although the RPC refuses it (F-EDT-01). No per-account timezone setting exists; the device's zone is used. |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/publishing.ts:40-71`, `packages/features/src/editor/components/publish-panel.tsx:97-118,162-199`, `packages/validation/src/rpc.ts:13-18`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:234-274`, `packages/features/src/editor/strings.en.ts:59,76-85`, tests `publishing.test.tsx:81-102,245,359,381`, `supabase/tests/20_publish.test.sql:151,173-180` |
| Status | Verified |

### BR-EDT-022 — Due-chapter job
| Field | Value |
| --- | --- |
| Description | `publish_due_chapters(limit 50)` publishes scheduled chapters whose time has come. |
| Preconditions | pg_cron `storynest-publish-due-chapters` every minute (or another runner if pg_cron is absent) — scheduling owned by `BR-JOB-*`. |
| Conditions | `status='scheduled' AND scheduled_for ≤ now() AND deleted_at IS NULL`, oldest first, `FOR UPDATE SKIP LOCKED`. No revision check. Attributed to `chapter_drafts.updated_by` (last saver). |
| Expected behavior | Each chapter goes through the same core as publish now (`BR-EDT-019/020`). A failing chapter is logged as WARNING, skipped and left scheduled for the next run. Returns the count published. |
| Exceptions | A failing scheduled chapter is never surfaced to the author (F-EDT-05). The actor's current role/account status is not re-checked (Q-EDT-02). |
| Related screens | SCR-EDT-01 (state badge) |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:310-335`, `supabase/migrations/20261103000300_outbox_worker_and_cron.sql:133-138`, tests `supabase/tests/20_publish.test.sql:183-202`; WBS WP 3.7 note (verified on dev: scheduled 10:37 ICT = 03:37 UTC) |
| Status | Verified (SQL test) |

### BR-EDT-023 — Unpublish / cancel schedule
| Field | Value |
| --- | --- |
| Description | Takes a published chapter offline, or cancels a schedule; same RPC. |
| Preconditions | Owner or co_author; confirmation dialog. |
| Conditions | Status must be published or scheduled, else PT409. |
| Expected behavior | `status='draft'`, `published_version_id=NULL`, `scheduled_for=NULL`. Versions are kept (history intact), `first_published_at` kept so publishing again does not re-notify followers. Readers lose access (`BR-READ-*`). Toast "Chapter unpublished and returned to draft." |
| Exceptions | The cancel-schedule path reuses the unpublish dialog and toast text (U-EDT-01). |
| Related screens | SCR-EDT-01 |
| Evidence | `supabase/migrations/20261103000200_publish_chapter_rpc.sql:276-308`, `packages/features/src/editor/components/publish-panel.tsx:149-158,201-213`, `packages/features/src/editor/strings.en.ts:67-68,75,86-90`, tests `publishing.test.tsx:340,353`, `supabase/tests/20_publish.test.sql:142-170` |
| Status | Verified (SQL test) |

### BR-EDT-024 — Role- and state-based enablement of publish controls
| Field | Value |
| --- | --- |
| Description | The "Publish chapter" panel shows only what the user may do now. |
| Preconditions | Publish state loaded (`chapters.status, scheduled_for` + `rpc story_role`). |
| Conditions | `canPublish` = role not null and status ≠ archived → "Publish chapter" (or "Publish new version" when published) + "Schedule…". `canUnpublishChapter` = role ∈ owner, co_author and status ∈ published, scheduled → "Unpublish chapter" (or "Cancel schedule"). Archived → no buttons + "Unarchive it in the chapter list before publishing." (archive rules `BR-CHM-*`). |
| Expected behavior | Badge: draft "Draft, not visible to readers"; scheduled "Scheduled for … (zone)"; published "Published, readers see the published version"; archived "Archived, hidden from readers". |
| Exceptions | While the state is loading or if it fails, the whole panel renders nothing (F-EDT-04). Schedule is shown for published chapters (F-EDT-01). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/model/publishing.ts:6-19`, `packages/features/src/editor/components/publish-panel.tsx:49-59,113-160`, `packages/features/src/editor/api/publishing.api.ts:24-39`, `packages/features/src/editor/strings.en.ts:56-68`, tests `publishing.test.tsx:53,245,333,353` |
| Status | Verified |

### BR-EDT-025 — Error mapping to messages
| Field | Value |
| --- | --- |
| Description | RPC SQLSTATEs are mapped to `AppError.kind` (`classifyRpcError` first, then PostgREST codes / HTTP status) and then to one message per kind; raw server text is never shown. |
| Preconditions | Publish, schedule or unpublish fails. |
| Conditions | 42501 → forbidden "You don't have permission to do this."; PT404 → notFound "Chapter not found (it may have been deleted)."; PT409 → conflict "The draft or chapter status was changed elsewhere. Reload the page and try again."; 22023 → invalid "The chapter isn't ready to publish: check the chapter title, content and scheduled time."; network → "No connection. Check your network and try again."; anything else → "Something went wrong. Please try again." |
| Expected behavior | Shown inline in the panel as `role="alert"`; cleared on the next action. |
| Exceptions | Same message for different 22023 causes (deleted story, foreign image key, past time). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/validation/src/rpc.ts:26-39`, `packages/features/src/_shared/errors.ts:57-122`, `packages/features/src/editor/model/publishing.ts:21-38`, `packages/features/src/editor/components/publish-panel.tsx:81-83,130-137`, `packages/features/src/editor/strings.en.ts:91-98`, test `publishing.test.tsx:67` |
| Status | Verified |

### BR-EDT-026 — Double-submit protection
| Field | Value |
| --- | --- |
| Description | A double click cannot publish twice. |
| Preconditions | — |
| Conditions | A ref lock is taken synchronously on the first click (also between two renders); publish/schedule/unpublish buttons disabled and labelled "Working…" until the answer. Unpublish dialog buttons disabled while pending. |
| Expected behavior | One RPC per click burst (test clicks three times in one `act`). |
| Exceptions | Client-only: the server does not deduplicate two concurrent publishes with the same expected revision (WBS 3.7 note) — F-EDT-06. |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/components/publish-panel.tsx:56-57,64-88,141`, `packages/ui/src/widgets/confirm-dialog.tsx:38-66`, test `publishing.test.tsx:289`; WBS WP 3.7 |
| Status | Verified |

### BR-EDT-027 — Keyboard shortcuts and input rules
| Field | Value |
| --- | --- |
| Description | Shortcuts come from the Tiptap 3.32.2 extensions enabled in `BR-EDT-003`; the app adds none. |
| Preconditions | Focus in the editor body. |
| Conditions | Bold Mod-B; italic Mod-I; underline Mod-U; strikethrough Mod-Shift-S; heading Mod-Alt-2; hard break Shift-Enter / Mod-Enter; undo Mod-Z, redo Mod-Shift-Z / Mod-Y. Markdown input rules: `## ` → heading, `---` / `___ ` / `*** ` → divider, `**x**` / `__x__` bold, `*x*` / `_x_` italic, `~~x~~` strike. Toolbar buttons do not steal focus (mousedown prevented). |
| Expected behavior | As listed. No save shortcut (Mod-S opens the browser's save-page dialog) — U-EDT-04. Shortcuts are not shown in tooltips or `aria-keyshortcuts`. |
| Exceptions | — |
| Related screens | SCR-EDT-01 |
| Evidence | Tiptap 3.32.2 sources under `node_modules/.pnpm/`: `@tiptap/extension-bold/src/bold.tsx:133`, `@tiptap/extension-strike/src/strike.ts:113`, `@tiptap/extension-heading/src/heading.ts:137,146`, `@tiptap/extension-horizontal-rule/src/horizontal-rule.ts:131`, `@tiptap/extension-hard-break/src/hard-break.ts:117-118`, `@tiptap/extensions/src/undo-redo/undo-redo.ts:77-79`; version pin `packages/features/package.json:21-25`; `packages/features/src/editor/components/editor-toolbar.tsx:97-98` |
| Status | Verified (library default; not covered by repo tests) |

### BR-EDT-028 — Cache refresh after a publish action
| Field | Value |
| --- | --- |
| Description | After publish/schedule/unpublish (success or failure) every view showing the chapter is refreshed. |
| Preconditions | — |
| Conditions | Invalidate `["editor","publish-state",chapterId]`, `["studio"]`, story keys, discovery keys. |
| Expected behavior | Panel badge/buttons reflect the new state; studio lists, public story page and feeds refetch. |
| Exceptions | History queries are not invalidated but refetch on mount (`staleTime 0`). |
| Related screens | SCR-EDT-01 |
| Evidence | `packages/features/src/editor/hooks/use-publishing.ts:38-60` |
| Status | Verified |

### BR-EDT-029 — Draft sign-off (batch 4, Lucian 180)
| Field | Value |
| --- | --- |
| Description | One current review per chapter (`chapter_reviews`: pending → approved / changes_requested, the saved revision it is about, notes up to 500 chars) |
| Preconditions | Ask: any team member (`request_chapter_review`, the draft is saved first, revision must match). Decide: owner or co-author who did not ask (`decide_chapter_review`) |
| Conditions | Asking again replaces the review with a new pending one. Notifications (existing table / realtime / bell): `chapter_review_requested` to owner + co-authors except the requester, `chapter_review_approved` / `chapter_review_changes_requested` to the requester; deduped per revision / decision; link to the editor |
| Expected behavior | The editor shows a sign-off sheet with three seals (drafted, review, approved; sent back stamps in the destructive colour) and says when the draft changed after the reviewed revision |
| Exceptions | Advisory: publish / schedule / unpublish do not read reviews. Editor deciding → 42501; deciding your own request → 42501; not pending → PT409; archived chapter → PT409 |
| Related screens | SCR-EDT-01, SCR-NOTI-01 |
| Evidence | `supabase/migrations/20261106040400_chapter_reviews.sql`; `supabase/tests/520_chapter_reviews.test.sql`; `packages/features/src/editor/components/review-panel.tsx`; `packages/features/src/editor/team-tools.test.tsx`; `packages/features/src/notifications/model/notification.ts` |
| Status | Verified (SQL test, unit test) |

### BR-EDT-030 — Advisory edit lock with hand-over (batch 4, Lucian 196)
| Field | Value |
| --- | --- |
| Description | `chapter_edit_locks` (holder, 90 s expiry, optional request) managed only by `claim_edit_lock`, `request_edit_lock`, `hand_over_edit_lock`, `decline_edit_request`, `release_edit_lock` |
| Preconditions | Team member with an active account (42501 / PT404 otherwise) |
| Conditions | The open editor claims on open and every 30 s while visible (takes a free / expired lock, renews its own), releases on close; a holder no longer on the team does not keep it. Updates via Supabase Realtime (already used for notifications) plus a 20 s poll |
| Expected behavior | The editor shows who is editing; others can ask, the holder can hand over or keep editing |
| Exceptions | Advisory only: it never blocks typing or saving and does not touch `chapter_drafts`, so the optimistic revision check is unchanged. Hand over without holding the lock or without a request → PT409 |
| Related screens | SCR-EDT-01 |
| Evidence | `supabase/migrations/20261106040600_chapter_edit_locks.sql`; `supabase/tests/530_chapter_edit_locks.test.sql`; `packages/features/src/editor/hooks/use-team-tools.ts`; `packages/ui/src/widgets/control-handoff.tsx` |
| Status | Verified (SQL test, unit test); realtime delivery not verified (no Supabase project) |
