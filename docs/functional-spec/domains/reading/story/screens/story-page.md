# SCR-STORY-01 — Story page

## A. Identification

| Field | Value |
| --- | --- |
| Screen ID | `SCR-STORY-01` |
| Business domain | [D-READING Reading](../../overview.md) |
| Business object | [OBJ-STORY](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Story page (public story detail) |
| Route | `/story/[id]/[slug]` (public; not guarded) |
| Route file | `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx` (server: metadata, 404/308, JSON-LD, hydrate); `apps/web/src/app/(main)/story/[id]/[slug]/story-view.tsx` (client wrapper); `apps/web/src/app/(main)/story/[id]/[slug]/opengraph-image.tsx` |
| Server loader | `apps/web/src/lib/story/load-story.ts` |
| Screen component | `packages/features/src/story/screens/story-screen.tsx` (`StoryScreen`) |
| Roles | Guest, Member, Story team (owner / co_author / editor), Moderator, Crawler |
| Business rules | [BR-STORY-001…016](../business-rules.md), [BR-PROG-008](../../reading-progress/business-rules.md#br-prog-008--continue-reading-target) |
| Workflows | [WF-STORY-01…05](../workflows.md), [WF-PROG-03](../../reading-progress/workflows.md#wf-prog-03--continue-reading) |
| Entry points | Story cards (home, search, rankings, author, recommendations), library, reading lists, notifications, reader "Back to story" link, external links |
| Layout | Inside the main shell (header + mobile bottom nav). `article` with a 2-column header on ≥ sm (cover 12rem + facts), one column on mobile (cover 10rem, centred) |

## B. Components

| ID | Component | Description | Source |
| --- | --- | --- | --- |
| SCR-STORY-01-C01 | Adult gate (SCR-MAT-01) | Wraps the whole page when `isMature`: "Mature story" + "Go back" / "I'm 18 or older, continue" (`BR-MAT-009`) | `story-screen.tsx:76`, `adult-content/components/adult-gate.tsx` |
| SCR-STORY-01-C02 | Cover | `StoryCover`, eager-loaded, placeholder when there is no cover | `story-screen.tsx:79` |
| SCR-STORY-01-C03 | Title (h1) | Story title | `story-screen.tsx:82` |
| SCR-STORY-01-C04 | Author line | "Author" + display name linking to `/author/{username}`, or plain "Anonymous author" | `story-screen.tsx:83-95` |
| SCR-STORY-01-C05 | Badges | Category (secondary), status (outline), "18+" (destructive) | `story-screen.tsx:97-101` |
| SCR-STORY-01-C06 | Stats row | Reads / Votes / Comments / Followers (`StatPill`, locale-formatted) | `story-screen.tsx:103-113` |
| SCR-STORY-01-C07 | Primary CTA | "Start reading" or "Continue reading · Chapter N" (large button-styled link) | `story-screen.tsx:115-121` |
| SCR-STORY-01-C08 | Library actions | `StoryActions`: Follow / Following, Save to library / Saved (toggle buttons with `aria-pressed`), plus `AddToListButton`. Group label = "Sign in to follow or save stories" | `story/components/story-actions.tsx` (rules `BR-LIB-*`, `BR-LIST-*`) |
| SCR-STORY-01-C09 | Report button | `ReportButton kind="story"`, opens the flag dialog SCR-MOD-02 (`BR-MOD-004…006`) | `story-screen.tsx:129-130` |
| SCR-STORY-01-C10 | Synopsis | h2 "Synopsis". Text keeps line breaks; empty → "The author hasn't written a synopsis yet." Clamped to 6 lines with a fade and "Show more / Show less" (`ExpandableText`, Lucian #288): the toggle appears only when the text really overflows (measured), carries `aria-expanded`/`aria-controls`, and the full text stays in the DOM (SEO) | `story-screen.tsx`, `ui/widgets/expandable-text.tsx` |
| SCR-STORY-01-C11 | Tag list | `#tag` badges linking to the home feed filtered by tag; aria-label "View stories tagged {name}" (`BR-TAX-*`) | `story-screen.tsx:125-135` |
| SCR-STORY-01-C12 | Chapter list | h2 "Chapters" + "N chapters". Ordered list of rows: "Chapter N", title (truncated), "N words". A long story (more than 50 chapters, [BR-READ-022](../../chapter-reader/business-rules.md#br-read-022--long-stories-chapter-ranges)) shows the rows in an accordion of ranges ("Chapters 1–50", "50 chapters"; one open at a time; headers are buttons with `aria-expanded`, ↑/↓/Home/End move between them; the continue chapter's range opens first). The bottom-sheet TOC of C17 gets a scrub rail for such stories | `story-screen.tsx` (`ChapterList`, `ChapterRangeList`), `ui/widgets/accordion-list.tsx` |
| SCR-STORY-01-C13 | Similar stories | `SimilarStories` ("you may also like" with a reason) (`BR-REC-*`) | `story-screen.tsx:186` |
| SCR-STORY-01-C14 | Skeletons | Page skeleton (cover + 3 lines) and chapter-list skeleton (3 rows), `aria-busy` | `story-screen.tsx:148-153,192-203` |
| SCR-STORY-01-C15 | JSON-LD + metadata | `Book` structured data, canonical, robots, OG (server only) | `page.tsx:18-39,55-63` |
| SCR-STORY-01-C16 | Share button | "Share" next to Report; not shown for a private story. Opens the share dialog (`ShareDialog`, Lucian #254): the absolute story link (canonical origin via `PlatformAdapter.shareOrigin`) in a read-only field, "Copy" that turns into a check (`CopyLinkButton`, Lucian #008, announced politely), and "Share with another app" where `navigator.share` exists | `story-screen.tsx`, `features/share/components/share-button.tsx` |
| SCR-STORY-01-C17 | Sticky reading bar | Once C07 has scrolled up out of view a compact bar rises at the bottom (above the mobile bottom nav, safe-area aware; `StickyActionBar`, Lucian #221): title, "Chapter N · title", a "Chapters" button that opens the TOC as a bottom sheet (`TocSheet`, continue chapter marked `aria-current="step"`) and the same Start/Continue link. It slips away when C07 is visible again; while hidden it is `inert` and `aria-hidden`. Not shown without published chapters | `story-screen.tsx`, `ui/widgets/sticky-action-bar.tsx`, `reader/components/toc-sheet.tsx` |
| SCR-STORY-01-C18 | Rating (Lucian 016, batch 4 · community4) | Under the library actions: "Rating", the average and count, and for a signed-in reader a five-star slider (preview on hover, newly lit stars pop with a sparkle, arrows/Home/End/0–5, word for the score); disabled with a hint until a chapter was read; guests get a sign-in link (BR-STORY-017) | `story-screen.tsx`, `components/story-rating.tsx`, `ui/widgets/star-rating.tsx` |

## C. User actions & system responses

#### SCR-STORY-01-A01 — Open the page
| Field | Value |
| --- | --- |
| Trigger | Navigate to `/story/{id}/{slug}` |
| Preconditions | — |
| Expected behavior | SSR with story + chapters prefetched, then hydrate. See WF-STORY-01. |
| State change | None |
| Validation | `id` must be a UUID, otherwise 404 without a query (`story.api.ts:27`) |
| Error behavior | Hidden / missing → HTTP 404. Load error → client error state with retry |
| Navigation | Wrong slug → 308 to canonical (`page.tsx:50`) |
| Evidence | `page.tsx:45-68`, `load-story.ts:24-34`, `page.test.tsx:84-89` |

#### SCR-STORY-01-A02 — Start / continue reading
| Field | Value |
| --- | --- |
| Trigger | Click C07 |
| Preconditions | ≥ 1 published chapter |
| Expected behavior | Opens the continue target, or else the first chapter (BR-STORY-012) |
| State change | None |
| Validation | — |
| Error behavior | — |
| Navigation | → SCR-READ-01 `/story/{id}/{slug}/{chapterSlug}` |
| Evidence | `story-screen.tsx:60-66,105-109`, `story.test.tsx:266,354-371` |

#### SCR-STORY-01-A03 — Open a chapter from the list
| Field | Value |
| --- | --- |
| Trigger | Click a C12 row (keyboard: Tab + Enter; visible focus ring) |
| Preconditions | List loaded |
| Expected behavior | Opens that chapter |
| State change | None |
| Validation | — |
| Error behavior | — |
| Navigation | → SCR-READ-01 |
| Evidence | `story-screen.tsx:187-206` |

#### SCR-STORY-01-A04 — Follow / unfollow
| Field | Value |
| --- | --- |
| Trigger | Click Follow / Following (C08) |
| Preconditions | Signed in (otherwise → `/login?next=…`) |
| Expected behavior | Optimistic toggle. The follower count in C06 moves ±1, then takes the server's count. The button is disabled while pending. Toast "Followed. You'll be notified when there are new chapters." / "Unfollowed." |
| State change | `story_follows` row via `set_story_follow` (`BR-LIB-002`, `BR-LIB-005`) |
| Validation | Server: `can_read_story` |
| Error behavior | Rollback + toast "You can't follow or save this story." (forbidden) / "No connection. Check your network and try again." / "Couldn't complete that. Please try again." |
| Navigation | Guest → `/login?next=<path>` |
| Evidence | `story-actions.tsx:30-47`, `use-story-library.ts:32-73`, `library.test.tsx:145-256` |

#### SCR-STORY-01-A05 — Save / remove from library
| Field | Value |
| --- | --- |
| Trigger | Click Save to library / Saved (C08) |
| Preconditions | Signed in |
| Expected behavior | Optimistic toggle; toast "Saved to your library." / "Removed from your library." The follower count does not move |
| State change | `story_saves` via `set_story_save` (`BR-LIB-003`, `BR-LIB-005`) |
| Validation | Server: `can_read_story` |
| Error behavior | Rollback + toast by kind (as A04) |
| Navigation | Guest → `/login?next=<path>` |
| Evidence | `story-actions.tsx:48-65`, `use-story-library.ts:75-94` |

#### SCR-STORY-01-A06 — Add to reading list
| Field | Value |
| --- | --- |
| Trigger | `AddToListButton` (C08) |
| Preconditions | Owned by OBJ-LIST |
| Expected behavior | See `BR-LIST-*` / the reading-lists screen spec |
| State change | `reading_list_items` |
| Validation | `BR-LIST-*` |
| Error behavior | `BR-LIST-*` |
| Navigation | — |
| Evidence | `story-actions.tsx:66` |

#### SCR-STORY-01-A07 — Report the story
| Field | Value |
| --- | --- |
| Trigger | `ReportButton` (C09) |
| Preconditions | Owned by OBJ-MOD |
| Expected behavior | Report dialog (`BR-MOD-004…006`) |
| State change | `content_reports` via `submit_report` |
| Validation | `BR-MOD-004…006`. Server refuses self-reports (22023) |
| Error behavior | Shown to the author too, who then gets "You can't report your own content, or the information isn't valid." (F-STORY-01) |
| Navigation | — |
| Evidence | `story-screen.tsx:129`, `moderation/components/report-button.tsx:40-56`, `supabase/migrations/20261104002200_abuse_limits.sql:164` |

#### SCR-STORY-01-A08 — Open author / tag / similar story
| Field | Value |
| --- | --- |
| Trigger | Click author name (C04), a tag (C11) or a similar-story card (C13) |
| Preconditions | Author link only when a username exists |
| Expected behavior | Client navigation |
| State change | None |
| Validation | — |
| Error behavior | — |
| Navigation | `/author/{username}` (OBJ-AUTHOR), home feed filtered by tag (`homeHref({tagSlug})`, OBJ-TAX), another SCR-STORY-01 |
| Evidence | `story-screen.tsx:86-94,153,210` |

#### SCR-STORY-01-A09 — Retry after error
| Field | Value |
| --- | --- |
| Trigger | "Try again" in the page error state, or in the chapter-list error |
| Preconditions | The corresponding query failed |
| Expected behavior | Refetches only the failed query (story or chapters) |
| State change | None |
| Validation | — |
| Error behavior | Stays in the error state if it fails again |
| Navigation | — |
| Evidence | `story-screen.tsx:51-60,178-183`, `story.test.tsx:312` |

#### SCR-STORY-01-A11 — Share the story
| Field | Value |
| --- | --- |
| Trigger | "Share" (C16), then "Copy" or "Share with another app" |
| Preconditions | Story is not private |
| Expected behavior | Dialog with the absolute link `https://<site>/story/{id}/{slug}`. Copy puts it on the clipboard (Clipboard API, fallback to the copy command); the button shows a check and "Copied" for 1.8 s. The share sheet gets title + link |
| State change | None |
| Validation | — |
| Error behavior | Clipboard blocked → toast "Couldn't copy. Select the link and copy it yourself." (the field selects itself on focus). Share sheet dismissed → nothing; other failure → toast |
| Navigation | — |
| Evidence | `share-button.tsx`, `story.test.tsx` (StoryScreen sharing), `share/share.test.tsx` |

#### SCR-STORY-01-A12 — Read from the sticky bar
| Field | Value |
| --- | --- |
| Trigger | Scroll past C07, then press the bar's Start/Continue link or "Chapters" |
| Preconditions | ≥ 1 published chapter; IntersectionObserver available (otherwise the bar never shows) |
| Expected behavior | Same target as A02; "Chapters" opens the chapter list as a bottom sheet |
| State change | None |
| Validation | — |
| Error behavior | — |
| Navigation | → SCR-READ-01 |
| Evidence | `story.test.tsx` (sticky reading bar), `ui/widgets/share-widgets.test.tsx` |

#### SCR-STORY-01-A10 — Confirm age (mature story)
| Field | Value |
| --- | --- |
| Trigger | "I'm 18 or older, continue" / "Go back" in C01 |
| Preconditions | `isMature` and the reader has not chosen to show adult content |
| Expected behavior | Confirm → the page renders (the choice is stored per device, `BR-MAT-009`). Go back → `navigation.back()` |
| State change | Device-local adult-content preference |
| Validation | — |
| Error behavior | — |
| Navigation | Back → previous page |
| Evidence | `adult-gate.tsx:17-34`, `story.test.tsx:209` |

## D. UI states

| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | SSR HTML with hydrated data; JSON-LD when indexable (`page.tsx:53-67`) |
| Loading | Implemented | `StorySkeleton` when the story is pending; chapter-list skeleton (`story-screen.tsx:50,172-177`). Follow/Save, Vote count and CTA "continue" appear only after their queries resolve (no skeleton) |
| Empty | Implemented | No published chapters → "This story has no published chapters yet." and no CTA. No synopsis → "The author hasn't written a synopsis yet." No tags → tag list omitted (`story-screen.tsx:138-139,149,184-185`) |
| Populated | Implemented | Full layout (B) |
| Validation error | Not applicable | No input on this screen (dialogs belong to LIST/MOD) |
| Request error | Implemented | Story: "Couldn't load the story" / "Check your connection and try again." + "Try again". Chapters: "Couldn't load the chapter list" + "Try again", with the story still shown. Mutations: toast + rollback. **Missing**: a library-state load error hides the C08 buttons silently (U-STORY-01) |
| Success | Implemented | Toasts for follow/unfollow/save/remove (`story-actions.tsx:40,58`) |
| Disabled | Implemented | Follow/Save disabled while pending (`story-actions.tsx:36,54`) |
| Unauthorized | Implemented | Hidden story → 404 / "Story not found" + "This story doesn't exist, was taken down or is private." Guest actions → login redirect |
| Offline | Missing | No offline detection. Network failures go to the request-error state or a "No connection" toast |
| Unsaved changes | Not applicable | — |
| Mature gate | Implemented | C01 replaces the whole page until confirmed |

## E. Acceptance criteria

| ID | Given / When / Then |
| --- | --- |
| SCR-STORY-01-AC01 | **Given** a public, non-draft story with published chapters **When** a guest opens `/story/{id}/{slug}` **Then** the server returns 200 with title, author, badges, stats, synopsis, tags, the chapter list in `sort_order` and a "Start reading" link to the first chapter. |
| SCR-STORY-01-AC02 | **Given** the slug in the URL differs from the story's slug **When** the page is requested **Then** the response is a 308 to `/story/{id}/{currentSlug}`. |
| SCR-STORY-01-AC03 | **Given** a private, draft or soft-deleted story, or a non-UUID id **When** a non-team visitor requests it **Then** the response is HTTP 404 and nothing reveals that the story exists. |
| SCR-STORY-01-AC04 | **Given** a private or draft story **When** its owner, co-author, editor or a moderator opens it **Then** the page renders with `noindex,nofollow` and no JSON-LD. |
| SCR-STORY-01-AC05 | **Given** a soft-deleted story **When** its owner opens the public URL **Then** the page is a 404. |
| SCR-STORY-01-AC06 | **Given** an unlisted story **When** anyone opens its link **Then** it renders with `noindex,nofollow` and no JSON-LD. It is absent from every discovery list (BR-STORY-007). |
| SCR-STORY-01-AC07 | **Given** a mature story and a reader who has not opted in **When** the page opens **Then** only the adult gate is shown. **When** they confirm **Then** the page appears. The story is never indexed. |
| SCR-STORY-01-AC08 | **Given** a signed-in reader whose current chapter N is unfinished **When** the page opens **Then** the CTA reads "Continue reading · Chapter N" and opens chapter N. **Given** chapter N is finished and a next chapter exists **Then** the CTA opens the next chapter. |
| SCR-STORY-01-AC09 | **Given** a story with no published chapters **Then** "This story has no published chapters yet." is shown and there is no CTA. |
| SCR-STORY-01-AC10 | **Given** a guest **When** they press Follow or Save to library **Then** they are sent to `/login?next=<this page>` and no request is made. |
| SCR-STORY-01-AC11 | **Given** a member **When** they press Follow **Then** the button and follower count change at once, the button is disabled until the server answers, the count then equals the server's value, and the toast confirms. **When** the server refuses **Then** both revert and an error toast explains why. |
| SCR-STORY-01-AC12 | **Given** the story query fails **Then** "Couldn't load the story" with "Try again" is shown, and retry refetches. **Given** only the chapter list fails **Then** the story stays visible and the chapters section shows its own retry. |
| SCR-STORY-01-AC13 | **Given** the owner's account is hidden **Then** the author line reads "Anonymous author" without a link. |
| SCR-STORY-01-AC18 | **Given** a public or unlisted story **When** the reader presses Share **Then** the dialog shows the story's absolute canonical link and Copy turns into a check. A private story has no Share button. |
| SCR-STORY-01-AC19 | **Given** a story with published chapters **When** the Start/Continue button scrolls up out of view **Then** a bar with the same action and a chapter picker rises above the bottom nav, and it hides again once the button is back on screen. Nothing animates on page load. |
| SCR-STORY-01-AC20 | **Given** a synopsis longer than 6 lines **Then** it is clamped with "Show more"; a shorter one shows no toggle; the full text is always in the HTML. |
| SCR-STORY-01-AC14 [Proposed] | **Given** the signed-in user owns the story **Then** no Report button is shown (F-STORY-01). |
| SCR-STORY-01-AC15 [Proposed] | **Given** the follow/save state fails to load **Then** the buttons still render (default state) or offer a retry, instead of disappearing (U-STORY-01). |
| SCR-STORY-01-AC16 [Proposed] | **Given** a story with published chapters **Then** the header shows "Updated <date>" and each chapter row shows its publish date (U-STORY-02). |
| SCR-STORY-01-AC17 [Proposed] | **When** `/story/{id}` is requested without a slug **Then** it 308-redirects to the canonical URL (F-STORY-03). |

## F. Findings referenced

F-STORY-01 (report shown to author), F-STORY-02 (unbounded chapter list), F-STORY-03 (URL resilience), F-STORY-04 (JSON-LD author URL), U-STORY-01 (silent disappearance of actions), U-STORY-02 (no dates), U-READ-03 (chapter numbering gaps), F-PROG-02 / F-PROG-03 (continue reading). Full text: agent `reading` findings, to be consolidated into `audits/`.

## G. Open questions

- Q-STORY-01 — Should stories of suspended authors stay readable? (BR-STORY-016)
- Q-READ-01 — Should "Chapter N" be the position among published chapters or `sort_order`? (BR-STORY-011)

## Batch 4 · authoring4
Batch 4 authoring4: cover blur-up from `cover_blurhash` (BR-STM-029); "Updates on …" line under the counters (BR-STM-028); next chapter countdown above the chapter list (BR-STORY-018); chapters grouped into part folders (BR-CHM-016). The reader contents sheet heads part runs with the part name. Rollback: top of `20261106040200_next_chapter_countdown.sql`.
