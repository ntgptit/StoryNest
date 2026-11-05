# OBJ-READ — Workflows

| ID | Name | Status |
| --- | --- | --- |
| [WF-READ-01](#wf-read-01--open-a-chapter) | Open a chapter | Verified |
| [WF-READ-02](#wf-read-02--move-between-chapters) | Move between chapters | Verified |
| [WF-READ-03](#wf-read-03--change-reading-options) | Change reading options | Verified |
| [WF-READ-04](#wf-read-04--preferences-follow-the-reader-to-another-device) | Preferences follow the reader to another device | Verified |
| [WF-READ-05](#wf-read-05--open-a-deep-link-to-a-block-or-the-comments) | Open a deep link to a block or the comments | Verified / Inferred |
| [WF-READ-06](#wf-read-06--chapter-becomes-unavailable-while-readers-have-links) | Chapter becomes unavailable while readers have links | Verified |

---

### WF-READ-01 — Open a chapter
| Field | Value |
| --- | --- |
| User goal | Read a chapter. |
| Trigger | Story page CTA or chapter row, TOC, prev/next, library "Continue", notification, external link. |
| Preconditions | None (public route). |
| Main flow | 1. Server `loadChapter(id, chapterSlug)` loads the story and the chapter **in parallel** into the same per-request query client (`apps/web/src/lib/story/load-chapter.ts:14-17`). 2. Both found and the story slug matches → metadata (BR-READ-011), JSON-LD when indexable, dehydrate → `ReaderView` → `ReaderScreen`. 3. The bootstrap script has already applied stored reader preferences before paint (BR-READ-015). 4. Client: skeleton until story and chapter are known (BR-READ-010). Then the sticky toolbar (back to story, Display, Contents, progress bar), the chapter label + title, the blocks, the "— End of chapter —" marker, vote, report, the comment thread, and prev/next. 5. The reading tracker starts: progress restore/save for members ([WF-PROG-01/02](../reading-progress/workflows.md)) and read recording after 10 s ([WF-PROG-04](../reading-progress/workflows.md#wf-prog-04--count-a-read)). 6. Preference sync starts for members (BR-READ-016). |
| Alternative flows | A1 Wrong story slug → 308 (BR-READ-003). A2 Mature story → adult gate (BR-READ-010). A3 Zero blocks → "This chapter has no content yet." (BR-READ-012). |
| Exception flows | E1 Not found / unpublished / archived / deleted / hidden story → 404 (BR-READ-002). E2 Load error → client retries; still failing → "Couldn't load the chapter" + "Try again", which refetches both chapter and story (`reader-screen.tsx:75-86`). |
| Success criteria | The published text is readable at the chosen typography with no flash. |
| Postconditions | Members: progress row written on open (BR-PROG-005). Everyone: a read event after the dwell time (BR-PROG-010). |
| Affected objects | OBJ-READ, OBJ-STORY, OBJ-PROG, OBJ-VOTE, OBJ-CMT |
| Related screens | SCR-READ-01 |
| Status | Verified (`reader.test.tsx`, `page.test.tsx:105-135`, `load-chapter.test.ts`; WBS 2.4 runtime 200/308/404) |

### WF-READ-02 — Move between chapters
| Field | Value |
| --- | --- |
| User goal | Continue to the next chapter or go back. |
| Trigger | "Next chapter" / "Previous chapter" at the end of the article; a chapter in the Contents sheet; "← {story title}" (Back to story). |
| Preconditions | Story and chapter list loaded. |
| Main flow | 1. The reader scrolls to the end (past vote, report and comments) and presses "Next chapter". 2. Client navigation to the next published chapter. The old tracker flushes its last position on unmount (BR-PROG-006). 3. WF-READ-01 runs for the new chapter (`ReadingTracker` is keyed by chapter id, so it restarts). |
| Alternative flows | A1 Contents → choose any chapter (the current one is marked). A2 Back to story → SCR-STORY-01. A3 First / last chapter → that direction is a disabled placeholder. |
| Exception flows | Target chapter was unpublished meanwhile → 404 (BR-READ-002). |
| Success criteria | The next chapter opens in one action from the end of the text. |
| Postconditions | Story pointer moves to the new chapter (BR-PROG-005). |
| Affected objects | OBJ-READ, OBJ-PROG |
| Related screens | SCR-READ-01, SCR-STORY-01 |
| Status | Verified. UX gap: nav buried below comments, no shortcuts (U-READ-01) |

### WF-READ-03 — Change reading options
| Field | Value |
| --- | --- |
| User goal | Make the text comfortable to read. |
| Trigger | "Display" (vi "Hiển thị") in the reader toolbar, or the same sheet on the settings screen. |
| Preconditions | — |
| Main flow | 1. The "Reading options" sheet opens on the right: "Changes apply right away and are remembered for next time." 2. The reader presses "Decrease/Increase font size" (the size name is announced via `aria-live`), or a toggle in "Line spacing", "Font" or "Background". 3. The device store is updated and the `<html>` attributes change immediately (BR-READ-014/015). 4. Members: the change is saved to the account 1.5 s later (BR-READ-016). 5. The sheet is closed with Esc, the overlay or the close button. |
| Alternative flows | At the smallest or largest size the matching button is disabled. |
| Exception flows | Storage blocked → the change lasts for this page only. Account save fails → silently retried on the next change. |
| Success criteria | Applied instantly, kept after a reload and in other tabs. |
| Postconditions | localStorage updated, and `user_reader_preferences` upserted for members. |
| Affected objects | OBJ-READ (OBJ-SET hosts the same component) |
| Related screens | SCR-READ-01, settings screen |
| Status | Verified (`preferences.test.tsx:160-208`) |

### WF-READ-04 — Preferences follow the reader to another device
| Field | Value |
| --- | --- |
| User goal | Same reading look everywhere. |
| Trigger | A member opens a chapter (or settings) on a device. |
| Preconditions | Signed in. |
| Main flow | 1. The account copy is fetched (`staleTime 0`). 2. If one exists and differs from the device copy, the device copy is replaced and applied. 3. If none exists and the device has non-default settings, those are uploaded. 4. From then on, changes on the device are pushed (debounced). |
| Alternative flows | Account copy unreadable → the device copy keeps working (`preferences.test.tsx:317`). |
| Exception flows | — |
| Success criteria | A setting chosen on device A appears on device B after sign-in (WBS 2.7 runtime check). |
| Postconditions | — |
| Affected objects | OBJ-READ |
| Related screens | SCR-READ-01 |
| Status | Verified |

### WF-READ-05 — Open a deep link to a block or the comments
| Field | Value |
| --- | --- |
| User goal | Jump straight to the paragraph or comment someone referred to. |
| Trigger | A link `/story/{id}/{slug}/{chapterSlug}#b-{blockId}` or `#comments` (for example from a reply notification, `BR-NOTI-*`). |
| Preconditions | Chapter readable. |
| Main flow | 1. The SSR HTML contains the anchors, so the browser scrolls to the hash (`scroll-mt-20` clears the toolbar). 2. With a hash present, the saved position is **not** restored (BR-PROG-007). |
| Alternative flows | Mature story not yet confirmed → gate shown, and the anchor is not in the DOM (Inferred: no re-scroll after confirming). |
| Exception flows | Block removed by a republish → the browser stays at the top (Inferred). |
| Success criteria | The block or the comments section is in view. |
| Postconditions | — |
| Affected objects | OBJ-READ, OBJ-CMT, OBJ-NOTI |
| Related screens | SCR-READ-01, SCR-CMT-01 |
| Status | Verified (anchors, hash priority) / Inferred (gate + hash) |

### WF-READ-06 — Chapter becomes unavailable while readers have links
| Field | Value |
| --- | --- |
| User goal | (System) Readers must not see content the author took down. |
| Trigger | The author archives or unpublishes the chapter, renames its slug or deletes it; or the story becomes private/draft/deleted (OBJ-CHM, OBJ-STM, OBJ-MOD). |
| Preconditions | — |
| Main flow | 1. The change is committed. 2. On the next request, RLS and the reader filters make the chapter unreadable → HTTP 404 "Chapter not found". 3. The chapter disappears from the story page list, the TOC and prev/next. 4. Progress, vote and read RPCs for it fail with PT404 / 42501. |
| Alternative flows | Slug rename: the new URL works, the old URL 404s (no redirect, BR-READ-003). |
| Exception flows | A reader who already has the page open keeps reading the cached content. The next navigation or reload 404s. |
| Success criteria | No unpublished content is served. |
| Postconditions | Existing votes, comments and progress rows are kept (counters unchanged). |
| Affected objects | OBJ-READ, OBJ-PROG, OBJ-VOTE, OBJ-CMT |
| Related screens | SCR-READ-01 |
| Status | Verified (RLS, filters) |
