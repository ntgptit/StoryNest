# OBJ-HAB — Reading habits: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-HAB` |
| Name | Reading habits: per-day reading record, streak, daily goal, reading level (XP) and achievement badges |
| Business purpose | Encourage regular reading with feedback that belongs to the reader alone: no rankings, no rewards, nothing shown to others. |
| User goals | "Keep my streak", "reach today's goal", "see how far I have come". |
| Actors / roles | Member (reads their own habits, sets their goal); System (triggers on the existing read and progress paths). Guests have no habits. |
| Related entities | `user_reading_days`, `user_reading_stats`, `user_achievements` (owner-readable), `user_finished_chapters`, `user_finished_stories` (internal), `user_settings.daily_chapter_goal`; functions `refresh_reading_habits`, `habits_mark_story_finished`; triggers `chapter_read_events_habits`, `user_chapter_progress_habits`, `user_settings_habits` |
| Dependencies | OBJ-PROG (`record_chapter_read` = BR-PROG-010/011 is the only source of reading days; `save_reading_progress` completion = BR-PROG-004 is the source of finished chapters), OBJ-SET (the goal is a column of the settings row), OBJ-STORY (`stories.status = 'completed'`) |
| Screens | [SCR-PRF-01 My profile](../../account/profile/screens/my-profile.md) (panel), [SCR-LIB-01 Library](../../library/library/screens/library.md) (chip), [SCR-SET-01 Settings](../../account/settings/screens/settings.md) (goal) |
| Migration | `supabase/migrations/20261106020000_reading_habits.sql` (rollback statements in its header), tests `supabase/tests/400_reading_habits.test.sql` |

### Rule index

| ID | Name | Status |
| --- | --- | --- |
| BR-HAB-001 | A reading day is a UTC day with at least one counted read | Verified (SQL test) |
| BR-HAB-002 | Streak | Verified (SQL test + unit test) |
| BR-HAB-003 | Daily goal and today's rings | Verified (SQL test + unit test) |
| BR-HAB-004 | XP and level are derived, never stored | Verified (unit test) |
| BR-HAB-005 | Achievements: fixed set, awarded by the server, never revoked | Verified (SQL test) |
| BR-HAB-006 | Finished chapters and finished stories | Verified (SQL test) |
| BR-HAB-007 | Privacy: owner-only, no client writes | Verified (SQL test) |
| BR-HAB-008 | Backfill, retention and rollback | Verified (code) |

### BR-HAB-001 — A reading day is a UTC day with at least one counted read
| Field | Value |
| --- | --- |
| Description | Each NEW signed-in read event (`chapter_read_events`, already deduped per reader x chapter x UTC day by BR-PROG-010) adds 1 to `user_reading_days.chapters_read` of that reader and day, in the same transaction (AFTER INSERT trigger). |
| Preconditions | Signed-in reader; chapter readable and published (BR-PROG-011). |
| Conditions | Guest events (`is_anonymous`) are never attributed to anybody, even when the anonymous id equals an account id. |
| Expected behavior | Re-opening a chapter the same day changes nothing. Days are UTC days, the same boundary the read dedupe uses (in Vietnam the day turns at 07:00 local time). |
| Exceptions | A day can exist with `chapters_read = 0` and `chapters_finished > 0` (finished without a counted read); it is not a reading day. |
| Related screens | SCR-PRF-01, SCR-LIB-01 |
| Evidence | migration §3 `habits_count_read`, §5 trigger; `400_reading_habits.test.sql` §1, §5 |
| Status | Verified (SQL test) |

### BR-HAB-002 — Streak
| Field | Value |
| --- | --- |
| Description | A streak is a run of consecutive reading days. The server stores the run ending on `last_read_day` (`current_streak`) and the longest run ever (`longest_streak`). |
| Expected behavior | The app shows the streak as alive while `last_read_day` is today or yesterday (UTC), and 0 once a whole day was missed; "read today" is shown when `last_read_day` is today. The week strip is the current Monday–Sunday week. |
| Exceptions | An older separate run never joins the current one. |
| Related screens | SCR-PRF-01 (flame), SCR-LIB-01 (chip) |
| Evidence | `refresh_reading_habits` (gaps and islands); `packages/features/src/reading-habits/model/habits.ts` `toStreak`, `toWeek`; SQL test §5; `reading-habits.test.tsx` "keeps a streak alive…" |
| Status | Verified (SQL test + unit test) |

### BR-HAB-003 — Daily goal and today's rings
| Field | Value |
| --- | --- |
| Description | `user_settings.daily_chapter_goal`: chapters a day, 1–20 (CHECK), default 3 (no settings row = 3). Saved with the other settings by the owner only (RLS `user_settings_own`); only that column is sent. |
| Expected behavior | Two rings per day against the goal: chapters read (BR-HAB-001) and chapters finished (BR-HAB-006). The day picker covers the last 7 UTC days, today last; a ring past the goal laps. Changing the goal updates the rings at once (optimistic) and re-reads the habits after saving. |
| Exceptions | Goal 0 or 21 → `23514`; another account's row → `42501`. A refused save restores the previous goal with a toast. |
| Related screens | SCR-SET-01 (stepper), SCR-PRF-01 (rings) |
| Evidence | migration §1; `packages/validation/src/reading-habits.ts` `DAILY_GOAL` (checked against the migration in `validation.test.ts`); SQL test §6; `reading-habits.test.tsx` "steps the daily goal" |
| Status | Verified (SQL test + unit test) |

### BR-HAB-004 — XP and level are derived, never stored
| Field | Value |
| --- | --- |
| Description | XP = 10 x chapters read (sum of daily counts, so a chapter re-read on another day counts again) + 20 x chapters finished + 100 x stories finished, from `user_reading_stats`. Level L needs 100 + 50 x (L − 1) XP to reach L + 1 (100, 150, 200…); level 1 at 0 XP. |
| Expected behavior | Nothing is written for XP: there is no ledger and nothing to drift. The rules live in one place (`XP_RULES`, `levelFor`) used by web and mobile. |
| Exceptions | XP never decreases: its inputs are durable (BR-HAB-006). |
| Related screens | SCR-PRF-01 (XP bar) |
| Evidence | `model/habits.ts` `XP_RULES`, `xpFor`, `levelFor`; `reading-habits.test.tsx` "derives XP and level" |
| Status | Verified (unit test) |

### BR-HAB-005 — Achievements: fixed set, awarded by the server, never revoked
| Field | Value |
| --- | --- |
| Description | Six badges (`user_achievements.code` CHECK): `first_chapter` (1 finished chapter), `daily_goal` (a day whose chapters read reach the current goal), `streak_7` / `streak_30` (longest streak ≥ 7 / 30), `first_story` / `stories_10` (finished stories ≥ 1 / 10). `earned_at` is set by `refresh_reading_habits`, which runs after every new read, first completion and goal change. |
| Expected behavior | Earned once, kept forever (raising the goal later does not take `daily_goal` back). Locked badges show progress computed by the app from the same thresholds (`ACHIEVEMENT_THRESHOLDS`, checked against the migration); the app never shows a badge as earned that the server has not awarded. |
| Exceptions | Badges are private encouragement, not a currency: `completed_at` is client-writable for readable chapters (BR-PROG-004), so a user could award themselves badges; that affects nobody else, which is why nothing is attached to them. |
| Related screens | SCR-PRF-01 (badges) |
| Evidence | migration §3; SQL test §3–§7; `model/habits.ts` `toAchievements` |
| Status | Verified (SQL test) |

### BR-HAB-006 — Finished chapters and finished stories
| Field | Value |
| --- | --- |
| Description | The first time a chapter's progress has `completed_at` set, the chapter is recorded in `user_finished_chapters` (once per reader and chapter) and counted in that day's `chapters_finished`. The day is the server's UTC day at that moment, never the client-supplied `completed_at`. A story is finished when its author marked it `completed` and every published, non-deleted chapter is in the reader's finished list. |
| Expected behavior | Clearing reading history (deleting progress rows) does not take finished chapters back, and finishing again does not count twice. |
| Exceptions | A story marked `completed` only after the reader finished all its chapters counts at the reader's next first completion in it (not retroactively). An ongoing story never counts. |
| Related screens | SCR-PRF-01 |
| Evidence | migration §3 `habits_count_finished`, `habits_mark_story_finished`; SQL test §3–§4 |
| Status | Verified (SQL test) |

### BR-HAB-007 — Privacy: owner-only, no client writes
| Field | Value |
| --- | --- |
| Description | RLS on every table; `authenticated` may only SELECT listed columns of its own rows in `user_reading_days`, `user_reading_stats`, `user_achievements`. `anon` has nothing. The finished tables and all functions are not reachable by API roles. |
| Expected behavior | Another member sees zero rows; insert/update/delete on any habits table is refused (`42501`); `refresh_reading_habits` cannot be called by clients. Nothing of this appears on public profiles, author pages or stats. |
| Related screens | SCR-PRF-01, SCR-LIB-01, SCR-SET-01 |
| Evidence | migration §2; SQL test §2, §6 |
| Status | Verified (SQL test) |

### BR-HAB-008 — Backfill, retention and rollback
| Field | Value |
| --- | --- |
| Description | On migration, existing signed-in read events (the last 90 days the purge keeps, BR-PROG-015) and existing completions are folded in once; badges earned by that history get the migration time as `earned_at`. Day rows and finished records are kept for the life of the account and cascade-delete with it. |
| Rollback | Drop the three triggers, the five functions, the five tables and `user_settings.daily_chapter_goal` (exact statements at the top of the migration). Read counting and progress are unaffected. |
| Evidence | migration header and §4; SQL test §8 |
| Status | Verified (code) |
