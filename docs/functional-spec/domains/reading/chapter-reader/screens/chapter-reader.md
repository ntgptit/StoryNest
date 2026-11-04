# SCR-READ-01 — Chapter reader

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-READ-01` |
| Name | Chapter reader |
| Route | `/story/[id]/[slug]/[chapterSlug]` (public) |
| Route file | `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx` (server: metadata, 404/308, JSON-LD, hydrate); `.../[chapterSlug]/reader-view.tsx` (client wrapper, image URL resolver); `.../[chapterSlug]/opengraph-image.tsx` |
| Server loader | `apps/web/src/lib/story/load-chapter.ts` (+ `load-story.ts`) |
| Screen component | `packages/features/src/reader/screens/reader-screen.tsx` (`ReaderScreen`) |
| Pre-paint script | `buildReaderBootstrapScript(CHAPTER_PATH_PATTERN)` in `apps/web/src/app/layout.tsx:37` |
| Roles | Guest, Member, Story team, Moderator, Crawler |
| Business rules | [BR-READ-001…018](../business-rules.md), [BR-PROG-*](../../reading-progress/business-rules.md), [BR-VOTE-*](../../community/vote/business-rules.md), `BR-CMT-*`, `BR-MOD-*`, `BR-MAT-*` |
| Workflows | [WF-READ-01…06](../workflows.md), [WF-PROG-01, 02, 04](../../reading-progress/workflows.md), [WF-VOTE-01, 02](../../community/vote/workflows.md) |
| Entry points | SCR-STORY-01 (CTA, chapter list), TOC / prev / next, library "Continue with chapter N" (SCR-LIB-01), notifications, external links |
| Layout | Main shell. A sticky top toolbar (h-12, translucent) with a 2px progress bar, and a centred article column `max-width: 66ch` with the reader font, size and line height |

## B. Components

| ID | Component | Description | Source |
| --- | --- | --- | --- |
| SCR-READ-01-C01 | Adult gate | Wraps everything when the story is mature (`BR-MAT-*`) | `reader-screen.tsx:71` |
| SCR-READ-01-C02 | Reading tracker | Invisible. Restores and saves position (members) and records the read (everyone) | `reader/components/reading-tracker.tsx`, `reader-screen.tsx:73` |
| SCR-READ-01-C03 | Back to story link | "←" + story title (truncated). Screen-reader text "Back to story" | `reader-screen.tsx:76-87` |
| SCR-READ-01-C04 | Display button + Reading options sheet | Right sheet: Font size (−/+, current size name in `<output aria-live>`), Line spacing, Font, Background as `aria-pressed` toggle groups | `reader/components/reader-settings-sheet.tsx` |
| SCR-READ-01-C05 | Contents button + TOC sheet | Right sheet listing published chapters, current one `aria-current="page"` | `reader/components/toc-sheet.tsx` |
| SCR-READ-01-C06 | Progress bar | `role="progressbar"` "Chapter reading progress", 0–100 of the **page** scroll | `packages/ui/src/widgets/reading-progress.tsx`, `reader-screen.tsx:93` |
| SCR-READ-01-C07 | Chapter header | "Chapter N" + h1 title | `reader-screen.tsx:97-100` |
| SCR-READ-01-C08 | Chapter blocks | Paragraph / heading (h2) / image / divider with anchors `b-{id}` and inline marks | `reader/components/reader-blocks.tsx`, `block-view.tsx`, `rich-text.tsx` |
| SCR-READ-01-C09 | Inline comment buttons | Small speech-bubble button + count at the end of each paragraph or heading. Opens a bottom sheet with that block's `CommentThread` (owned by OBJ-CMT, SCR-CMT-01) | `reader-blocks.tsx:40-77` |
| SCR-READ-01-C10 | End marker | "— End of chapter —" (`aria-hidden`) | `reader-screen.tsx:110-112` |
| SCR-READ-01-C11 | Vote button | Toggle + "N votes" (`aria-live`) ([BR-VOTE-*](../../community/vote/business-rules.md)) | `reader/components/vote-button.tsx` |
| SCR-READ-01-C12 | Report button | `ReportButton kind="chapter"` (`BR-MOD-*`) | `reader-screen.tsx:114-116` |
| SCR-READ-01-C13 | Comments section | `section#comments`, h2 + chapter-level `CommentThread` (SCR-CMT-01) | `reader-screen.tsx:117-124` |
| SCR-READ-01-C14 | Chapter nav | "Previous chapter" / "Next chapter" links with `rel`, or disabled placeholders | `reader/components/chapter-nav.tsx` |
| SCR-READ-01-C15 | Skeleton | Title + 6 lines, `aria-busy` | `reader-screen.tsx:132-142` |

## C. User actions & system responses

#### SCR-READ-01-A01 — Open a chapter
| Field | Value |
| --- | --- |
| Trigger | Navigate to the chapter URL |
| Preconditions | — |
| Expected behavior | WF-READ-01. Preferences applied before paint. Skeleton until story + chapter are known |
| State change | Members: `user_chapter_progress` + `user_story_progress` written on open. Everyone: read event after 10 s |
| Validation | UUID story id, non-empty slug (`reader.api.ts:23`) |
| Error behavior | Not readable → 404. Error → "Couldn't load the chapter" / "Check your connection and try again." + "Try again" |
| Navigation | Wrong story slug → 308 |
| Evidence | `[chapterSlug]/page.tsx:42-66`, `reader-screen.tsx:39-64` |

#### SCR-READ-01-A02 — Scroll / read
| Field | Value |
| --- | --- |
| Trigger | Scrolling |
| Preconditions | — |
| Expected behavior | The progress bar follows the page scroll (rAF-throttled). Members: position saved at most every 5 s and flushed on tab hide or leave (BR-PROG-006) |
| State change | Progress rows (members) |
| Validation | Server validates percent and block (BR-PROG-003) |
| Error behavior | Silent; retried on the next scroll |
| Navigation | — |
| Evidence | `reading-progress.tsx:14-52`, `use-reading-tracker.ts:65-100` |

#### SCR-READ-01-A03 — Go to next / previous chapter
| Field | Value |
| --- | --- |
| Trigger | C14 links (Tab + Enter works; no arrow-key shortcuts) |
| Preconditions | A neighbour exists |
| Expected behavior | Opens the neighbour in the published list (BR-READ-008) |
| State change | The last position of the current chapter is flushed |
| Validation | — |
| Error behavior | — |
| Navigation | → SCR-READ-01 (other chapter) |
| Evidence | `chapter-nav.tsx:22-45`, `reader.test.tsx:328` |

#### SCR-READ-01-A04 — Open the table of contents and jump
| Field | Value |
| --- | --- |
| Trigger | "Contents" (C05), then a chapter |
| Preconditions | Story loaded |
| Expected behavior | The sheet opens with "Contents" / "Choose a chapter to read." The selected chapter opens |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | → SCR-READ-01 |
| Evidence | `toc-sheet.tsx:28-63` |

#### SCR-READ-01-A05 — Back to story
| Field | Value |
| --- | --- |
| Trigger | C03 |
| Preconditions | Story loaded |
| Expected behavior | Client navigation to the story page |
| State change | Tracker flush |
| Validation | — |
| Error behavior | — |
| Navigation | → SCR-STORY-01 |
| Evidence | `reader-screen.tsx:76-87` |

#### SCR-READ-01-A06 — Change font size
| Field | Value |
| --- | --- |
| Trigger | "Decrease font size" / "Increase font size" in C04 |
| Preconditions | Not at the end of the scale |
| Expected behavior | One step (s ↔ m ↔ l ↔ xl), applied at once. The size name is announced |
| State change | Device copy, plus account copy after 1.5 s (members) |
| Validation | Closed list |
| Error behavior | — |
| Navigation | — |
| Evidence | `reader-settings-sheet.tsx:79-106`, `preferences.test.tsx:197` |

#### SCR-READ-01-A07 — Change line spacing / font / background
| Field | Value |
| --- | --- |
| Trigger | Toggle buttons in C04 ("Compact/Normal/Relaxed", "Sans-serif/Serif", "Match app theme/Light/Sepia/Dark") |
| Preconditions | — |
| Expected behavior | Applied at once to the reader (the background applies to the whole page). The pressed state updates |
| State change | As A06 |
| Validation | Closed list |
| Error behavior | — |
| Navigation | — |
| Evidence | `reader-settings-sheet.tsx:107-127`, `preferences.test.tsx:167` |

#### SCR-READ-01-A08 — Vote / unvote
| Field | Value |
| --- | --- |
| Trigger | C11 |
| Preconditions | Signed in. Otherwise "Sign in to vote" → `/login?next=<chapter path>` |
| Expected behavior | [WF-VOTE-01](../../community/vote/workflows.md#wf-vote-01--vote-or-unvote-a-chapter) |
| State change | `chapter_votes`, counters |
| Validation | Server: active account + chapter readable |
| Error behavior | Rollback + toast "You can't vote for this chapter." / "No connection…" / "Couldn't vote. Please try again." |
| Navigation | Guest → login |
| Evidence | `vote-button.tsx:16-47` |

#### SCR-READ-01-A09 — Open paragraph comments / chapter comments
| Field | Value |
| --- | --- |
| Trigger | C09 bubble at the end of a paragraph, or scrolling to C13 |
| Preconditions | — |
| Expected behavior | Bottom sheet with the block's excerpt (120 chars) and its thread, or the chapter thread inline. Behaviour: SCR-CMT-01 / `BR-CMT-*` |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `reader-blocks.tsx:12-77`, `reader-screen.tsx:117-124` |

#### SCR-READ-01-A10 — Report the chapter
| Field | Value |
| --- | --- |
| Trigger | C12 |
| Preconditions | `BR-MOD-*` |
| Expected behavior | Report dialog (`BR-MOD-*`) |
| State change | `content_reports` |
| Validation | Server refuses self-reports (also shown to the author: F-STORY-01) |
| Error behavior | `BR-MOD-*` |
| Navigation | — |
| Evidence | `reader-screen.tsx:115` |

#### SCR-READ-01-A11 — Retry after a load error
| Field | Value |
| --- | --- |
| Trigger | "Try again" |
| Preconditions | Chapter or story query errored |
| Expected behavior | Refetches **both** the chapter and the story |
| State change | — |
| Validation | — |
| Error behavior | Stays in the error state |
| Navigation | — |
| Evidence | `reader-screen.tsx:47-58`, `reader.test.tsx:371` |

#### SCR-READ-01-A12 — Confirm age (mature story)
| Field | Value |
| --- | --- |
| Trigger | Gate buttons |
| Preconditions | Mature story, not opted in |
| Expected behavior | As SCR-STORY-01-A10 (`BR-MAT-*`) |
| State change | Device adult-content choice |
| Validation | — |
| Error behavior | — |
| Navigation | "Go back" → history back |
| Evidence | `adult-gate.tsx:17-34`, `reader.test.tsx:299` |

#### SCR-READ-01-A13 — Open a deep link
| Field | Value |
| --- | --- |
| Trigger | URL with `#b-{blockId}` or `#comments` |
| Preconditions | — |
| Expected behavior | Browser scrolls to the anchor. Saved position is not restored |
| State change | — |
| Validation | — |
| Error behavior | Unknown anchor → top of the chapter |
| Navigation | — |
| Evidence | `use-reading-tracker.ts:69-70`, `block-view.tsx:16` |

**Keyboard**: no custom shortcuts are implemented. Everything is reachable with Tab. The sheets are Radix dialogs (Esc closes them, focus is trapped). Disabled nav placeholders are not focusable. Recommended: ←/→ for previous/next (U-READ-01).

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | SSR HTML with content and preferences applied pre-paint (`layout.tsx:37`) |
| Loading | Implemented | `ReaderSkeleton` until **both** chapter and story are loaded (`reader-screen.tsx:46`). The vote button is hidden until its count is known |
| Empty | Implemented | "This chapter has no content yet." (`reader-screen.tsx:102-104`) |
| Populated | Implemented | Full layout (B) |
| Validation error | Not applicable | Preferences are closed lists. Comment and report forms belong to CMT/MOD |
| Request error | Implemented (partial) | Load: error state + "Try again". Vote: toast + rollback. Progress, read and preference sync errors are silent by design. **Missing**: a vote-state load error hides the vote button (U-STORY-01) |
| Success | Implemented | Vote state flips; preferences visibly apply. No toast for vote success (by design) |
| Disabled | Implemented | Vote button while pending; font-size buttons at the ends; nav placeholders at the first/last chapter |
| Unauthorized | Implemented | Hidden or unpublished → 404 "Chapter not found" + "The chapter doesn't exist, isn't published, or has been removed." Guest vote → login |
| Offline | Missing | No offline mode or cache. Network errors go to the error state; progress writes retry on the next push |
| Unsaved changes | Not applicable | Settings auto-save. Pending progress is flushed on hide/leave |
| Mature gate | Implemented | Gate instead of content |

## E. Acceptance criteria

| ID | Given / When / Then |
| --- | --- |
| SCR-READ-01-AC01 | **Given** a published chapter of a public story **When** a guest opens its URL **Then** the server returns 200 with "Chapter N", the title, all supported blocks in order, the end marker, vote count, comments and prev/next. |
| SCR-READ-01-AC02 | **Given** a chapter that is draft, scheduled, archived, deleted, or belongs to a private/draft/deleted story **When** a non-team visitor requests it **Then** HTTP 404. |
| SCR-READ-01-AC03 | **Given** the story slug in the URL is stale **Then** 308 to `/story/{id}/{currentSlug}/{chapterSlug}`. |
| SCR-READ-01-AC04 | **Given** any block **Then** its element has `id="b-{block_id}"`. **When** the URL has `#b-{id}` **Then** the page opens at that block and no saved position overrides it. |
| SCR-READ-01-AC05 | **Given** block text containing HTML-like characters **Then** it is rendered as text, never as markup. **Given** overlapping bold and italic ranges **Then** both apply to the overlap. |
| SCR-READ-01-AC06 | **Given** an unknown block type or an image without a storage key **Then** that block is skipped and the rest renders. |
| SCR-READ-01-AC07 | **Given** the first published chapter **Then** "Previous chapter" is a disabled placeholder. **Given** the last **Then** "Next chapter" is disabled. Gaps in `sort_order` do not create dead links. |
| SCR-READ-01-AC08 | **Given** the reader picks Sepia / Serif / Large **Then** the change applies immediately, survives a reload with no flash of the default theme, and is gone after leaving the reader. |
| SCR-READ-01-AC09 | **Given** a member with a saved account copy **When** they open a chapter on a new device **Then** the account settings replace the device settings. **Given** no account copy and a customised device **Then** the device settings are uploaded. |
| SCR-READ-01-AC10 | **Given** font size Extra large **Then** "Increase font size" is disabled. **Given** Small **Then** "Decrease font size" is disabled. |
| SCR-READ-01-AC11 | **Given** a mature story not confirmed on this device **Then** no chapter text is rendered (not even during loading) until the reader confirms 18+. |
| SCR-READ-01-AC12 | **Given** the chapter request fails **Then** "Couldn't load the chapter" with "Try again" is shown, and retry refetches the chapter and story. |
| SCR-READ-01-AC13 | **Given** a public, non-mature story **Then** the page has `Chapter` JSON-LD with `isPartOf` Book. **Given** unlisted or mature **Then** `noindex,nofollow` and no JSON-LD. |
| SCR-READ-01-AC14 [Proposed] | **Given** the reader reached the end of the chapter text **Then** a "Next chapter" control is visible right after "End of chapter", before vote and comments. **When** the user presses → (focus not in an input) **Then** the next chapter opens (U-READ-01). |
| SCR-READ-01-AC15 [Proposed] | **Given** an image block with author-provided alt text **Then** the `<img>` carries it as `alt` (U-READ-02). |
| SCR-READ-01-AC16 [Proposed] | **Given** a reader who scrolled to the end-of-chapter marker **Then** the progress bar shows 100 % and the chapter is saved as completed, whatever the length of the comment section (F-PROG-01). |

## F. Findings referenced

U-READ-01 (nav placement, no shortcuts), U-READ-02 (image alt), U-READ-03 (numbering gaps), F-PROG-01 (percent includes comments), F-STORY-01 (report shown to author), F-STORY-02 (unbounded TOC), F-STORY-03 (chapter slug rename breaks links), U-STORY-01 (vote button hidden on load error). Full text: agent `reading` findings, to be consolidated into `audits/`.

## G. Open questions

- Q-READ-01 — Published index vs `sort_order` for "Chapter N".
- Q-PROG-01 — Continue pointer = last opened or furthest chapter.
