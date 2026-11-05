# OBJ-STAT — Author analytics: workflows

| ID | Name | Status |
| --- | --- | --- |
| WF-STAT-01 | View a story's statistics | Verified |
| WF-STAT-02 | Change the time range | Verified |

### WF-STAT-01 — View a story's statistics
| Field | Value |
| --- | --- |
| User goal | Understand how my story is read |
| Trigger | "Stats" on a Studio row (owner, co-author) → `/studio/story/{id}/stats` |
| Preconditions | Signed in (guest redirected to login); owner or co-author |
| Main flow | 1. Header "Story statistics" / "Who reads your story and where they stop." and "Back to Studio". 2. Both RPCs requested (30 days default). 3. Totals skeleton, chart skeleton, table skeleton while loading. 4. Totals (Reads, New likes, New comments), "By day" chart + note, "By chapter" table + retention note |
| Alternative flows | A1 No activity → "No activity in this range yet.". A2 No published chapter → "No chapters have been published yet." |
| Exception flows | E1 Editor → "You can't view these statistics". E2 Not a manager / missing → "Story not found". E3 Other → "Couldn't load statistics" + "Try again" |
| Success criteria | Numbers equal `chapter_stats` (per chapter) and the event tables (per day) |
| Postconditions | None |
| Affected objects | OBJ-STAT |
| Related screens | SCR-STM-01 → SCR-STAT-01 → SCR-STM-01 |
| Status | Verified — `story-stats-screen.tsx:66-242` |

### WF-STAT-02 — Change the time range
| Field | Value |
| --- | --- |
| User goal | Compare short- and long-term activity |
| Trigger | Tab "7 days" / "30 days" / "90 days" |
| Preconditions | Statistics shown |
| Main flow | 1. Tab selected. 2. `author_story_daily(story, days)` requested (cached per range). 3. Totals and chart update; the per-chapter table does not change |
| Alternative flows | — |
| Exception flows | Same as WF-STAT-01 E3 |
| Success criteria | Totals equal the sum of the selected days |
| Postconditions | Range not remembered between visits |
| Affected objects | OBJ-STAT |
| Related screens | SCR-STAT-01 |
| Status | Verified — `story-stats-screen.tsx:56-58,108-122`, `analytics.test.tsx:491` |
