# SCR-EDT-01 — Chapter editor

Rules: [../business-rules.md](../business-rules.md) · Workflows: [../workflows.md](../workflows.md)

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-EDT-01` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-EDT](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Chapter editor (vi `editorText.title` "Soạn chương"; browser title `appText.pageTitle.editChapter` "Soạn chương · StoryNest", always Vietnamese — owned by `OBJ-I18N`) |
| Route | `/studio/story/{id}/chapter/{chapterId}` (protected prefix `/studio`, `robots: noindex`) |
| Route file | `apps/web/src/app/(main)/studio/story/[id]/chapter/[chapterId]/page.tsx` → `chapter-editor-view.tsx` |
| Screen component | `packages/features/src/editor/screens/chapter-editor-screen.tsx` (`ChapterEditorScreen` → `DraftEditor`), with `components/editor-toolbar.tsx`, `components/find-replace-panel.tsx`, `components/draft-merge-view.tsx`, `components/publish-panel.tsx` |
| Roles | owner, co_author, editor (`BR-TEAM-*`); unpublish / cancel schedule: owner, co_author only |
| Entry points | Chapter manager "Write" link (`packages/features/src/studio/screens/chapter-manager-screen.tsx:198`), "Back to editor" on SCR-HIST-01/02, "Open editor" after restore |
| Workflows | WF-EDT-01 … WF-EDT-10, WF-HIST-03 (target) |

## B. Components

| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-EDT-01-C01 | Back link | "Back to chapters" → `/studio/story/{id}/chapters` | `chapter-editor-screen.tsx:293-298` |
| SCR-EDT-01-C02 | Preview / Version history buttons | Outline links to `…/preview` and `…/history` | `chapter-editor-screen.tsx:299-306` |
| SCR-EDT-01-C03 | Backup banner | `role="status"`; title, time, optional older-base warning; Restore / Compare and merge / Discard | `chapter-editor-screen.tsx` (backup block) |
| SCR-EDT-01-C04 | Conflict alert | `role="alert"`; "The draft was edited elsewhere" + "Load latest version" / "Load latest and merge" | `chapter-editor-screen.tsx` (conflict block) |
| SCR-EDT-01-C05 | Chapter title field | Label "Chapter title", placeholder "Chapter title", `maxLength=400`, inline error `role="alert"` | `chapter-editor-screen.tsx:492-510` |
| SCR-EDT-01-C06 | Formatting toolbar | `role="toolbar"` "Formatting": Heading, Bold, Italic, Underline, Strikethrough (toggle, `aria-pressed`), Divider, Insert picture (+hidden file input "Choose a picture to insert"), Find and replace (`aria-expanded`), Undo, Redo (disabled when unavailable). Icon buttons 36 px. Skeleton until editor ready | `editor-toolbar.tsx`, `packages/ui/src/components/button.tsx:25` |
| SCR-EDT-01-C13 | Find and replace panel (Lucian #128) | `role="search"` "Find and replace in the chapter", under the toolbar while open: Find → Replace with, "Replace all"; count "3/12" (+ polite live text "Match 3 of 12" / "No matches" / "N replaced"), Previous / Next match, "Match case" toggle (`aria-pressed`), Replace, Close. Matches are ProseMirror decorations (`find-match`, current `find-match-current`); replaced text flashes once (`animate-replace-flash`) | `components/find-replace-panel.tsx`, `model/find-replace.ts`, `packages/ui/src/widgets/find-replace-bar.tsx` |
| SCR-EDT-01-C14 | Merge view (Lucian #149) | Replaces the backup banner while open: "Merge your version with the server's", "Take all mine" / "Take all from the server", "N differences left to decide" (polite), one `role="group"` per differing block (and the title) with "Mine" / "On the server" buttons (`aria-pressed`; a missing side reads "(Not in this version)"; "formatting only" note), "Use the merged version" (disabled until all decided), "Not now" | `components/draft-merge-view.tsx`, `model/draft-merge.ts`, `packages/ui/src/widgets/merge-choice.tsx` |
| SCR-EDT-01-C07 | Body editor | Tiptap `EditorContent`, `role="textbox"`, `aria-multiline`, `aria-label="Chapter content"`, reader typography (`reader-text`), min 50vh; image blocks as framed pictures | `chapter-editor-screen.tsx:208-225,374-377` |
| SCR-EDT-01-C08 | Publish panel | `<section aria-label="Publish chapter">`: H2, state badge, error alert, readiness checklist (C15), split button (Lucian 010) "Publish" / "Publish new version" with an arrow "More ways to publish" opening a menu with "Schedule…" (same usePublishFlow, saves first, locked while running, progress bar inside while busy), Unpublish / Cancel schedule | `publish-panel.tsx`, `packages/ui/src/widgets/split-button.tsx` |
| SCR-EDT-01-C15 | Readiness checklist (Lucian 014) | "Before you publish", ring n/3, one row per existing rule (`publishReadiness`): title present and ≤ 200 chars (checkTitle), content only holds savable parts (checkBody = chapterBodySchema), chapter not archived (canPublish); a failing row shows the existing message as hint. The split button is disabled and `aria-describedby` the checklist until all hold; shown only to the story team | `publish-panel.tsx`, `model/publishing.ts`, `packages/ui/src/widgets/readiness-checklist.tsx` |
| SCR-EDT-01-C16 | Toolbar tooltips (Lucian 076) | Each toolbar icon button has a tooltip with its name and shortcut (Ctrl/⌘+B, I, U, Shift+S, Alt+2, F, Z, Shift+Z); one provider: 450 ms first delay, instant within 300 ms when moving along; Esc closes; never on touch | `editor-toolbar.tsx`, `packages/ui/src/widgets/shortcut-tooltip.tsx` |
| SCR-EDT-01-C17 | Side-by-side live preview (Lucian 101) | From 1024 px wide: toggle "Side-by-side preview" (`aria-pressed`, off by default) puts the editor and a live preview of what is typed (the preview screen's article) side by side, with a divider `role="separator"` (drag, ←/→ 3 %, Home/End 35–70 %, Esc back to 55 %). On/off and width remembered in localStorage `storynest.editor.split` | `chapter-editor-screen.tsx`, `model/workspace-prefs.ts`, `packages/ui/src/widgets/split-pane.tsx` |
| SCR-EDT-01-C18 | First-run tour (Lucian 197) | Once per device (localStorage `storynest.editor.tour-done`, set on Done or Skip): dim layer with a hole over toolbar → autosave status → publish panel → find button; "Step n of 4", Back / Next / Done, Skip; modal dialog, focus on Next, Esc skips, ←/→ step; hole glides (jumps under reduced motion). Turned on by the web route only (`firstRunTour`) | `chapter-editor-screen.tsx`, `packages/ui/src/widgets/spotlight-tour.tsx` |
| SCR-EDT-01-C09 | Schedule dialog | Title "Schedule publication", `datetime-local` "Publish time" (min now+1 min), "Your time zone: {zone}", inline error, Cancel / Schedule | `publish-panel.tsx:154-191` |
| SCR-EDT-01-C10 | Unpublish confirm dialog | "Unpublish this chapter?", destructive "Unpublish chapter", Cancel | `publish-panel.tsx:193-205` |
| SCR-EDT-01-C11 | Footer status | `aria-live="polite"`: "{n} words · {status}" | `chapter-editor-screen.tsx:381-385` |
| SCR-EDT-01-C12 | Save button | "Save draft" / "Saving…" | `chapter-editor-screen.tsx:558-560` |
| SCR-EDT-01-C13 | Drop and paste a picture (Lucian 032) | A file dragged over the text highlights it ("Drop the picture to insert it"); dropped, it is inserted where it lands; a pasted picture (screenshot, copied image, no text) is inserted at the cursor. Same upload, checks and error toasts as "Insert picture" (A05). A paste with text is left to the editor | `chapter-editor-screen.tsx` (`handleDrop`, `handlePaste`), `model/pasted-image.ts` |

## C. User actions & system responses

| Field | SCR-EDT-01-A01 Open editor |
| --- | --- |
| Trigger | Navigate to the route |
| Preconditions | Signed in |
| Expected behavior | Skeleton → editor with saved draft (`BR-EDT-001/002`) |
| State change | None |
| Validation | Draft body via `chapterBodySchema`; `storyId` must match |
| Error behavior | Not found / Can't open the draft / Couldn't load the draft + Try again |
| Navigation | Anonymous → `/login?next=…` |
| Evidence | `page.tsx:11-14`, `chapter-editor-screen.tsx:85-107` |

| Field | SCR-EDT-01-A02 Edit title |
| --- | --- |
| Trigger | Typing in C05 |
| Preconditions | Editor ready |
| Expected behavior | Marks dirty, backup in 0.5 s, autosave (`BR-EDT-009`) |
| State change | Local title; later `chapter_drafts.title` |
| Validation | Trimmed 1–200 chars at save time ("Please enter a chapter title." / "The chapter title can be up to 200 characters.") |
| Error behavior | Inline alert under the field; status "Not saved: check the chapter title and content" |
| Navigation | — |
| Evidence | `chapter-editor-screen.tsx:499-509`, `model/draft-form.ts:12-15` |

| Field | SCR-EDT-01-A03 Type / edit body |
| --- | --- |
| Trigger | Keyboard, paste, drag of an image block |
| Preconditions | Editor ready |
| Expected behavior | Word count updates; autosave; block ids preserved (`BR-EDT-004`) |
| State change | `chapter_drafts.body` after save |
| Validation | `BR-EDT-006` |
| Error behavior | Unsupported content → "Part of the content can't be saved. Remove it and try again." |
| Navigation | — |
| Evidence | `chapter-editor-screen.tsx:289-292` |

| Field | SCR-EDT-01-A04 Format (toolbar / shortcut) |
| --- | --- |
| Trigger | Toolbar button or shortcut (`BR-EDT-027`) |
| Preconditions | Selection/cursor in body |
| Expected behavior | Toggles heading/bold/italic/underline/strike; inserts divider; undo/redo; button pressed state follows the cursor; focus stays in the text |
| State change | Document → autosave |
| Validation | Only body-representable formats exist |
| Error behavior | — |
| Navigation | — |
| Evidence | `editor-toolbar.tsx:55-173` |

| Field | SCR-EDT-01-A05 Insert picture |
| --- | --- |
| Trigger | "Insert picture" → pick file |
| Preconditions | Not already uploading |
| Expected behavior | Upload then image block at cursor (`BR-EDT-014`) |
| State change | Storage object; body after autosave |
| Validation | JPEG/PNG/WebP, ≤ 10 MB input; bucket ≤ 5 MiB |
| Error behavior | Toast per cause |
| Navigation | — |
| Evidence | `chapter-editor-screen.tsx:299-308`, `editor-toolbar.tsx:68-77,104-118` |

| Field | SCR-EDT-01-A06 Save draft |
| --- | --- |
| Trigger | C12 |
| Preconditions | Not saving; editor ready |
| Expected behavior | Immediate save; toast "Draft saved." |
| State change | revision +1 |
| Validation | `BR-EDT-006` |
| Error behavior | Status text; no toast |
| Navigation | — |
| Evidence | `chapter-editor-screen.tsx:366-369` |

| Field | SCR-EDT-01-A07 Restore / discard local backup |
| --- | --- |
| Trigger | C03 buttons |
| Preconditions | Banner visible |
| Expected behavior | Restore → content replaced, toast "Unsaved version restored, saving automatically."; Discard → banner gone |
| State change | Editor content / `localStorage` key removed |
| Validation | Backup already schema-checked on read |
| Error behavior | Restore disabled until editor ready |
| Navigation | — |
| Evidence | `chapter-editor-screen.tsx:265-273,316-330` |

| Field | SCR-EDT-01-A07b Compare and merge (backup) |
| --- | --- |
| Trigger | C03 "Compare and merge" |
| Preconditions | Banner visible |
| Expected behavior | C14 opens: the backup ("mine") against the draft as loaded ("server"), compared with the version history's `diffBlocks` (blocks matched by `block_id`). The author picks a side per differing block / the title (or takes all of one side); "Use the merged version" loads the result into the editor as an ordinary edit (toast "Merged version in place, saving automatically.") and autosave saves it with the loaded draft's revision (`BR-EDT-009`); "Not now" returns to the banner unchanged |
| State change | Editor content; `chapter_drafts` after autosave (revision check unchanged; the backup key is removed after a clean save) |
| Validation | Merged blocks keep their ids, one block per id; a block only one side has is kept or dropped by the choice |
| Error behavior | A save conflict after merging is handled like any other (C04) |
| Navigation | — |
| Evidence | `model/draft-merge.ts`, `chapter-editor-screen.tsx` (`loadContent`), `editor-screen.test.tsx` "merging…" |

| Field | SCR-EDT-01-A08 Load latest version (conflict) |
| --- | --- |
| Trigger | C04 button |
| Preconditions | Status conflict |
| Expected behavior | Refetch draft; editor remounted; backup banner offers the author's text |
| State change | Editor session reset |
| Validation | — |
| Error behavior | Refetch error → load error state |
| Navigation | — |
| Evidence | `chapter-editor-screen.tsx:76-79,342` |

| Field | SCR-EDT-01-A08b Load latest and merge (conflict) |
| --- | --- |
| Trigger | C04 "Load latest and merge" |
| Preconditions | Status conflict |
| Expected behavior | As A08 (the text is kept as a device backup, the draft is refetched, the editor remounted), then C14 opens directly on the fresh draft; applying it saves against the fresh revision |
| State change | Editor session reset; then as A07b |
| Validation | — |
| Error behavior | No differing backup → plain reload |
| Navigation | — |
| Evidence | `chapter-editor-screen.tsx` (`onReload({ merge: true })`, `startMerge`) |

| Field | SCR-EDT-01-A13 Find and replace |
| --- | --- |
| Trigger | Ctrl/Cmd+F in the text or C06 "Find and replace"; Esc (in the text or the panel) or Close ends it |
| Preconditions | Editor ready |
| Expected behavior | C13 opens with focus in Find (a one-line selection becomes the query). Matching runs per text block across mark boundaries, never across blocks or line breaks and never into image/divider blocks; case-insensitive unless "Match case". Enter / Shift+Enter or the arrows select the next / previous match (wrapping). Replace replaces the current match and moves on; Replace all replaces every match in one transaction (one Undo restores all), keeping the marks the match started with |
| State change | Document → autosave (decorations themselves never reach the body) |
| Validation | Empty query: no matches; the query is literal text |
| Error behavior | — |
| Navigation | — |
| Evidence | `model/find-replace.ts`, `find-replace.test.ts`, `editor-screen.test.tsx` "find and replace" |

| Field | SCR-EDT-01-A09 Publish / Publish new version |
| --- | --- |
| Trigger | C08 primary button |
| Preconditions | `canPublish` |
| Expected behavior | Save first → `publish_chapter` → toast "Chapter published." / "New version published." |
| State change | `BR-EDT-020` |
| Validation | Save-first; server `BR-EDT-019` |
| Error behavior | Inline `role="alert"` (`BR-EDT-025`) |
| Navigation | — |
| Evidence | `publish-panel.tsx:90-95,139-142` |

| Field | SCR-EDT-01-A10 Schedule |
| --- | --- |
| Trigger | "Schedule…" → C09 → "Schedule" |
| Preconditions | `canPublish` (shown also for published chapters, F-EDT-01) |
| Expected behavior | Validate → save first → `schedule_chapter` → dialog closes, toast "Publication scheduled." |
| State change | `status='scheduled'`, `scheduled_for` |
| Validation | "Please choose a publish time." / "Choose a time in the future." |
| Error behavior | Inline in dialog (picker) or panel alert (server) |
| Navigation | — |
| Evidence | `publish-panel.tsx:97-111,144-146,162-199` |

| Field | SCR-EDT-01-A11 Unpublish / Cancel schedule |
| --- | --- |
| Trigger | C08 ghost button → C10 confirm |
| Preconditions | `canUnpublishChapter` (owner/co_author; published/scheduled) |
| Expected behavior | `unpublish_chapter` → toast "Chapter unpublished and returned to draft." |
| State change | `BR-EDT-023` |
| Validation | — |
| Error behavior | Panel alert; dialog stays open |
| Navigation | — |
| Evidence | `publish-panel.tsx:141-150,193-205` |

| Field | SCR-EDT-01-A12 Navigate away |
| --- | --- |
| Trigger | C01/C02/header link, tab close/reload |
| Preconditions | — |
| Expected behavior | `BR-EDT-012` (prompt only on browser unload) |
| State change | Possible local backup |
| Validation | — |
| Error behavior | — |
| Navigation | Chapters list / Preview / History / elsewhere |
| Evidence | `chapter-editor-screen.tsx:312-337` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Skeleton `aria-busy` while the draft loads (`chapter-editor-screen.tsx:91`); toolbar skeleton until Tiptap mounts (`:368-372`) |
| Loading | Implemented (partial) | Draft: skeleton. Save: "Saving…" button + status. Upload: "Uploading picture…". Publish: "Working…". **Missing**: publish panel renders nothing while its state loads (`publish-panel.tsx:64`) |
| Empty | Implemented | Never-written draft → one empty paragraph, "0 words" (`body-converter.ts:161`) |
| Populated | Implemented | Title, formatted body, word count |
| Validation error | Implemented | Inline title/body message + status "Not saved: check…"; schedule dialog inline errors |
| Request error | Implemented (partial) | Load error + retry; autosave "Couldn't save, retrying"; image toasts; publish alert. **Missing**: publish-state load failure is silent (F-EDT-04); permanent save errors look retryable (F-EDT-03) |
| Success | Implemented | "Saved" status, toasts for manual save / publish / schedule / unpublish / restore |
| Disabled | Implemented | Save while saving; Undo/Redo when unavailable; picture while uploading; publish buttons while busy; archived → buttons hidden + hint |
| Unauthorized | Implemented | Anonymous → login redirect; no role → "Chapter not found"; editor → no Unpublish button |
| Offline | Implemented | Autosave error + backoff + `online` retry; local backup; image/publish "No connection…" messages |
| Unsaved changes | Implemented (partial) | Footer "Unsaved changes…", `beforeunload` prompt, backup banner. **Missing**: no in-app navigation guard / flush (F-EDT-02) |
| Conflict | Implemented | Alert + reload + backup offer, or reload straight into the block merge (C14) |
| Not found / unreadable | Implemented | Empty states `notFound`, `cannotOpen` |

## E. Acceptance criteria

| ID | Given / When / Then | Type |
| --- | --- | --- |
| SCR-EDT-01-AC01 | Given an owner, co-author or editor, when they open the editor, then the saved title, body and word count are shown. | Happy |
| SCR-EDT-01-AC02 | Given a user with no role or a chapter of another story, when they open the URL, then "Chapter not found" is shown and no draft content is revealed. | Permission |
| SCR-EDT-01-AC03 | Given an anonymous visitor, when they open the URL, then they are redirected to `/login?next=<editor path>`. | Navigation |
| SCR-EDT-01-AC04 | Given a stored body that fails `chapterBodySchema`, when the editor opens, then "Can't open the draft" is shown and nothing is saved. | Error |
| SCR-EDT-01-AC05 | Given the author stops typing, when 2 s pass (or 10 s of continuous typing), then the draft is saved with the current revision and the footer shows "Saved". | State transition |
| SCR-EDT-01-AC06 | Given a blank title, when a save runs, then no request is sent and "Please enter a chapter title." is shown. | Validation |
| SCR-EDT-01-AC07 | Given the network is down, when a save fails, then the footer shows "Couldn't save, retrying", the text stays on screen and in the device backup, and the save succeeds without user action once online. | Error / Offline |
| SCR-EDT-01-AC08 | Given another device saved the draft after it was opened here, when this device saves, then "The draft was edited elsewhere" is shown, nothing is overwritten, and after "Load latest version" the local text is offered for restore. | Edge |
| SCR-EDT-01-AC09 | Given an unsaved local backup that differs from the server, when the editor opens, then the backup banner is shown; Restore replaces the content and autosaves; Discard removes it. | State transition |
| SCR-EDT-01-AC10 | Given unsaved changes, when the author closes or reloads the tab, then the browser asks for confirmation. | Navigation |
| SCR-EDT-01-AC11 | Given an edited paragraph, when it is saved, then its `block_id` is unchanged; a new paragraph gets a new UUID; a pasted copy gets new ids. | Edge |
| SCR-EDT-01-AC12 | Given a JPEG ≤ 10 MB, when it is inserted, then it is uploaded to `<story_id>/<uuid>.webp` and an image block appears at the cursor; a GIF shows "Only JPG, PNG or WebP pictures can be inserted." | Happy / Validation |
| SCR-EDT-01-AC13 | Given unsaved text, when Publish is pressed, then the text is saved first and that revision is published; a double click creates one version. | Happy / Edge |
| SCR-EDT-01-AC14 | Given someone saved the draft after this page loaded, when Publish is pressed with no local edits, then PT409 shows "The draft or chapter status was changed elsewhere. Reload the page and try again." | Error |
| SCR-EDT-01-AC15 | Given an editor role, when the panel loads for a published chapter, then "Publish new version" is visible and "Unpublish chapter" is not. | Permission |
| SCR-EDT-01-AC16 | Given a local time 10:37 in Asia/Ho_Chi_Minh, when scheduled, then the server receives 03:37Z and the badge reads "Scheduled for … 10:37 (Asia/Ho_Chi_Minh)". | Happy |
| SCR-EDT-01-AC17 | Given a time less than one minute ahead or empty, when "Schedule" is pressed, then an inline error is shown and no request is sent. | Validation |
| SCR-EDT-01-AC18 | Given an archived chapter, when the panel loads, then no publish/schedule buttons are shown and "Unarchive it in the chapter list before publishing." is displayed. | State |
| SCR-EDT-01-AC19 | Given an owner, when they confirm "Unpublish chapter", then the chapter returns to draft and the toast "Chapter unpublished and returned to draft." is shown. | Happy |
| SCR-EDT-01-AC25 | Given a chapter where "Lan" appears 3 times (once split over bold/plain text), when the author searches "lan", then "1/3" is shown and all three are highlighted; "Replace all" with "Mai" replaces all three and one Undo restores them; an image block is never touched. | Happy / Edge |
| SCR-EDT-01-AC26 | Given a device backup that differs from the server draft, when the author chooses "Compare and merge", picks a side for each difference and applies, then the editor shows the merged text and the next save is sent with the server draft's revision. | Happy / State transition |
| SCR-EDT-01-AC27 | Given a save conflict, when the author chooses "Load latest and merge", then the merge view opens on the freshly loaded draft and the merged text saves against that revision (a further concurrent save still conflicts). | Edge |
| SCR-EDT-01-AC20 `[Proposed]` | Given a published chapter, when the panel loads, then "Schedule…" is not offered (or is explained as unavailable). | Edge (F-EDT-01) |
| SCR-EDT-01-AC21 `[Proposed]` | Given unsaved changes, when the author follows an in-app link (Preview, Version history, Back to chapters), then pending changes are saved before navigating, or the author is asked to confirm. | Navigation (F-EDT-02) |
| SCR-EDT-01-AC22 `[Proposed]` | Given the publish state cannot be loaded, when the editor is shown, then the panel shows a loading placeholder and an error with retry instead of disappearing. | Error (F-EDT-04) |
| SCR-EDT-01-AC23 `[Proposed]` | Given the session expired or the role was revoked, when a save fails with 401/403, then autosave stops and the author is told to sign in again / that they lost access, with the text kept on the device. | Error (F-EDT-03) |
| SCR-EDT-01-AC24 `[Proposed]` | Given a scheduled chapter whose due time passed and which was not published, when the editor opens, then the panel says the scheduled publish failed and why. | Error (F-EDT-05) |

## F. Findings referenced

F-EDT-01, F-EDT-02, F-EDT-03, F-EDT-04, F-EDT-05, F-EDT-06, F-EDT-07, F-EDT-08, F-EDT-09, F-EDT-10, U-EDT-01, U-EDT-02,
U-EDT-03, U-EDT-04, U-EDT-05 (details: [functional gap analysis](../../../../audits/functional-gap-analysis.md) / [UX gap analysis](../../../../audits/ux-ui-gap-analysis.md)).

## G. Open questions

Q-EDT-01 (empty chapters publishable?), Q-EDT-02 (scheduled snapshot content and attribution), Q-EDT-03 (may editors
cancel a schedule?), Q-EDT-04 (same-browser multi-tab backup), Q-EDT-05 (schedule the next version of a live chapter?).
