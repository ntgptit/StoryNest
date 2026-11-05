# OBJ-EDT — Chapter editor, autosave & publishing: workflows

Rules: [business-rules.md](business-rules.md) · Screen: [SCR-EDT-01](screens/chapter-editor.md) · Related:
[version history workflows](../version-history/workflows.md).

| ID | Workflow | Status |
| --- | --- | --- |
| WF-EDT-01 | Open a chapter for editing | Verified |
| WF-EDT-02 | Write and autosave the draft | Verified |
| WF-EDT-03 | Save the draft manually | Verified |
| WF-EDT-04 | Resolve a two-device conflict | Verified |
| WF-EDT-05 | Recover unsaved text from this device | Verified |
| WF-EDT-06 | Insert a picture | Verified |
| WF-EDT-07 | Publish now / publish a new version | Verified |
| WF-EDT-08 | Schedule a publication and auto-publish | Verified |
| WF-EDT-09 | Unpublish or cancel a schedule | Verified |
| WF-EDT-10 | Leave the editor | Verified |

---

### WF-EDT-01 — Open a chapter for editing
| Field | Value |
| --- | --- |
| User goal | Start writing a chapter. |
| Trigger | "Write" link (`t.write`) in the chapter manager (`BR-CHM-*`), a deep link, the "Back to editor" link of SCR-HIST-01/02, or the "Open editor" link after a restore. |
| Preconditions | Signed in; role on the story (`BR-EDT-001`). |
| Main flow | 1. Route checks the session (`requireUser`). 2. Screen shows a skeleton while the draft loads (always fresh, `staleTime 0`, `gcTime 0`). 3. Draft is validated (`BR-EDT-002`). 4. Editor renders title, toolbar (skeleton until Tiptap is ready), body, publish panel, word count and Save. 5. If a differing local backup exists, the backup banner is shown (`WF-EDT-05`). 6. Publish panel loads status and role (`BR-EDT-024`). |
| Alternative flows | A1 Never-written draft → one empty paragraph. A2 Chapter archived → publish buttons hidden with hint. |
| Exception flows | E1 Not signed in → `/login?next=…`. E2 No role / wrong story / unknown id → "Chapter not found". E3 Unreadable body → "Can't open the draft". E4 Load failed → "Couldn't load the draft" + "Try again". |
| Success criteria | The author sees the saved draft and can type. |
| Postconditions | No data changed. |
| Affected objects | `chapter_drafts`, `chapters` (read), `story_role` RPC. |
| Related screens | SCR-EDT-01, chapter manager (`OBJ-CHM`) |
| Status | Verified (`editor-screen.test.tsx:187-305`) |

### WF-EDT-02 — Write and autosave the draft
| Field | Value |
| --- | --- |
| User goal | Write without thinking about saving. |
| Trigger | Typing in title or body, formatting, inserting/removing blocks. |
| Preconditions | WF-EDT-01 done. |
| Main flow | 1. Each change increments the edit counter, marks the autosaver dirty, schedules a backup in 0.5 s, updates the word count. 2. Footer: "Unsaved changes, will save automatically". 3. After 2 s idle (max 10 s) the draft is validated and saved with `expected_revision` (`BR-EDT-006/008`). 4. Footer: "Saving…" → "Saved"; backup cleared if nothing changed meanwhile. |
| Alternative flows | A1 Edits during a save → another save 2 s after it ends. A2 Tab hidden → save at once (`BR-EDT-012`). |
| Exception flows | E1 Invalid (blank/too-long title, unsupported content) → inline message, status "Not saved: check…", no request; next edit retries. E2 Offline/server error → "Couldn't save, retrying", backoff 2→30 s, immediate retry on `online`; text kept on device. E3 Conflict → WF-EDT-04. |
| Success criteria | Server draft equals screen content within ~2–10 s of the last change. |
| Postconditions | `chapter_drafts.revision` +1 per save, `updated_by` = author. |
| Affected objects | `chapter_drafts`, `localStorage`. |
| Related screens | SCR-EDT-01 |
| Status | Verified (`autosaver.test.ts`, `editor-screen.test.tsx:312-362`) |

### WF-EDT-03 — Save the draft manually
| Field | Value |
| --- | --- |
| User goal | Make sure the draft is saved now. |
| Trigger | "Save draft" button. |
| Preconditions | Editor ready, not currently saving. |
| Main flow | 1. Button → "Saving…" (disabled). 2. Save attempt now. 3. Toast "Draft saved."; footer "Saved". |
| Alternative flows | — |
| Exception flows | As WF-EDT-02 E1–E3 (no success toast). |
| Success criteria | Toast shown and revision increased. |
| Postconditions | As WF-EDT-02. |
| Affected objects | `chapter_drafts` |
| Related screens | SCR-EDT-01 |
| Status | Verified |

### WF-EDT-04 — Resolve a two-device conflict
| Field | Value |
| --- | --- |
| User goal | Continue after someone (or the author on another device) saved the same draft. |
| Trigger | A save returns 0 rows (stale revision). |
| Preconditions | Draft opened on two devices/tabs; the other saved first. |
| Main flow | 1. Text written to the local backup; autosave stops. 2. Alert "The draft was edited elsewhere" with "Load latest version"; footer "Not saved: the draft was changed elsewhere"; the author's text stays on screen. 3. Author presses "Load latest version" → draft refetched, editor remounted with the newer version. 4. Backup banner offers the author's text with the older-base warning. 5. Author restores (→ autosave on top of the newer revision) or discards. |
| Alternative flows | A1 Author copies text manually before reloading. |
| Exception flows | E1 Publish attempted while in conflict → save-first fails → "The draft couldn't be saved, so it wasn't published…". |
| Success criteria | No silent overwrite; the author chooses which text wins. |
| Postconditions | Either the other device's version or the restored text is the saved draft. |
| Affected objects | `chapter_drafts`, `localStorage` |
| Related screens | SCR-EDT-01 |
| Status | Verified (`editor-screen.test.tsx:247,462`; WBS 3.5 browser check with two tabs) |

### WF-EDT-05 — Recover unsaved text from this device
| Field | Value |
| --- | --- |
| User goal | Get back text that never reached the server (offline, closed tab, crash, conflict, in-app navigation). |
| Trigger | Opening the editor while `storynest.draftBackup.{chapterId}` exists and differs from the server draft. |
| Preconditions | Same browser profile; storage not cleared. |
| Main flow | 1. Banner (`role="status"`) "There's an unsaved version on this device" + time. 2. "Restore unsaved version" → title and body replaced, marked dirty, toast "Unsaved version restored, saving automatically." → WF-EDT-02. |
| Alternative flows | A1 "Discard unsaved version" → backup deleted, banner hidden. A2 Backup older than server revision → extra warning that restoring overwrites newer changes. A3 Backup identical to server → no banner. |
| Exception flows | E1 Corrupt/invalid backup → ignored silently. E2 Storage blocked → no backup, writing still works. |
| Success criteria | Typed text is never lost on this device. |
| Postconditions | Backup cleared once the restored text is saved. |
| Affected objects | `localStorage`, `chapter_drafts` |
| Related screens | SCR-EDT-01 |
| Status | Verified (`editor-screen.test.tsx:411-462`); real offline tab-close not verified (WBS 3.6) |

### WF-EDT-06 — Insert a picture
| Field | Value |
| --- | --- |
| User goal | Put an illustration inside the chapter. |
| Trigger | Toolbar "Insert picture" → file picker. |
| Preconditions | Role owner/co_author/editor; active account. |
| Main flow | 1. File checked (type, ≤ 10 MB), shrunk to ≤ 1600 px wide, re-encoded WebP/JPEG. 2. Button disabled "Uploading picture…". 3. Upload to `chapter-images/<story_id>/<uuid>.<ext>`. 4. Image block inserted at the cursor with a new block id; it shows the picture. 5. Change autosaves (WF-EDT-02). |
| Alternative flows | — |
| Exception flows | E1 Wrong type / too large / unreadable / rejected / forbidden / network → toast (`BR-EDT-014`), nothing inserted. E2 Author leaves before the upload ends → object uploaded but never inserted (orphan, F-EDT-08). |
| Success criteria | Picture visible in the editor and, after publish, in the reader. |
| Postconditions | Storage object exists (never deleted); key validated only at publish (`BR-EDT-016`). |
| Affected objects | Storage `chapter-images`, `chapter_drafts` |
| Related screens | SCR-EDT-01 |
| Status | Verified (`chapter-image.test.tsx`; WBS 3.5 browser check) |

### WF-EDT-07 — Publish now / publish a new version
| Field | Value |
| --- | --- |
| User goal | Make the current draft visible to readers. |
| Trigger | "Publish chapter" (draft/scheduled) or "Publish new version" (published). |
| Preconditions | Role owner/co_author/editor; chapter not archived. |
| Main flow | 1. Panel locks, button "Working…". 2. Unsaved text saved first; the resulting revision is taken (`BR-EDT-018`). 3. `publish_chapter(chapter, expected_revision)`. 4. Server validates and snapshots (`BR-EDT-019/020`). 5. Toast "Chapter published." / "New version published."; badge "Published…"; studio, story page and feeds refreshed. |
| Alternative flows | A1 Chapter was scheduled → published now, schedule cleared. A2 First publish of the chapter → outbox event → followers notified (`BR-NOTI-*`); story leaves `draft` status. |
| Exception flows | E1 Save-first failed → inline "The draft couldn't be saved, so it wasn't published…". E2 PT409 stale revision/archived → "…changed elsewhere. Reload the page…". E3 22023 → "The chapter isn't ready to publish…". E4 42501 / PT404 / network / other → mapped messages (`BR-EDT-025`). |
| Success criteria | New version is live; exactly one version per click. |
| Postconditions | New immutable `chapter_versions` row (`BR-HIST-002`); chapter `published`. |
| Affected objects | `chapter_drafts`, `chapters`, `chapter_blocks`, `chapter_versions`, `chapter_version_blocks`, `stories`, `chapter_stats`, `story_stats`, `outbox_events` |
| Related screens | SCR-EDT-01, SCR-HIST-01 (new version listed), reader (`BR-READ-*`) |
| Status | Verified (`publishing.test.tsx:266-333`, `20_publish.test.sql`) |

### WF-EDT-08 — Schedule a publication and auto-publish
| Field | Value |
| --- | --- |
| User goal | Release a chapter at a chosen time without being online. |
| Trigger | "Schedule…" → dialog → "Schedule". |
| Preconditions | Role owner/co_author/editor; status draft or scheduled. |
| Main flow | 1. Author picks a local date/time (min now + 1 min; zone shown). 2. Client validates (required, ≥ 60 s ahead) and converts to UTC. 3. Unsaved text saved first; `schedule_chapter(chapter, instant, revision)`. 4. Dialog closes; toast "Publication scheduled."; badge "Scheduled for … (zone)". 5. Every minute the due job publishes chapters whose time has come, from the draft as it is then (`BR-EDT-022`). 6. Chapter becomes published (WF-EDT-07 step 4 effects). |
| Alternative flows | A1 Re-schedule a scheduled chapter → new time. A2 "Publish chapter" on a scheduled chapter → publishes now. A3 Edits after scheduling (by any collaborator) are included in the scheduled snapshot. |
| Exception flows | E1 Empty/past time → inline dialog error, no request. E2 Server: past (clock skew) → 22023; published/archived → PT409 (Schedule is offered on published chapters, F-EDT-01). E3 Due-time draft invalid → job skips and retries every minute, author not told (F-EDT-05). |
| Success criteria | Chapter goes live at the chosen instant (± cron minute). |
| Postconditions | `chapters.status='scheduled'`, `scheduled_for` set → later `published`. |
| Affected objects | `chapters`, then as WF-EDT-07 |
| Related screens | SCR-EDT-01 |
| Status | Verified (`publishing.test.tsx:413,435`, `20_publish.test.sql:172-202`; WBS 3.7 dev check) |

### WF-EDT-09 — Unpublish or cancel a schedule
| Field | Value |
| --- | --- |
| User goal | Take a chapter offline or stop a planned release. |
| Trigger | "Unpublish chapter" (published) / "Cancel schedule" (scheduled). |
| Preconditions | Role owner or co_author. |
| Main flow | 1. Confirm dialog "Unpublish this chapter?" with destructive "Unpublish chapter". 2. `unpublish_chapter`. 3. Toast "Chapter unpublished and returned to draft."; badge "Draft…". |
| Alternative flows | A1 Cancel → nothing happens. |
| Exception flows | E1 Failure → inline mapped message; dialog stays open. E2 Already draft (raced) → PT409 message. |
| Success criteria | Readers can no longer open the chapter; versions kept. |
| Postconditions | `status='draft'`, `published_version_id=NULL`, `scheduled_for=NULL`; republish later is silent (no re-notification). |
| Affected objects | `chapters` |
| Related screens | SCR-EDT-01 |
| Status | Verified (`publishing.test.tsx:394,407`, `20_publish.test.sql:142-170`) |

### WF-EDT-10 — Leave the editor
| Field | Value |
| --- | --- |
| User goal | Leave without losing work. |
| Trigger | Closing/reloading the tab, browser back, or an in-app link (Back to chapters, Preview, Version history, header). |
| Preconditions | — |
| Main flow | 1. Nothing unsaved → leave silently. 2. Unsaved + browser unload → backup written + native "leave site?" prompt. 3. Unsaved + in-app link → backup written; navigation proceeds without prompt or save. |
| Alternative flows | A1 Tab hidden first (mobile app switch) → immediate save. |
| Exception flows | E1 After 3., Preview shows the last saved draft and History restore deletes the backup (F-EDT-02). |
| Success criteria | Typed text is either on the server or offered back on return. |
| Postconditions | Possibly a local backup. |
| Affected objects | `localStorage`, `chapter_drafts` |
| Related screens | SCR-EDT-01, SCR-HIST-01, SCR-HIST-02, chapter manager (`OBJ-CHM`) |
| Status | Verified (`editor-screen.test.tsx:383,400`) |
