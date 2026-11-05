# SCR-STAT-01 — Story statistics

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-STAT-01` |
| Business domain | [D-STUDIO Authoring (Studio)](../../overview.md) |
| Business object | [OBJ-STAT](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Story statistics ("Story statistics") |
| Route | `/studio/story/[id]/stats` |
| Route file | `apps/web/src/app/(main)/studio/story/[id]/stats/page.tsx` (view `stats-view.tsx`) |
| Screen component | `packages/features/src/analytics/screens/story-stats-screen.tsx` (`StoryStatsScreen` → `Stats`); `components/daily-chart.tsx` |
| Roles | Owner, co-author; editor and non-members see no-access / not-found states |
| Entry points | SCR-STM-01 row "Stats" (owner, co-author). Not linked from SCR-STM-03, SCR-CHM-01 or SCR-TEAM-01 |
| Workflows | WF-STAT-01, WF-STAT-02 |
| Rules | BR-STAT-001..010, BR-STM-023 |

## B. Components
| ID | Component | Notes / evidence |
| --- | --- | --- |
| SCR-STAT-01-C01 | Header "Story statistics" / "Who reads your story and where they stop." (no story title) | `story-stats-screen.tsx:68`, `strings.en.ts:2-3` |
| SCR-STAT-01-C02 | Link "← Back to Studio" → `/studio` | `story-stats-screen.tsx:69-75` |
| SCR-STAT-01-C03 | Section "In the selected range": tabs 7/30/90 days ("Time range"), three tiles Reads / New likes / New comments | `story-stats-screen.tsx:89-126` |
| SCR-STAT-01-C04 | Section "By day": bar chart (`role="img"` + summary label) or "No activity in this range yet.", note | `story-stats-screen.tsx:128-136`, `components/daily-chart.tsx` |
| SCR-STAT-01-C05 | Section "By chapter": table (Chapter, Reads + bar, Likes, Comments, Retention), horizontal scroll on narrow screens, note; empty "No chapters have been published yet." | `story-stats-screen.tsx:138-193` |
| SCR-STAT-01-C06 | States: auth skeleton; sign-in prompt; no access; not found; error + "Try again" | `story-stats-screen.tsx:30-60,77-86` |

## C. User actions & system responses

| Field | SCR-STAT-01-A01 Change range |
| --- | --- |
| Trigger | Click a range tab (keyboard: tabs widget) |
| Preconditions | — |
| Expected behavior | Request the window; totals show skeleton, chart skeleton until loaded |
| State change | Local range (default 30, not persisted) |
| Validation | Only 7/30/90 accepted |
| Error behavior | Generic error state with retry |
| Navigation | — |
| Evidence | `story-stats-screen.tsx:92-106`; `model/stats.ts:42-46` |

| Field | SCR-STAT-01-A02 Retry |
| --- | --- |
| Trigger | "Try again" |
| Expected behavior | Refetch chapters and daily series |
| Evidence | `story-stats-screen.tsx:77-86`; `analytics.test.tsx:284` |

| Field | SCR-STAT-01-A03 Back to Studio |
| --- | --- |
| Trigger | Link |
| Expected behavior | Navigate to SCR-STM-01 |
| Evidence | `story-stats-screen.tsx:69-75` |

| Field | SCR-STAT-01-A04 Read a day's value |
| --- | --- |
| Trigger | Hover a bar |
| Expected behavior | Browser tooltip "<YYYY-MM-DD>: n reads" (mouse only) |
| Evidence | `components/daily-chart.tsx:23-29` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Auth skeleton |
| Loading | Implemented | Per-section skeletons (`aria-busy`) |
| Empty | Implemented | "No activity in this range yet." / "No chapters have been published yet." |
| Populated | Implemented | Totals, chart, table |
| Validation error | Not applicable | — |
| Request error | Implemented | Error state + retry; forbidden/notFound distinct |
| Success | Not applicable | Read-only |
| Disabled | Not applicable | — |
| Unauthorized | Implemented | Guest: proxy/`requireUser` redirect (screen also has a sign-in prompt); editor: "You can't view these statistics" |
| Offline | Partial | Generic error |
| Unsaved changes | Not applicable | — |

## E. Acceptance criteria
- SCR-STAT-01-AC01 Given I own the story, When I open the page, Then the 30-day totals, chart and per-chapter table are shown.
- SCR-STAT-01-AC02 Given chapter 1 has 4 reads and chapter 2 has 3, Then chapter 2's retention is "75%" and chapter 1's is "—".
- SCR-STAT-01-AC03 Given I select "7 days", Then the totals equal the sum of the last 7 UTC days And the table is unchanged.
- SCR-STAT-01-AC04 Given the range has no activity, Then "No activity in this range yet." replaces the chart.
- SCR-STAT-01-AC05 Given I am an editor, Then "You can't view these statistics" is shown and no figures.
- SCR-STAT-01-AC06 Given I have no role on the story (or it does not exist), Then "Story not found" is shown.
- SCR-STAT-01-AC07 Given a draft, archived or deleted chapter, Then it is not in the table.
- SCR-STAT-01-AC08 Given the request fails, Then "Couldn't load statistics" and "Try again" are shown And retry requests both series.
- SCR-STAT-01-AC09 Given I open the page, Then the header names the story and a link returns to the story's details `[Proposed]` (U-STAT-01).
- SCR-STAT-01-AC10 Given I use a keyboard or touch, Then I can read each day's values (e.g. focusable bars or a data table) `[Proposed]` (U-STAT-02).

## F. Findings referenced
U-STAT-01, U-STAT-02, F-STM-06.

## G. Open questions
Q-STAT-01.
