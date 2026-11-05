# SCR-SRCH-01 — Search results (with header SearchBox)

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | SCR-SRCH-01 |
| Business domain | [D-DISCOVERY Discovery](../../overview.md) |
| Business object | [OBJ-SRCH](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Search results; the header SearchBox (rendered by the shell on every page) is component C01 |
| Route | `/search?q=<term>&tab=<stories|authors|tags>` |
| Route file | `apps/web/src/app/(main)/search/page.tsx` (+ `search-view.tsx`) |
| Screen component | `packages/features/src/search/screens/search-screen.tsx`; header box `packages/features/src/search/components/search-box.tsx` (mounted by `shell/components/site-header.tsx:21`) |
| Roles | Guest, Member, Moderator (same results) |
| Guard | None; `robots: { index: false }`; title "Tìm kiếm · StoryNest" (server, Vietnamese only) |
| Workflows | WF-SRCH-01, WF-SRCH-02, WF-SRCH-03 |
| Rules | BR-SRCH-001…012, BR-PROG-016 |

## B. Components
| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-SRCH-01-C01 | Header SearchBox | `form role=search`; input `role=combobox` "Search stories, authors or tags", placeholder "Search stories, authors, tags…"; listbox "Suggestions" with ≤ 5 titles + "See all results for “term”"; below `sm` an icon link "Open search" | `search-box.tsx:65-135`, `strings.en.ts:3-6,11-12` |
| SCR-SRCH-01-C02 | Page header | `PageHeader` "Search" | `search-screen.tsx:63` |
| SCR-SRCH-01-C03 | Search form | Input (aria-label as C01, `maxLength` 120) + "Search" button | `search-screen.tsx:64-78` |
| SCR-SRCH-01-C04 | Hint / length message | `role=status` text when term not searchable | `search-screen.tsx:80-83` |
| SCR-SRCH-01-C12 | Trending searches (empty box only) | Line "Trending · rank · term · marker" rolling every 2.5 s (not under reduced motion, while open, hovered or focused); pressing it unfolds the top 10 (rank, term, up n / down n / NEW / same); picking a term replaces the address with its search; note "Terms searched by at least 3 people…"; hidden when there are none | `search-screen.tsx` (`Trending`), `ui/widgets/trending-terms.tsx` (Lucian #322) (BR-SRCH-012) |
| SCR-SRCH-01-C05 | Results heading | `h2` "Results for “term”" | `search-screen.tsx:86` |
| SCR-SRCH-01-C06 | Tabs | Stories / Authors / Tags (Radix tabs); also switchable by swiping the results sideways on touch (changed by PR #60) | `search-screen.tsx:87-95` |
| SCR-SRCH-01-C07 | Story results | Card grid + infinite list, end "No more results." | `search-screen.tsx:125-166` |
| SCR-SRCH-01-C08 | Author results | List of rows (avatar, name, @username · N stories) + "Load more" button | `search-screen.tsx:168-209` |
| SCR-SRCH-01-C09 | Tag results | List of "#name / N stories" rows (≤ 10) | `search-screen.tsx:211-231` |
| SCR-SRCH-01-C10 | Loading | Skeletons, `role=status` "Searching…" | `search-screen.tsx:105-113` |
| SCR-SRCH-01-C11 | Empty / error | Per-tab empty texts; "Can't search right now" + "Try again" | `search-screen.tsx:115-123`, `strings.en.ts:17-22` |

## C. User actions and system responses

| Field | SCR-SRCH-01-A01 — Type in the header box |
| --- | --- |
| Trigger | Input change |
| Preconditions | Width ≥ `sm` |
| Expected behavior | List opens; after 250 ms with a 3–100 char term, ≤ 5 story titles appear above "See all results" |
| State change | Local `value`, `open`, `active`; query `search/suggestions/{term}/{mature}` |
| Validation | Short term → no list |
| Error behavior | Request failure → no titles, only "See all" (silent) |
| Navigation | — |
| Evidence | `search-box.tsx:36-49,168-173`, `use-search.ts:66-80` |

| Field | SCR-SRCH-01-A02 — Keyboard in the header box |
| --- | --- |
| Trigger | ArrowDown / ArrowUp / Escape / Enter |
| Preconditions | Box focused |
| Expected behavior | Arrows cycle rows (`aria-activedescendant`); Escape closes; Enter opens active story, else results page if searchable |
| State change | `active` index |
| Validation | Enter with short term does nothing |
| Error behavior | — |
| Navigation | `/story/{id}/{slug}` or `/search?q=` |
| Evidence | `search-box.tsx:45-63`, `search.test.tsx:463,482` |

| Field | SCR-SRCH-01-A03 — Pick a suggestion / "See all" with the mouse |
| --- | --- |
| Trigger | Mouse-down on a row |
| Preconditions | List open |
| Expected behavior | Navigates; list closes |
| State change | `open=false` |
| Validation | — |
| Error behavior | — |
| Navigation | Story page / results page |
| Evidence | `search-box.tsx:185-211` |

| Field | SCR-SRCH-01-A04 — Open search on mobile |
| --- | --- |
| Trigger | Tap header search icon |
| Preconditions | Width < `sm` |
| Expected behavior | The search field opens in place over the header row and takes focus; no navigation until a search is submitted. Escape, the close button or leaving the field folds it back (changed by PR #60) |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-SRCH-01 |
| Evidence | `search-box.tsx:57-78,125-137`, `search.test.tsx:498-529` |

| Field | SCR-SRCH-01-A05 — Submit the page form |
| --- | --- |
| Trigger | "Search" button / Enter in C03 |
| Preconditions | — |
| Expected behavior | `navigation.replace(searchHref(draft, tab))`; normalised term in URL; tab kept |
| State change | URL; screen remounts (key = term) |
| Validation | Short/long term → C04 message, no request |
| Error behavior | — |
| Navigation | Same screen |
| Evidence | `search-screen.tsx:55-58`, `search-view.tsx:8-9`, `search.test.tsx:353,364` |

| Field | SCR-SRCH-01-A06 — Switch tab |
| --- | --- |
| Trigger | Click tab, or swipe the results sideways on touch (changed by PR #60) |
| Preconditions | Term searchable |
| Expected behavior | URL `tab` replaced (stories omitted); only the selected tab's query runs |
| State change | URL |
| Validation | Unknown tab param → stories |
| Error behavior | — |
| Navigation | Same screen |
| Evidence | `search-screen.tsx:109-110,115-132`, `model/search.ts:35-37` |

| Field | SCR-SRCH-01-A07 — Load more |
| --- | --- |
| Trigger | Scroll sentinel / "Load more" (stories); "Load more" button (authors, disabled while loading) |
| Preconditions | Next offset not null |
| Expected behavior | Next 12 appended |
| State change | Infinite query pages |
| Validation | Offset cap 200 |
| Error behavior | Silent: no inline error; button reappears (U-SRCH-01) |
| Navigation | — |
| Evidence | `search-screen.tsx:178-191,212-216` |

| Field | SCR-SRCH-01-A08 — Open a result |
| --- | --- |
| Trigger | Click story card / author row / tag row |
| Preconditions | — |
| Expected behavior | Story → `/story/{id}/{slug}`; author → `/author/<username>`; tag → `/?tag=<slug>` |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-STORY-01 / SCR-AUTHOR-01 / SCR-HOME-01 |
| Evidence | `search-screen.tsx:182-184,224-235,249-255` |

| Field | SCR-SRCH-01-A09 — Retry |
| --- | --- |
| Trigger | "Try again" |
| Preconditions | Tab request failed with nothing shown (tags: any failure) |
| Expected behavior | Refetch that tab |
| State change | — |
| Validation | — |
| Error behavior | Stays on error |
| Navigation | — |
| Evidence | `search-screen.tsx:173,200,242`, `search.test.tsx:324` |

### C.x Browse interactions (Lucian batch 2 · browse)

- Result tabs use the underline style; on touch the results can be swiped sideways to the neighbouring tab, the underline following the finger (Lucian 048). The tab still lives in the address (`navigation.replace(searchHref(term, tab))`), exactly as a click.
- The stories tab has the grid / list toggle (Lucian 308) and the shared story-card behaviours (cover transition, long-press quick look; see home-discover).
- Header SearchBox on phones (Lucian 027): the search icon opens the same combobox over the header row (growing out of the icon), focused; Escape (when no suggestions are open), the close button, leaving the field or submitting folds it back and focus returns to the icon. Desktop unchanged.

## D. UI states
| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | No/short term → hint "Enter at least 3 characters to search. Accents are optional." (`search-screen.tsx:79-82`) |
| Loading | Implemented | Skeleton grid/list with `role=status` "Searching…"; header list keeps previous suggestions |
| Empty | Implemented | Per tab: "No matching stories / authors / tags" with advice (`strings.en.ts:17-21`) |
| Populated | Implemented | Cards / rows |
| Validation error | Implemented | Too long → "Search terms can be up to 100 characters." |
| Request error | Implemented (partial) | First-page error state with retry; later-page errors silent (U-SRCH-01); header suggestions errors silent |
| Success | Not applicable | — |
| Disabled | Implemented | Authors "Load more" disabled while fetching |
| Unauthorized | Not applicable | Public |
| Offline | Missing | Generic error text only |
| Unsaved changes | Not applicable | Draft term is discarded on navigation (acceptable) |

## E. Acceptance criteria
- SCR-SRCH-01-AC01 — Given a public story "Đọc truyện mỗi đêm", When the reader searches "doc truyen", Then it is the first story result.
- SCR-SRCH-01-AC02 — Given the term "ab", When submitted, Then no request is sent and the hint is shown.
- SCR-SRCH-01-AC03 — Given a 101-character term, Then "Search terms can be up to 100 characters." is shown and no request is sent.
- SCR-SRCH-01-AC04 — Given a private, a draft, a deleted, a mature and a suspended-owner story all match, When a guest searches, Then none of them is listed.
- SCR-SRCH-01-AC05 — Given the reader opted into mature content, Then the matching mature story appears with "18+".
- SCR-SRCH-01-AC06 — Given `/search?q=abc&tab=authors`, When the reader picks "Tags", Then the URL becomes `/search?q=abc&tab=tags` without a new history entry.
- SCR-SRCH-01-AC07 — Given suggestions are shown, When the reader presses ArrowDown then Enter, Then the first suggested story opens.
- SCR-SRCH-01-AC08 — Given a tag result, When clicked, Then `/?tag=<slug>` opens filtered.
- SCR-SRCH-01-AC09 — Given 13 matching stories, When the reader loads more, Then the 13th appears and "No more results." follows.
- SCR-SRCH-01-AC10 [Proposed] — Given more than 204 matches, When the cap is reached, Then "Only the first results are shown. Try a more specific search." is displayed instead of "No more results." (F-SRCH-01).
- SCR-SRCH-01-AC11 [Proposed] — Given page 2 fails, Then an inline error with "Try again" is shown under the results (U-SRCH-01).
- SCR-SRCH-01-AC12 [Proposed] — Given the reader opens `/search` from the mobile icon, Then the field has focus (U-SRCH-02).

## F. Findings referenced
F-SRCH-01, U-SRCH-01, U-SRCH-02, U-AUTHOR-02 (author counts). See [domain overview](../../overview.md#findings-index).

## G. Open questions
- Q-SRCH-01 — Should tag results/popular tags count mature stories for a reader who opted in (today they never do, by WBS 5.6 decision)?
