# SCR-LIB-01 — Library

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-LIB-01` |
| Business domain | [D-LIBRARY Library](../../overview.md) |
| Business object | [OBJ-LIB](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Library (Reading / Saved / Following / Lists) |
| Route | `/library` |
| Route files | `apps/web/src/app/(main)/library/page.tsx` (`requireUser("/library")`, title "Thư viện", `noindex`), `apps/web/src/app/(main)/library/library-view.tsx` (passes `coverUrlFor`) |
| Screen component | `packages/features/src/library/screens/library-screen.tsx` (Lists tab: `packages/features/src/lists/components/my-lists.tsx`, OBJ-LIST) |
| Roles | Signed-in reader. Guest → `/login?next=%2Flibrary` |
| Navigation entry | Bottom nav "Library" (mobile, `packages/features/src/shell/components/main-shell.tsx:15`), user menu "Library" (`packages/features/src/shell/components/user-menu.tsx:63`), "Back to library" on a list page |
| Workflows | WF-LIB-03, WF-LIB-04, WF-LIB-05, WF-LIB-06; WF-LIST-01 (Lists tab) |
| Rules | BR-LIB-006 … BR-LIB-012; BR-LIST-010 |

## B. Components

| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-LIB-01-C01 | Page header | "Library" / "Stories you're reading, have saved and are following." | `library-screen.tsx:59` |
| SCR-LIB-01-C02 | Tabs | `TabsList` "Library sections": Reading, Saved, Following, Lists; default Reading; state not in URL | `library-screen.tsx:55-84` |
| SCR-LIB-01-C03 | Story grid | `ul` "<Tab> stories", 2/3/4 columns, `StoryCard` per entry | `library-screen.tsx:133-148`, `:197` |
| SCR-LIB-01-C04 | Entry actions | "Continue with chapter N" (Reading, primary), "Open story" (Saved/Following, outline), remove button (ghost), time line | `library-screen.tsx:207-222` |
| SCR-LIB-01-C05 | Unavailable placeholder | Dashed `role="note"` card "Story no longer available" | `library-screen.tsx:198-205` |
| SCR-LIB-01-C06 | Skeleton | 4 cover-shaped skeletons `aria-busy` | `library-screen.tsx:119-126` |
| SCR-LIB-01-C07 | Empty state | Per tab icon/title/description | `library-screen.tsx:130-132`, `strings.en.ts:7-17` |
| SCR-LIB-01-C08 | Error state | "Couldn't load your library" + "Try again" | `library-screen.tsx:109-117` |
| SCR-LIB-01-C09 | My lists (Lists tab) | See [SCR-LIST-01 §B](../../reading-lists/screens/reading-list.md#b-components) component C08 | `my-lists.tsx` |
| SCR-LIB-01-C10 | Reading streak chip (header action, batch 4 habits4) | Flame + "N days · read/goal today", link to `/me` named "N-day streak, read of goal chapters today. See your reading habits"; hidden until the habits load and on an error (BR-HAB-002, BR-HAB-003) | `packages/features/src/reading-habits/screens/reading-streak-chip.tsx` |

## C. User actions & system responses

| Field | SCR-LIB-01-A01 Switch tab |
| --- | --- |
| Trigger | Tab click / arrow keys (Radix tabs) |
| Preconditions | Signed in |
| Expected behavior | Tab content mounts and loads fresh data |
| State change | Local `tab` state |
| Validation | — |
| Error behavior | Per-tab ErrorState |
| Navigation | None (URL unchanged) |
| Evidence | `library-screen.tsx:60`, `use-library.ts:13-25` |

| Field | SCR-LIB-01-A02 Continue reading |
| --- | --- |
| Trigger | "Continue with chapter N" |
| Preconditions | Story available and current chapter readable |
| Expected behavior | Opens the chapter |
| State change | — |
| Validation | — |
| Error behavior | Reader not-found if it became unreadable meanwhile |
| Navigation | `/story/{id}/{slug}/{chapterSlug}` |
| Evidence | `library-screen.tsx:208-212`, `model/library.ts:56` |

| Field | SCR-LIB-01-A03 Open story |
| --- | --- |
| Trigger | "Open story" or the story card |
| Preconditions | Story available |
| Expected behavior | Story page opens |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/story/{id}/{slug}` |
| Evidence | `library-screen.tsx:213-217` |

| Field | SCR-LIB-01-A04 Remove from tab |
| --- | --- |
| Trigger | "Remove from reading" / "Unsave" / "Unfollow" |
| Preconditions | — |
| Expected behavior | Row removed; toast; lists and story page state refresh |
| State change | `user_story_progress` / `story_saves` / `story_follows` row deleted |
| Validation | — |
| Error behavior | Error toast; entry remains |
| Navigation | None |
| Evidence | `library-screen.tsx:166-179`, `use-library.ts:57-79` |

| Field | SCR-LIB-01-A05 Retry |
| --- | --- |
| Trigger | "Try again" |
| Preconditions | Error |
| Expected behavior | Refetch that tab |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | None |
| Evidence | `library-screen.tsx:115` |

| Field | SCR-LIB-01-A06 Create / open a reading list (Lists tab) |
| --- | --- |
| Trigger | "New list" / a list row |
| Preconditions | — |
| Expected behavior | See WF-LIST-01, SCR-LIST-01 |
| State change | — |
| Validation | BR-LIST-003 |
| Error behavior | BR-LIST-013 |
| Navigation | `/lists/{id}` |
| Evidence | `my-lists.tsx:37-100` |

### C.x Browse interactions (Lucian batch 2 · browse)

- Tabs use the underline style; on touch the shelf can be swiped sideways to switch tabs (Lucian 048); the tab row scrolls on narrow screens instead of the page.
- Saved and Following: a story can be swiped left on touch to remove it (Lucian 071); it disappears at once and the same API runs as the remove button. After a removal from either tab (swipe or button) the toast offers **Undo**, which saves / follows again through `set_story_save` / `set_story_follow` (the saved/follow time becomes now). Reading has no swipe and no undo: removing deletes the progress pointer, which cannot be restored as it was.
- Cards have the shared behaviours (cover transition, long-press quick look).

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Server guard; queries idle until user known — `use-library.ts:22`, `library.test.tsx:214` |
| Loading | Implemented | Skeleton grid |
| Empty | Implemented | Per tab — `strings.en.ts:7-17` |
| Populated | Implemented | Grid of up to 50 |
| Validation error | Not applicable | — |
| Request error | Implemented | ErrorState per tab; toast on remove failure |
| Success | Implemented | Remove toasts |
| Disabled | Implemented | Remove button disabled while pending (per entry) |
| Unauthorized | Implemented | Proxy + `requireUser` redirect |
| Offline | Implemented (generic) | Network message |
| Unsaved changes | Not applicable | — |
| Unavailable item | Implemented | Placeholder with remove only |
| Pagination > 50 | Missing | F-LIB-01 |

## E. Acceptance criteria

- SCR-LIB-01-AC01 Given a guest, when they open `/library`, then they are redirected to `/login?next=%2Flibrary`.
- SCR-LIB-01-AC02 Given I read stories A then B, when I open the library, then "Reading" lists B before A, each with "Continue with chapter N" linking to my current chapter.
- SCR-LIB-01-AC03 Given I open the "Saved" tab for the first time, when it loads, then saves are ordered by save time and each has "Open story"; the Following tab is not requested until opened.
- SCR-LIB-01-AC04 Given a saved story became private, when I open "Saved", then a "Story no longer available" card is shown with "Unsave", and pressing it removes the entry.
- SCR-LIB-01-AC05 Given I press "Unfollow" in the library, when it succeeds, then the toast "Unfollowed." shows, the entry disappears and the story page shows "Follow" with the follower count decreased.
- SCR-LIB-01-AC06 Given I press "Remove from reading", when it succeeds, then only my progress row for that story is deleted and my save/follow are unchanged.
- SCR-LIB-01-AC07 Given one tab fails to load, when I switch to another, then the other loads normally.
- SCR-LIB-01-AC08 Given an empty tab, when it loads, then its empty text is shown (e.g. "No saved stories yet").
- SCR-LIB-01-AC09 Given the language is English, when entries render, then the time line reads "Read 2 hours ago" etc. in English.
- SCR-LIB-01-AC10 [Proposed] Given more than 50 entries in a tab, when I reach the end, then I can load more (F-LIB-01).
- SCR-LIB-01-AC11 [Proposed] Given I open `/library?tab=lists` (or come back from a list page), when the page loads, then the Lists tab is selected (U-LIB-01).
- SCR-LIB-01-AC12 [Proposed] Given I remove an entry by mistake, when the toast shows, then it offers "Undo" (U-LIB-02).
- SCR-LIB-01-AC13 Given I read 2 chapters today with a goal of 3 and a 4-day streak, when the library loads, then the header chip reads "4 days · 2/3 today" and opens `/me` (BR-HAB-002/003).

## F. Findings referenced

F-LIB-01, U-LIB-01, U-LIB-02, U-LIB-03 (reported by the analysis run; to be merged into `audits/`).

## G. Open questions

- Q-LIB-01 — Should suspended accounts be able to follow/save, and should they count as story followers (author followers already exclude them)?
- Q-LIB-02 — Should "Remove from reading" also clear per-chapter progress, or only hide the story from the tab (current)?
