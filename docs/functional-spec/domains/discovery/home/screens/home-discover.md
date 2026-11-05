# SCR-HOME-01 — Home / Discover

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | SCR-HOME-01 |
| Business domain | [D-DISCOVERY Discovery](../../overview.md) |
| Business object | [OBJ-HOME](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Home / Discover ("Recently updated") |
| Route | `/` with optional `?category=<slug>` and `?tag=<slug>` (no `language` param — BR-HOME-005; pagination cursor is client state, not in the URL) |
| Route file | `apps/web/src/app/(main)/page.tsx` (+ `discover-home.tsx`, `home-hero.tsx`, shared `loading.tsx`) |
| Screen component | `packages/features/src/discovery/screens/discover-screen.tsx` (+ `category-chips.tsx`, `tag-filters.tsx`); For-you block `packages/features/src/recommendations/components/recommendation-list.tsx` |
| Roles | Guest, Member (adds For-you block and Following shortcut), Moderator (same as member) |
| Guard | None (public). Indexed (no `robots` override in `page.tsx`) |
| Workflows | WF-HOME-01, WF-HOME-02, WF-HOME-03, WF-HOME-04, WF-REC-02 |
| Rules | BR-HOME-001…012, BR-TAX-003/004, BR-REC-005…008 |

## B. Components
| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-HOME-01-C01 | Hero | `h1` "Where stories are written and read." + intro "Discover newly updated stories and follow the authors you love." Same for all roles | `apps/web/src/app/(main)/home-hero.tsx:6-12` |
| SCR-HOME-01-C02 | "Recommended for you" block | Member + unfiltered only; up to 8 cards with a reason line; hidden while loading/empty/error | `discover-home.tsx:10-13`, `recommendation-list.tsx:76-92` |
| SCR-HOME-01-C03 | Section heading | `h2` "Recently updated" (`title`) | `discover-screen.tsx:51-53` |
| SCR-HOME-01-C04 | Shortcuts nav (`aria-label` "Shortcuts") | "From authors you follow" (member), "See rankings" (all) | `discover-screen.tsx:54-63` |
| SCR-HOME-01-C05 | Category chips (nav "Categories") | "All" + root categories as links; horizontally scrollable on mobile; skeleton while tree loads | `category-chips.tsx:31-38`, `discover-screen.tsx:66-70` |
| SCR-HOME-01-C06 | Active-tag line | "Filtering by tag #name" + "Clear tag filter" (X icon) | `tag-filters.tsx:31-41` |
| SCR-HOME-01-C07 | Popular tags (nav "Popular tags") | Up to 12 `#tag` chips, toggling | `tag-filters.tsx:43-61`, `model/popular-tags.ts:1` |
| SCR-HOME-01-C08 | Story grid | 2/3/4 columns; `StoryCard` per story | `discover-screen.tsx:19,98-116` |
| SCR-HOME-01-C09 | Infinite list footer | Sentinel + "Load more" button, loading skeleton, end message "You've seen all the stories." | `infinite-list.tsx:58-71`, `discover-screen.tsx:110-115` |
| SCR-HOME-01-C10 | Empty state | Generic or tag-specific | `discover-screen.tsx:90-95` |
| SCR-HOME-01-C11 | Error state | Full (no items) or inline (next page) with "Try again" | `discover-screen.tsx:74-83,117-124` |

## C. User actions and system responses

| Field | SCR-HOME-01-A01 — Open home |
| --- | --- |
| Trigger | Navigate to `/` |
| Preconditions | — |
| Expected behavior | SSR HTML contains the first page of cards; client hydrates; route-level `RouteLoading` shows during navigation |
| State change | Queries `discovery/categories`, `discovery/latest/{filter}` cached |
| Validation | Non-string or empty query params ignored |
| Error behavior | Server prefetch error logged; client shows skeleton then data or error |
| Navigation | — |
| Evidence | `page.tsx:15-43`, `(main)/loading.tsx:8-10` |

| Field | SCR-HOME-01-A02 — Choose a category chip |
| --- | --- |
| Trigger | Click chip |
| Preconditions | Category tree loaded |
| Expected behavior | Navigate to `homeHref({categorySlug, tagSlug})`; feed shows category + direct children; chip `aria-current="page"`; For-you hidden |
| State change | URL changes; new query key |
| Validation | Unknown slug → empty list |
| Error behavior | Tree error with category active → full error |
| Navigation | Same screen |
| Evidence | `category-chips.tsx:34-35`, `discovery.api.ts:74-79` |

| Field | SCR-HOME-01-A03 — Clear category ("All") |
| --- | --- |
| Trigger | Click "All" |
| Preconditions | — |
| Expected behavior | `homeHref({tagSlug})`; tag filter kept |
| State change | URL |
| Validation | — |
| Error behavior | — |
| Navigation | Same screen |
| Evidence | `category-chips.tsx:34` |

| Field | SCR-HOME-01-A04 — Toggle a popular tag |
| --- | --- |
| Trigger | Click `#tag` chip |
| Preconditions | Popular tags loaded |
| Expected behavior | Inactive → `/?tag=slug` (category kept); active → removes tag |
| State change | URL |
| Validation | — |
| Error behavior | Popular tags failing → bar hidden |
| Navigation | Same screen |
| Evidence | `tag-filters.tsx:46-58` |

| Field | SCR-HOME-01-A05 — Clear tag filter |
| --- | --- |
| Trigger | "Clear tag filter" link |
| Preconditions | `?tag` present |
| Expected behavior | `homeHref({categorySlug})` |
| State change | URL |
| Validation | — |
| Error behavior | — |
| Navigation | Same screen |
| Evidence | `tag-filters.tsx:34-40` |

| Field | SCR-HOME-01-A06 — Load more |
| --- | --- |
| Trigger | Scroll near bottom (240 px) or "Load more" button |
| Preconditions | `hasNextPage`, not already loading |
| Expected behavior | Next keyset page appended; skeleton bar while loading; no double fetch |
| State change | Infinite query pages |
| Validation | Cursor validated |
| Error behavior | Inline error with "Try again" (calls `fetchNextPage`) |
| Navigation | — |
| Evidence | `infinite-list.tsx:30-62`, `discover-screen.tsx:110-124` |

| Field | SCR-HOME-01-A07 — Open a story |
| --- | --- |
| Trigger | Click card (feed or For-you) |
| Preconditions | — |
| Expected behavior | Navigate `/story/{id}/{slug}` |
| State change | — |
| Validation | — |
| Error behavior | Owned by story page |
| Navigation | SCR-STORY-01 |
| Evidence | `story-card.ts:62-68` |

| Field | SCR-HOME-01-A08 — Shortcut to rankings / following |
| --- | --- |
| Trigger | "See rankings" / "From authors you follow" |
| Preconditions | Following link: signed in |
| Expected behavior | Navigate |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-RANK-01 / SCR-AUTHOR-02 |
| Evidence | `discover-screen.tsx:55-62` |

| Field | SCR-HOME-01-A09 — Retry after failure |
| --- | --- |
| Trigger | "Try again" in the full error state |
| Preconditions | Feed failed with no items |
| Expected behavior | Refetch category tree and feed |
| State change | Queries refetched |
| Validation | — |
| Error behavior | Stays on error state if it fails again |
| Navigation | — |
| Evidence | `discover-screen.tsx:79-82`, `discovery.test.tsx:340` |

## D. UI states
| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | SSR first page (`page.tsx:24-40`) |
| Loading | Implemented | Route `RouteLoading`; chip skeleton; 8-tile skeleton grid `aria-busy` (`discover-screen.tsx:84-89`) |
| Empty | Implemented | "No stories yet / Check back later, or try another category." or tag variant (`strings.en.ts:12-13`) |
| Populated | Implemented | Grid + infinite footer |
| Validation error | Not applicable | No input; bad params ignored or produce empty state |
| Request error | Implemented | Full and inline error states (`discover-screen.tsx:74-83,117-124`) |
| Success | Not applicable | Read-only |
| Disabled | Not applicable | "Load more" hidden while loading (`infinite-list.tsx:63`) |
| Unauthorized | Not applicable | Public; member-only parts simply hidden |
| Offline | Missing | No offline detection; generic error "Check your connection and try again." covers it |
| Unsaved changes | Not applicable | — |

## E. Acceptance criteria
- SCR-HOME-01-AC01 — Given public, unlisted, private, draft, deleted and mature stories exist, When a guest opens `/`, Then only public non-draft non-deleted non-mature stories are listed, newest update first.
- SCR-HOME-01-AC02 — Given more than 12 eligible stories, When the reader scrolls to the end, Then the next 12 load once, with no duplicate or missing story even when two share `updated_at`.
- SCR-HOME-01-AC03 — Given category "Lãng mạn" has child "Lãng mạn học đường", When the reader opens `/?category=lang-man`, Then stories of both categories are listed and the chip is marked current.
- SCR-HOME-01-AC04 — Given `/?category=does-not-exist`, Then the empty state is shown, not the unfiltered feed.
- SCR-HOME-01-AC05 — Given `/?category=lang-man&tag=tinh-yeu`, When the reader clicks "Clear tag filter", Then the URL becomes `/?category=lang-man`.
- SCR-HOME-01-AC06 — Given no story has tag `x`, When `/?tag=x` opens, Then "No stories with this tag yet" is shown.
- SCR-HOME-01-AC07 — Given a signed-in member, When the home is unfiltered, Then "Recommended for you" and "From authors you follow" are visible; When a filter is active, Then "Recommended for you" is hidden.
- SCR-HOME-01-AC08 — Given a guest, Then neither "Recommended for you" nor "From authors you follow" is shown, and "See rankings" is.
- SCR-HOME-01-AC09 — Given the feed request fails, When the reader presses "Try again" and the request succeeds, Then cards replace the error.
- SCR-HOME-01-AC10 — Given the reader confirmed 18+ and enabled mature content, Then mature stories appear with an "18+" badge.
- SCR-HOME-01-AC11 [Proposed] — Given an author is suspended by a moderator, When anyone opens `/`, Then none of that author's stories is listed (F-HOME-01).
- SCR-HOME-01-AC12 [Proposed] — Given `/?language=en`, Then only English stories are listed and a language control reflects it (F-HOME-02).

## F. Findings referenced
F-HOME-01 (suspended authors' stories on home), F-HOME-02 (language filter not exposed), U-HOME-01 (ranking/following
discoverability), U-HOME-02 (guest hero without call to action), U-TAX-01 (sub-category chips). See
[domain overview](../../overview.md#findings-index).

## G. Open questions
- Q-HOME-01 — Is listing suspended authors' stories on home intended? (see overview)
