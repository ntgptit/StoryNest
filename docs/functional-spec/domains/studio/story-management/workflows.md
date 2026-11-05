# OBJ-STM — Story management: workflows

| ID | Name | Status |
| --- | --- | --- |
| WF-STM-01 | Open the Studio and find a story | Verified |
| WF-STM-02 | Create a story | Verified |
| WF-STM-03 | Edit story settings and tags | Verified |
| WF-STM-04 | Add, change or remove the cover | Verified |
| WF-STM-05 | Soft-delete a story | Verified |
| WF-STM-06 | Restore a deleted story | Verified |
| WF-STM-07 | Change a story's URL slug (cross-screen: Studio → public page) | Verified |

### WF-STM-01 — Open the Studio and find a story
| Field | Value |
| --- | --- |
| User goal | See every story I write or help with, and jump to the right tool |
| Trigger | User menu "Studio" or bottom nav "Write" (`/studio`); notification "collaboration_invited" |
| Preconditions | Signed in (else redirected to `/login?next=/studio`, BR-STM-023) |
| Main flow | 1. Page renders header "Studio" + "Write a new story". 2. Pending invitations (if any) appear in "Collaboration invitations" (WF-TEAM-02). 3. Skeleton (3 cards) while loading. 4. List of stories (BR-STM-001..003), newest update first. 5. User picks a row action (BR-STM-004): Edit → WF-STM-03, Manage chapters → WF-CHM-*, Collaborators → WF-TEAM-01, Stats → WF-STAT-01, View story page → public page |
| Alternative flows | A1 No stories: empty state "You don't have any stories yet". A2 Owner has deleted stories: "Show deleted stories (n)" toggle → WF-STM-06 |
| Exception flows | E1 Load fails: error "Couldn't load your stories" + "Try again" (refetch). E2 Invitations or deleted list fail to load: section silently absent (finding U-STM-04) |
| Success criteria | Only owned and shared, non-deleted stories are listed, each with correct role-dependent actions |
| Postconditions | None (read-only) |
| Affected objects | OBJ-STM, OBJ-TEAM (inbox) |
| Related screens | SCR-STM-01 |
| Status | Verified — `packages/features/src/studio/screens/studio-screen.tsx:104-153`, `packages/features/src/studio/studio.test.tsx:158,185,194` |

### WF-STM-02 — Create a story
| Field | Value |
| --- | --- |
| User goal | Start a new story with its basic details |
| Trigger | "Write a new story" on SCR-STM-01 (`/studio/new`) |
| Preconditions | Signed in; active account |
| Main flow | 1. Form opens with defaults (BR-STM-006) and a client id generated once. 2. User types the title; slug fills in (BR-STM-008). 3. Optional: synopsis, category ("Parent › Child" list), tags (chips), language, status, visibility (with hint), 18+. 4. "Create story" → button shows "Saving…". 5. Story inserted (BR-STM-005). 6. If tags were chosen, `set_story_tags` runs. 7. Toast "Story created." 8. Navigate to `/studio/story/{id}` (SCR-STM-03), where the cover can now be added |
| Alternative flows | A1 Author edits the slug manually → it stops following the title. A2 "Cancel" → `/studio`, nothing saved, no prompt |
| Exception flows | E1 Validation error → field messages, nothing sent. E2 Slug taken → message on the slug field. E3 Tags refused → story still created; toast "Story saved, but the tags couldn't be saved. …"; navigation still happens and the typed tags are lost (finding U-STM-06). E4 Network/other → banner (`studioText.errors.*`); retry reuses the id; if the first insert actually succeeded the retry is reported as "slug taken" (finding F-STM-04) |
| Success criteria | Exactly one story row, owned by the user, with the entered values |
| Postconditions | Story exists as private draft by default; Studio, story and discovery caches invalidated |
| Affected objects | OBJ-STM, OBJ-TAX (tags) |
| Related screens | SCR-STM-02 → SCR-STM-03 |
| Status | Verified — `packages/features/src/studio/screens/story-form-screen.tsx:71-80,172-182`, `packages/features/src/studio/story-tags.test.tsx:366,391` |

### WF-STM-03 — Edit story settings and tags
| Field | Value |
| --- | --- |
| User goal | Correct or update how the story is presented |
| Trigger | Row "Edit" on SCR-STM-01; "Back to story details" on SCR-CHM-01 / SCR-TEAM-01 |
| Preconditions | Owner or co-author (editor sees read-only notice, BR-STM-012) |
| Main flow | 1. Skeleton, then the form filled with stored values, tags and cover. 2. User changes fields and/or tags. 3. "Save changes" becomes enabled. 4. Submit: story updated (if any field changed), then tags saved (if changed). 5. Toast "Changes saved."; button disabled again |
| Alternative flows | A1 Only tags changed → only `set_story_tags`, story row untouched. A2 Slug changed → WF-STM-07. A3 Visibility/status changed → reader access follows BR-STM-019/020 |
| Exception flows | E1 Validation → field messages. E2 Slug taken → slug field. E3 Tag refusal after a successful story save → toast + message under Tags; Save remains enabled for retry. E4 0 rows / forbidden / network → banner. E5 Story not visible / not mine → "Story not found" empty state. E6 Load error → error state with retry |
| Success criteria | Stored values equal the submitted form; tags equal the stored set |
| Postconditions | `updated_at` touched (trigger `stories_touch`); caches invalidated |
| Affected objects | OBJ-STM, OBJ-TAX |
| Related screens | SCR-STM-03 |
| Status | Verified — `packages/features/src/studio/screens/story-form-screen.tsx:82-116,172-197`, `packages/features/src/studio/story-tags.test.tsx:410-461` |

### WF-STM-04 — Add, change or remove the cover
| Field | Value |
| --- | --- |
| User goal | Give the story a cover picture |
| Trigger | "Add a cover" / "Change cover" / "Remove cover" in the Cover block of SCR-STM-03 |
| Preconditions | Story saved (edit mode); owner or co-author; active account |
| Main flow | 1. "Add a cover" opens the file picker (JPG/PNG/WebP). 2. Client checks type and ≤ 10 MB, opens the 2:3 crop dialog (drag, zoom by slider/wheel/pinch, arrows/+/−); on "Use photo" it crops the chosen part, resizes ≤ 600 px, encodes. 3. Button shows "Uploading…", both buttons disabled. 4. Upload to `covers/<story_id>/<random>` → story key updated → old object deleted. 5. Toast "Cover updated."; preview updates |
| Alternative flows | A1 Remove: key cleared then object deleted; toast "Cover removed.". A2 Picking the same file again reopens the crop dialog. A3 "Cancel"/Escape in the crop dialog: nothing uploaded |
| Exception flows | E1 Wrong type / too large / unreadable → inline alert, nothing uploaded. E2 Server rejects (400/413/415) → "The server did not accept this picture…". E3 Not allowed → "You are not allowed to change this story's cover.". E4 Key save fails → new object removed, old cover kept |
| Success criteria | `cover_storage_key` points at an object in the story's folder; only one cover object remains (best effort) |
| Postconditions | Cover shown on Studio row, story page, story cards |
| Affected objects | OBJ-STM |
| Related screens | SCR-STM-03; on SCR-STM-02 only the hint "Save the story first…" |
| Status | Verified — `packages/features/src/studio/components/cover-editor.tsx:44-134`, `packages/features/src/studio/cover.test.tsx:188-230` |

### WF-STM-05 — Soft-delete a story
| Field | Value |
| --- | --- |
| User goal | Take a story down without losing it |
| Trigger | "Delete story" on SCR-STM-03 |
| Preconditions | Owner (UI); story not deleted |
| Main flow | 1. Confirm dialog "Delete this story?". 2. "Delete story" (destructive) → buttons disabled while running. 3. `deleted_at` set. 4. Toast "Story deleted.". 5. Navigate to `/studio`; the story is now under "Show deleted stories" |
| Alternative flows | A1 "Cancel" closes the dialog |
| Exception flows | E1 Failure → dialog stays open, no message (finding F-STM-03) |
| Success criteria | Story hidden from readers, Studio list and invitations (BR-STM-018) |
| Postconditions | Can be restored (WF-STM-06); slug stays reserved |
| Affected objects | OBJ-STM; indirectly chapters, invitations, discovery |
| Related screens | SCR-STM-03 → SCR-STM-01 |
| Status | Verified — `packages/features/src/studio/screens/story-form-screen.tsx:453-479`, `packages/features/src/studio/story-editing.test.tsx:419` |

### WF-STM-06 — Restore a deleted story
| Field | Value |
| --- | --- |
| User goal | Bring a deleted story back |
| Trigger | SCR-STM-01 "Show deleted stories (n)" → "Restore"; or SCR-STM-03 "Restore story" |
| Preconditions | Owner; story deleted by its owner/co-author |
| Main flow | 1. Toggle shows deleted stories with "Deleted …" relative time. 2. "Restore" (no confirmation; disabled while running). 3. `deleted_at` cleared. 4. Toast "Story restored."; story returns to the list |
| Alternative flows | A1 From the edit form: the "Restore story" button replaces "Delete story" |
| Exception flows | E1 Story removed by a moderator → 42501 → toast "You don't have permission to do this." (finding F-STM-02). E2 Network → toast |
| Success criteria | Story visible again to its audience |
| Postconditions | Caches invalidated |
| Affected objects | OBJ-STM, OBJ-MOD |
| Related screens | SCR-STM-01, SCR-STM-03 |
| Status | Verified — `packages/features/src/studio/screens/studio-screen.tsx:155-209`, `packages/features/src/studio/screens/story-form-screen.tsx:434-451` |

### WF-STM-07 — Change a story's URL slug
| Field | Value |
| --- | --- |
| User goal | Give the story a better address without breaking shared links |
| Trigger | Edit the "URL slug" field on SCR-STM-03 and save |
| Preconditions | Owner/co-author |
| Main flow | 1. Slug edited (never auto-changed in edit mode). 2. Save (WF-STM-03). 3. Readers opening the old `/story/{id}/{oldSlug}[/{chapter}]` are permanently redirected to the new slug (BR-STM-010) |
| Alternative flows | — |
| Exception flows | E1 Slug used by another of my stories → slug field error |
| Success criteria | Old and new links reach the story |
| Postconditions | Canonical URL updated (OBJ-SEO) |
| Affected objects | OBJ-STM, OBJ-STORY, OBJ-SEO |
| Related screens | SCR-STM-03 → public story page |
| Status | Verified — `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:49`. The form gives no hint about this (finding U-STM-02) |
