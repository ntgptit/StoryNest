# SCR-PRF-01 — My profile

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-PRF-01` |
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

Not present: avatar, link to the public author page, link to Settings / sign-out, reading or writing stats (U-PRF-01).

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
- SCR-PRF-01-AC05 [Proposed] Given the profile query fails, then an error state with "Try again" is shown instead of "No profile was found" (F-PRF-01).
- SCR-PRF-01-AC06 [Proposed] Given a member, then `/me` shows their avatar and links to their public page `/author/<username>`, Settings and Sign out (U-PRF-01).

## F. Findings referenced
F-PRF-01, U-PRF-01, U-SHELL-03.

## G. Open questions
—
