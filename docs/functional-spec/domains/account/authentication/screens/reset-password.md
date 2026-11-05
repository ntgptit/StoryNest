# SCR-AUTH-04 — Reset password

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-AUTH-04` |
| Business domain | [D-ACCOUNT Account & Identity](../../overview.md) |
| Business object | [OBJ-AUTH](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | `/reset-password` |
| Route file | `apps/web/src/app/(auth)/reset-password/page.tsx` (+ `apps/web/src/app/(auth)/auth-pages.tsx:50-59`) |
| Screen component | `packages/features/src/auth/screens/reset-password-screen.tsx` (`ResetPasswordScreen`) |
| Roles | Any session (recovery session from the email link, or a normal session); guests see the invalid-link card |
| Workflows | WF-AUTH-04 |
| Page title | "Đặt mật khẩu mới · StoryNest", noindex |

## B. Components
| ID | Component | Notes / text |
| --- | --- | --- |
| SCR-AUTH-04-C01 | Loading skeleton | While session state is `loading` |
| SCR-AUTH-04-C02 | Invalid-link card | "This link is invalid or has expired" / "Please request a new password reset link." + "Request a new link" → `/forgot-password` |
| SCR-AUTH-04-C03 | Heading + description | "Set a new password" / "Choose a new password for your account." |
| SCR-AUTH-04-C04 | Error banner | BR-AUTH-013 |
| SCR-AUTH-04-C05 | New password + toggle | "New password", `autocomplete=new-password` |
| SCR-AUTH-04-C06 | Confirm password + toggle | "Confirm password" |
| SCR-AUTH-04-C07 | Submit | "Change password" / "Saving…" |
| SCR-AUTH-04-C08 | Password strength meter (Lucian 036) | As SCR-AUTH-02-C11, under "New password"; advisory only (BR-AUTH-002) |

## C. User actions & system responses

| Field | SCR-AUTH-04-A01 Change password |
| --- | --- |
| Trigger | "Change password" |
| Preconditions | Session present |
| Expected behavior | `updateUser({ password })` → toast "Password changed." → `replace('/')` + `refresh()` |
| State change | Password updated; user remains signed in |
| Validation | BR-AUTH-002 (new password); confirmation must match → "Passwords don't match." on the confirm field |
| Error behavior | `same_password`, `weak_password`, network, session expired ("The link has expired. Request a new one.") |
| Navigation | `/` |
| Evidence | `reset-password-screen.tsx:28-40,52-98`, `packages/validation/src/auth.ts:60-62`, `auth-screens.test.tsx:254-300` |

| Field | SCR-AUTH-04-A02 Request a new link |
| --- | --- |
| Trigger | Link on C02 |
| Preconditions | No session |
| Expected behavior | Navigate to SCR-AUTH-03 |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/forgot-password` |
| Evidence | `reset-password-screen.tsx:45-50` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Form (with session) |
| Loading | Implemented | C01 skeleton; submit pending text |
| Empty / Populated | Not applicable | |
| Validation error | Implemented | |
| Request error | Implemented | |
| Success | Implemented | Toast + redirect |
| Disabled | Implemented | |
| Unauthorized | Implemented | C02 card for no session |
| Offline | Implemented | Network message |
| Unsaved changes | Not applicable | |
| Recovery vs normal session distinguished | Missing | Any signed-in session can change the password here without the current password (F-AUTH-05) |

## E. Acceptance criteria
- SCR-AUTH-04-AC01 Given a recovery session, when entering matching 8+ char passwords, then the password changes, a "Password changed." toast shows and the user lands on `/` signed in.
- SCR-AUTH-04-AC02 Given no session, when opening the page, then C02 is shown with a link to `/forgot-password`.
- SCR-AUTH-04-AC03 Given mismatching passwords, then "Passwords don't match." shows on the confirmation field and nothing is sent.
- SCR-AUTH-04-AC04 Given the old password is reused, then "The new password must be different from the old one." shows.
- SCR-AUTH-04-AC05 [Proposed] Given a normal (non-recovery) session, when the user wants to change their password, then they must re-enter the current password or reauthenticate (F-AUTH-05).

## F. Findings referenced
F-AUTH-04, F-AUTH-05.

## G. Open questions
Q-AUTH-02 (is Supabase "secure password change" enabled?).
