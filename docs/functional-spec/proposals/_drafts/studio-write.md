# Draft studio-write

Agent key `studio-write` · Scope: writing productivity, draft safety, publishing/scheduling, revision management ·
Screens SCR-EDT-01, SCR-HIST-01, SCR-HIST-02 · Journeys JRN-AUT-08…11 · Capabilities CAP-AUTH-20…49 · New FP range
FP-058…FP-062 · Baseline: Phase 1 spec (commit `204a1ea`) + code read on 2026-11-05.

> **Evidence limitation.** All three screens are signed-in only (story team role). No runtime session was available, so
> **nothing in this draft is `Verified (Runtime)`**. Layout statements at 390/768/1280 px are derived from the Tailwind
> classes and component code (`Inferred (Code)`), not observed. Behaviour is taken from `packages/features/src/editor`,
> `packages/features/src/history`, the SQL migrations/tests and the Phase 1 specs. The only runtime material used is the
> guest reader screenshot `rt2/shots/m-reader.png` (to compare the preview with the real reader header). Friction is
> marked **Confirmed (Code)** when the code makes it certain, **Hypothesised** when it depends on user behaviour or
> device behaviour not observed.

---

## 1. Journeys

### JRN-AUT-08 — Writing and editing a chapter

| Field | Value |
| --- | --- |
| Journey ID | JRN-AUT-08 |
| User goal | Write a chapter comfortably (often in short sessions on a phone), format it the way readers will see it, know how long it is, and move on to the next chapter. |
| Current workflow | Studio → story row "Manage chapters" → chapter row "Write" → SCR-EDT-01 (WF-CHM-06, WF-EDT-01/02). Screen = back link + Preview/History buttons, title input, formatting toolbar (H2, B, I, U, S, divider, picture, undo, redo), body (min 50vh), publish panel, footer "n words · status" + "Save draft". All inside the main shell (header + mobile bottom nav). |
| Friction points | **F1 Confirmed (Code)** — no screen heading or context: `editorText.title` "Edit chapter" exists but is never rendered; no story title or chapter number on screen (`editor/strings.en.ts:2`, `chapter-editor-screen.tsx:290-390`; U-EDT-03). **F2 Confirmed (Code)** — toolbar is not sticky: it scrolls away once the author is a screen into the text (`chapter-editor-screen.tsx:368-377`, no `sticky`). **F3 Confirmed (Code)** — save status and word count are in the footer **below the publish panel**, i.e. under the whole chapter (`:379-389`), so status is invisible while writing. **F4 Inferred (Code)** — at 390 px the 9 toolbar buttons (36 px, `button.tsx:25`, gap 4 px, `editor-toolbar.tsx:86`) need 356 px but 348 px are available → wraps to 2 rows; all targets 32–36 px < 44 px project rule (`tokens.css:74`). **F5 Hypothesised** — with the on-screen keyboard open (~45 % of an 844 px phone), the sticky 56 px header (`app-shell.tsx:24`) plus the fixed 64 px bottom nav (`bottom-nav.tsx:47`; on Android Chrome it sits above the keyboard when the viewport resizes) leave roughly 250–300 px for text, and the toolbar is off screen. **F6 Confirmed (Code)** — no find/replace, no placeholder on an empty body, no selection/reading-time count (`extensions.ts:47-66`). **F7 Confirmed (Code)** — shortcuts undiscoverable, Mod+S opens the browser save dialog (U-EDT-04). **F8 Confirmed (Code)** — after publishing, no way to go to the next chapter or create it from the editor (only "Back to chapters"). **F9 Hypothesised** — paste from Word/Google Docs keeps supported marks but empty paragraphs used as spacing become empty blocks (BR-EDT-003 "Inferred, not tested"); Vietnamese IME on mobile not tested (WBS 3.5 note "kiểm thử bằng bàn phím thật (IME tiếng Việt) chưa làm"). |
| Missing capabilities | Focused / distraction-free writing frame; mobile keyboard-aware toolbar; always-visible save status; find & replace; writing stats (selection, reading time); paste clean-up; chapter-to-chapter navigation; author's note as structured field (open question, CAP-AUTH-28). Chapter templates: **not justified** (serial chapters are free-form; the only recurring structure, the author's note, is better a field — Q-EDT-07). |
| Proposed improvement | FP-058 (focused, mobile-ready workspace incl. chapter context and prev/next), FP-062 (writing aids), FP-034 amendment (shortcuts/Mod+S), FP-030 amendment (touch image controls). |
| Expected value | Authors can write a whole chapter on a phone without fighting the layout; fewer formatting round-trips to Preview; faster serial cadence. |
| Affected screens | SCR-EDT-01 (primary), SCR-CHM-01 (create next chapter reuse), SCR-SHELL-01 (frame) |
| Dependencies | BRC-SHELL-01 (studio frame without bottom nav), Q-EDT-06 (is mobile web authoring a launch target), WP 7.1/7.3 (Capacitor keyboard), FP-022 (toolbar a11y). |
| Evidence | `packages/features/src/editor/screens/chapter-editor-screen.tsx:290-390`, `editor/components/editor-toolbar.tsx:46-121`, `packages/ui/src/components/button.tsx:21-28`, `packages/ui/src/widgets/app-shell.tsx:24-29`, `packages/ui/src/widgets/bottom-nav.tsx:47`, `packages/design-tokens/src/tokens.css:74,206-207`, WBS §1.2 `(studio)` group (`docs/WBS.md:64`), WBS 3.5 note. |

### JRN-AUT-09 — Saving and recovering drafts

| Field | Value |
| --- | --- |
| Goal | Never lose a word — offline, on tab close, across two devices, across co-authors — and recover an earlier draft state when something goes wrong. |
| Current workflow | Autosave 2 s / max 10 s with CAS revision (BR-EDT-008/009); local device backup every 0.5 s + banner on return (BR-EDT-011); `beforeunload` prompt (BR-EDT-012); conflict alert + "Load latest version" (BR-EDT-013); history restore overwrites draft (BR-HIST-006). |
| Friction points | **F1 Confirmed (Code)** — in-app navigation (Preview, Version history, Back, header, bottom nav) neither saves nor warns; text only survives as a device backup (F-EDT-02, `chapter-editor-screen.tsx:238-263`). **F2 Confirmed (Code)** — backup banner forces a blind choice: Restore vs Discard with only a relative time; no way to see what differs, and with an older base "restoring will overwrite newer changes" (`:309-333`). **F3 Confirmed (Code)** — conflict is detected only at save time, i.e. after the second person has typed; collaborators get no warning that someone else has the chapter open (BR-EDT-013). **F4 Confirmed (Code)** — there is no server-side history of the draft: only published versions exist (`chapter_versions`), so an author who writes for weeks before publishing has no way back; restore and "Load latest version" replace the draft with no undo (F-HIST-01). **F5 Confirmed (Code)** — permanent save errors retry forever (F-EDT-03). **F6 Hypothesised** — two tabs of one browser share one backup key (Q-EDT-04; WBS 3.6 "chưa kiểm chứng"). **F7 Confirmed (Code)** — the editor cannot open without network ("Couldn't load the draft"), so writing offline on a commute is impossible even though a device backup exists (`chapter-editor-screen.tsx:52-63`). **F8 Hypothesised** — save status lives under the chapter (JRN-AUT-08 F3), so offline/error states are noticed late. |
| Missing capabilities | Flush-before-leave guard; compare-before-restore of the device backup; server draft checkpoints (automatic + named); editing presence; offline open. |
| Proposed improvement | FP-003 amendment (flush/guard on all exits, backup compare, multi-tab), FP-059 (draft checkpoints), FP-061 (presence), FP-010 (permanent errors, already there), FP-058 (status chip always visible). Offline open → Q-EDT-08 (deferred to WP 7.x). |
| Expected value | Removes the remaining silent-loss paths; gives authors an "undo across days"; cuts co-author conflicts before they happen. |
| Affected screens | SCR-EDT-01, SCR-HIST-01 |
| Dependencies | Q-HIST-01, Q-HIST-03, Q-EDT-04, Q-EDT-08; Supabase Realtime (already used for notifications). |
| Evidence | BR-EDT-008…013, BR-HIST-006; `packages/features/src/editor/model/local-backup.ts:1-52`, `editor/model/autosaver.ts`, `history/hooks/use-history.ts:32-62`; WBS 3.6 note. |

### JRN-AUT-10 — Publishing and scheduling chapters

| Field | Value |
| --- | --- |
| Goal | Check the chapter as readers will see it, publish it (now or at a planned time), know who will be told, fix mistakes after publishing, take it offline if needed. |
| Current workflow | Preview (SCR-HIST-02, saved draft only) → back to editor → publish panel: Publish / Publish new version, Schedule… (`datetime-local` + zone), Unpublish / Cancel schedule (owner, co-author) (WF-EDT-07/08/09, WF-HIST-04). First publish → outbox `chapter.published` → followers notified within ~1 min (BR-NOTI-003). |
| Friction points | **F1 Confirmed (Code)** — Preview shows the last *saved* draft; unsaved text is missing (F-EDT-02/U-HIST-02). **F2 Confirmed (Code)** — preview has no publish action: author must go back and scroll to the panel under the chapter (`preview-screen.tsx:48-59`). **F3 Confirmed (Code)** — first publish is one click with no confirmation although it irreversibly notifies every follower and moves the story to "ongoing" (U-EDT-05, BR-EDT-020). **F4 Confirmed (Code)** — "Publish new version" gives no idea what changes for readers; republishing an unchanged draft creates an identical version (F-EDT-06). **F5 Inferred (Code)** — removing or merging a paragraph that carries reader paragraph-comments hides those comments: comments anchor to permanent `chapter_blocks` (`20261104000700_comments.sql:222-225`) but the reader renders only the live version's blocks (BR-READ-*), and nothing warns the author. **F6 Inferred (Code)** — publishing a first chapter while the story is private (or otherwise suppressed) sets `first_published_at` (`publish_chapter_rpc.sql:163,189`) but the handler sends nothing (BR-NOTI-003 "story … private"), and later publishes are silent → the one-time announcement is silently consumed. **F7 Confirmed (Code)** — a picture copied from another story fails only at publish with a generic "isn't ready to publish" (BR-EDT-016, BR-EDT-025). **F8 Confirmed (Code)** — Schedule offered on published chapters and always refused (F-EDT-01); failed scheduled publish invisible (F-EDT-05). **F9 Confirmed (Code)** — a scheduled chapter publishes "the draft as it is then": editing a scheduled chapter shows no warning that half-finished edits will go live (BR-EDT-021/022, Q-EDT-02). **F10 Confirmed (Code)** — publish panel renders nothing while its state loads or fails (F-EDT-04). **F11 Confirmed (Code)** — notification links break after chapter slug rename (F-NOTI-01) and lead to "not found" after unpublish. **F12 Inferred (Code)** — on mobile the panel sits after the whole chapter, the schedule dialog is a centred modal with a native picker (acceptable), all buttons 36 px. |
| Missing capabilities | Pre-publish review (diff vs live, audience, warnings, checks); publish from preview; scheduled-edit warning; schedule-next-version (Q-EDT-05); author receipt when a scheduled chapter goes live; resilient notification destinations. |
| Proposed improvement | FP-060 (pre-publish review sheet, also reachable from Preview), FP-034 amendment (merge first-publish confirmation into FP-060), FP-010 amendment (scheduled-edit banner, readable schedule summary, receipt), FP-011 amendment (unpublished/archived chapter destination), FP-020 (panel loading/error). |
| Expected value | No accidental announcements; authors see the consequence of every publish (who is told, what changes, which reader comments are affected); scheduling becomes trustworthy. |
| Affected screens | SCR-EDT-01, SCR-HIST-02, SCR-HIST-01 (diff reuse), SCR-NOTI-01, SCR-CHM-01 |
| Dependencies | Q-EDT-01, Q-EDT-02, Q-EDT-05, Q-NOTI-02, Q-NOTI-04 (new); outbox + pg_cron. |
| Evidence | BR-EDT-016…028, BR-HIST-005/007, BR-NOTI-003; `packages/features/src/editor/components/publish-panel.tsx:39-216`, `history/screens/preview-screen.tsx:15-80`, `supabase/migrations/20261103000200_publish_chapter_rpc.sql:161-212`, `supabase/migrations/20261104000800_story_follows_saves.sql:27-37` (`story_stats.followers`). |

### JRN-AUT-11 — Revision management (history, compare, restore)

| Field | Value |
| --- | --- |
| Goal | See what was published when and by whom, find exactly what changed, and go back — to a published version or to an earlier unpublished state — without fear. |
| Current workflow | Editor "Version history" → SCR-HIST-01: list of published versions (newest first, live badge) above a viewer with Content / Compare (base = current draft or another version) and "Restore to draft" (confirm) (WF-HIST-01…03). |
| Friction points | **F1 Confirmed (Code)** — only *published* versions exist; drafting history is absent (JRN-AUT-09 F4). **F2 Confirmed (Code)** — single column: the full version list sits above the viewer (`history-screen.tsx:103,116-149`); with many versions the viewer is pushed far down and selecting a version does not scroll to it (Inferred for 20+ versions at 390 px). **F3 Confirmed (Code)** — Compare renders the **whole chapter** with badges on changed blocks (`:318-335`); no "changes only" filter, no next/previous change, paragraph-level only (old text struck through in full, no word highlight). **F4 Confirmed (Code)** — title change not compared; "paragraphs" wording for images/dividers; no "before" for changed images (U-HIST-01). **F5 Confirmed (Code)** — base-version load failure = endless skeleton (F-HIST-02). **F6 Confirmed (Code)** — restore overwrites the draft with no undo, re-reads the revision just before writing (misses edits made since History opened) and deletes the device backup (F-HIST-01). **F7 Confirmed (Code)** — no entry from the chapter manager (only from the editor). **F8 Hypothesised** — teams cannot tell why a version exists (no change note); low value for solo authors, so not proposed. |
| Missing capabilities | Draft checkpoints in the same history; master–detail layout; changes-only diff with navigation and word highlight; safe restore with undo. |
| Proposed improvement | FP-059 (checkpoints shown as a second list in SCR-HIST-01, same viewer/compare/restore), SE-HIST-01 (layout + diff UX, quick-fix level), FP-003 amendment (revision displayed + undo), FP-020 (F-HIST-02). Partial (single-paragraph) restore: **not recommended** — copy/paste from the Content view covers it. |
| Expected value | History becomes a real safety net for drafting, and diffs answer "what changed?" in seconds on a phone. |
| Affected screens | SCR-HIST-01, SCR-EDT-01 |
| Dependencies | Q-HIST-01, Q-HIST-03; BR-HIST-002 (immutability unchanged). |
| Evidence | BR-HIST-001…009; `packages/features/src/history/screens/history-screen.tsx:82-338`, `history/model/history.ts:90-172`, `history/hooks/use-history.ts:36-62`. |

---

## 2. Capability rows

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-AUTH-20 | Rich-text formatting limited to what a chapter stores (H2, B/I/U/S, break, divider, picture, undo/redo) | Implemented | BR-EDT-003, `editor/model/extensions.ts:47-66` | Reader-faithful formatting, no lossy saves | none |
| CAP-AUTH-21 | Live word count | Implemented | BR-EDT-007 | Length awareness | none |
| CAP-AUTH-22 | Writing stats: selection count, characters, est. reading time, words this session | Missing | `chapter-editor-screen.tsx:100,217-219` (total only) | Serial authors target consistent chapter length | FP-062 |
| CAP-AUTH-23 | Focus / distraction-free mode (no shell, panels hidden) | Missing | Editor inside `MainShell` (`apps/web/src/app/(main)/layout.tsx:4-7`) | Concentration on long sessions | FP-058 |
| CAP-AUTH-24 | Mobile editing: keyboard-aware sticky toolbar, ≥ 44 px targets, status always visible | Missing | JRN-AUT-08 F2–F5 | Most serial writing happens in short phone sessions (Hypothesised; benchmark: mobile-first writing apps) | FP-058 |
| CAP-AUTH-25 | Keyboard shortcuts incl. save, discoverable | Partial | BR-EDT-027, U-EDT-04 | Desktop speed | FP-034 (amended) |
| CAP-AUTH-26 | Find & replace within a chapter | Missing | No search extension (`extensions.ts`) | Rename a character / fix a repeated typo | FP-062 |
| CAP-AUTH-27 | Paste from Word / Google Docs with clean-up and a report of dropped content | Partial (Unverified) | BR-EDT-003 exception (Inferred, untested) | Most authors draft elsewhere first | FP-062 |
| CAP-AUTH-28 | Author's note (before/after chapter) as a field outside the body | Missing | `chapterBodySchema` has no such field | Keeps notes out of word count, diff and paragraph comments | none — Q-EDT-07 |
| CAP-AUTH-29 | Chapter templates | Missing | — | Low: chapters are free-form | none (not justified) |
| CAP-AUTH-30 | Team review notes / suggestions on a draft (editor role) | Missing | No draft-comment entity; BR-TEAM-010 | Editors have edit rights but no review channel | none — consolidation with collaboration agent (§7) |
| CAP-AUTH-31 | Autosave with visible status | Implemented (status placement weak) | BR-EDT-009; JRN-AUT-08 F3 | Trust | FP-058 (placement) |
| CAP-AUTH-32 | Local device backup + recovery banner | Implemented | BR-EDT-011 | Offline/tab-close safety | FP-003 (amended: compare before restore) |
| CAP-AUTH-33 | Flush/guard on in-app navigation | Missing | F-EDT-02 | Prevents stale preview and lost text | FP-003 |
| CAP-AUTH-34 | Open and edit a chapter while offline | Missing | `chapter-editor-screen.tsx:52-63` | Commute writing | none — Q-EDT-08 (WP 7.x) |
| CAP-AUTH-35 | Same-browser multi-tab handling | Unverified | Q-EDT-04, WBS 3.6 note | Avoid self-conflicts | FP-003 (amended) |
| CAP-AUTH-36 | Two-device / co-author conflict detection (CAS) | Implemented | BR-EDT-008/013 | No silent overwrite | none |
| CAP-AUTH-37 | Conflict prevention: who else is editing (presence) | Missing | BR-EDT-013 reacts only at save | Fewer conflicts in team stories | FP-061 |
| CAP-AUTH-38 | Server-side draft history (automatic + named checkpoints) | Missing | Only `chapter_versions` (published) | Undo across days, safe restore | FP-059 |
| CAP-AUTH-39 | Reader-faithful preview (incl. unsaved text, chapter header, phone width) | Partial | BR-HIST-007, U-HIST-02, F-EDT-02 | Confidence before publishing | SE-HIST-02 + FP-003 |
| CAP-AUTH-40 | Publish now with double-submit and revision safety | Implemented | BR-EDT-018/026 | Integrity | none |
| CAP-AUTH-41 | Pre-publish review: audience, diff vs live, warnings (comments on removed paragraphs, foreign images, empty) | Missing | JRN-AUT-10 F3–F7 | No accidental announcement; protects reader discussion | FP-060 |
| CAP-AUTH-42 | Skip identical republish | Missing | F-EDT-06 | Clean history | FP-034 |
| CAP-AUTH-43 | Scheduled publishing with failure feedback | Partial | BR-EDT-021/022, F-EDT-01/05 | Release planning | FP-010 |
| CAP-AUTH-44 | Warning when editing a scheduled chapter; schedule next version of a live chapter | Missing | BR-EDT-021, Q-EDT-02, Q-EDT-05 | Prevent half-edits going live | FP-010 (amended) |
| CAP-AUTH-45 | Unpublish / cancel schedule (role-gated, confirmed) | Implemented (copy issue U-EDT-01) | BR-EDT-023 | Recover from mistakes | FP-034 |
| CAP-AUTH-46 | Follower notification on first publish | Implemented (links fragile; private-story consumption) | BR-NOTI-003, F-NOTI-01, JRN-AUT-10 F6 | Audience reach | FP-011 (amended), FP-060, Q-NOTI-04 |
| CAP-AUTH-47 | Choose to announce a major republish | Missing | BR-NOTI-003 "republish is silent" | Low; risk of spam | none (keep BR) |
| CAP-AUTH-48 | Version list + read-only view | Implemented | BR-HIST-003/004 | Accountability | none |
| CAP-AUTH-49 | Compare: changes-only, next/prev change, word-level, title | Partial | BR-HIST-005, U-HIST-01 | Find changes fast | SE-HIST-01 (UI only, no FP) |
| CAP-AUTH-50 | Restore with undo | Partial | BR-HIST-006, F-HIST-01 | Fearless restore | FP-003 + FP-059 |
| CAP-AUTH-51 | Image block: alt text, touch controls (replace/remove), cleanup | Partial | BR-EDT-014, F-EDT-08/09 | A11y, mobile editing | FP-030 (amended) |

> Note: rows run to CAP-AUTH-51 (two over the "20 upward" hint); the other studio agent uses 01…19, so no collision.

---

## 3. Screen enhancements

### SE-EDT-01 — Chapter editor (SCR-EDT-01)

**Current experience** — Purpose: write the chapter's working draft and publish it (BR-EDT-*). Structure (top→bottom,
single left-aligned column `max-w-3xl`, `chapter-editor-screen.tsx:291`): "Back to chapters" + outline buttons
Preview / Version history (32 px) → backup banner / conflict alert → title input (36 px, `maxLength 400`) → toolbar (9
icon buttons, 36 px, wraps) → body (`reader-text`, min 50vh) → publish panel (H2, state badge, Publish / Schedule… /
Unpublish) → footer "n words · status" + "Save draft". Lives in the main shell (sticky header, mobile bottom nav,
`pb-24`). Known limitations: F-EDT-01…10, U-EDT-01…05 (spec §F); no heading/context (U-EDT-03); no in-app flush
(F-EDT-02); panel disappears while loading (F-EDT-04).

**Identified opportunities**
- *Missing functionality*: focus mode, find & replace, writing stats, paste clean-up, empty-body placeholder, next/prev
  chapter, pre-publish review (FP-060), presence (FP-061), checkpoints entry (FP-059). — Verified (Code) absent.
- *UX/UI*: status and Save below the chapter (Verified (Code) `:379-389`); toolbar not sticky (Verified (Code));
  targets < 44 px (Verified (Code) `button.tsx:22-25`); 2-row toolbar at 390 px (Inferred (Code)); keyboard covers
  toolbar + bottom nav eats space (Hypothesised); on desktop the column is left-aligned leaving ~256 px empty on the
  right of the 1024 px main column at 1280 (Inferred (Code), `app-shell.tsx:29` + `:291`).
- *Workflow*: Preview/History exits lose unsaved text (Verified (Code), FP-003); publishing requires scrolling past the
  whole chapter (Verified (Code)); after publish there is no "next chapter" path (Verified (Code)).
- *IA*: no H1 / story / chapter number (Verified (Code), `strings.en.ts:2` unused); Save draft is a primary-looking
  button although autosave is the real mechanism (Verified (Code)).

**Proposed experience** (FP-058 unless noted; reuse `Button`, `Sheet`, `DropdownMenu`, `Tooltip`, `Badge`, `ConfirmDialog`)
- **Frame**: studio writing frame without the bottom nav (BRC-SHELL-01; WBS §1.2 `(studio)` group). Top **action bar**
  (sticky, 56 px incl. safe area) replaces the site header on this screen:
  `[← Chapters] [Story title · Ch. n (truncate)] [status chip] [Preview] [⋯] [Publish ▸]`.
  - *Status chip* (`aria-live` only on state change, not on word count — fixes U-EDT-03): Saved ✓ / Saving… / Unsaved /
    Offline – kept on this device / Not saved – fix title / Conflict. Tapping it opens details (last saved time,
    revision source, "Save now"). "Save draft" moves into the chip/⋯ (still Mod+S, FP-034).
  - *Publish ▸* (primary) opens the **Publish sheet** (FP-060): state badge, Publish/Publish new version, Schedule,
    Unpublish/Cancel, review summary. The bottom-of-page panel is removed. While state loads: skeleton in the sheet;
    error: retry (FP-020/F-EDT-04).
  - *⋯ menu*: Version history, Find & replace (FP-062), Writing stats, Focus mode, Keyboard shortcuts, Previous/Next
    chapter, "Write next chapter" (creates via existing `create_chapter`, CHM rules).
- **Writing column**: title as a borderless large field (H1 semantics via `aria-label` "Chapter title" + visually the
  page heading); body at reader measure (`max-w-[var(--reader-measure)]`, centred) so line length equals the reader.
  Placeholder "Start writing…" on an empty body (Tiptap Placeholder, already in `@tiptap/extensions@3.32.2`).
- **Toolbar**: ≥ md: sticky under the action bar, one row, 44 px targets, tooltips with shortcuts. < md: a single-row,
  horizontally scrollable bar of 44 px buttons docked to the bottom of the *visual* viewport while the body has focus
  (above the keyboard; `visualViewport` resize on web, Capacitor Keyboard plugin in WP 7.3); order B, I, H, picture,
  divider, U, S, then undo/redo pinned right. Hidden when the title has focus.
- **Focus mode** (toggle in ⋯, Mod+Shift+F on desktop): hides action bar except a faint status dot and "Exit focus",
  hides toolbar until text is selected (selection bubble on desktop via bubble-menu, already installed), typewriter
  scrolling optional (Proposed, off by default). Remembered per device (localStorage, best effort).
- **Banners** (backup, conflict, scheduled-edit warning from FP-010, presence from FP-061) stack under the action bar,
  compact one-line with "Details" expander on mobile.
- **Breakpoints**: 390 — action bar collapses Preview into ⋯, title truncates, Publish sheet = bottom sheet (max 85vh,
  scrollable, primary button sticky at its bottom), docked toolbar; 768 — Preview visible, toolbar sticky top, Publish
  sheet from the right (420 px); 1280 — centred writing column + optional **right rail** (320 px) showing the publish
  state, word stats and last checkpoint; rail hidden in focus mode.

**Acceptance criteria** [Proposed]
- SE-EDT-01-AC01 — Given the editor at 390 px with the keyboard open and the cursor in the body, When the author types, Then the formatting bar is visible directly above the keyboard, every button is ≥ 44×44 px, and no bottom navigation is shown.
- SE-EDT-01-AC02 — Given any autosave state change, When it happens, Then the action-bar status chip shows it without scrolling, and screen readers announce the state change but not word-count changes.
- SE-EDT-01-AC03 — Given the editor, When it loads, Then the story title and "Chapter n" (published position or sort order per Q-READ-01) are shown in the action bar and the page has exactly one H1-level heading.
- SE-EDT-01-AC04 — Given the author presses "Publish ▸", When the publish state is still loading or failed, Then the sheet shows a skeleton or an error with "Try again" — never nothing (F-EDT-04).
- SE-EDT-01-AC05 — Given focus mode is on, When the author selects text on desktop, Then a formatting bubble appears; When they press Esc or "Exit focus", Then the full frame returns and the setting is remembered on this device.
- SE-EDT-01-AC06 — Given a chapter was just published, When the success toast appears, Then it offers "Write next chapter", which opens the next existing draft chapter or, if none, the create-chapter flow of SCR-CHM-01.
- SE-EDT-01-AC07 — Given an empty body, When the editor shows, Then a placeholder hint is visible and is not part of the saved body or word count.
- SE-EDT-01-AC08 — Given 1280 px, When the editor shows, Then the writing column is centred at the reader measure and the right rail shows publish state and word stats; in focus mode the rail is hidden.
- SE-EDT-01-AC09 — Given unsaved changes, When the author taps "← Chapters", Preview or History, Then FP-003 flush/guard applies (save first; if offline, navigate and show "Saved on this device only").

**Impact** — Frontend: editor screen restructure, new `EditorActionBar`, `PublishSheet` (wraps current `PublishPanel`
logic), docked toolbar hook (`useVisualViewport`). Backend/API: none (FP-060 adds a read RPC). Database: none.
Shared components: `AppShell` variant without bottom nav (or a `StudioShell`), `Sheet` bottom/side usage, Tooltip.
Business rules: BRC-SHELL-01; BR-EDT-024 panel location text. Other screens: SCR-HIST-02 (Publish entry), SCR-CHM-01
(create next chapter), SCR-SHELL-01.

**Related** — FP-058, FP-060, FP-062, FP-003, FP-010, FP-020, FP-022, FP-030, FP-034; F-EDT-01…05, U-EDT-01…05.

**Priority** — **P1** for the FP-003 exits (data loss) and the status/publish placement; **P2** for the mobile frame
(P1 if Q-EDT-06 says mobile web authoring is a launch target); P3 for focus mode and right rail.

### SE-HIST-01 — Version history (SCR-HIST-01)

**Current experience** — Purpose: list published versions, view one read-only with reader rendering, compare
(block-level) with the draft or another version, restore into the draft (BR-HIST-001…009). Structure: PageHeader →
"Back to editor" → `<ol>` of version cards (full width) → viewer section (Content/Compare toggle, Restore, content or
diff). Single column `max-w-3xl` at every width (`history-screen.tsx:103`). Limitations: F-HIST-01 (restore without
undo), F-HIST-02 (endless skeleton), U-HIST-01 (title/wording), no checkpoints, no entry from chapter manager.

**Identified opportunities**
- *Missing functionality*: draft checkpoints (FP-059) — Verified (Code) absent; undo after restore — Verified (Code).
- *UX/UI*: list above viewer, no scroll-to-viewer on select (Verified (Code) `:116-149`); diff shows whole chapter,
  no changes-only filter / next change / word highlight (Verified (Code) `:318-335`); Content/Compare and Restore are
  32 px (Verified (Code)); "Compare" base defaults to draft but the summary does not say how the *live* version
  differs (Inferred).
- *Workflow*: restore → toast + "Open editor" link (fine); restore uses a fresh revision (F-HIST-01) — FP-003.
- *IA*: published versions and (future) checkpoints need one timeline with clear labels; the live version should be
  pinned/identifiable at a glance (Inferred).

**Proposed experience** (reuse `Tabs`, `Select`, `Sheet`, `Badge`, `ConfirmDialog`, `BlockView`)
- **Header**: "Version history · {chapter title}" + Back to editor; tabs **Published** | **Checkpoints** (FP-059; tab
  hidden until approved).
- **390 px**: version picker as a full-width trigger ("Version 5 · Live · 2 days ago ▾") opening a bottom sheet list;
  viewer directly under it; mode toggle as a 2-segment control (44 px); Restore in a sticky bottom bar of the viewer.
- **768 px**: same as mobile, picker as a `Select`; **1280 px**: master–detail — list left (300 px, scrollable,
  sticky), viewer right; selecting updates the viewer without page jump; keyboard ↑/↓ moves selection.
- **Compare**: default filter **Changes only** (with "Show whole chapter" toggle); "Previous / Next change" buttons
  with position "2 of 7"; changed text blocks show word-level `<ins>/<del>` highlighting (client-side word diff on the
  two texts, no new service) plus sr-only "Before/After"; title change row on top; image change shows before/after
  thumbnails; counters say "blocks" or split "paragraphs, pictures, dividers" (U-HIST-01). Quick base chips: "Current
  draft" · "Live version" · "Previous version".
- **Restore**: dialog states what will happen to the current draft ("It will be kept as a checkpoint" when FP-059 is
  approved, else "kept as a backup on this device" per FP-003) and sends the revision the screen loaded (FP-003).
  After success: inline status with **Undo** (restores the replaced draft) and Open editor.
- **Errors**: base load failure → ErrorState with retry (F-HIST-02 / FP-020).
- **Entry**: also from the chapter manager row menu (consolidation with CHM agent).

**Acceptance criteria** [Proposed]
- SE-HIST-01-AC01 — Given 12 versions at 390 px, When the author picks version 3 from the version picker, Then the viewer shows version 3 without the author scrolling past the list.
- SE-HIST-01-AC02 — Given 1280 px, When the history opens, Then the list and the viewer are side by side and the list stays visible while the viewer scrolls.
- SE-HIST-01-AC03 — Given Compare with 7 changed blocks in a 200-block chapter, When "Changes only" is on (default), Then only the 7 blocks (plus one context block each side, collapsed counts in between) are shown, and "Next change" moves focus to each in order.
- SE-HIST-01-AC04 — Given a paragraph where one word changed, When compared, Then that word is highlighted as removed/added and screen readers get "Before"/"After" text.
- SE-HIST-01-AC05 — Given the version title differs from the base, When compared, Then a "Title changed" row shows old and new titles (U-HIST-01).
- SE-HIST-01-AC06 — Given a successful restore, When the inline status shows, Then "Undo" puts back the exact draft that was replaced (same title, body and block ids) and is offered until the author leaves the screen.
- SE-HIST-01-AC07 — Given the base version fails to load, When Compare is shown, Then an error with "Try again" replaces the skeleton.
- SE-HIST-01-AC08 — Given a chapter with no published versions but with checkpoints (FP-059), When the history opens, Then the Checkpoints tab is selected instead of the empty state.

**Impact** — Frontend: history screen layout, diff filter/navigation, word diff util in `history/model`. Backend/API:
none for layout; restore revision via FP-003; checkpoints via FP-059. Database: none (FP-059 separate). Shared
components: `Tabs`, `Sheet`; maybe a `SegmentedControl` pattern on `Button`. Business rules: BR-HIST-005 (presentation
only; matching rule unchanged), BR-HIST-006 via BRC-HIST-01. Other screens: SCR-EDT-01, SCR-CHM-01 (entry).

**Related** — FP-059, FP-003, FP-020, FP-022; F-HIST-01, F-HIST-02, U-HIST-01.

**Priority** — **P2**: restore safety parts are P1 inside FP-003; layout and diff UX are P2 (history is used rarely
but at high-stakes moments); word-level diff P3.

### SE-HIST-02 — Chapter preview (SCR-HIST-02)

**Current experience** — Purpose: show the saved draft with the reader's components and settings sheet (BR-HIST-007).
Structure: sticky bar (Back to editor, ReaderSettingsSheet) → note "This is a draft…" → article (H1 title + blocks).
Rendered inside the main shell. Limitations: stale (saved draft only, F-EDT-02); no "Chapter n" label or end marker
(U-HIST-02); error text says "history" (U-HIST-02); no way to publish from here.

**Identified opportunities**
- *Missing functionality*: publish from preview; phone-width frame on desktop; unsaved-text indicator. — Verified
  (Code) absent.
- *UX/UI*: the preview bar is `sticky top-0 z-10` while the site header is `sticky top-0 z-30`
  (`preview-screen.tsx:48`, `app-shell.tsx:24`): both stick at 0, so once the page scrolls the bar slides under the
  header and "Back to editor" is hidden — Inferred (Code); same pattern in the reader (`reader-screen.tsx:74`), flagged
  for the reader agent. Header differs from the real reader, which shows "Chương 2" above the title
  (Verified (Runtime) guest reader `m-reader.png`; preview code has no label — Verified (Code)).
- *Workflow*: Preview → back → scroll → publish (Verified (Code)); the preview cannot tell the author whether it
  includes their latest typing (Verified (Code)).
- *IA*: the note is generic; it could state status ("Draft · not visible to readers" / "Scheduled for…" /
  "Published — this draft has unpublished changes").

**Proposed experience**
- Studio writing frame (BRC-SHELL-01): the preview bar becomes the only sticky bar: `[← Editor] [state badge] [Aa
  settings] [Publish ▸]`; Publish opens the same review sheet as the editor (FP-060).
- Chapter header identical to the reader (story title link disabled, "Chapter n" label, H1), end-of-chapter marker,
  and greyed placeholders where vote/comments will appear ("Readers can vote and comment here") so the author sees
  the real page rhythm, without interactive controls.
- Freshness line in the note: "Showing the draft saved at 10:42" and, if the editor still had unsaved text that could
  not be saved (offline flush failure, FP-003), "Changes made after that are not included".
- ≥ md: device toggle **Phone 390 · Tablet 768 · Full** constraining the article width (no iframe, CSS only) so desktop
  authors can check how long paragraphs and pictures look on a phone. 390: no toggle; bar 56 px with 44 px targets.
- Error text specific to preview ("Couldn't load the preview").

**Acceptance criteria** [Proposed]
- SE-HIST-02-AC01 — Given the preview is scrolled, When the author looks for "Back to editor", Then the preview bar remains visible (not covered by any header).
- SE-HIST-02-AC02 — Given the preview of chapter 4, Then "Chapter 4" appears above the title and an end-of-chapter marker after the last block, as in the reader.
- SE-HIST-02-AC03 — Given the author presses "Publish ▸" in the preview, When they confirm in the review sheet, Then the chapter is published with the revision shown in the preview and the preview's state badge updates.
- SE-HIST-02-AC04 — Given 1280 px and "Phone" selected, Then the article renders at 390 px width with the reader typography; the choice is not persisted to reader preferences.
- SE-HIST-02-AC05 — Given the draft fails to load, Then the error reads "Couldn't load the preview" with "Try again".
- SE-HIST-02-AC06 — Given the editor could not save before navigating (offline), When the preview opens, Then the note says later changes are not included.

**Impact** — Frontend: preview header/footer reuse of reader `ChapterHeader`-like parts (extract from `reader-screen`
into a shared presentational component), device toggle, Publish entry. Backend/API: none (uses FP-060 read RPC).
Database: none. Shared components: reader header/end marker extraction; `PublishSheet` from FP-058/060. Business
rules: BR-HIST-007 exceptions list shrinks (no BR conflict). Other screens: SCR-READ-01 (shared header component),
SCR-EDT-01.

**Related** — FP-003 (fresh preview), FP-058, FP-060, FP-020; F-EDT-02, U-HIST-02.

**Priority** — **P2** (staleness itself is P1 via FP-003; header parity is a quick fix; publish-from-preview and
device toggle P2/P3).

---

## 4. New feature proposals

### FP-058 — Focused, mobile-ready writing workspace

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-EDT (+ OBJ-SHELL frame) · SCR-EDT-01, SCR-HIST-02 (frame), SCR-HIST-01 (frame) |
| User problem | Writing a chapter on a phone fights the layout: toolbar scrolls away and wraps, keyboard + header + bottom nav leave little text visible, save status and Publish sit under the whole chapter, targets are < 44 px; on desktop the editor is a left-aligned column inside a browsing shell with no context and no focus option. |
| Evidence / hypothesis | Verified (Code): `chapter-editor-screen.tsx:290-390` (order, no sticky, no H1), `editor-toolbar.tsx:86` (`flex-wrap`), `button.tsx:22-25` (32–36 px), `app-shell.tsx:24-29`, `bottom-nav.tsx:47`, `tokens.css:74` (44 px rule). Documented: WBS §1.2 planned a separate `(studio)` group (`docs/WBS.md:64`); WBS 7.3 "touch target ≥ 44px", keyboard integration. Hypothesised: share of authors writing on phones (benchmark: Wattpad's writer flow is mobile-app-first — not verified here). Runtime: not observed (signed-in). |
| Current limitation | One generic frame (`MainShell`) for reading-oriented browsing and for writing. |
| Proposed solution | (1) Studio writing frame: `AppShell` variant without bottom nav, used by SCR-EDT-01/HIST-01/HIST-02 (route group `(studio)` per WBS §1.2, or a layout flag). (2) Sticky action bar with context (story · chapter n), status chip, Preview, ⋯ menu, Publish ▸ (opens the publish sheet). (3) Toolbar: sticky ≥ md; < md docked above the keyboard via `visualViewport` (web) / Capacitor Keyboard (WP 7.3), single scrollable row of 44 px buttons. (4) Writing column centred at `--reader-measure`; placeholder on empty body. (5) Focus mode. (6) Right rail ≥ lg (publish state, stats, last checkpoint). (7) Prev/Next chapter + "Write next chapter" in ⋯ and in the publish success toast. |
| Expected benefit | Comfortable phone writing, always-visible save state (trust), one-tap path to publish, less scrolling, WCAG target size. |
| Scenarios & main flow | 1. Author opens a chapter on a phone; action bar shows "Saved". 2. Taps into the body; keyboard opens; formatting bar docks above it. 3. Types; chip goes Unsaved → Saving… → Saved. 4. Taps Publish ▸ → bottom sheet (FP-060 review) → publishes. 5. Toast "Chapter published · Write next chapter" → next draft opens. |
| Alternative / error flows | Offline: chip "Offline – kept on this device"; Publish ▸ disabled with reason. Conflict: chip red + banner (BR-EDT-013 unchanged). `visualViewport` unsupported: toolbar falls back to sticky top. Focus mode + conflict: focus exits automatically to show the alert. |
| Business rules to add/modify | BRC-SHELL-01 (studio writing screens without bottom nav). New BR-EDT (Proposed): "Save state is visible without scrolling on every breakpoint." No change to save/publish rules. |
| UI behaviour & validation | Chip text = existing `editorText.status.*` (plus offline variant); `aria-live` only on chip state; toolbar buttons keep `onMouseDown preventDefault` (focus stays in text) and gain `aria-keyshortcuts`; roving tabindex (FP-022). Focus-mode flag in localStorage (try/catch). |
| Technical impact | Frontend: editor screen split (`EditorActionBar`, `DockedToolbar`, `PublishSheet`), `useVisualViewport` hook in `features/_shared`. Shared components: `AppShell` prop to omit bottom nav / `StudioShell`; `Sheet`, `DropdownMenu`, `Tooltip`. API/RPC: none (next chapter uses existing chapter list query + `create_chapter`). Database · RLS · Jobs: none. Mobile app (WP 7.1) reuses the screen via `PlatformProvider`. |
| Dependencies · Risks | FP-003 (exits), FP-060 (sheet content), FP-022. Risk: iOS Safari `visualViewport` quirks (toolbar jitter) — mitigate with fallback; Vietnamese IME composition must not be broken by the docked bar (needs device test, WBS 3.5 gap). |
| Priority · Complexity · Class | P2 (P1 if Q-EDT-06 = mobile web authoring at launch) · M · Maturity |
| Decision required | BRC-SHELL-01; Q-EDT-06 (priority). |

Acceptance criteria [Proposed]
- Given a 390 px phone with the keyboard open, When the cursor is in the body, Then the formatting bar is directly above the keyboard, no bottom navigation is visible, and all toolbar targets are ≥ 44×44 px.
- Given any breakpoint, When an autosave changes state, Then the status is visible in the action bar without scrolling.
- Given the author enables focus mode, When they reload the editor on the same device, Then focus mode is still on and can be left with Esc or "Exit focus".
- Given a chapter was published, When the author chooses "Write next chapter", Then the next chapter's editor opens (or the create-chapter form if there is none).

### FP-059 — Draft checkpoints (server-side draft history)

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-STUDIO · OBJ-HIST (+ OBJ-EDT) · SCR-HIST-01, SCR-EDT-01 |
| User problem | Only published versions are kept. An author drafting for weeks, a co-author who overwrote a passage, or an author who restored the wrong version or pressed "Load latest version" after a conflict has no way back to an earlier unpublished state; the device backup is per browser and single-slot. |
| Evidence / hypothesis | Verified (Code): `chapter_drafts` holds one row per chapter (BR-EDT-008), `chapter_versions` only on publish (BR-EDT-020); restore overwrites with no undo and deletes the backup (BR-HIST-006, F-HIST-01); Q-HIST-01 open. Benchmark (not verified here): Google Docs version history; Wattpad's writer offers part version history of saves. |
| Current limitation | No server-side record between publishes; undo stack is lost on reload. |
| Proposed solution | Table `chapter_draft_checkpoints(id, chapter_id, revision, title, body jsonb, word_count, kind ∈ auto/named/before_restore/before_reload, label, created_by, created_at)`; RLS read/insert = `can_edit_chapter` + `is_active_account()`; no UPDATE; DELETE by owner/co-author for named ones (or none, per Q-HIST-03). Writes: RPC `create_draft_checkpoint(chapter, expected_revision, kind, label)` copies the **saved** draft server-side (no body upload). Automatic: client calls it at most every 30 min of active editing and on the first save of a session; always before history restore (BRC-HIST-01) and before "Load latest version". Named: ⋯ → "Save checkpoint…" (label ≤ 80 chars). Retention job (pg_cron, existing pattern): keep all named + last N automatic (N per Q-HIST-03). UI: "Checkpoints" tab in SCR-HIST-01 reusing viewer, Compare (`diffBlocks`) and Restore; "Last checkpoint 12 min ago" in the editor rail/⋯. |
| Expected benefit | Undo across days and devices; fearless restore and conflict reload; teams can recover a collaborator's overwrite. |
| Scenarios & main flow | 1. Author writes; 30 min later an automatic checkpoint is created from the saved draft. 2. Next day they delete a scene and autosave saves it. 3. Opens History → Checkpoints → picks yesterday's → Compare with current draft shows the scene as "Removed". 4. Restores → current draft first saved as `before_restore` checkpoint → draft replaced. |
| Alternative / error flows | Checkpoint RPC fails (offline) → silently retried at next save; never blocks writing. Restore conflict → same messages as BR-HIST-009. Draft unchanged since last checkpoint → RPC no-ops (dedupe on `revision`). |
| Business rules to add/modify | New BR-HIST-010 (checkpoint creation, dedupe by revision, never published, team-only), BR-HIST-011 (retention). BRC-HIST-01 (restore first checkpoints the replaced draft — modifies BR-HIST-006 expected behaviour). BR-HIST-002 untouched (checkpoints are not versions; not immutable-published). |
| UI behaviour & validation | Label trimmed 0–80 chars; list shows kind icon, label/"Automatic", time, author, words; Restore confirm text explains current draft will be checkpointed. |
| Technical impact | Frontend: history tabs, editor ⋯ action, `useCreateCheckpoint`. API/RPC: `create_draft_checkpoint`, `list_draft_checkpoints` (or table select). Database: new table + index `(chapter_id, created_at desc)`; storage ≈ body size × N per chapter (bounded by N and 2,000-block limit). RLS: as above + tests. Jobs: daily retention purge (pg_cron). |
| Dependencies · Risks | FP-003 (revision displayed), Q-HIST-01, Q-HIST-03. Risk: storage growth (mitigated by N and dedupe); privacy of removed text kept server-side (retention + account deletion must purge, WBS Q7). |
| Priority · Complexity · Class | P2 · M (L with retention UI) · Maturity |
| Decision required | Q-HIST-01 (existing), Q-HIST-03 (new), BRC-HIST-01. |

Acceptance criteria [Proposed]
- Given an author edited for 35 minutes with saves, When the next save succeeds, Then exactly one automatic checkpoint with that revision exists, and none is created if the revision equals the last checkpoint's.
- Given the author restores version 2, When the restore succeeds, Then a `before_restore` checkpoint holds the replaced draft (same title, body, block ids) and restoring that checkpoint returns the draft to its previous state.
- Given a member without a role on the story, When they query checkpoints of its chapters, Then no rows are returned (RLS test).
- Given more than N automatic checkpoints for a chapter, When the retention job runs, Then the oldest automatic ones beyond N are deleted and named ones are kept.

### FP-060 — Pre-publish review: audience, changes and checks

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-EDT (+ OBJ-HIST diff, OBJ-NOTI audience, OBJ-CMT anchors) · SCR-EDT-01, SCR-HIST-02 |
| User problem | Publishing is one click with no idea of consequences: the first publish irreversibly notifies all followers and makes the story "ongoing"; a republish may hide reader paragraph comments (removed blocks), may be identical, or may fail on a picture from another story; publishing while the story is private silently uses up the follower announcement. |
| Evidence / hypothesis | Verified (Code): U-EDT-05, F-EDT-06, BR-EDT-016/020/025; comments anchor to `chapter_blocks` (`20261104000700_comments.sql:222-225`) — Inferred that comments on blocks absent from the live version are unreachable in the reader (reader renders live blocks only, BR-READ-*); `first_published_at` set regardless of story visibility (`publish_chapter_rpc.sql:163,189`) while BR-NOTI-003 skips private stories — Inferred consumption. `story_stats.followers` available (`20261104000800_story_follows_saves.sql:27-37`). |
| Current limitation | Publish panel shows state and buttons only; no diff vs live, no audience, no pre-flight checks. |
| Proposed solution | A **review step** inside the Publish sheet (FP-058), also opened from Preview: (1) *What happens*: first publish → "≈{followers} followers will be notified; the story becomes Ongoing"; private story → warning "Followers will not be notified now **or later**" (until Q-NOTI-04 decides otherwise); republish → "Silent update: readers see the new text on next load". (2) *What changes* (republish): summary from `diffBlocks(liveVersionBlocks, draftBlocks)` — "3 changed, 1 added, 2 removed" + link "See changes" (opens SCR-HIST-01 Compare with base = live). (3) *Checks* (blocking ✕ / warning !): ✕ title blank / > 200; ✕ image key outside this story (client check with `is_valid_storage_key` convention, BR-EDT-016); ! 0 words (or ✕ per Q-EDT-01); ! "2 removed paragraphs have 14 reader comments that will no longer be shown"; ! identical to live (FP-034 dedupe: button becomes "Nothing to publish"). (4) Actions: Publish now (primary) · Schedule… · Cancel. One read RPC `publish_preview(chapter_id)` returns followers count, story visibility/status, live version id, `first_published_at`, and per-block comment counts for blocks of the live version missing from the saved draft (SECURITY DEFINER, `story_role` not null). |
| Expected benefit | No accidental announcements; reader discussions protected; fewer publish-time errors; FP-034 first-publish confirmation delivered with real information. |
| Scenarios & main flow | 1. Author taps Publish ▸. 2. Sheet saves first (`ensureSaved`, BR-EDT-018), then loads `publish_preview`. 3. Shows audience, changes, checks. 4. Author taps Publish now → existing `publish_chapter(expected_revision)`. 5. Toast + "Write next chapter". |
| Alternative / error flows | Preview RPC fails → sheet still allows publishing with a notice "Couldn't load the summary" (never blocks on a read). Blocking check → Publish disabled with reason and "Fix" link (focuses the title / selects the image block). Save-first fails → existing message (U-EDT-01 copy fix in FP-034). |
| Business rules to add/modify | New BR-EDT (Proposed) "Publish review": informational; the server remains the authority (BR-EDT-019 unchanged). No BRC unless Q-EDT-01 makes 0-word chapters non-publishable (then BRC-EDT via FP-034) or Q-NOTI-04 re-arms announcements. |
| UI behaviour & validation | Sheet sections collapsible on mobile; follower count shown approximately ("about 1.2k") via `formatCount`; comment warning lists the paragraphs (first 80 chars) with a link to each in the editor. |
| Technical impact | Frontend: `PublishReview` in editor feature, reuse `diffBlocks` from history model (move to shared model or import via `history/index.ts`). API/RPC: `publish_preview` (read-only, SQL test for role/visibility). Database: none (reads `story_stats`, `chapters`, `chapter_version_blocks`, `comments`). RLS: definer function with `story_role` check. Jobs: none. |
| Dependencies · Risks | FP-058 (sheet), FP-034 (dedupe, copy), Q-EDT-01, Q-NOTI-04. Risk: comment count query cost — bounded by the blocks of one chapter; `idx_comments_block (block_id, created_at, id)` already exists (`20261103000000_init_schema.sql:357`). |
| Priority · Complexity · Class | P2 · M · Maturity (first-publish part MVP) |
| Decision required | none to start; Q-EDT-01 and Q-NOTI-04 refine checks. |

Acceptance criteria [Proposed]
- Given a never-published chapter of a public story with 120 followers, When the author opens the publish review, Then it states that about 120 followers will be notified and the story becomes Ongoing, and nothing is published until "Publish now" is pressed.
- Given a published chapter whose draft removes two paragraphs carrying 14 visible reader comments, When the review loads, Then a warning names those paragraphs and the comment count, and publishing is still allowed.
- Given a draft containing an image block whose key belongs to another story, When the review loads, Then "Publish now" is disabled with "A picture comes from another story — remove or re-insert it", and no RPC publish call is made.
- Given the story is private, When a first publish is reviewed, Then the review warns that followers will not be notified.
- Given the summary RPC fails, When the sheet shows, Then the author can still publish and sees "Couldn't load the summary".

### FP-061 — Editing presence for collaborators

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-STUDIO · OBJ-EDT (+ OBJ-TEAM) · SCR-EDT-01, SCR-CHM-01 (badge) |
| User problem | Co-authors and editors learn that someone else is editing the same chapter only when their own save is refused as a conflict — after they typed. The conflict path is safe but costly (reload, compare, re-apply). |
| Evidence / hypothesis | Verified (Code): CAS detects conflicts only at save (BR-EDT-008/013); draft query never refetches on focus (`use-chapter-draft.ts:12-23`); team roles owner/co_author/editor all edit drafts (BR-TEAM-010). Hypothesised: frequency of simultaneous editing in team stories. |
| Current limitation | No awareness of other editors; no soft lock. |
| Proposed solution | Supabase Realtime **Presence** channel `chapter-draft:{chapterId}` (Realtime already used for notifications — no new service): each open editor tracks `{user_id, display_name, since, typing}`. Editor shows a compact banner "Lan is editing this chapter (since 10:12). Your changes may conflict." with actions "Open read-only preview" / "Continue anyway". Additionally, the editor subscribes to `chapter_drafts` UPDATE for that chapter (Realtime Postgres changes, RLS-filtered) and, when another user saves, shows "Lan saved a newer version — Load it" *before* the local save fails. Chapter manager rows show an "Editing: Lan" badge. No hard lock. |
| Expected benefit | Prevents most team conflicts; makes collaboration visible. |
| Scenarios & main flow | 1. Lan opens chapter 5. 2. Minh opens it; sees the presence banner. 3. Minh chooses preview or continues; if Lan saves, Minh is told immediately and can load before typing more. |
| Alternative / error flows | Realtime unavailable → no banner; CAS remains the safety net. Same user on two devices → banner "You also have this chapter open on another device". |
| Business rules to add/modify | New BR-EDT (Proposed): presence is visible only to people with a role on the story; presence never blocks saving. |
| UI behaviour & validation | Banner dismissible per session; avatar + name; `role="status"`. |
| Technical impact | Frontend: `useDraftPresence` hook (editor), badge in chapter manager. Shared: avatar widget. API: Realtime channel authorization (private channel with RLS on `realtime.messages`, or presence keyed by an unguessable chapter id + RLS-filtered postgres changes). Database: Realtime publication for `chapter_drafts` (RLS applies). Jobs: none. |
| Dependencies · Risks | Realtime private-channel authorization must be configured (verify in WP 8.3 review); privacy: shows teammates' activity (team-only). |
| Priority · Complexity · Class | P3 · M · Optional |
| Decision required | none |

Acceptance criteria [Proposed]
- Given two collaborators open the same chapter, When the second editor loads, Then they see who else is editing within 5 s.
- Given collaborator A saves, When collaborator B has the chapter open, Then B is told a newer version exists before B's next save is attempted.
- Given a member without a role on the story, When they try to join the presence channel, Then they are refused and receive no presence or draft-change events.

### FP-062 — Writing aids: find & replace, writing stats, paste clean-up

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-STUDIO · OBJ-EDT · SCR-EDT-01 |
| User problem | Authors cannot rename a character or fix a repeated mistake inside a chapter (no replace; on mobile no in-editor find at all); they only see a total word count (no selection count, reading time or words written this session); text pasted from Word/Google Docs brings empty spacing paragraphs and silently loses unsupported formatting. |
| Evidence / hypothesis | Verified (Code): no search/replace or CharacterCount/Placeholder extension (`extensions.ts:47-66`); only total words (`chapter-editor-screen.tsx:100,217-219`). Inferred: paste normalisation per ProseMirror schema (BR-EDT-003 exception, untested). Hypothesised: most authors draft in other tools first. |
| Current limitation | Editor offers formatting only. |
| Proposed solution | (1) Find & replace panel (⋯ / Mod+F inside the editor; Mod+H replace): match case, whole word, Vietnamese-diacritic-aware option "ignore accents" (reuse `unaccent`-like client normaliser from `@storynest/utils` if present, else simple NFD strip); replace one / all as one undo step; block ids preserved (text edits only). Implemented as a small ProseMirror decoration plugin (no new dependency) or a pinned Tiptap community extension after review. (2) Writing stats popover from the status chip: words, characters, paragraphs, est. reading time (words ÷ 200 wpm, Vietnamese-tuned constant to confirm), selection words, words added this session (client only). (3) Paste clean-up: on paste of HTML, collapse runs of empty paragraphs to one, trim leading/trailing whitespace, keep B/I/U/S, and show a toast "Pasted. Removed: 12 empty lines, 3 links, 1 list (converted to paragraphs)". |
| Expected benefit | Faster revision, length consistency across chapters, clean imports. |
| Scenarios & main flow | 1. Author opens Find & replace, types "Lan" → "Lam", whole word, Replace all (14) → one undo step reverts all. 2. Taps the status chip → sees "2,340 words · ~12 min read · +410 this session". 3. Pastes a Google Docs chapter → toast summarises clean-up. |
| Alternative / error flows | Replace all would exceed `blockTextLength` → refused with message, nothing changed. Paste exceeding 2,000 blocks → existing validation message after paste (BR-EDT-006) — better: refuse paste with explanation. |
| Business rules to add/modify | New BR-EDT (Proposed) "Replace keeps block ids"; reading-time constant documented once (shared with the reader/story page if they show reading time — consolidation). No BRC. |
| UI behaviour & validation | Panel docks under the action bar (≥ md) or as a bottom sheet above the keyboard (< md); counts update live; `aria-live` only on "n matches". |
| Technical impact | Frontend only: editor plugin, stats util in `editor/model`, paste transform via `editorProps.transformPastedHTML`/`transformPasted`. Add `@tiptap/extensions` as a pinned direct dependency for CharacterCount/Placeholder (already in the lockfile as a transitive dep). API/DB/RLS/Jobs: none. |
| Dependencies · Risks | FP-058 (chip, ⋯). Risk: IME composition and replace interplay — test on Vietnamese keyboards. |
| Priority · Complexity · Class | P3 · M · Maturity |
| Decision required | none |

Acceptance criteria [Proposed]
- Given a chapter where "Lan" appears 14 times as a whole word, When the author replaces all with "Lam", Then 14 occurrences change, block ids of all paragraphs are unchanged, and one Undo restores all 14.
- Given the author selects a passage, When the stats popover is open, Then it shows the selection's word count alongside the chapter total and an estimated reading time.
- Given HTML with 5 consecutive empty paragraphs and a link is pasted, When the paste completes, Then at most one empty paragraph remains, the link text is kept without the link, and a toast reports what was removed.

---

## 5. Amendments to existing FPs

**FP-003 (Never lose typed text)** — add:
1. Scope explicitly includes the action-bar exits of FP-058, header/user-menu links and (while it exists) the bottom
   nav. Flush has a timeout (e.g. 3 s): if offline or failing, navigate anyway, keep the device backup and show
   "Saved on this device only" (so the guard never traps the author). Also write the backup on `pagehide` (iOS Safari
   does not show `beforeunload` prompts) — Inferred.
2. Backup banner gets **"Compare"**: opens a sheet with `diffBlocks(serverDraft, backup)` (reuse history model) so
   Restore/Discard is an informed choice; when the backup's base is older, offer "Restore as a checkpoint first"
   (if FP-059 approved).
3. Same-browser tabs (answers Q-EDT-04 option): `BroadcastChannel('storynest-draft-{chapterId}')` — the second tab
   shows "This chapter is open in another tab" and becomes read-only until the author chooses "Edit here" (the other
   tab then stops autosaving and writes its backup).
4. Restore safety: send the revision the History screen loaded (already in FP-003) **and** offer an inline "Undo"
   after a successful restore (SE-HIST-01-AC06); if FP-059 is approved, the replaced draft is kept server-side
   (BRC-HIST-01) instead of only as a device backup.
5. AC to add: "Given the author is offline with unsaved text, When they tap Preview, Then they navigate within 3 s,
   the backup is kept and the preview notes that later changes are not included."

**FP-010 (Reliable scheduled publishing)** — add:
1. Editing a scheduled chapter shows a persistent banner "Scheduled for Thu 20:00 — changes you save now will be
   published then" (UI-only, no BR change) — closes JRN-AUT-10 F9 regardless of Q-EDT-02.
2. Schedule dialog: quick picks (Tonight 20:00, Tomorrow same time, Next week same time), a readable confirmation
   ("Publishes Thursday 6 Nov, 20:00 (Asia/Ho_Chi_Minh) — in 2 days"), and the state badge shows relative time.
   Mobile: dialog as bottom sheet so the native picker and buttons are not covered by the keyboard.
3. If Q-EDT-05 = yes (schedule the next version of a live chapter), the schedule must capture the revision at
   scheduling time; record as BRC-EDT-01 (see §6) — the "draft as it is then" rule would otherwise publish
   half-finished edits.
4. Optional author receipt when a scheduled chapter goes live (in-app notification to the scheduler, reusing the
   outbox handler) — type list decision belongs to Q-NOTI-03 / FP-026.
5. Chapter manager shows the scheduled date/time (already U-CHM-01) and a "Scheduled" filter for release planning
   (consolidation with CHM agent).

**FP-011 (Stable links)** — add: when a `chapter_published` notification points to a chapter that is now
unpublished, archived or deleted, open the story page with a notice "This chapter is no longer available" instead
of a not-found page; resolve the displayed chapter title by `chapter_id` at display time (the payload title freezes
the first version's title, BR-NOTI-003). AC: "Given a notification for a chapter that was later unpublished, When
clicked, Then the story page opens with the notice."

**FP-030 (Images)** — add: touch-friendly image block controls (tap → small bar: Alt text, Replace, Remove, Move
up/down; 44 px) because selecting an atom node and deleting it with the virtual keyboard is unreliable on mobile
(Hypothesised); upload progress with Cancel; at paste/insert time detect image blocks whose key is outside this story
(BR-EDT-016) and mark them in the editor (feeds the FP-060 blocking check); `accept` already lets phones offer the
camera — keep it. AC: "Given an image block on a 390 px screen, When tapped, Then Remove and Replace are reachable
without the keyboard."

**FP-034 (Editor publish safety and clarity)** — change: the first-publish confirmation (bullet 1 and its AC) is
**delivered by FP-060's review step** (with follower count and story-status change) — keep one implementation. Keep
Mod+S, shortcuts help (add tooltips + `aria-keyshortcuts` on toolbar buttons), title `maxLength` 200, copy fixes,
identical-republish dedupe (FP-060 shows "Nothing to publish" when identical). Add copy: conflict banner should say
"Your text is kept on this device and offered after reloading" (U-EDT-01).

---

## 6. BR change proposals and open questions

### BR change proposals (require approval; none edits the BR text)

| ID | Rule affected | Proposed change | Why | Linked |
| --- | --- | --- | --- | --- |
| BRC-SHELL-01 | BR-SHELL-001 "Every regular page uses the main shell" | Studio writing screens (SCR-EDT-01, SCR-HIST-01, SCR-HIST-02) render in a studio writing frame without the mobile bottom navigation and with a screen-specific sticky action bar instead of the browsing header (route group `(studio)` as planned in WBS §1.2). | Keyboard + bottom nav + header leave little writing space; sticky bars collide (preview). | FP-058, Q-EDT-06; consolidate with the reader agent's shell-less `(reader)` proposal |
| BRC-HIST-01 | BR-HIST-006 "Restore a version into the draft" (step 4: delete the device backup; no undo) | Before writing, store the current saved draft as a `before_restore` checkpoint (server) and keep the device backup until the restore succeeds; offer Undo. | F-HIST-01; Q-HIST-01 | FP-059, FP-003 |
| BRC-EDT-01 | BR-EDT-021/022 "snapshot taken from the draft as it is at the due time" | (Only if Q-EDT-02/Q-EDT-05 decide so) store `scheduled_revision` at scheduling; at due time publish only if the draft revision still equals it, otherwise keep the chapter scheduled-failed and notify the author (FP-010 failure path). | Half-finished edits going live; enables scheduling the next version of a live chapter. | FP-010, Q-EDT-02, Q-EDT-05 |

### New open questions

| ID | Question | Why it matters | Linked |
| --- | --- | --- | --- |
| Q-EDT-06 | Is writing chapters in the mobile **web** app (390 px) a launch target, or is mobile authoring deferred to the Capacitor app (WP 7.1 "studio rút gọn")? | Sets FP-058 priority (P1 vs P2) and whether the docked toolbar is built for web or only for Capacitor. | FP-058 |
| Q-EDT-07 | Should chapters have a structured author's note (before/after the chapter), outside the body, word count, diff and paragraph comments? | Authors otherwise write notes into the body, inflating counts and creating comment anchors on notes. | CAP-AUTH-28 |
| Q-EDT-08 | Should the editor open offline (recently edited chapters cached on the device) and sync on reconnect, with CAS conflicts handled as today? | Commute writing; scope of WP 7.4 (offline is planned for reading only). | CAP-AUTH-34 |
| Q-HIST-03 | Checkpoint retention and visibility: how many automatic checkpoints per chapter / how long; may named checkpoints be deleted and by whom; purge on account deletion (WBS Q7)? | Storage, privacy of removed text. | FP-059 |
| Q-NOTI-04 | When a chapter's first publish produced no follower notification (story private/suppressed at processing), should the announcement be re-armed for the next time the chapter is published while the story is public? | Today `first_published_at` is set anyway, so followers are never told. | FP-060, BR-NOTI-003 |

Existing questions this draft depends on: Q-EDT-01, Q-EDT-02, Q-EDT-04, Q-EDT-05, Q-HIST-01, Q-NOTI-02, Q-NOTI-03,
Q-READ-01 (chapter number shown in the editor header).

---

## 7. Notes for consolidation

- **Shell-less frames**: BRC-SHELL-01 (studio writing frame) and the reader agent's `(reader)` shell-less route are
  the same pattern; one `AppShell` variant should serve both. The sticky-under-sticky collision
  (`preview-screen.tsx:48` / `reader-screen.tsx:74` vs `app-shell.tsx:24`, both `top-0`) also affects SCR-READ-01.
- **Shared reader header**: SE-HIST-02 wants the reader's "Chapter n" header and end marker as a presentational
  component — coordinate with the reader agent so both screens use one component.
- **Chapter manager (other studio agent, CAP-AUTH-01…19)**: "Write next chapter" reuses `create_chapter`; history
  entry from the chapter row; scheduled date + "Scheduled" filter (FP-010/U-CHM-01); presence badge (FP-061);
  release calendar, if proposed there, should read the same `scheduled_for`.
- **Collaboration**: CAP-AUTH-30 (review notes/suggestions for the editor role) is not proposed here; the
  collaboration owner should decide together with Q-TEAM-01 (what editors may do). FP-061 presence is team-scoped.
- **Notifications / community**: Q-NOTI-04 and FP-011 amendment touch OBJ-NOTI; FP-060 reads comment counts per
  block (OBJ-CMT); `idx_comments_block` exists (`init_schema.sql:357`).
- **Reading time**: if any agent proposes reading time on story/chapter pages, use one constant/util with FP-062.
- **Accessibility**: toolbar roving tabindex, `aria-keyshortcuts`, live-region scope stay in FP-022 (U-EDT-03); FP-058
  only relocates them.
- **Not verified**: all signed-in behaviour at runtime (layout, keyboard overlap, Vietnamese IME, paste from Docs,
  sticky collision); Supabase Realtime private-channel setup.
