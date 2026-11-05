# SCR-STM-03 — Edit story

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-STM-03` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-STM](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Edit story ("Edit story") |
| Route | `/studio/story/[id]` |
| Route file | `apps/web/src/app/(main)/studio/story/[id]/page.tsx` (view `apps/web/src/app/(main)/studio/story-form-view.tsx`) |
| Screen component | `packages/features/src/studio/screens/story-form-screen.tsx` (`EditStory` → `StoryFields mode="edit"`); `components/cover-editor.tsx`, `components/tag-editor.tsx`; `ui/widgets/confirm-dialog.tsx` |
| Roles | Owner (all incl. delete/restore), co-author (all but delete/restore), editor (read-only notice) |
| Entry points | SCR-STM-01 row "Edit"; redirect after SCR-STM-02; "Back to story details" on SCR-CHM-01 and SCR-TEAM-01 |
| Workflows | WF-STM-03, WF-STM-04, WF-STM-05, WF-STM-06, WF-STM-07 |
| Rules | BR-STM-007..022, BR-STM-024, BR-STM-025 |

## B. Components
| ID | Component | Notes / evidence |
| --- | --- | --- |
| SCR-STM-03-C01 | Header "Edit story" / "Change how your story is displayed." | `story-form-screen.tsx:92`, `strings.en.ts:168-169` |
| SCR-STM-03-C02 | Link "Manage chapters" → `/studio/story/{id}/chapters` (all roles) | `story-form-screen.tsx:93-98` |
| SCR-STM-03-C03 | Notice "This story is deleted." (when deleted) | `story-form-screen.tsx:99` |
| SCR-STM-03-C04 | Editor notice "You're an editor of this story, so you can't change its details." (replaces the form) | `story-form-screen.tsx:100-102` |
| SCR-STM-03-C05 | Cover block: label "Cover", preview (2:3), "Add a cover"/"Change cover" ("Uploading…"), "Remove cover", hidden file input "Choose a cover", hint, alert; after a valid pick the crop dialog "Adjust the cover" (2:3 frame, "Zoom" slider, "Use photo"/"Cancel") | `components/cover-editor.tsx`, `packages/ui/src/widgets/image-crop-dialog.tsx` |
| SCR-STM-03-C06..C13 | Same fields as SCR-STM-02-C04..C11 (title, slug, synopsis, category, tags, language, status, visibility, 18+) pre-filled | `story-form-screen.tsx:212-395` |
| SCR-STM-03-C14 | "Save changes" (disabled until something changed; "Saving…"), "Cancel" → `/studio` | `story-form-screen.tsx:397-403` |
| SCR-STM-03-C15 | Owner only: "Delete story" (destructive outline) or "Restore story" when deleted | `story-form-screen.tsx:404-433` |
| SCR-STM-03-C16 | Confirm dialog "Delete this story?" | `story-form-screen.tsx:437-450` |
| SCR-STM-03-C17 | Skeleton; error state (retry); empty state "Story not found" | `story-form-screen.tsx:76-89` |

## C. User actions & system responses

| Field | SCR-STM-03-A01 Save changes |
| --- | --- |
| Trigger | "Save changes" |
| Preconditions | Owner/co-author; form dirty or tags changed |
| Expected behavior | Story updated (if fields changed) → tags saved (if changed) → toast "Changes saved." → form marked clean |
| State change | `stories` row; `story_tags` |
| Validation | BR-STM-007; slug never auto-changes (BR-STM-008) |
| Error behavior | Slug taken → field; 0 rows → "Story not found."; forbidden → "You don't have permission to do this."; network → "No connection…"; tags refused → toast + message under Tags, Save stays enabled |
| Navigation | Stays |
| Evidence | `story-form-screen.tsx:162-190`, `story-tags.test.tsx:409-460`, `story-editing.test.tsx:384` |

| Field | SCR-STM-03-A02 Change / add cover |
| --- | --- |
| Trigger | "Add a cover" / "Change cover" → choose file |
| Preconditions | Owner/co-author, active account |
| Expected behavior | WF-STM-04; toast "Cover updated." |
| State change | `cover_storage_key`, Storage objects |
| Validation | Type JPG/PNG/WebP, ≤ 10 MB (client); ≤ 2 MiB after processing (bucket) |
| Error behavior | Inline alert (`role="alert"`) with the specific reason (BR-STM-014) |
| Navigation | — |
| Evidence | `components/cover-editor.tsx:54-59,84-103` |

| Field | SCR-STM-03-A03 Remove cover |
| --- | --- |
| Trigger | "Remove cover" (only when a cover exists) |
| Expected behavior | Key cleared, object deleted, toast "Cover removed."; no confirmation |
| Evidence | `components/cover-editor.tsx:70-83` |

| Field | SCR-STM-03-A04 Delete story |
| --- | --- |
| Trigger | "Delete story" → confirm "Delete story" |
| Preconditions | Owner; not deleted |
| Expected behavior | Soft delete; toast "Story deleted."; navigate to `/studio` |
| State change | `deleted_at = now()` |
| Validation | — |
| Error behavior | Dialog stays open, buttons re-enabled, **no message** (F-STM-03) |
| Navigation | SCR-STM-01 |
| Evidence | `story-form-screen.tsx:424-450`, `packages/ui/src/widgets/confirm-dialog.tsx:15-18,40-51` |

| Field | SCR-STM-03-A05 Restore story |
| --- | --- |
| Trigger | "Restore story" (no confirmation) |
| Preconditions | Owner; story deleted |
| Expected behavior | `deleted_at = null`; toast "Story restored."; notice and button update after refetch |
| Error behavior | Toast; moderator-removed → "You don't have permission to do this." (F-STM-02) |
| Evidence | `story-form-screen.tsx:405-422` |

| Field | SCR-STM-03-A06 Manage chapters / Cancel |
| --- | --- |
| Trigger | "Manage chapters" link; "Cancel" |
| Expected behavior | Navigate to SCR-CHM-01 / SCR-STM-01; unsaved edits discarded without prompt (U-STM-03) |
| Evidence | `story-form-screen.tsx:93-98,401-403` |

Tag actions: as SCR-STM-02-A03.

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Skeleton until story + role are known |
| Loading | Implemented | `Skeleton` `aria-busy` (`story-form-screen.tsx:76`) |
| Empty | Implemented | "Story not found" for no access / missing |
| Populated | Implemented | Form pre-filled with stored values and tags |
| Validation error | Implemented | Field and tag messages |
| Request error | Implemented (save, cover, tags) / Missing (delete) | Banner, inline alerts; delete failure silent (F-STM-03). Load error uses list copy "Couldn't load your stories" (F-STM-06) |
| Success | Implemented | Toasts |
| Disabled | Implemented | Save disabled when clean or busy; cover buttons disabled while busy; tag editor disabled while tags save |
| Unauthorized | Implemented | Guest redirect; non-member → not found; editor → read-only notice |
| Offline | Partial | "No connection…" messages; no offline indicator |
| Unsaved changes | Missing | Save button state shows dirtiness but leaving is not guarded (U-STM-03) |
| Deleted story | Implemented | Notice + Restore; form still editable (Inferred intended) |

## E. Acceptance criteria
- SCR-STM-03-AC01 Given I own the story, When the page loads, Then the form shows the stored values and tags And "Save changes" is disabled.
- SCR-STM-03-AC02 Given I change the title, Then the slug does not change And "Save changes" becomes enabled.
- SCR-STM-03-AC03 Given only the tags changed, When I save, Then only `set_story_tags` is called And the story row is not updated.
- SCR-STM-03-AC04 Given I am an editor, Then I see the read-only notice and no form, cover or delete button.
- SCR-STM-03-AC05 Given I am a co-author, Then I see the form and cover, And no "Delete story" button.
- SCR-STM-03-AC06 Given I am not a member of the story (or it does not exist), Then "Story not found" is shown.
- SCR-STM-03-AC07 Given I confirm "Delete story", Then the story is soft-deleted, "Story deleted." is shown And I land on `/studio`.
- SCR-STM-03-AC08 Given the story is deleted, Then "This story is deleted." and "Restore story" are shown; When I click it, Then "Story restored." is shown.
- SCR-STM-03-AC09 Given I pick a GIF as cover, Then "Only JPG, PNG or WebP pictures can be used." is shown And nothing is uploaded.
- SCR-STM-03-AC10 Given a 1200×600 PNG, When picked, Then the crop dialog opens; When "Use photo" is pressed without changes, Then the stored cover is the centred 2:3 part (400×600) And the old cover object is removed; When "Cancel" is pressed, Then nothing is uploaded.
- SCR-STM-03-AC11 Given deleting fails, Then an error message is shown in or under the dialog `[Proposed]` (F-STM-03).
- SCR-STM-03-AC12 Given the story was removed by a moderator, Then "Restore story" is not offered and the reason is explained `[Proposed]` (F-STM-02).
- SCR-STM-03-AC13 Given I change the slug of a story with readers, Then the hint tells me old links will redirect `[Proposed]` (U-STM-02).
- SCR-STM-03-AC14 Given a co-author calls the API to set `deleted_at`, Then the update is refused `[Proposed]` (F-STM-01, pending Q-TEAM-02).

## F. Findings referenced
F-STM-01, F-STM-02, F-STM-03, F-STM-05, F-STM-06, U-STM-01, U-STM-02, U-STM-03, U-STM-05.

## G. Open questions
Q-TEAM-02, Q-STM-01.
