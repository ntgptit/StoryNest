# SCR-PRF-01 — My profile

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-PRF-01` |
| Business domain | [D-ACCOUNT Account & Identity](../../overview.md) |
| Business object | [OBJ-PRF](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | `/me` (protected) |
| Route file | `apps/web/src/app/(main)/me/page.tsx` (Server Component: `requireUser`, reads profile) |
| Screen component | `apps/web/src/app/(main)/me/me-view.tsx` (`MeView`, web-only client view; texts in `packages/features/src/shell/strings*.ts` under `me.*`) |
| Roles | Member |
| Workflows | WF-PRF-01, WF-PRF-02 (entry) |
| Page title | "Hồ sơ · StoryNest", noindex |
| Entry points | Bottom nav "Me" (mobile only), account menu "Profile" |

Note: unlike other screens this one is not a router-agnostic `packages/features` screen (WBS Q1 pattern); the mobile app will need its own.

## B. Components
| ID | Component | Notes / text (en; vi key `shell.me.*`) |
| --- | --- | --- |
| SCR-PRF-01-C01 | Page header | "Your profile" / "Account information." |
| SCR-PRF-01-C02 | "Edit profile" button → `/me/edit` | Always shown, even when the profile is missing |
| SCR-PRF-01-C03 | Definition list | "Display name", "Username" (`@username`), "Email" ("—" if none), "About" (bio with line breaks, or "No bio yet.") |
| SCR-PRF-01-C04 | Missing-profile message | "No profile was found for this account." |
| SCR-PRF-01-C05 | Reading habits panel (batch 4 habits4, `ReadingHabitsPanel` via `me-habits.tsx`) | "Reading habits" / "Only you can see this."; skeleton while loading, error state with "Retry" (OBJ-HAB) |
| SCR-PRF-01-C06 | Streak flame (Lucian 379, `StreakFlame`) | Streak number + "day streak", Mon–Sun slots with a check per reading day, today ringed, "Full week!" badge, hint "Read a chapter today to keep it going." / "You've read today…" + "Longest: N days" (BR-HAB-002) |
| SCR-PRF-01-C07 | Daily rings (Lucian 099, `ActivityRings`) | "Daily goal": rings "Chapters read" and "Chapters finished" against the goal, last 7 days as mini rings (one tab stop, ←/→ Home/End), "Days the goal was met in the last 7: N", link "Change goal" → `/settings` (BR-HAB-003) |
| SCR-PRF-01-C08 | Reading level (Lucian 372, `XpBar`) | Display name, "N chapters · N reading days", LEVEL number, progress bar "Experience" "into / needed XP", "N XP to the next level", rule chips +10 / +20 / +100 XP (BR-HAB-004) |
| SCR-PRF-01-C09 | Badges (Lucian 386, `AchievementBadges`) | "Badges" "n/6 earned"; locked: grey medal, padlock, progress "x/y"; earned: colour, press to flip to what earned it and "Earned <date>" (BR-HAB-005) |

Not present: avatar, link to the public author page, link to Settings / sign-out, writing stats (U-PRF-01). Reading stats arrived with C05–C09.

## C. User actions & system responses

| Field | SCR-PRF-01-A01 Edit profile |
| --- | --- |
| Trigger | "Edit profile" |
| Preconditions | — |
| Expected behavior | Navigate to SCR-PRF-02 |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/me/edit` |
| Evidence | `me-view.tsx:19-27`, `me-view.test.tsx:45` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial / Populated | Implemented | Server-rendered data |
| Loading | Implemented | Generic `(main)/loading.tsx` card-grid skeleton (not page-shaped, U-SHELL-03) |
| Empty | Implemented | Bio empty → "No bio yet." |
| Validation error | Not applicable | |
| Request error | Missing | Query error is ignored and shown as "No profile was found…" (`page.tsx:15-19`, F-PRF-01) |
| Success | Not applicable | |
| Disabled | Not applicable | |
| Unauthorized | Implemented | Proxy + `requireUser` → `/login?next=%2Fme` |
| Offline | Not applicable | Server-rendered; navigation fails at framework level |
| Unsaved changes | Not applicable | |

## E. Acceptance criteria
- SCR-PRF-01-AC01 Given a signed-in member, when opening `/me`, then display name, `@username`, email and bio are shown with labels in the current language.
- SCR-PRF-01-AC02 Given an empty bio, then "No bio yet." is shown.
- SCR-PRF-01-AC03 Given a guest, when opening `/me`, then they are redirected to `/login?next=%2Fme`.
- SCR-PRF-01-AC04 Given the user saved WF-PRF-02, when `/me` re-renders, then the new values are shown (router refresh).
- SCR-PRF-01-AC05 Given I read chapters on 4 consecutive UTC days up to today, when opening `/me`, then the flame shows 4 with this week's read days checked; nothing animates on load (BR-HAB-002).
- SCR-PRF-01-AC06 Given another member, when they query my habits tables, then they get no rows; my habits never appear on my public author page (BR-HAB-007).
- SCR-PRF-01-AC07 Given a badge I have not earned, then it shows locked with my progress; given an earned one, pressing it flips to its description and earned date (BR-HAB-005).
- SCR-PRF-01-AC08 Given 30 chapters read, 12 finished and 2 finished stories, then the level card shows level 5 with 40 / 300 XP (BR-HAB-004).
- SCR-PRF-01-AC05 [Proposed] Given the profile query fails, then an error state with "Try again" is shown instead of "No profile was found" (F-PRF-01).
- SCR-PRF-01-AC06 [Proposed] Given a member, then `/me` shows their avatar and links to their public page `/author/<username>`, Settings and Sign out (U-PRF-01).

## F. Findings referenced
F-PRF-01, U-PRF-01, U-SHELL-03.

## G. Open questions
—
