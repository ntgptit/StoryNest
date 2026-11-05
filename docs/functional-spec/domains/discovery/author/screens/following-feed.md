# SCR-AUTHOR-02 — Following feed

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | SCR-AUTHOR-02 |
| Business domain | [D-DISCOVERY Discovery](../../overview.md) |
| Business object | [OBJ-AUTHOR](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | "From authors you follow" |
| Route | `/following` |
| Route file | `apps/web/src/app/(main)/following/page.tsx` (+ `following-view.tsx`) |
| Screen component | `packages/features/src/author/screens/following-screen.tsx` |
| Roles | Member only (guest → `/login?next=%2Ffollowing`) |
| Guard | Proxy `PROTECTED_PREFIXES` + `requireUser("/following")`; `robots: noindex`; disallowed in robots.txt |
| Navigation entry | Only the "From authors you follow" link on SCR-HOME-01 (member) — not in header, bottom nav or user menu (U-HOME-01) |
| Workflows | WF-AUTHOR-03 |
| Rules | BR-AUTHOR-008, BR-AUTHOR-009, BR-HOME-009 |

## B. Components
| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-AUTHOR-02-C01 | Page header | "From authors you follow" / "Recently updated stories from the authors you follow." | `following-screen.tsx:37`, `strings.en.ts:30-32` |
| SCR-AUTHOR-02-C02 | Story grid | Infinite list of cards, end "No more stories." | `following-screen.tsx:54-72` |
| SCR-AUTHOR-02-C03 | Loading | 8-tile skeleton `aria-busy` | `following-screen.tsx:45-50` |
| SCR-AUTHOR-02-C04 | Empty | "No stories yet / Follow a few authors and their updated stories will show up here." | `following-screen.tsx:51-52`, `strings.en.ts:33-36` |
| SCR-AUTHOR-02-C05 | Error | "Couldn't load the list" + "Try again" | `following-screen.tsx:38-44`, `strings.en.ts:38` |

## C. User actions and system responses

| Field | SCR-AUTHOR-02-A01 — Open the feed |
| --- | --- |
| Trigger | Navigate to `/following` |
| Preconditions | Signed in |
| Expected behavior | First 12 stories of followed active authors, newest update first; always refetched on mount (`staleTime 0`) |
| State change | Query `author/followed-stories/{viewer}/{mature}` |
| Validation | — |
| Error behavior | Error state with retry |
| Navigation | Guest → login, then back |
| Evidence | `following/page.tsx:11-14`, `use-author.ts:49-70` |

| Field | SCR-AUTHOR-02-A02 — Load more |
| --- | --- |
| Trigger | Scroll / "Load more" |
| Preconditions | Next cursor present |
| Expected behavior | Next page after `(updated_at, id)` of the last story |
| State change | Pages |
| Validation | Cursor has both parts |
| Error behavior | Silent (U-SRCH-01) |
| Navigation | — |
| Evidence | `following-screen.tsx:66-69`, `author.test.tsx:456` |

| Field | SCR-AUTHOR-02-A03 — Open a story |
| --- | --- |
| Trigger | Click card |
| Preconditions | — |
| Expected behavior | `/story/{id}/{slug}` |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-STORY-01 |
| Evidence | `following-screen.tsx:58-65` |

| Field | SCR-AUTHOR-02-A04 — Retry |
| --- | --- |
| Trigger | "Try again" |
| Preconditions | First page failed |
| Expected behavior | Refetch |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `following-screen.tsx:43`, `author.test.tsx:440` |

## D. UI states
| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Skeleton until the viewer id is known (`author.test.tsx:433`) |
| Loading | Implemented | Skeleton grid |
| Empty | Implemented | Advice text, but no link to discover authors (search/ranking) — Recommended |
| Populated | Implemented | Card grid |
| Validation error | Not applicable | — |
| Request error | Implemented (partial) | First page only |
| Success | Not applicable | — |
| Disabled | Not applicable | — |
| Unauthorized | Implemented | Proxy + `requireUser` redirect to login |
| Offline | Missing | Generic error |
| Unsaved changes | Not applicable | — |

## E. Acceptance criteria
- SCR-AUTHOR-02-AC01 — Given a guest opens `/following`, Then they are redirected to `/login?next=%2Ffollowing`.
- SCR-AUTHOR-02-AC02 — Given a member follows `demo_an` (2 public stories), When `/following` opens, Then exactly those 2 stories are listed, newest update first.
- SCR-AUTHOR-02-AC03 — Given a followed author is suspended, Then their stories disappear from the feed while the follow remains.
- SCR-AUTHOR-02-AC04 — Given two stories share the same `updated_at` across a page boundary, When the next page loads, Then neither is skipped nor repeated.
- SCR-AUTHOR-02-AC05 — Given the member unfollows the only followed author, When `/following` reopens, Then the empty state is shown.
- SCR-AUTHOR-02-AC06 — Given mature content is hidden, Then followed authors' mature stories are not listed.
- SCR-AUTHOR-02-AC07 [Proposed] — Given the empty state, Then it offers a link to find authors (search or rankings) and the page is reachable from the main navigation (U-HOME-01).

## F. Findings referenced
U-HOME-01, U-SRCH-01, F-AUTHOR-01. See [domain overview](../../overview.md#findings-index).

## G. Open questions
None.
