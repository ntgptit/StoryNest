# OBJ-AUTH — Authentication: workflows

Rules: [business-rules.md](business-rules.md). Screens: [SCR-AUTH-01](screens/sign-in.md), [SCR-AUTH-02](screens/sign-up.md),
[SCR-AUTH-03](screens/forgot-password.md), [SCR-AUTH-04](screens/reset-password.md).

## WF-AUTH-01 — Sign up with email and password
| Field | Value |
| --- | --- |
| User goal | Create an account to write, follow and keep a library |
| Trigger | "Sign up" link on SCR-AUTH-01, or direct visit to `/register[?next=…]` |
| Preconditions | Guest (signed-in users are redirected away, BR-AUTH-009) |
| Main flow | 1. User fills email, password, optional username and display name. 2. Client validates (BR-AUTH-001..003). 3. `signUp` with `emailRedirectTo = /auth/callback?next=<next>` and metadata. 4. Supabase creates `auth.users`; trigger creates `app_users` (BR-AUTH-004). 5. No session returned → "Check your email" card with the address (BR-AUTH-005). 6. User continues with WF-AUTH-02 |
| Alternative flows | A1. Project without email confirmation: session returned → `replace(next)` + `refresh()`, user is signed in. A2. User follows "Sign in" footer link (keeps safe `next`) |
| Exception flows | E1. Validation error → field messages, no request. E2. `user_already_exists`/`email_exists` → "This email is already registered." E3. `weak_password` / rate limit / network → banner (BR-AUTH-013) |
| Success criteria | `auth.users` + `app_users` rows exist; user knows to check their email |
| Postconditions | Profile with derived username (possibly changed without notice, F-AUTH-01) |
| Affected objects | OBJ-AUTH, OBJ-PRF |
| Related screens | SCR-AUTH-02, SCR-AUTH-01 |
| Status | Verified (code + unit tests); end-to-end on real Supabase with SMTP not yet verified (`docs/WBS.md:137`) |

## WF-AUTH-02 — Open an email link (`/auth/callback`)
`GET /auth/callback` is a route handler, not a screen (`apps/web/src/app/auth/callback/route.ts:11-22`).

| Field | Value |
| --- | --- |
| User goal | Confirm the email address, or start a password reset |
| Trigger | Click on the link in the confirmation or reset email |
| Preconditions | Link issued by WF-AUTH-01 or WF-AUTH-04 in the same browser (PKCE code verifier) |
| Main flow | 1. Browser requests `/auth/callback?code=…&next=…`. 2. `next` sanitised (BR-AUTH-007). 3. `exchangeCodeForSession(code)` sets session cookies. 4. 302 to `next` (`/` or the page the user started from; `/reset-password` for resets) |
| Alternative flows | — |
| Exception flows | E1. No `code`, expired/used code, or other browser/device → 302 `/login?error=callback` → notice "The sign-in link is invalid or has expired. Please try again." (F-AUTH-04: for a confirmation link the email may in fact be confirmed). E2. Supabase `error` params are not read |
| Success criteria | Valid session cookie; user lands on `next` |
| Postconditions | Signed in (normal or recovery session) |
| Affected objects | OBJ-AUTH |
| Related screens | SCR-AUTH-01 (failure), SCR-AUTH-04 (reset) |
| Status | Verified (`apps/web/src/app/auth/callback/route.test.ts`) |

## WF-AUTH-03 — Sign in
| Field | Value |
| --- | --- |
| User goal | Access member features |
| Trigger | Header "Sign in" button (SCR-SHELL-01), redirect from a protected page, or link from SCR-AUTH-02/03 |
| Preconditions | Guest; account exists |
| Main flow | 1. User enters email + password. 2. Client validation (BR-AUTH-001/002). 3. `signInWithPassword`. 4. On success `replace(safe next)` + `refresh()` |
| Alternative flows | A1. Arrived with `?error=callback` → notice banner shown above the form. A2. "Forgot password?" → WF-AUTH-04. A3. "Sign up" → WF-AUTH-01 with same `next` |
| Exception flows | E1. Wrong credentials → "Incorrect email or password." E2. Unconfirmed → "Your email isn't confirmed yet…" (no resend, F-AUTH-03). E3. Rate limit / network → banner |
| Success criteria | Session established; user on intended page |
| Postconditions | `AuthProvider` = authenticated; LanguageSync applies the account language (WF-SET-04); header shows avatar menu |
| Affected objects | OBJ-AUTH, OBJ-SET, OBJ-SHELL |
| Related screens | SCR-AUTH-01 |
| Status | Verified; runtime sign-in/refresh/sign-out on real Supabase recorded in `docs/WBS.md:138` |

## WF-AUTH-04 — Forgot and reset password (cross-screen)
| Field | Value |
| --- | --- |
| User goal | Regain access without the old password |
| Trigger | "Forgot password?" on SCR-AUTH-01 |
| Preconditions | Knows the account email |
| Main flow | 1. SCR-AUTH-03: enter email → `resetPasswordForEmail(email, redirectTo=/auth/callback?next=/reset-password)`. 2. Neutral "Instructions sent" card (BR-AUTH-014). 3. User opens email link → WF-AUTH-02 → recovery session → `/reset-password`. 4. SCR-AUTH-04: new password + confirmation (must match). 5. `updateUser({ password })` → toast "Password changed." → home, signed in |
| Alternative flows | A1. "Back to sign in" from SCR-AUTH-03 |
| Exception flows | E1. Link expired/other device → `/login?error=callback` (not back to SCR-AUTH-03). E2. SCR-AUTH-04 opened without a session → "This link is invalid or has expired" + "Request a new link". E3. Same password → "The new password must be different from the old one." E4. Rate limit on step 1 |
| Success criteria | Password changed; user signed in |
| Postconditions | Other sessions are not revoked by the app (Unknown whether Supabase revokes them) |
| Affected objects | OBJ-AUTH |
| Related screens | SCR-AUTH-03, SCR-AUTH-04, SCR-AUTH-01 |
| Status | Verified (code + tests) |

## WF-AUTH-05 — Reach a protected page while signed out
| Field | Value |
| --- | --- |
| User goal | Open e.g. `/studio` or `/library?tab=saved` and continue there after signing in |
| Trigger | Link, bookmark, bottom-nav item (Library, Write, Me) |
| Preconditions | No valid session |
| Main flow | 1. Proxy matches a protected prefix (BR-AUTH-008) → 307 `/login?next=<path+query>`. 2. WF-AUTH-03. 3. `replace(next)` → page renders; `requireUser` passes (BR-AUTH-010) |
| Alternative flows | A1. Session expired between proxy and page → `requireUser` redirects the same way |
| Exception flows | E1. Unsafe `next` → home |
| Success criteria | User lands on the originally requested URL incl. query |
| Postconditions | — |
| Affected objects | OBJ-AUTH |
| Related screens | SCR-AUTH-01, any protected screen |
| Status | Verified (`apps/web/src/lib/auth/route-guard.test.ts:36-41`); WBS DoD 1.2 runtime check recorded |

Note: the header "Sign in" button links to plain `/login` (no `next`), so signing in from a public page (story, chapter) returns the user to home, not to that page — U-SHELL-04.

## WF-AUTH-06 — Sign out
| Field | Value |
| --- | --- |
| User goal | End the session (shared device, switch account) |
| Trigger | Account menu → "Sign out" |
| Preconditions | Signed in |
| Main flow | 1. `signOut()` (global scope). 2. `replace('/')` + `refresh()`. 3. Auth queries removed; header shows "Sign in" |
| Alternative flows | A1. Sign-out in another tab → this tab's `AuthProvider` becomes unauthenticated (no automatic navigation away from a member page; next server request is redirected by the proxy) |
| Exception flows | E1. Failure → toast "Could not sign out. Please try again." |
| Success criteria | No session cookie; member UI gone |
| Postconditions | All sessions of the account ended (library default, Q-AUTH-01) |
| Affected objects | OBJ-AUTH, OBJ-SHELL |
| Related screens | SCR-SHELL-01 |
| Status | Verified (code); A1 navigation behaviour Inferred |

## WF-AUTH-07 — Google OAuth sign-in [Not implemented]
Documented in `docs/WBS.md:137,286` (Q6, M1). Expected: provider button on SCR-AUTH-01/02 → `signInWithOAuth({ provider: 'google', redirectTo: /auth/callback?next=… })` → WF-AUTH-02. Status: Documented — F-AUTH-02.

## WF-AUTH-08 — Account lifecycle: deactivate, delete (anonymise), export [Not implemented]
Documented in `docs/WBS.md:222,287` (WP 6.4, Q7; legal retention policy still open). Status: Documented — F-AUTH-07.
