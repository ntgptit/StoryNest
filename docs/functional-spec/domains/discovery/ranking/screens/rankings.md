# SCR-RANK-01 — Rankings

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | SCR-RANK-01 |
| Business domain | [D-DISCOVERY Discovery](../../overview.md) |
| Business object | [OBJ-RANK](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Rankings ("Ranking") |
| Route | `/ranking?period=<day|week|month|all>` (default week) |
| Route file | `apps/web/src/app/(main)/ranking/page.tsx` (+ `ranking-view.tsx`) |
| Screen component | `packages/features/src/ranking/screens/ranking-screen.tsx` |
| Roles | Guest, Member |
| Guard | None; indexed; listed in sitemap (`apps/web/src/lib/seo/sitemap.ts:43`); title "Xếp hạng · StoryNest" (server, Vietnamese only) |
| Navigation entry | Only the "See rankings" link on SCR-HOME-01 (not in header, bottom nav or user menu → U-HOME-01) |
| Workflows | WF-RANK-01, WF-RANK-02 |
| Rules | BR-RANK-001…008 |

## B. Components
| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-RANK-01-C01 | Page header | "Ranking" / "The most read and most voted stories." | `ranking-screen.tsx:37`, `strings.en.ts:2-3` |
| SCR-RANK-01-C02 | Period tabs | `TabsList` "Time period": Today, This week, This month, All time | `ranking-screen.tsx:38-46`, `strings.en.ts:4-5` |
| SCR-RANK-01-C03 | Freshness note | "Updated <relative>" | `ranking-screen.tsx:47-51` |
| SCR-RANK-01-C04 | Ranked grid | Infinite list of ranked cards | `ranking-screen.tsx:69-80` |
| SCR-RANK-01-C05 | Ranked card | Rank badge (aria-label "Rank N"), `StoryCard`, "<n> reads · <m> votes" | `ranking-screen.tsx:81-109` |
| SCR-RANK-01-C06 | Empty / error | "No ranking yet…", "Couldn't load the ranking" + "Try again" | `ranking-screen.tsx:53-67`, `strings.en.ts:12-17` |

## C. User actions and system responses

| Field | SCR-RANK-01-A01 — Open the ranking |
| --- | --- |
| Trigger | Navigate to `/ranking[?period=]` |
| Preconditions | — |
| Expected behavior | Period resolved (unknown → week); top 12 loaded client-side; freshness loaded |
| State change | Queries `ranking/top/{period}/{mature}`, `ranking/freshness` |
| Validation | `periodFromParam` |
| Error behavior | Error state with retry |
| Navigation | — |
| Evidence | `ranking/page.tsx:11-14`, `ranking-screen.tsx:30-33` |

| Field | SCR-RANK-01-A02 — Change period |
| --- | --- |
| Trigger | Click a tab |
| Preconditions | — |
| Expected behavior | `navigation.replace(rankingHref(period))`; that period's list shown (cached per period) |
| State change | URL |
| Validation | — |
| Error behavior | As A01 |
| Navigation | Same screen |
| Evidence | `ranking-screen.tsx:38`, `ranking.test.tsx:254,285` |

| Field | SCR-RANK-01-A03 — Load more |
| --- | --- |
| Trigger | Scroll sentinel / "Load more" |
| Preconditions | Next offset ≤ 200 |
| Expected behavior | Next 12 appended, numbering continues |
| State change | Pages |
| Validation | — |
| Error behavior | Silent (U-SRCH-01) |
| Navigation | — |
| Evidence | `ranking-screen.tsx:74-79`, `ranking.test.tsx:332` |

| Field | SCR-RANK-01-A04 — Open a story |
| --- | --- |
| Trigger | Click card |
| Preconditions | — |
| Expected behavior | `/story/{id}/{slug}` |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-STORY-01 |
| Evidence | `ranking-screen.tsx:112-117` |

| Field | SCR-RANK-01-A05 — Retry |
| --- | --- |
| Trigger | "Try again" |
| Preconditions | First page failed |
| Expected behavior | Refetch |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `ranking-screen.tsx:53-59`, `ranking.test.tsx:319` |

## D. UI states
| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Default week tab selected |
| Loading | Implemented | 8-tile skeleton `aria-busy` (`ranking-screen.tsx:60-65`) |
| Empty | Implemented | "No ranking yet" |
| Populated | Implemented | Ranked cards |
| Validation error | Not applicable | Bad period silently → week |
| Request error | Implemented (partial) | First page only; later pages silent |
| Success | Not applicable | — |
| Disabled | Not applicable | — |
| Unauthorized | Not applicable | Public |
| Offline | Missing | Generic error text |
| Unsaved changes | Not applicable | — |

## E. Acceptance criteria
- SCR-RANK-01-AC01 — Given story A has 3 reads and B has 2 this week, When `/ranking` opens, Then A is rank 1 and B rank 2 with "3 reads · 0 votes" and "2 reads · 0 votes".
- SCR-RANK-01-AC02 — Given equal scores, Then the story with more reads ranks higher.
- SCR-RANK-01-AC03 — Given a ranked story is made private, When the page reloads before the next refresh, Then the story is gone.
- SCR-RANK-01-AC04 — Given `/ranking?period=nonsense`, Then "This week" is selected.
- SCR-RANK-01-AC05 — Given the reader selects "All time", Then the URL is `/ranking?period=all` and no history entry is added.
- SCR-RANK-01-AC06 — Given 13 ranked stories, When the reader loads more, Then the 13th shows badge "13".
- SCR-RANK-01-AC07 — Given the last refresh was 3 minutes ago, Then "Updated 3 minutes ago" is shown.
- SCR-RANK-01-AC08 — Given mature content is hidden, Then no mature story is ranked; Given it is enabled, Then mature stories rank with an "18+" badge.
- SCR-RANK-01-AC09 [Proposed] — Given a reader in UTC+7, Then "Today" counts reads and votes since local midnight (U-RANK-01, needs decision Q-RANK-01).
- SCR-RANK-01-AC10 [Proposed] — Given a ranked mature story, Then the rank badge and the "18+" badge do not overlap and the rank is announced as "Rank N" (U-RANK-02).

## F. Findings referenced
U-RANK-01, U-RANK-02, U-SRCH-01, U-HOME-01. See [domain overview](../../overview.md#findings-index).

## G. Open questions
- Q-RANK-01 — Should "Today" use the reader's (or Asia/Ho_Chi_Minh) day instead of UTC?
