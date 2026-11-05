# SCR-AUTH-01 — Sign in

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-AUTH-01` |
| Business domain | [D-ACCOUNT Account & Identity](../../overview.md) |
| Business object | [OBJ-AUTH](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | `/login[?next=<path>][&error=callback]` |
| Route file | `apps/web/src/app/(auth)/login/page.tsx` (+ wrapper `apps/web/src/app/(auth)/auth-pages.tsx:18-30`, layout `apps/web/src/app/(auth)/layout.tsx`) |
| Screen component | `packages/features/src/auth/screens/sign-in-screen.tsx` (`SignInScreen`) |
| Roles | Guest only (signed-in → redirected to `next`, BR-AUTH-009) |
| Workflows | WF-AUTH-03, WF-AUTH-05, WF-AUTH-02 (failure landing), WF-AUTH-04 (entry) |
| Page title | "Đăng nhập · StoryNest" (server, always Vietnamese), noindex |

## B. Components
| ID | Component | Notes / text (en, vi key) |
| --- | --- | --- |
| SCR-AUTH-01-C01 | Brand link "StoryNest" → `/` | Auth layout, not translated (brand) |
| SCR-AUTH-01-C02 | Card heading (h1) + description | "Sign in" / "Welcome back." (`signIn.title`, `signIn.description`) |
| SCR-AUTH-01-C03 | Notice banner (`role="status"`) | Only with `?error=callback`: "The sign-in link is invalid or has expired. Please try again." (`notices.callbackFailed`) |
| SCR-AUTH-01-C04 | Error banner (`role="alert"`) | BR-AUTH-013 texts |
| SCR-AUTH-01-C05 | Email input | label "Email", `type=email`, `autocomplete=email`, no autocapitalise/spellcheck |
| SCR-AUTH-01-C06 | Password input with show/hide toggle | label "Password", `autocomplete=current-password`, toggle "Show password"/"Hide password" |
| SCR-AUTH-01-C07 | "Forgot password?" link → `/forgot-password` | `signIn.forgot` (does not carry `next`) |
| SCR-AUTH-01-C08 | Submit button | "Sign in" / pending "Signing in…" |
| SCR-AUTH-01-C09 | Footer | "Don't have an account?" + "Sign up" → `/register[?next]` |
| SCR-AUTH-01-C10 | Email typo suggestion (Lucian 264) | Under the email field, `aria-live="polite"`: button "Did you mean {address}?" with the corrected letters marked; one press fills the field (BR-AUTH-001) |

## C. User actions & system responses

| Field | SCR-AUTH-01-A01 Submit credentials |
| --- | --- |
| Trigger | Click "Sign in" or Enter |
| Preconditions | Form rendered |
| Expected behavior | Client validation, then `signInWithPassword`; on success `navigation.replace(safeRedirectPath(next))` + `refresh()` |
| State change | Session cookie set; AuthProvider → authenticated |
| Validation | BR-AUTH-001 (email), BR-AUTH-002 sign-in variant (non-empty, ≤ 72 bytes) |
| Error behavior | Banner per BR-AUTH-013; form values kept; button re-enabled; no auto-retry |
| Navigation | `next` (default `/`) |
| Evidence | `sign-in-screen.tsx:32-37,50,106-108`, `auth-pages.tsx:18-30`, `auth-screens.test.tsx:76-139` |

| Field | SCR-AUTH-01-A02 Toggle password visibility |
| --- | --- |
| Trigger | Eye button in password field |
| Preconditions | — |
| Expected behavior | Switches input type; accessible name flips "Show password" ↔ "Hide password" |
| State change | Local only |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `sign-in-screen.tsx:92-97`, `auth-screens.test.tsx:150-158` |

| Field | SCR-AUTH-01-A03 Go to sign-up |
| --- | --- |
| Trigger | Footer "Sign up" |
| Preconditions | — |
| Expected behavior | Navigates to `/register`, keeping a safe non-root `next` |
| State change | — |
| Validation | `withNext` drops unsafe or `/` values |
| Error behavior | — |
| Navigation | `/register[?next]` |
| Evidence | `sign-in-screen.tsx:43-47`, `auth-urls.ts:10-14`, `auth-screens.test.tsx:141-148` |

| Field | SCR-AUTH-01-A04 Forgot password |
| --- | --- |
| Trigger | "Forgot password?" |
| Preconditions | — |
| Expected behavior | Navigates to SCR-AUTH-03 |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/forgot-password` (the original `next` is lost) |
| Evidence | `sign-in-screen.tsx:103-105` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Empty fields; notice only with `error=callback` |
| Loading (submitting) | Implemented | `aria-busy`, disabled button, "Signing in…" (`sign-in-screen.tsx:50,106-108`) |
| Empty | Not applicable | |
| Populated | Not applicable | |
| Validation error | Implemented | Inline `FormMessage` per field, translated codes |
| Request error | Implemented | `FormError` banner |
| Success | Implemented | Immediate navigation (no toast) |
| Disabled | Implemented | Submit disabled while pending |
| Unauthorized | Not applicable | Signed-in visitors are redirected by the proxy |
| Offline | Implemented | Network error → "No connection. Check your network and try again." |
| Unsaved changes | Not applicable | |
| Already signed in in another tab | Missing | Page keeps showing the form until navigation (proxy only acts on requests) — Inferred |

## E. Acceptance criteria
- SCR-AUTH-01-AC01 Given a confirmed account, when the user submits the right email/password, then they are taken to `next` (or `/`) and the header shows the avatar menu.
- SCR-AUTH-01-AC02 Given `next=//evil.com` or `https://evil.com`, when sign-in succeeds, then the user lands on `/`.
- SCR-AUTH-01-AC03 Given an invalid email format, when submitting, then "Invalid email address." shows and no request is made.
- SCR-AUTH-01-AC04 Given a wrong password, when submitting, then "Incorrect email or password." shows and the fields keep their values.
- SCR-AUTH-01-AC05 Given an unconfirmed email, when submitting, then "Your email isn't confirmed yet. Open the link in your sign-up email." shows.
- SCR-AUTH-01-AC06 Given `?error=callback`, when the page opens, then the callback notice is shown above the form.
- SCR-AUTH-01-AC07 Given a signed-in user, when opening `/login?next=%2Flibrary`, then they are redirected to `/library`.
- SCR-AUTH-01-AC08 Given a request in flight, then the submit button is disabled and reads "Signing in…".
- SCR-AUTH-01-AC09 [Proposed] Given an unconfirmed email error, when the user clicks "Resend confirmation email", then a new link is sent and a neutral confirmation is shown (F-AUTH-03).
- SCR-AUTH-01-AC10 [Proposed] Given Google OAuth is configured, when the user clicks "Continue with Google", then WF-AUTH-07 runs and returns to `next` (F-AUTH-02).
- SCR-AUTH-01-AC11 [Proposed] Given the page is open, the language can be switched from the auth layout (U-AUTH-01).

## F. Findings referenced
F-AUTH-02, F-AUTH-03, F-AUTH-04, F-AUTH-08, U-AUTH-01, U-SHELL-04 (see the findings register).

## G. Open questions
Q-AUTH-02 (Supabase Auth project settings are not in the repo).
