# OBJ-STM — Story management: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-STM` |
| Name | Story management (studio list, create/edit, cover, tags, slug, soft delete/restore, status/visibility/mature) |
| Business purpose | Let a writer create a story, keep its public card (title, synopsis, cover, category, tags, language, status, visibility, 18+) correct, and take it down or bring it back without ever losing data |
| User goals | See all my stories (own + shared) at a glance; start a new story in one form; fix details any time; hide a story and restore it |
| Actors / roles | Owner (all), co-author (edit settings, cover, tags), editor (read-only on settings). Matrix: [BR-TEAM-010](../collaboration/business-rules.md#br-team-010--studio-role-permission-matrix) |
| Related entities | Tables `stories`, `story_collaborators`, `story_tags`, `tags`, `categories`, Storage bucket `covers`; RPC `set_story_tags`; helpers `story_role`, `can_read_story`, `is_active_account`, `is_valid_storage_key`, `can_write_story_image`; trigger `stories_guard_removal` |
| Code | `packages/features/src/studio/{screens/studio-screen.tsx,screens/story-form-screen.tsx,components/cover-editor.tsx,components/tag-editor.tsx,api/studio.api.ts,api/story-write.api.ts,hooks/use-my-stories.ts,hooks/use-story-editing.ts,model/story-form.ts,model/studio-story.ts,model/tags.ts}`, `packages/validation/src/story.ts` |
| Dependencies | OBJ-TAX (tag creation/quota, categories), OBJ-STORY (public page, canonical redirect, reader visibility), OBJ-MOD (moderator removal), OBJ-MAT (mature effects), OBJ-TEAM (roles) |

| Rule | Name | Status |
| --- | --- | --- |
| BR-STM-001 | Studio list = my own + my shared stories, not deleted | Verified |
| BR-STM-002 | Merge, de-duplicate and order of the Studio list | Verified |
| BR-STM-003 | Studio row content | Verified |
| BR-STM-004 | Quick actions per role on a Studio row | Verified |
| BR-STM-005 | Who may create a story; client-generated id | Verified |
| BR-STM-006 | Defaults of a new story | Verified |
| BR-STM-007 | Story field validation | Verified |
| BR-STM-008 | Slug proposal from the title | Verified |
| BR-STM-009 | Slug unique per owner | Verified |
| BR-STM-010 | Canonical public address and slug change | Verified |
| BR-STM-011 | Who may update story settings; save only real changes | Verified |
| BR-STM-012 | Editor is read-only on story settings | Verified |
| BR-STM-013 | Attaching tags to a story | Verified |
| BR-STM-014 | Cover upload | Verified |
| BR-STM-015 | Cover removal | Verified |
| BR-STM-016 | Soft delete of a story | Verified (RLS gap) |
| BR-STM-017 | Restore of a story | Verified |
| BR-STM-018 | Effects of a deleted story | Verified |
| BR-STM-019 | Visibility and reader access | Verified |
| BR-STM-020 | Story status | Verified |
| BR-STM-021 | Mature (18+) flag | Verified |
| BR-STM-022 | Opening a story in the Studio | Verified |
| BR-STM-023 | Route protection of Studio pages | Verified |
| BR-STM-024 | Cache refresh after a story write | Verified |
| BR-STM-025 | Account status on direct story writes | Verified (gap) |

## 2. Rules

### BR-STM-001 — Studio list = my own + my shared stories, not deleted
| Field | Value |
| --- | --- |
| Description | The Studio home lists stories the user owns plus stories where the user is a collaborator; nothing else, even though RLS also lets every user read public stories |
| Preconditions | Signed in (query idle until the session is known) |
| Conditions | Two queries: `stories` filtered by `owner_id = me` and `deleted_at IS NULL`; `story_collaborators` filtered by `user_id = me` with an inner-joined story whose `deleted_at IS NULL`. Columns: id, slug, title, status, visibility, is_mature, cover_storage_key, updated_at, `chapters(count)` |
| Expected behavior | Soft-deleted stories never appear in the list (they appear in the owner's "Deleted stories" section, BR-STM-017). A database error is shown as an error state, never as an empty list |
| Exceptions | No pagination: every story is loaded (WBS 3.1 "phân trang (chưa cần …)"). Chapter count includes draft, archived and soft-deleted chapters (the embed counts every chapter row visible to the user) — Inferred from `chapters(count)` with chapters RLS `can_read_chapter` (collaborators see all) |
| Related screens | SCR-STM-01 |
| Evidence | `packages/features/src/studio/api/studio.api.ts:11,18-39`; `packages/features/src/studio/hooks/use-my-stories.ts:11-21`; `packages/features/src/studio/studio.test.tsx:55,98`; `docs/WBS.md` WP 3.1 |
| Status | Verified |

### BR-STM-002 — Merge, de-duplicate and order of the Studio list
| Field | Value |
| --- | --- |
| Description | Owned and shared stories form one list |
| Preconditions | Both queries succeeded |
| Conditions | A story id appearing in both sets keeps the `owner` role; a collaborator row whose role is not `co_author`/`editor` is dropped |
| Expected behavior | Sorted by `updated_at` descending, ties by id descending |
| Exceptions | — |
| Related screens | SCR-STM-01 |
| Evidence | `packages/features/src/studio/model/studio-story.ts:53-64`; `packages/features/src/studio/api/studio.api.ts:34-38`; `packages/features/src/studio/studio.test.tsx:70,90,108` |
| Status | Verified |

### BR-STM-003 — Studio row content
| Field | Value |
| --- | --- |
| Description | Each row shows cover (or title initial), title, status badge, visibility badge with icon, "18+" badge when mature, role badge for non-owners, chapter count, relative "Updated …" time |
| Preconditions | — |
| Conditions | An unknown visibility value is displayed as `private` (most restrictive) |
| Expected behavior | Labels: `studioText.visibility.*` ("Private" / "Anyone with the link" / "Public"), `studioText.role.*` ("Co-author" / "Editor"), `studioText.chapterCount`, `studioText.updated` |
| Exceptions | Owner rows carry no role badge |
| Related screens | SCR-STM-01 |
| Evidence | `packages/features/src/studio/screens/studio-screen.tsx:31-59`; `packages/features/src/studio/model/studio-story.ts:33-47`; `packages/features/src/studio/strings.en.ts:5-8` |
| Status | Verified |

### BR-STM-004 — Quick actions per role on a Studio row
| Field | Value |
| --- | --- |
| Description | Which links a row offers depends on the user's role on that story |
| Preconditions | Row rendered |
| Conditions | "Edit" → owner, co-author; "Manage chapters" → all roles; "Collaborators" → owner; "Stats" → owner, co-author; "View story page" → all roles |
| Expected behavior | Hidden links match what the database allows for these destinations (see BR-TEAM-010) |
| Exceptions | "View story page" links to `/story/{id}/{slug}` even for a private/draft story; the page renders for collaborators only (BR-STM-019) |
| Related screens | SCR-STM-01 |
| Evidence | `packages/features/src/studio/screens/studio-screen.tsx:61-97` |
| Status | Verified |

### BR-STM-005 — Who may create a story; client-generated id
| Field | Value |
| --- | --- |
| Description | Any signed-in user with an active account creates stories they own |
| Preconditions | Signed in; `app_users.account_status = 'active'` and not deleted |
| Conditions | INSERT is allowed only when `owner_id = auth.uid()` and `is_active_account()`; insertable columns are id, owner_id, category_id, slug, title, synopsis, cover_storage_key, language_code, status, visibility, is_mature. The id is generated by the client once per opened form and reused on retry |
| Expected behavior | On success: toast `studioText.form.created` ("Story created."), tags saved (BR-STM-013), navigation to `/studio/story/{id}` |
| Exceptions | Owner spoofing → 403 (WBS 3.2 REST attack check). A retry after a lost response hits the primary key (unique violation 23505) and is reported as "slug taken" — see finding F-STM-04 |
| Related screens | SCR-STM-02 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:203-208`; `packages/features/src/studio/api/story-write.api.ts:31-39`; `packages/features/src/studio/screens/story-form-screen.tsx:62-71,162-172`; `packages/features/src/studio/story-editing.test.tsx:309,344` |
| Status | Verified |

### BR-STM-006 — Defaults of a new story
| Field | Value |
| --- | --- |
| Description | A new story starts as a private draft in Vietnamese, not mature, no category, empty synopsis |
| Preconditions | Create form opened |
| Conditions | Form defaults `emptyStoryForm()`; the database contract `storyCreateSchema` has the same defaults |
| Expected behavior | title "", slug "", synopsis "", categoryId "" (none), languageCode `vi`, status `draft`, visibility `private`, isMature false |
| Exceptions | — |
| Related screens | SCR-STM-02 |
| Evidence | `packages/features/src/studio/model/story-form.ts:21-31`; `packages/validation/src/inputs.ts:39-50`; `packages/features/src/studio/story-editing.test.tsx:120` |
| Status | Verified |

### BR-STM-007 — Story field validation
| Field | Value |
| --- | --- |
| Description | Inputs are validated by `storyFormSchema` in the browser, then by `storyCreateSchema`/`storyUpdateSchema` before sending, then by table constraints |
| Preconditions | Submit |
| Conditions | title trimmed 1–200; slug trimmed 1–120 and `^[a-z0-9]+(?:-[a-z0-9]+)*$`; synopsis trimmed ≤ 5000; category = digits or empty; language code `^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$` (UI offers `vi`, `en`); status ∈ draft/ongoing/completed/hiatus; visibility ∈ private/unlisted/public; isMature boolean. DB: varchar(200)/varchar(120), non-blank title and slug, status and visibility CHECKs |
| Expected behavior | Field messages from `studioText.validation.*` (e.g. "Please enter a story title.", "The slug can only contain lowercase letters, numbers and hyphens."); nothing is sent while invalid |
| Exceptions | The slug *format* is not checked by the database (only non-blank and length) — a direct API write could store an invalid slug. Inferred from `supabase/migrations/20261103000000_init_schema.sql:59,75` |
| Related screens | SCR-STM-02, SCR-STM-03 |
| Evidence | `packages/validation/src/story.ts:8-42`; `packages/features/src/studio/model/story-form.ts:39-61,84-97`; `supabase/migrations/20261103000000_init_schema.sql:55-76`; `packages/features/src/studio/strings.en.ts:227-235`; `packages/features/src/studio/story-editing.test.tsx:328` |
| Status | Verified |

### BR-STM-008 — Slug proposal from the title
| Field | Value |
| --- | --- |
| Description | While creating, the slug follows the title (ASCII, lowercase, hyphenated, ≤ 120) until the author types in the slug field; when editing an existing story the slug never changes by itself |
| Preconditions | — |
| Conditions | `slugTouched` starts `true` in edit mode; set `true` on any slug keystroke |
| Expected behavior | "Đừng Bỏ Cuộc!" → `dung-bo-cuoc` |
| Exceptions | A title without Latin letters/digits gives an empty slug and the "Please enter a URL slug." error (Inferred from `slugify` + schema) |
| Related screens | SCR-STM-02, SCR-STM-03 |
| Evidence | `packages/features/src/studio/screens/story-form-screen.tsx:133-134,221-226,246-248`; `packages/features/src/studio/model/story-form.ts:34-37`; `packages/features/src/studio/story-editing.test.tsx:98,298,397` |
| Status | Verified |

### BR-STM-009 — Slug unique per owner
| Field | Value |
| --- | --- |
| Description | One owner cannot have two stories with the same slug; different owners may |
| Preconditions | Create or update |
| Conditions | `UNIQUE (owner_id, slug)` — soft-deleted stories keep their slug reserved |
| Expected behavior | A unique violation (`conflict` + code 23505) is shown on the slug field: `studioText.errors.slugTaken` ("You already have a story with this URL slug. Choose a different one.") instead of the banner |
| Exceptions | No check while typing (WBS 3.2 "Chưa làm: kiểm tra trùng slug ngay khi gõ"). Any 23505 is treated as a slug conflict (see F-STM-04) |
| Related screens | SCR-STM-02, SCR-STM-03 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:73`; `packages/features/src/studio/model/story-form.ts:99-104`; `packages/features/src/studio/screens/story-form-screen.tsx:142-144,190`; `packages/features/src/studio/story-editing.test.tsx:335` |
| Status | Verified |

### BR-STM-010 — Canonical public address and slug change
| Field | Value |
| --- | --- |
| Description | The public story address is `/story/{id}/{slug}`; the id decides the story, the slug is cosmetic (decision Q2). Changing a story slug therefore never breaks links: a stale slug permanently redirects to the current one, also for chapter pages |
| Preconditions | Slug changed in SCR-STM-03 |
| Conditions | Server page compares the requested slug with the stored one |
| Expected behavior | 308 to `/story/{id}/{newSlug}` (and `/story/{id}/{newSlug}/{chapterSlug}`) |
| Exceptions | Chapter slugs have no redirect (BR-CHM-006). Rule owned by OBJ-STORY/OBJ-SEO; referenced here |
| Related screens | SCR-STM-03 |
| Evidence | `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:50`; `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:47`; `docs/WBS.md` §4 Q2 |
| Status | Verified |

### BR-STM-011 — Who may update story settings; save only real changes
| Field | Value |
| --- | --- |
| Description | Owner and co-authors update category, slug, title, synopsis, cover key, language, status, visibility, mature flag and `deleted_at` |
| Preconditions | `story_role(id) IN ('owner','co_author')` |
| Conditions | Update policy `stories_update`; `owner_id` is not updatable (column grant). The form sends every field (full state). "Save changes" is enabled only when the form is dirty or the tag set changed; when only tags changed the story row is not touched (so it does not jump to the top of "recently updated") |
| Expected behavior | Toast `studioText.form.saved` ("Changes saved."); form reset to the saved values |
| Exceptions | Zero matched rows → `notFound` → banner "Story not found."; `forbidden` → "You don't have permission to do this."; `network` → "No connection. Check your network and try again." |
| Related screens | SCR-STM-03 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:205-211`; `packages/features/src/studio/api/story-write.api.ts:41-45`; `packages/features/src/studio/screens/story-form-screen.tsx:174-187,398`; `packages/features/src/studio/model/story-form.ts:106-118`; `packages/features/src/studio/story-editing.test.tsx:167,384`; `packages/features/src/studio/story-tags.test.tsx:409,438,449` |
| Status | Verified |

### BR-STM-012 — Editor is read-only on story settings
| Field | Value |
| --- | --- |
| Description | An editor opening `/studio/story/{id}` sees the header, the "Manage chapters" link and the notice `studioText.form.readOnly` ("You're an editor of this story, so you can't change its details."), no form, cover or tags |
| Preconditions | `role = 'editor'` |
| Conditions | — |
| Expected behavior | Matches RLS: an editor's UPDATE of `stories` matches 0 rows (SQL test "editor cannot change story") |
| Exceptions | — |
| Related screens | SCR-STM-03 |
| Evidence | `packages/features/src/studio/screens/story-form-screen.tsx:100-104`; `packages/features/src/studio/strings.en.ts:215`; `supabase/tests/10_rls.test.sql:143`; `packages/features/src/studio/story-editing.test.tsx:404` |
| Status | Verified |

### BR-STM-013 — Attaching tags to a story
| Field | Value |
| --- | --- |
| Description | A story has at most 10 tags; tags are chosen in the story form and saved with it through `set_story_tags` (replace the whole set) |
| Preconditions | Owner or co-author, active account (RPC) |
| Conditions | Name cleaned (trim, inner whitespace collapsed), ≤ 40 characters, slug 2–40; same slug = same tag (first spelling kept); input split at `,` `;` newline; Enter/comma/blur commit; Backspace in empty field removes last; up to 8 popular suggestions not yet chosen; field disabled when 10 tags. Tag *creation* rules and the 10-new-tags-per-24h quota are owned by OBJ-TAX (BR-TAX-*). Direct writes to `story_tags` are closed |
| Expected behavior | Create: tags saved after the story; edit: saved after the story update or alone. The stored set (as cleaned by the DB) replaces the chips |
| Exceptions | RPC errors: 22023 → `tags.errors.invalid`; PT409 (quota) → `tags.errors.quota` ("You've created 10 new tags in the past 24 hours…"); 42501 → `tags.errors.forbidden`. The story stays saved; toast `tags.savedWithoutTags` ("Story saved, but the tags couldn't be saved. …") and the message under the field |
| Related screens | SCR-STM-02, SCR-STM-03 |
| Evidence | `supabase/migrations/20261104001400_tags.sql:1-13,23,33-99`; `packages/features/src/studio/model/tags.ts:7-12,23-91`; `packages/features/src/studio/components/tag-editor.tsx:46-62,66,115-121`; `packages/features/src/studio/screens/story-form-screen.tsx:128-160`; `packages/features/src/studio/story-tags.test.tsx:44,75,89,390,460` |
| Status | Verified |

### BR-STM-014 — Cover upload
| Field | Value |
| --- | --- |
| Description | A cover can be added/changed only for a story that already exists (edit form), by owner or co-author |
| Preconditions | Edit mode; role owner/co_author; active account |
| Conditions | Client: JPEG/PNG/WebP, input ≤ 10 MB, centre-cropped to 2:3, ≤ 600 px wide, WebP (JPEG fallback). Storage: bucket `covers` public, ≤ 2 MiB, JPEG/PNG/WebP; key `<story_id>/<generated file name>` (no user file name); `upsert: false`. DB CHECK: `cover_storage_key` must lie in the story's own folder. Upload happens immediately on file pick (not with "Save changes") |
| Expected behavior | Upload → set `stories.cover_storage_key` → delete the previous object (best effort) → toast "Cover updated." |
| Exceptions | Set-key failure removes the just-uploaded object; 0 rows → notFound. Error texts: wrong type "Only JPG, PNG or WebP pictures can be used.", > 10 MB "That picture is too large (10 MB at most).", unreadable, 400/413/415 → "The server did not accept this picture…", 401/403 → "You are not allowed to change this story's cover.", network. Create mode shows `form.cover.saveFirst` ("Save the story first, then you can add a cover.") |
| Related screens | SCR-STM-03 (SCR-STM-02 shows the hint) |
| Evidence | `packages/features/src/studio/components/cover-editor.tsx:21-34,54-59,84-95`; `packages/features/src/studio/api/story-write.api.ts:138-181`; `packages/features/src/_shared/image-prepare.ts:5,84`; `supabase/migrations/20261104002400_story_image_buckets.sql:22-54,59-66`; `supabase/migrations/20261104000300_storage_key_convention.sql:24-34`; `packages/features/src/studio/screens/story-form-screen.tsx:206-210`; `packages/features/src/studio/cover.test.tsx:69,97,106,164`; `supabase/tests/300_story_image_buckets.test.sql` |
| Status | Verified |

### BR-STM-015 — Cover removal
| Field | Value |
| --- | --- |
| Description | "Remove cover" (shown only when a cover exists) clears the key first, then deletes the object |
| Preconditions | Cover set; owner/co-author |
| Conditions | — |
| Expected behavior | Toast "Cover removed."; title initial shows again everywhere |
| Exceptions | Object deletion failure is ignored (orphan object possible). Old URLs may stay in caches (WBS 3.3 note) |
| Related screens | SCR-STM-03 |
| Evidence | `packages/features/src/studio/api/story-write.api.ts:183-195`; `packages/features/src/studio/components/cover-editor.tsx:70-83`; `packages/features/src/studio/cover.test.tsx:124,172` |
| Status | Verified |

### BR-STM-016 — Soft delete of a story
| Field | Value |
| --- | --- |
| Description | A story is never hard-deleted; "Delete story" sets `deleted_at = now()` after confirmation |
| Preconditions | UI: owner only, story not deleted |
| Conditions | No DELETE grant on `stories`; the UPDATE of `deleted_at` goes through `stories_update`, which allows **owner and co-author** |
| Expected behavior | Confirm dialog "Delete this story?" / "The story will be hidden from everyone. You can restore it from "Deleted stories" in Studio." → toast "Story deleted." → navigate to `/studio` |
| Exceptions | Documented rule (WBS 3.2 "chỉ chủ sở hữu mới xóa") is enforced only by the UI: a co-author can soft-delete (and restore) through the API — finding F-STM-01. A failed delete leaves the dialog open with no message — finding F-STM-03 |
| Related screens | SCR-STM-03 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:205-212`; `packages/features/src/studio/api/story-write.api.ts:47-57`; `packages/features/src/studio/screens/story-form-screen.tsx:404-450`; `packages/features/src/studio/strings.en.ts:218-223`; `packages/features/src/studio/story-editing.test.tsx:179,415,427` |
| Status | Verified (RLS weaker than documented rule) |

### BR-STM-017 — Restore of a story
| Field | Value |
| --- | --- |
| Description | The owner restores a soft-deleted story from the Studio "Deleted stories" section or from the edit form ("Restore story") |
| Preconditions | Story deleted by its owner (or co-author) |
| Conditions | Deleted list = the caller's **own** deleted stories (`owner_id = me`), newest deletion first, hidden behind a toggle "Show deleted stories (n)", rendered only when non-empty. Trigger `stories_guard_removal` refuses (42501) to clear `deleted_at` when the last moderator action on the story is `remove_story` |
| Expected behavior | `deleted_at = NULL`, toast "Story restored."; the story returns to the Studio list and to readers (if its visibility/status allow) |
| Exceptions | Moderator-removed story: the Restore button is still offered and fails with "You don't have permission to do this." — finding F-STM-02. Co-authors never see the deleted list |
| Related screens | SCR-STM-01, SCR-STM-03 |
| Evidence | `packages/features/src/studio/api/story-write.api.ts:115-127`; `packages/features/src/studio/screens/studio-screen.tsx:155-209`; `packages/features/src/studio/screens/story-form-screen.tsx:405-422`; `supabase/migrations/20261104002000_moderation.sql:15-18,103-116`; `packages/features/src/studio/story-editing.test.tsx:238,433,460,470` |
| Status | Verified |

### BR-STM-018 — Effects of a deleted story
| Field | Value |
| --- | --- |
| Description | While `deleted_at` is set the story is out of circulation but still editable by its managers |
| Preconditions | `deleted_at IS NOT NULL` |
| Conditions / Expected behavior | Readers cannot read it or its chapters (`can_read_story`/`can_read_chapter` require `deleted_at IS NULL` for non-managers); excluded from the Studio list (BR-STM-001); `create_chapter`/`reorder_chapters` → PT404; `publish_chapter` → 22023 "story is deleted"; `invite_collaborator` → PT404; `list_my_invitations` hides it; accepting its invitation → PT409. The edit form still opens with the notice "This story is deleted." and remains editable |
| Exceptions | Chapter manager does not show the deleted state (finding U-CHM-02) |
| Related screens | SCR-STM-01, SCR-STM-03, SCR-CHM-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:93-112`; `supabase/migrations/20261104000400_chapter_management.sql:49-52,72-75`; `supabase/migrations/20261103000200_publish_chapter_rpc.sql:131-133`; `supabase/migrations/20261104000500_collaboration_invitations.sql:70-73,128-131,178`; `packages/features/src/studio/screens/story-form-screen.tsx:99` |
| Status | Verified |

### BR-STM-019 — Visibility and reader access
| Field | Value |
| --- | --- |
| Description | `private` = owner and collaborators only; `unlisted` = anyone with the link, not in discovery; `public` = everyone |
| Preconditions | — |
| Conditions | Non-managers can read a story only if `deleted_at IS NULL AND visibility IN ('public','unlisted') AND status <> 'draft'`. Discovery exclusion of unlisted is owned by BR-STORY-* |
| Expected behavior | Hints: private "Only you and your collaborators can view it.", unlisted "Anyone with the link can view it; it won't appear on the home page or in search.", public "Everyone can see and find it." |
| Exceptions | A `public` story whose status is still `draft` is invisible to readers; the hint does not say so (finding U-STM-01). First publish of a chapter moves `draft` → `ongoing` (BR-STM-020) |
| Related screens | SCR-STM-02, SCR-STM-03 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:93-101,198-202`; `packages/features/src/studio/strings.en.ts:180-185` |
| Status | Verified |

### BR-STM-020 — Story status
| Field | Value |
| --- | --- |
| Description | Status ∈ draft / ongoing / completed / hiatus is chosen by the author; labels from `statusLabel` (discovery) |
| Preconditions | — |
| Conditions | The first publish of any chapter changes `draft` to `ongoing` and sets `first_published_at` |
| Expected behavior | Setting `draft` again hides the whole story from readers (BR-STM-019) |
| Exceptions | No warning when switching a live story back to draft (finding U-STM-01) |
| Related screens | SCR-STM-02, SCR-STM-03 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:64-65`; `supabase/migrations/20261103000200_publish_chapter_rpc.sql:194-196`; `packages/features/src/studio/screens/story-form-screen.tsx:329-352` |
| Status | Verified |

### BR-STM-021 — Mature (18+) flag
| Field | Value |
| --- | --- |
| Description | Switch "Mature content (18+)" with hint "18+ stories are hidden from the home page by default."; shown as "18+" badge in the Studio |
| Preconditions | Owner/co-author |
| Conditions | Stored as `stories.is_mature`; reader/discovery effects owned by OBJ-MAT (BR-MAT-*) |
| Expected behavior | — |
| Exceptions | — |
| Related screens | SCR-STM-01..03 |
| Evidence | `packages/features/src/studio/screens/story-form-screen.tsx:381-395`; `packages/features/src/studio/strings.en.ts:186-187`; `packages/features/src/studio/screens/studio-screen.tsx:53` |
| Status | Verified |

### BR-STM-022 — Opening a story in the Studio
| Field | Value |
| --- | --- |
| Description | A Studio story page opens only for the owner or a collaborator; anything else is "Story not found" ("The story doesn't exist or you don't have access to it.") |
| Preconditions | Signed in |
| Conditions | Row read under RLS; role = owner if `owner_id = me`, else collaborator role; a moderator who can read the row but has no role gets `null` |
| Expected behavior | Loads form values, role, `deleted_at`, tags (sorted by name) and cover key. Never cached (`staleTime 0`, `gcTime 0`) |
| Exceptions | A non-UUID id yields a load error with retry instead of "not found" (finding F-STM-06, Inferred) |
| Related screens | SCR-STM-03, SCR-CHM-01, SCR-TEAM-01 |
| Evidence | `packages/features/src/studio/api/story-write.api.ts:59-107`; `packages/features/src/studio/hooks/use-story-editing.ts:26-36`; `packages/features/src/studio/story-editing.test.tsx:190,410` |
| Status | Verified |

### BR-STM-023 — Route protection of Studio pages
| Field | Value |
| --- | --- |
| Description | Every `/studio/**` path needs a signed-in user: the proxy redirects guests to `/login?next=<path>`; each page re-checks with `requireUser(<own path>)`; RLS decides the data |
| Preconditions | — |
| Conditions | `PROTECTED_PREFIXES` contains `/studio` |
| Expected behavior | After sign-in the user returns to the requested Studio page; pages are `noindex` |
| Exceptions | — |
| Related screens | All D-STUDIO screens |
| Evidence | `apps/web/src/lib/auth/route-guard.ts:4-12,35-48`; `apps/web/src/lib/auth/require-user.ts:29-33`; `apps/web/src/app/(main)/studio/page.tsx:8-13`; `apps/web/src/app/(main)/studio/new/page.tsx:8-13`; `apps/web/src/app/(main)/studio/story/[id]/page.tsx:8-14` |
| Status | Verified |

### BR-STM-024 — Cache refresh after a story write
| Field | Value |
| --- | --- |
| Description | After create, update, delete/restore, tag save, cover upload/remove, the Studio, public story and discovery caches are invalidated |
| Preconditions | Mutation succeeded |
| Conditions | Invalidate `studioKeys.all`, `storyKeys.all`, `discoveryKeys.all`; Studio queries use `staleTime 0` |
| Expected behavior | The Studio list, story page and home feed show the new state on next view |
| Exceptions | Image CDN caches of a replaced cover are not purged (WBS 3.3) |
| Related screens | SCR-STM-01..03 |
| Evidence | `packages/features/src/studio/hooks/use-story-editing.ts:50-58,66-160` |
| Status | Verified |

### BR-STM-025 — Account status on direct story writes
| Field | Value |
| --- | --- |
| Description | Creating a story requires an active account; updating, soft-deleting and restoring it do not |
| Preconditions | Account suspended or deactivated |
| Conditions | `stories_insert` checks `is_active_account()`; `stories_update` checks only `story_role`. Cover upload is blocked (bucket policy checks active), tags are blocked (RPC checks active) |
| Expected behavior | — |
| Exceptions | A suspended account can still edit settings, delete/restore its story and clear its cover key — finding F-STM-05 / Q-STM-01 |
| Related screens | SCR-STM-03 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:74-80,207-211`; `supabase/migrations/20261104002400_story_image_buckets.sql:38-40`; `supabase/migrations/20261104001400_tags.sql:48-51` |
| Status | Verified (gap) |
