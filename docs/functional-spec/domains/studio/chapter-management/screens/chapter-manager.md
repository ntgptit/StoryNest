# SCR-CHM-01 — Chapter manager

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-CHM-01` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-CHM](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Chapter manager ("Manage chapters") |
| Route | `/studio/story/[id]/chapters` |
| Route file | `apps/web/src/app/(main)/studio/story/[id]/chapters/page.tsx` (view `chapter-manager-view.tsx`) |
| Screen component | `packages/features/src/studio/screens/chapter-manager-screen.tsx` (`ChapterManagerScreen` → `ChapterManager`, `AddChapterForm`); `components/rename-slug-dialog.tsx`; `components/scheduled-chapters.tsx`; `ui/widgets/confirm-dialog.tsx`, `ui/widgets/scheduled-outbox.tsx` |
| Roles | Owner, co-author (all actions); editor (add, move, rename slug, write) |
| Entry points | SCR-STM-01 row "Manage chapters" (all roles); SCR-STM-03 link "Manage chapters" |
| Workflows | WF-CHM-01..06 |
| Rules | BR-CHM-001..015, BR-STM-022, BR-STM-023 |

## B. Components
| ID | Component | Notes / evidence |
| --- | --- | --- |
| SCR-CHM-01-C01 | Header "Manage chapters" / "Order, URL slugs and status of the chapters in "<story>"." | `chapter-manager-screen.tsx:122`, `strings.en.ts:22-23` |
| SCR-CHM-01-C02 | Breadcrumb (Lucian 103) `nav` "Location in Studio": Studio → `/studio` › story title → `/studio/story/{id}` › Chapters (current page). Beside the story crumb, when the author has more than one story, a "Switch to another story" button (Lucian 037) opens a menu of their stories (useMyStories, role as second line, check on the current one) and opens the chapters of the one picked. Replaces the old "Back to story details" link | `components/studio-crumbs.tsx`, `packages/ui/src/widgets/breadcrumbs.tsx` |
| SCR-CHM-01-C12 | Scheduled outbox (Lucian #190), above the list, only when a live chapter is scheduled: heading "Scheduled", "These chapters publish by themselves, soonest first. Times are in {zone}."; one card per chapter in `scheduled_for` order with the time (relative + exact, user locale/time zone) as a button (`aria-expanded`) opening an inline `datetime-local` "New publish time" (min now+1 min) + "Save new time" / "Cancel"; title, "Chapter n · /slug"; "Publish now"; [owner/co-author] "Cancel schedule"; inline `role="alert"` on refusal. A rescheduled time drops into place (`animate-outbox-moved`) | `components/scheduled-chapters.tsx`, `model/studio-chapter.ts` (`scheduledChapters`) |
| SCR-CHM-01-C03 | Ordered list "Chapter list": row with "Chapter n", title / "(untitled)", status badge, "Deleted" badge, `/slug` | `chapter-manager-screen.tsx:134-156` |
| SCR-CHM-01-C04 | Live-row actions: Move up / Move down (icon buttons, aria-label "Move up: <title>"), "Write", "Change URL slug", [owner/co-author] "Archive" or "Unarchive", "Delete" | `chapter-manager-screen.tsx:176-240` |
| SCR-CHM-01-C05 | Deleted-row action: [owner/co-author] "Restore" | `chapter-manager-screen.tsx:158-174` |
| SCR-CHM-01-C06 | Numbering note | `chapter-manager-screen.tsx:248` |
| SCR-CHM-01-C07 | Empty state "This story has no chapters yet" / "Add the first chapter below." | `chapter-manager-screen.tsx:130-131` |
| SCR-CHM-01-C08 | Add form "Add chapter": "Chapter title", "URL slug", submit ("Adding…") | `chapter-manager-screen.tsx:314-371` |
| SCR-CHM-01-C09 | Rename dialog "Change chapter URL slug" | `components/rename-slug-dialog.tsx:66-100` |
| SCR-CHM-01-C10 | Confirm dialog (archive or delete; delete is destructive) | `chapter-manager-screen.tsx:267-283` |
| SCR-CHM-01-C11 | Skeleton; error state (retry both queries); "Story not found" empty state | `chapter-manager-screen.tsx:50-72` |
| SCR-CHM-01-C13 | Row context menu (Lucian #038): right-click, long press (touch) or Shift+F10 / menu key on any control of a row opens a menu with the row's own actions (Write, Move up/down, Change URL slug, [owner/co-author] Archive/Unarchive, Delete; Restore on a deleted row), same enabled/disabled rules as the buttons. On phones (below `sm`) Change URL slug / Archive / Delete fold into a "..." button ("More actions: <title>"); Write and the arrows stay visible. No action was removed | `components/chapter-row.tsx`, `packages/ui/src/widgets/row-actions-menu.tsx` |
| SCR-CHM-01-C14 | Drag to reorder (Lucian #255 / #317): a grip at the start of each live row (pointer and touch; hidden from assistive tech, the arrows stay the keyboard route); the row lifts, the others open a gap, the drop is sent through the same `reorder_chapters` call (optimistic, rolled back on refusal). Any order change (arrows, drop, reload) flies the rows to their new places; nothing animates on load | `packages/ui/src/widgets/sortable-list.tsx` |
| SCR-CHM-01-C15 | [owner/co-author] Bulk selection (Lucian #178): checkbox per row ("Select <title>", Shift-click selects a range); dock "N chapters selected" with "Select all", Archive (n) / Unarchive (n) / Delete (n) / Restore (n) — each counting only the selected chapters the row rule (`chapterStateActions`) allows — and clear (also Escape) | `chapter-manager-screen.tsx`, `packages/ui/src/widgets/bulk-action-dock.tsx` |

## C. User actions & system responses

| Field | SCR-CHM-01-A01 Add chapter |
| --- | --- |
| Trigger | Submit the add form |
| Preconditions | Role on story; not busy |
| Expected behavior | `create_chapter`; toast "Chapter added."; form reset; list reload |
| State change | New chapter (draft) + draft row |
| Validation | Title required ≤ 200; slug required ≤ 120, lowercase/digits/hyphens |
| Error behavior | Slug taken → field; other → toast (BR-CHM-014) |
| Navigation | Stays |
| Evidence | `chapter-manager-screen.tsx:299-312`; `chapter-management.test.tsx:381,399,414` |

| Field | SCR-CHM-01-A02 Move up / down |
| --- | --- |
| Trigger | Arrow buttons |
| Preconditions | Not first (up) / not last (down) among live chapters; no reorder running |
| Expected behavior | Optimistic reorder → `reorder_chapters` → reload |
| State change | `sort_order` renumbered |
| Validation | Server: full live set exactly once |
| Error behavior | Rollback + toast "The chapter list was changed elsewhere…" (22023) or other kind |
| Navigation | — |
| Evidence | `chapter-manager-screen.tsx:105-109,177-196`; `chapter-management.test.tsx:301-368` |

| Field | SCR-CHM-01-A03 Write |
| --- | --- |
| Trigger | "Write" |
| Expected behavior | Navigate to SCR-EDT-01 `/studio/story/{id}/chapter/{chapterId}` |
| Evidence | `chapter-manager-screen.tsx:197-199` |

| Field | SCR-CHM-01-A04 Change URL slug |
| --- | --- |
| Trigger | "Change URL slug" → dialog → "Save URL slug" |
| Preconditions | Live chapter |
| Expected behavior | Update slug; toast "URL slug changed."; close |
| State change | `chapters.slug` |
| Validation | `chapterSlugFormSchema`; unchanged → close without request |
| Error behavior | Taken → field; other → toast; dialog stays open |
| Navigation | — |
| Evidence | `components/rename-slug-dialog.tsx:44-64`; `chapter-management.test.tsx:428` |

| Field | SCR-CHM-01-A05 Archive |
| --- | --- |
| Trigger | "Archive" → confirm "Archive" |
| Preconditions | Owner/co-author; not archived |
| Expected behavior | `archive_chapter`; toast "Chapter archived."; badge "Archived"; button becomes "Unarchive" |
| Error behavior | Toast; dialog stays open |
| Evidence | `chapter-manager-screen.tsx:220-229,277-282`; `chapter-management.test.tsx:443` |

| Field | SCR-CHM-01-A06 Unarchive |
| --- | --- |
| Trigger | "Unarchive" (no confirm; disabled while running) |
| Expected behavior | `unarchive_chapter`; toast "Unarchived. The chapter is back to draft." |
| Evidence | `chapter-manager-screen.tsx:205-219` |

| Field | SCR-CHM-01-A07 Delete |
| --- | --- |
| Trigger | "Delete" → confirm "Delete" (destructive) |
| Preconditions | Owner/co-author |
| Expected behavior | `deleted_at` set; toast "Chapter deleted."; row moves last, struck through |
| Error behavior | Toast; dialog stays open |
| Evidence | `chapter-manager-screen.tsx:230-238,277-281`; `chapter-management.test.tsx:457` |

| Field | SCR-CHM-01-A08 Restore |
| --- | --- |
| Trigger | "Restore" on a deleted row (no confirm) |
| Preconditions | Owner/co-author |
| Expected behavior | `deleted_at` cleared; toast "Chapter restored." |
| Evidence | `chapter-manager-screen.tsx:158-174` |

| Field | SCR-CHM-01-A10 Reschedule / Publish now / Cancel schedule (outbox) |
| --- | --- |
| Trigger | C12 time button → picker → "Save new time"; "Publish now"; "Cancel schedule" → confirm "Cancel the scheduled publication?" |
| Preconditions | The publish panel's rules (SCR-EDT-01, shared `usePublishFlow`, `canPublish`, `canUnpublishChapter`): all roles may reschedule / publish now; only owner/co-author may cancel; one action at a time per chapter |
| Expected behavior | Reschedule → `schedule_chapter(id, new time, draft revision)`, toast "Publish time changed."; Publish now → `publish_chapter(id, draft revision)` (no confirmation, as in the panel), toast "Chapter published."; Cancel → `unpublish_chapter`, toast "Schedule cancelled; the chapter is back to draft." The revision is the saved draft's, read when the button is pressed. Lists reload (`["studio"]`, story and discovery keys) |
| State change | `chapters.status` / `scheduled_for`; a new version on publish |
| Validation | Picker: "Please choose a publish time." / "Choose a time in the future." (`scheduleInstant`), nothing sent |
| Error behavior | Inline alert in the card with the publish contract's message (PT409 "The draft or chapter status was changed elsewhere…", 42501, PT404, 22023, network); cancel dialog stays open on failure |
| Navigation | — |
| Evidence | `components/scheduled-chapters.tsx`, `scheduled-outbox.test.tsx` |

| Field | SCR-CHM-01-A09 Breadcrumb (story / Studio) / Retry |
| --- | --- |
| Trigger | Link; "Try again" in error state |
| Expected behavior | Navigate to SCR-STM-03 (editor sees read-only notice there); refetch story and chapters |
| Evidence | `chapter-manager-screen.tsx:51-62,123-128` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Skeleton until story and chapters load |
| Loading | Implemented | `Skeleton aria-busy`; add form `aria-busy` while adding |
| Empty | Implemented | C07 + add form |
| Populated | Implemented | C03 |
| Validation error | Implemented | Add form and rename dialog field messages |
| Request error | Implemented | Error state (load), toasts (actions) |
| Success | Implemented | Toasts |
| Disabled | Implemented | Arrows at ends / while reordering; restore/unarchive while running; add submit while adding |
| Unauthorized | Implemented | Guest redirect; no role → "Story not found"; editor → management actions hidden |
| Offline | Partial | Network toast; optimistic reorder rolled back |
| Unsaved changes | Not applicable | Actions apply immediately (add form text is lost on leave — minor) |
| Deleted story | Missing | No notice; add/move fail with "Chapter not found." (U-CHM-02) |
| Scheduled chapter | Implemented | Badge "Scheduled" in the list; time, reschedule, publish now and cancel in the outbox (C12) |

## E. Acceptance criteria
- SCR-CHM-01-AC01 Given chapters 1–3 and one deleted chapter, Then the deleted one is listed last with "Deleted" and only "Restore" (owner/co-author).
- SCR-CHM-01-AC02 Given I click "Move up" on chapter 3, Then the order shows 3,1,2 immediately And `reorder_chapters` receives the three live ids in that order.
- SCR-CHM-01-AC03 Given the server refuses the order, Then the previous order is restored And "The chapter list was changed elsewhere…" is shown.
- SCR-CHM-01-AC04 Given the first live chapter, Then "Move up" is disabled; given the last, "Move down" is disabled.
- SCR-CHM-01-AC05 Given I add "Chương 1", Then the slug defaults to `chuong-1` And after success the form is empty And a new id is used for the next add.
- SCR-CHM-01-AC06 Given an existing slug, When I add or rename to it, Then the slug field shows "This story already has a chapter with this URL slug.".
- SCR-CHM-01-AC07 Given I am an editor, Then I see Move, Write and Change URL slug, and no Archive, Unarchive, Delete or Restore.
- SCR-CHM-01-AC08 Given I archive a published chapter, Then readers no longer see it And it shows "Archived" with "Unarchive".
- SCR-CHM-01-AC09 Given I unarchive, Then the chapter is "Draft" (not published).
- SCR-CHM-01-AC10 Given I am not a member of the story, Then "Story not found" is shown.
- SCR-CHM-01-AC11 Given an editor calls the API to set `deleted_at` on a chapter, Then it is refused `[Proposed]` (F-CHM-01).
- SCR-CHM-01-AC12 Given scheduled chapters, Then the "Scheduled" outbox lists them soonest first with the relative and exact time in my locale and time zone (U-CHM-01).
- SCR-CHM-01-AC14 Given a scheduled chapter, When I save a new time at least a minute ahead, Then `schedule_chapter` receives it with the saved draft revision; a past time shows "Choose a time in the future." and sends nothing.
- SCR-CHM-01-AC15 Given a scheduled chapter, When I press "Publish now", Then `publish_chapter` is called with the saved draft revision; a draft changed meanwhile shows the conflict message in the card.
- SCR-CHM-01-AC16 Given I am an editor, Then the outbox offers reschedule and "Publish now" but not "Cancel schedule"; for an owner/co-author, cancelling needs confirmation.
- SCR-CHM-01-AC17 Given a live row, When I right-click it, long-press it or press Shift+F10 on one of its buttons, Then a menu with exactly that row's actions opens (first item focused from the keyboard) And choosing one does what its button does.
- SCR-CHM-01-AC18 Given I drag chapter 1 below chapter 3, Then the order shows 2,3,1 at once And `reorder_chapters` receives it; a refusal puts the old order back with the stale message (as AC02/AC03).
- SCR-CHM-01-AC19 Given I select three chapters and press Archive (n), Then after the confirmation `archive_chapter` is called once per applicable chapter, one after the other; chapters that failed stay selected with "Not changed: <reason>" on their row And the toast says how many were done and how many failed. Unarchive and Restore run without a confirmation, like their row buttons.
- SCR-CHM-01-AC20 Given I am an editor, Then there are no checkboxes and no bulk dock.
- SCR-CHM-01-AC13 Given the story is deleted, Then a notice is shown and add/reorder are disabled `[Proposed]` (U-CHM-02).

## F. Findings referenced
F-CHM-01, F-STM-04, F-CHM-03, U-CHM-01, U-CHM-02, U-CHM-03, U-STM-05.

## G. Open questions
Q-TEAM-02.

## Batch 4 · authoring4
Parts tree (batch 4, Lucian 102): below the chapter list a "Parts" section shows the story as a tree (TreeFolder per part run, empty parts after), a part picker per chapter, add / rename / delete part. BR-CHM-016. Rollback: see the top of `20261106040000_story_parts.sql`.
