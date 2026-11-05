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
| Screen component | `packages/features/src/analytics/screens/story-stats-screen.tsx` (`StoryStatsScreen` → `Stats`); `components/daily-chart.tsx` (widget `packages/ui/src/widgets/synced-small-multiples.tsx`, Lucian #400 + #095); `components/read-through-funnel.tsx` (widget `packages/ui/src/widgets/funnel-steps.tsx`, Lucian #160); `components/reads-heatmap.tsx` (widget `packages/ui/src/widgets/calendar-heatmap.tsx`, Lucian #151); totals use the shared `packages/ui/src/widgets/rolling-number.tsx` (Lucian #047/#098); zoom of the daily charts in `synced-small-multiples.tsx` (Lucian #170) |
| Roles | Owner, co-author; editor and non-members see no-access / not-found states |
| Entry points | SCR-STM-01 row "Stats" (owner, co-author). Not linked from SCR-STM-03, SCR-CHM-01 or SCR-TEAM-01 |
| Workflows | WF-STAT-01, WF-STAT-02 |
| Rules | BR-STAT-001..014, BR-STM-023 |

## B. Components
| ID | Component | Notes / evidence |
| --- | --- | --- |
| SCR-STAT-01-C01 | Header "Story statistics" / "Who reads your story and where they stop." (no story title) | `story-stats-screen.tsx:83`, `strings.en.ts:2-3` |
| SCR-STAT-01-C02 | Link "← Back to Studio" → `/studio` | `story-stats-screen.tsx:84-90` |
| SCR-STAT-01-C03 | Section "In the selected range": tabs 7/30/90 days ("Time range", sliding pill), three tiles Reads / New likes / New comments (dimmed, `aria-busy`, while a new range loads; on a switch each tile's digits roll to the new total, BR-STAT-005) | `story-stats-screen.tsx`, `packages/ui/src/widgets/rolling-number.tsx` |
| SCR-STAT-01-C04 | Section "By day": three small multiples (Reads `--chart-1`, Likes `--chart-2`, Comments `--chart-3`) on one day axis with a shared cursor, per-chart value + change from the day before, dashed average line, first/middle/last day ticks, dotted flags on days a chapter was first published; a `figure` captioned with the summary ("30-day chart: n reads, …"); zoom row ("Zoom in", "Show all" while zoomed, live status "Showing <from> – <to>: n of N days." / "Selected <from> – <to>, n days. …"); "Show as table" toggle; or "No activity in this range yet."; note | `components/daily-chart.tsx`, `ui/widgets/synced-small-multiples.tsx` (BR-STAT-009, BR-STAT-012, BR-STAT-014) |
| SCR-STAT-01-C08 | Section "Reads over the last 90 days": weeks × weekdays heatmap (Monday first, Mon/Wed/Fri labelled, month labels above the weeks), status line (summary, or the picked day's reads, likes, comments and publish note), legend "Reads per day" with the whole-number range of each shade, "Show reads by week as a table" toggle, note (UTC days, reads are not distinct readers, always 90 days); "No reads in the last 90 days." when every day has 0 reads | `components/reads-heatmap.tsx`, `ui/widgets/calendar-heatmap.tsx` (BR-STAT-013) |
| SCR-STAT-01-C07 | Section "Read-through by chapter": funnel of the published chapters in reading order (bar width = reads ÷ most-read chapter, change from the chapter before, biggest drop in `--chart-1`), status line (live region) with the summary; first 8 steps + "Show all n chapters"; note that steps are reads, not distinct readers; hidden when no chapter is published; "No reads yet to draw the funnel." when every chapter has 0 reads | `components/read-through-funnel.tsx`, `ui/widgets/funnel-steps.tsx` (BR-STAT-011) |
| SCR-STAT-01-C05 | Section "By chapter": table (Chapter, Reads + bar, Likes, Comments, Retention), horizontal scroll on narrow screens, note; empty "No chapters have been published yet." | `story-stats-screen.tsx` |
| SCR-STAT-01-C06 | States: auth skeleton; sign-in prompt; no access; not found; error + "Try again" | `story-stats-screen.tsx:30-60,77-86` |

## C. User actions & system responses

| Field | SCR-STAT-01-A01 Change range |
| --- | --- |
| Trigger | Click a range tab (keyboard: tabs widget) |
| Preconditions | — |
| Expected behavior | Request the window. First load: skeletons. A later switch keeps the previous range on screen (tiles dimmed) until the new one arrives, then the bars morph: each bar slot is one day counted back from today, so the days that stay widen and rescale (height, spring easing, ≤240 ms stagger) and the others fold away; the picked day is cleared. Nothing animates on first render; reduced motion jumps to the end state |
| State change | Local range (default 30, not persisted) |
| Validation | Only 7/30/90 accepted |
| Error behavior | Generic error state with retry |
| Navigation | — |
| Evidence | `story-stats-screen.tsx:108-122`; `model/stats.ts:42-46` |

| Field | SCR-STAT-01-A02 Retry |
| --- | --- |
| Trigger | "Try again" |
| Expected behavior | Refetch chapters, the selected daily series and the 90-day heatmap series |
| Evidence | `story-stats-screen.tsx:77-86`; `analytics.test.tsx:544` |

| Field | SCR-STAT-01-A03 Back to Studio |
| --- | --- |
| Trigger | Link |
| Expected behavior | Navigate to SCR-STM-01 |
| Evidence | `story-stats-screen.tsx:84-90` |

| Field | SCR-STAT-01-A04 Read a day's values (scrub) |
| --- | --- |
| Trigger | Move a mouse over any chart, touch and drag sideways on it (vertical page scroll still works), or focus a chart and press ←/→ (Home/End: first/last day, Esc: clear) |
| Expected behavior | One crosshair moves through all three charts; each shows that day's value and its change from the day before, the other bars dim; the date line shows the day (and "Chapter n published" on a flagged day). A polite live region announces "<day>: n reads, n likes, n comments[. Chapter n published]". Mouse leave or leaving the charts with focus clears the cursor (a touch keeps it until focus moves); with no day picked the latest day is shown and nothing is announced |
| Evidence | `ui/widgets/synced-small-multiples.tsx`; `ui/widgets/stats-widgets.test.tsx`; `analytics.test.tsx` ("scrubbing one chart …") |

| Field | SCR-STAT-01-A05 Show the figures as a table |
| --- | --- |
| Trigger | "Show as table" / "Hide table" (`aria-expanded`) |
| Expected behavior | A scrollable table (Day, Reads, Likes, Comments, and "Published" when a flag exists) lists exactly the charted numbers |
| Evidence | `ui/widgets/synced-small-multiples.tsx`; `analytics.test.tsx` ("lists the same numbers …") |

| Field | SCR-STAT-01-A07 Zoom into days of the daily charts |
| --- | --- |
| Trigger | Mouse/pen: drag across any chart. Keyboard: on a focused chart hold Shift and press ←/→, then Enter. Touch and any input: pick a day, then "Zoom in". "Show all", or Esc with nothing picked, zooms out |
| Expected behavior | While dragging (or Shift-selecting) a band marks the days in all three charts and the status line reads "Selected <from> – <to>, n days. …"; releasing (or Enter) zooms in when at least 3 days are selected (fewer: treated as a click). "Zoom in" halves the visible days around the picked day (or the middle of the view), never below 3. Zoomed, the bars outside the window fold away and the rest widen (same morph as a range switch), each chart rescales to its busiest visible day and its average is over the visible days, the axis ticks and flags follow the window, and the status reads "Showing <from> – <to>: n of N days." (polite live region). The cursor stays shared and keys stay inside the window. Esc steps back: selection, then picked day, then zoom. Changing the range drops the zoom. The table still lists every day of the range |
| Evidence | `ui/widgets/synced-small-multiples.tsx` (`zoomInWindow`, `MIN_ZOOM_DAYS`); `ui/widgets/stats-widgets.test.tsx` ("SyncedSmallMultiples zoom") |

| Field | SCR-STAT-01-A08 Read a day in the heatmap |
| --- | --- |
| Trigger | Press a square (press again to let go), or Tab into the grid (one tab stop) and use ↑/↓ (a day), ←/→ (a week), Home/End (first/last day), Esc (clear), Enter/Space (toggle) |
| Expected behavior | The picked square lifts with a ring and the status line shows "<day>: n reads, n likes, n comments[. Chapter n published]"; each square's accessible name is that same sentence. "Show reads by week as a table" lists the reads with weeks as rows (the Monday as row header) and weekdays as columns |
| Evidence | `ui/widgets/calendar-heatmap.tsx`; `ui/widgets/stats-widgets.test.tsx` ("CalendarHeatmap"); `analytics.test.tsx` ("ReadsHeatmap") |

| Field | SCR-STAT-01-A06 Inspect a funnel step |
| --- | --- |
| Trigger | Press a chapter step (`aria-pressed`); press again to return |
| Expected behavior | The status line (polite live region) shows "Chapter n · title: n reads, x% of chapter 1, −y% compared with chapter n−1."; otherwise the summary "Chapter N has x% of chapter 1's reads. Biggest drop at chapter k: −y% …" (or "only one chapter" / "no basis" / "no chapter has fewer reads" variants) |
| Evidence | `components/read-through-funnel.tsx`, `ui/widgets/funnel-steps.tsx`; `analytics.test.tsx` ("sums up the read-through …") |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Auth skeleton |
| Loading | Implemented | Per-section skeletons (`aria-busy`) |
| Empty | Implemented | "No activity in this range yet." / "No chapters have been published yet." |
| Populated | Implemented | Totals, chart, heatmap, funnel, table |
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
- SCR-STAT-01-AC10 Given I use a keyboard or touch, Then I can read each day's values: ←/→ on a focused chart (or dragging on it) moves one cursor through all three charts and the day is announced; "Show as table" lists the same numbers (U-STAT-02, resolved).
- SCR-STAT-01-AC11 Given chapters 1–3 have 80, 60 and 40 reads, Then the funnel reads "Chapter 3 has 50% of chapter 1's reads" and highlights chapter 3 (−33%, the biggest drop).
- SCR-STAT-01-AC12 Given a chapter was first published on a day in the range, Then that day carries a flag and its readout and table row say "Chapter n published".
- SCR-STAT-01-AC13 Given I switch from 30 to 7 days, Then the chart is not replaced by a skeleton and the 7 remaining bars morph into place (no motion with reduced motion).
- SCR-STAT-01-AC14 Given I switch ranges, Then each total counts from the old range's figure to the new one in about 0.75 s (reduced motion: it jumps), And it does not count on the first load, And a screen reader reads only the final number.
- SCR-STAT-01-AC15 Given the 30-day charts, When I drag across 5 days with a mouse (or Shift+←/→ then Enter, or pick a day and press "Zoom in"), Then all three charts show only those days rescaled, And "Show all" brings back the 30 days.
- SCR-STAT-01-AC16 Given any range is selected, Then the heatmap shows the last 90 UTC days, And pressing a square (or moving to it with the arrow keys) shows that day's reads, likes and comments.

## F. Findings referenced
U-STAT-01, U-STAT-02, F-STM-06.

## G. Open questions
Q-STAT-01.
