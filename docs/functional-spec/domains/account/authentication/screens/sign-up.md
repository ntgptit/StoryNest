# SCR-AUTH-02 — Sign up

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-AUTH-02` |
| Business domain | [D-ACCOUNT Account & Identity](../../overview.md) |
| Business object | [OBJ-AUTH](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | `/register[?next=<path>]` |
| Route file | `apps/web/src/app/(auth)/register/page.tsx` (+ `apps/web/src/app/(auth)/auth-pages.tsx:32-44`) |
| Screen component | `packages/features/src/auth/screens/sign-up-screen.tsx` (`SignUpScreen`) |
| Roles | Guest only (BR-AUTH-009) |
| Workflows | WF-AUTH-01, WF-AUTH-02 |
| Page title | "Đăng ký · StoryNest", noindex |

## B. Components
| ID | Component | Notes / text (en, vi key) |
| --- | --- | --- |
| SCR-AUTH-02-C01 | Heading + description | "Create an account" / "Read, write and share your stories." (`signUp.title/description`) |
| SCR-AUTH-02-C02 | Error banner | BR-AUTH-013 |
| SCR-AUTH-02-C03 | Email input | "Email" |
| SCR-AUTH-02-C04 | Password input + toggle + hint | "Password", hint "At least 8 characters.", `autocomplete=new-password` |
| SCR-AUTH-02-C05 | Username input + hint | "Username (optional)", hint "Letters, numbers and underscores, 3-30 characters. Leave blank to generate one." |
| SCR-AUTH-02-C06 | Display name input | "Display name (optional)", `autocomplete=name` |
| SCR-AUTH-02-C07 | Submit | "Sign up" / "Creating account…" |
| SCR-AUTH-02-C08 | Footer | "Already have an account?" + "Sign in" → `/login[?next]` |
| SCR-AUTH-02-C09 | "Check your email" card (`role="status"`) | "Check your email" / "We've sent a confirmation link. Open the email and click the link to finish signing up." + address + "Sign in" link |
| SCR-AUTH-02-C10 | Email typo suggestion (Lucian 264) | As SCR-AUTH-01-C10 (BR-AUTH-001) |
| SCR-AUTH-02-C11 | Password strength meter (Lucian 036) | Shown once a password is typed: 4 bars, "Strength · advice only" + "Weak/Fair/Good/Strong" (`aria-live`), checklist "At least 8 characters", "Upper and lower case letters", "A number", "A symbol", hints. Advisory only (BR-AUTH-002) |
| SCR-AUTH-02-C13 | Username availability hint (Lucian 300, batch 3 · shell3) | Under the username field, 450 ms after typing stops and only for a valid name: small spinner "Checking the name…", then "This name looks free" (check) or "This name is taken. Pick another, or a random ending will be added to it." (cross); results spoken through a polite live region. Looks the name up in the public `app_users` read (case ignored). Advisory only: never blocks submit; a taken name still signs up and the `handle_new_user` trigger adds `_xxxxxxxx` (suspended/deleted accounts are hidden by RLS, so "free" can be wrong) |
| SCR-AUTH-02-C14 | Lockout countdown (Lucian 067) | As SCR-AUTH-01-C11, without the reset link |
| SCR-AUTH-02-C15 | First-run intro flag (Lucian 383) | A successful sign-up marks the intro as due on this device (`localStorage` `storynest.firstRunIntro`); the shell shows it once signed in (SCR-SHELL-01-C19) |
| SCR-AUTH-02-C12 | Check-your-email extras (Lucian 064) | Envelope animation (decorative, plays once), hint "No email? Look in your spam or promotions folder. If the address was wrong, use a different email.", button "Use a different email" → back to the filled form. No resend (BR-AUTH-005) |

No password confirmation field, no terms/privacy consent (WBS 6.9 legal pages ⬜), no captcha (F-AUTH-06).

## C. User actions & system responses

| Field | SCR-AUTH-02-A01 Submit sign-up |
| --- | --- |
| Trigger | "Sign up" |
| Preconditions | — |
| Expected behavior | Validates, calls `signUp` with `emailRedirectTo=/auth/callback?next=<next>` and non-empty metadata. No session → C09 card; session → `replace(next)` + `refresh()` |
| State change | `auth.users` + `app_users` created (BR-AUTH-004) |
| Validation | BR-AUTH-001, BR-AUTH-002, BR-AUTH-003 |
| Error behavior | Banner: "This email is already registered.", weak password, rate limit, network, generic |
| Navigation | C09 card, or `next` |
| Evidence | `sign-up-screen.tsx:38-60,74`, `auth.api.ts:19-35`, `auth-screens.test.tsx:160-220` |

| Field | SCR-AUTH-02-A02 Go to sign-in |
| --- | --- |
| Trigger | Footer or C09 "Sign in" |
| Preconditions | — |
| Expected behavior | `/login` with safe `next` |
| State change | — |
| Validation | `withNext` |
| Error behavior | — |
| Navigation | SCR-AUTH-01 |
| Evidence | `sign-up-screen.tsx:53,66-69` |

| Field | SCR-AUTH-02-A03 Toggle password visibility |
| --- | --- |
| Trigger | Eye button |
| Preconditions | — |
| Expected behavior | As SCR-AUTH-01-A02 |
| State change | Local |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `sign-up-screen.tsx:102-107` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Empty form |
| Loading | Implemented | `aria-busy`, disabled, "Creating account…" |
| Empty / Populated | Not applicable | |
| Validation error | Implemented | Per field |
| Request error | Implemented | Banner |
| Success | Implemented | C09 card (confirmation) or redirect |
| Disabled | Implemented | While pending |
| Unauthorized | Not applicable | |
| Offline | Implemented | Network message |
| Unsaved changes | Not applicable | |
| Username availability feedback | Missing | Taken/sanitised usernames are changed silently by the trigger (F-AUTH-01) |

## E. Acceptance criteria
- SCR-AUTH-02-AC01 Given valid email and an 8+ char password, when submitting with confirmation enabled, then "Check your email" shows the address and an email link to `/auth/callback?next=…` is sent.
- SCR-AUTH-02-AC02 Given a 7-char password, then "Password must be at least 8 characters." shows and no request is made.
- SCR-AUTH-02-AC03 Given username "ab", then the username rule message shows.
- SCR-AUTH-02-AC04 Given blank optional fields, then no `username`/`display_name` metadata is sent and the trigger derives them (email local part).
- SCR-AUTH-02-AC05 Given an already registered email, then "This email is already registered." shows (when Supabase reports it).
- SCR-AUTH-02-AC06 Given confirmation disabled in the project, when sign-up returns a session, then the user goes straight to `next`.
- SCR-AUTH-02-AC07 Given a username that is taken (case-insensitive), then the account is still created with a suffixed username.
- SCR-AUTH-02-AC08 [Proposed] Given a requested username that will be changed (taken, upper-case, > 20 chars), then the user is told the final username before or after sign-up (F-AUTH-01).
- SCR-AUTH-02-AC09 [Proposed] Given captcha is enabled, then sign-up requires a valid captcha token (F-AUTH-06).

## F. Findings referenced
F-AUTH-01, F-AUTH-02, F-AUTH-04, F-AUTH-06, U-AUTH-01.

## G. Open questions
Q-AUTH-02.
