# SCR-AUTH-03 — Forgot password

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-AUTH-03` |
| Business domain | [D-ACCOUNT Account & Identity](../../overview.md) |
| Business object | [OBJ-AUTH](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | `/forgot-password` |
| Route file | `apps/web/src/app/(auth)/forgot-password/page.tsx` (+ `apps/web/src/app/(auth)/auth-pages.tsx:46-48`) |
| Screen component | `packages/features/src/auth/screens/forgot-password-screen.tsx` (`ForgotPasswordScreen`) |
| Roles | Guest and member (not guest-only, BR-AUTH-009) |
| Workflows | WF-AUTH-04 |
| Page title | "Quên mật khẩu · StoryNest", noindex |

## B. Components
| ID | Component | Notes / text |
| --- | --- | --- |
| SCR-AUTH-03-C01 | Heading + description | "Forgot password" / "Enter your email and we'll send you a link to reset your password." |
| SCR-AUTH-03-C02 | Error banner | BR-AUTH-013 |
| SCR-AUTH-03-C03 | Email input | "Email" |
| SCR-AUTH-03-C04 | Submit | "Send link" / "Sending…" |
| SCR-AUTH-03-C05 | Footer link | "Back to sign in" → `/login` |
| SCR-AUTH-03-C06 | Sent card (`role="status"`) | "Instructions sent" / "If this email has an account, you'll get a password reset link within a few minutes." |
| SCR-AUTH-03-C07 | Email typo suggestion (Lucian 264) | As SCR-AUTH-01-C10 (BR-AUTH-001) |
| SCR-AUTH-03-C09 | Lockout countdown (Lucian 067, batch 3 · shell3) | On the request form: as SCR-AUTH-01-C11, without the reset link. On the sent card a resend that is refused with a named wait restarts the "Resend in {n} s" ring for that wait instead |
| SCR-AUTH-03-C08 | Sent card extras (Lucian 064) | Envelope animation, the address, spam hint, "Resend email" (locked "Resend in {n} s" with a ring for 60 s, `aria-disabled`; after a resend "Email sent again." and the envelope replays; errors in the alert banner), "Use a different email" → form (BR-AUTH-014) |

## C. User actions & system responses

| Field | SCR-AUTH-03-A01 Request reset link |
| --- | --- |
| Trigger | "Send link" |
| Preconditions | — |
| Expected behavior | `resetPasswordForEmail(email, { redirectTo: /auth/callback?next=%2Freset-password })` → C06 |
| State change | Supabase sends email (if account exists) |
| Validation | BR-AUTH-001 |
| Error behavior | Rate limit / network / generic banner; same success message whether or not the account exists (BR-AUTH-014) |
| Navigation | Stays; C06 replaces the form |
| Evidence | `forgot-password-screen.tsx:19-40`, `use-auth-actions.ts:40-52`, `auth-screens.test.tsx:222-252` |

| Field | SCR-AUTH-03-A02 Back to sign in |
| --- | --- |
| Trigger | Footer link |
| Preconditions | — |
| Expected behavior | Navigate to `/login` |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | SCR-AUTH-01 |
| Evidence | `forgot-password-screen.tsx:30` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | |
| Loading | Implemented | `aria-busy`, disabled, "Sending…" |
| Empty / Populated | Not applicable | |
| Validation error | Implemented | |
| Request error | Implemented | |
| Success | Implemented | C06 card |
| Disabled | Implemented | |
| Unauthorized | Not applicable | |
| Offline | Implemented | |
| Unsaved changes | Not applicable | |
| Resend / cooldown | Missing | After C06 there is no "send again" or cooldown hint; user must reload (Recommended) |

## E. Acceptance criteria
- SCR-AUTH-03-AC01 Given a registered email, when submitting, then a reset email whose link ends on `/reset-password` is sent and C06 shows.
- SCR-AUTH-03-AC02 Given an unregistered email, when submitting, then the identical C06 text shows.
- SCR-AUTH-03-AC03 Given an invalid email, then "Invalid email address." shows and nothing is sent.
- SCR-AUTH-03-AC04 Given Supabase returns a rate limit, then "You're going too fast. Try again in a few minutes." shows.
- SCR-AUTH-03-AC05 [Proposed] Given C06 is shown, when 60 s have passed, then a "Send again" action is available.

## F. Findings referenced
F-AUTH-04.

## G. Open questions
Q-AUTH-02.
