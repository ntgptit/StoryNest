# OBJ-HIST — Version history & preview: workflows

Rules: [business-rules.md](business-rules.md) · Screens: [SCR-HIST-01](screens/version-history.md),
[SCR-HIST-02](screens/chapter-preview.md) · Related: [editor workflows](../chapter-editor/workflows.md)

| ID | Workflow | Status |
| --- | --- | --- |
| WF-HIST-01 | Review a published version | Verified |
| WF-HIST-02 | Compare a version with the draft or another version | Verified |
| WF-HIST-03 | Restore a version into the draft and continue editing | Verified |
| WF-HIST-04 | Preview the draft as readers will see it | Verified |

---

### WF-HIST-01 — Review a published version
| Field | Value |
| --- | --- |
| User goal | See exactly what readers saw in a given version. |
| Trigger | "Version history" button in the editor (SCR-EDT-01-C02) or direct URL. |
| Preconditions | Signed in; role on the story. |
| Main flow | 1. Skeleton while draft + versions load. 2. Header "Version history" / "Published versions of the chapter "{title}". Old versions are never edited." + "Back to editor". 3. List newest first, live one badged; newest selected. 4. Selected version's content rendered read-only. 5. Author selects another entry → its content loads (skeleton) and shows. |
| Alternative flows | A1 No version yet → empty state. A2 Version without blocks → "This version has no content." |
| Exception flows | E1 No access / other story → "Chapter not found". E2 Load failure → "Couldn't load the history" + "Try again". E3 Blocks load failure → error with retry inside the viewer. |
| Success criteria | Version content matches the snapshot. |
| Postconditions | No data changed. |
| Affected objects | `chapter_versions`, `chapter_version_blocks`, `chapters`, `chapter_drafts` (read) |
| Related screens | SCR-HIST-01 |
| Status | Verified (`history.test.tsx:284,299`) |

### WF-HIST-02 — Compare a version with the draft or another version
| Field | Value |
| --- | --- |
| User goal | Understand what changed. |
| Trigger | "Compare" toggle in the viewer. |
| Preconditions | WF-HIST-01 step 4. |
| Main flow | 1. "Compare with" select defaults to "Current draft". 2. Diff by `block_id` rendered with summary and badges (`BR-HIST-005`). 3. Author picks another version as base → its blocks load → diff recomputed. 4. "Content" toggle returns to read-only view. |
| Alternative flows | A1 No differences → "The two versions are identical." |
| Exception flows | E1 Base blocks loading → skeleton. |
| Success criteria | Added/removed/changed blocks correctly identified; a paragraph edit is "changed", not removed+added. |
| Postconditions | No data changed. |
| Affected objects | as WF-HIST-01 |
| Related screens | SCR-HIST-01 |
| Status | Verified (`history.test.tsx:307,320`) |

### WF-HIST-03 — Restore a version into the draft and continue editing (cross-screen)
| Field | Value |
| --- | --- |
| User goal | Undo bad edits by going back to an earlier published text. |
| Trigger | "Restore to draft" in the viewer. |
| Preconditions | Owner/co_author/editor. |
| Main flow | 1. Confirm dialog (`BR-HIST-006`). 2. "Restore" → buttons disabled while running. 3. Body built from version blocks (ids kept), draft re-read, saved at that revision; local backup removed. 4. Toast + inline "Restored to draft." with "Open editor". 5. Author opens SCR-EDT-01 → editor loads the restored draft. 6. Author publishes when ready (WF-EDT-07) → a new version N+1 is created; old versions unchanged. |
| Alternative flows | A1 Cancel → nothing changes. |
| Exception flows | E1 Conflict / forbidden / not found / invalid / network → toast; dialog stays open. E2 An editor tab with unsaved text elsewhere → that tab gets a conflict and offers its text as backup (WF-EDT-04). E3 Unsaved text typed just before navigating to History (backup only) is deleted by the restore (F-EDT-02, F-HIST-01). |
| Success criteria | Draft equals the version; versions and live version untouched; readers see nothing until republished. |
| Postconditions | `chapter_drafts` title/body replaced, revision +1, `updated_by` = restorer. |
| Affected objects | `chapter_drafts`, `localStorage` |
| Related screens | SCR-HIST-01 → SCR-EDT-01 |
| Status | Verified (`history.test.tsx:329,350,361`; WBS 3.9 browser check) |

### WF-HIST-04 — Preview the draft as readers will see it
| Field | Value |
| --- | --- |
| User goal | Check layout and formatting before publishing. |
| Trigger | "Preview" button in the editor (SCR-EDT-01-C02) or direct URL. |
| Preconditions | Signed in; role on the story. |
| Main flow | 1. Skeleton while the draft loads. 2. Sticky bar with "Back to editor" and reader settings. 3. Draft note, title, blocks in reader typography. 4. Author changes font/size/theme in the settings sheet → preview updates (reader preferences, `BR-READ-*`). 5. "Back to editor". |
| Alternative flows | A1 Empty draft → "The draft has no content yet." |
| Exception flows | E1 No access → "Chapter not found". E2 Load failure → error + retry. E3 Text typed in the editor < 2 s before clicking Preview is not shown (F-EDT-02). |
| Success criteria | Saved draft looks as it will in the reader. |
| Postconditions | No content changed (reader preferences may change). |
| Affected objects | `chapter_drafts` (read), reader preferences |
| Related screens | SCR-HIST-02, SCR-EDT-01 |
| Status | Verified (`history.test.tsx:392,411`) |
