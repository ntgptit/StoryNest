# OBJ-AUTH — Authentication: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-AUTH` |
| Name | Authentication (sign-up, sign-in, password recovery, session, route protection) |
| Business purpose | Give every reader/writer a verified identity so that personal data (library, progress, studio, settings) can be written and protected by RLS |
| User goals | Create an account; sign in and stay signed in; recover a forgotten password; land back where they were after signing in; sign out |
| Actors / roles | Guest (anonymous visitor), Member (`authenticated`), Moderator (JWT `app_metadata.role = 'moderator'`), Supabase Auth (GoTrue), `service_role` |
| Related entities | `auth.users` (Supabase), `public.app_users` (profile row, `account_status`), trigger `on_auth_user_created` → `public.handle_new_user()`, helpers `is_moderator()`, `is_active_account()` |
| Code | `packages/features/src/auth/**`, `packages/features/src/_shared/auth.tsx`, `packages/validation/src/auth.ts`, `apps/web/src/app/(auth)/**`, `apps/web/src/app/auth/callback/route.ts`, `apps/web/src/proxy.ts`, `apps/web/src/lib/supabase/session.ts`, `apps/web/src/lib/auth/{route-guard,require-user}.ts`, `packages/utils/src/redirect.ts` |
| Dependencies | OBJ-PRF (profile row created here, edited there), OBJ-SET (language sync after sign-in), OBJ-SHELL (user menu, sign-out), OBJ-MOD (suspension changes `account_status`, see BR-MOD-*), OBJ-ABU (rate limits, see BR-ABU-*) |
| WBS | 1.1 🟡 (email + password done, **Google OAuth not done**), 1.2 ✅, 6.4 ⬜ (account lifecycle), 6.8 🟡 (no sign-up limit / captcha) — `docs/WBS.md:137-138,222,226` |

Screens: [SCR-AUTH-01 Sign in](screens/sign-in.md) · [SCR-AUTH-02 Sign up](screens/sign-up.md) ·
[SCR-AUTH-03 Forgot password](screens/forgot-password.md) · [SCR-AUTH-04 Reset password](screens/reset-password.md).
Endpoint `GET /auth/callback` is documented in [workflows](workflows.md#wf-auth-02--open-an-email-link-authcallback).

## 2. Rules

### BR-AUTH-001 — Email address input
| Field | Value |
| --- | --- |
| Description | Every credential form normalises and validates the email the same way |
| Preconditions | Email field submitted (sign-in, sign-up, forgot password) |
| Conditions | Value is trimmed and lower-cased, max 254 chars, must be a valid email |
| Expected behavior | Invalid → field message "Invalid email address." (`email_invalid`); no request is sent |
| Exceptions | — |
| Related screens | SCR-AUTH-01, SCR-AUTH-02, SCR-AUTH-03 |
| Evidence | `packages/validation/src/auth.ts:22-27`, `packages/features/src/auth/model/messages.ts:6-20`, `packages/features/src/auth/auth-screens.test.tsx:77-95` |
| Status | Verified |

### BR-AUTH-002 — Password rules
| Field | Value |
| --- | --- |
| Description | New passwords (sign-up, reset) need ≥ 8 characters and ≤ 72 UTF-8 bytes (bcrypt limit, rejected rather than truncated). Sign-in only requires a non-empty value ≤ 72 bytes, so old passwords keep working |
| Preconditions | Password field submitted |
| Conditions | `newPasswordSchema` for sign-up/reset; `signInSchema.password` for sign-in |
| Expected behavior | "Password must be at least 8 characters." / "Password is too long (72 bytes max)." / "Please enter a password." |
| Exceptions | Supabase may additionally refuse a weak or breached password (`weak_password` → "This password is too weak or has been exposed in a breach. Choose a different one."). Leaked-password protection is **disabled** in the dev project (`docs/WBS.md:120`) |
| Related screens | SCR-AUTH-01, SCR-AUTH-02, SCR-AUTH-04 |
| Evidence | `packages/validation/src/auth.ts:6-7,32-35,40-46`, `packages/features/src/auth/model/messages.ts:23-33` |
| Status | Verified (client); Supabase strength policy: Unknown |

### BR-AUTH-003 — Sign-up optional identity fields
| Field | Value |
| --- | --- |
| Description | Username and display name are optional at sign-up and travel as Auth user metadata, not as a profile insert |
| Preconditions | Sign-up form submitted |
| Conditions | Blank → omitted. Username: 3–30 chars, `[A-Za-z0-9_]`. Display name: trimmed, ≤ 100 chars |
| Expected behavior | Only non-empty values are put in `options.data`; the profile is created by BR-AUTH-004 |
| Exceptions | Invalid username → "Username can only contain letters, numbers and underscores (3-30 characters)." |
| Related screens | SCR-AUTH-02 |
| Evidence | `packages/validation/src/auth.ts:48-56`, `packages/validation/src/inputs.ts:13-17`, `packages/features/src/auth/api/auth.api.ts:15-35`, `packages/features/src/auth/auth-screens.test.tsx:191-200` |
| Status | Verified |

### BR-AUTH-004 — Profile row is created automatically on sign-up
| Field | Value |
| --- | --- |
| Description | An `AFTER INSERT ON auth.users` trigger creates the `app_users` row, so sign-up never fails on a taken username |
| Preconditions | Supabase Auth inserts a user (any provider) |
| Conditions | Username base = metadata `username` → email local part → `user`; lower-cased; characters outside `[a-z0-9_]` removed; prefixed `user` if shorter than 3; **truncated to 20 chars**; on collision `_` + 8 random hex chars are appended (loop until free). Display name = metadata `display_name` → `full_name` → `name` → final username, max 100 |
| Expected behavior | One `app_users` row with `id = auth.users.id`, `account_status = 'active'` (column default) |
| Exceptions | The user is **not told** when the requested username was changed (lower-cased, truncated, suffixed) — see F-AUTH-01 |
| Related screens | SCR-AUTH-02, SCR-PRF-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:26-63`, `supabase/migrations/20261103000000_init_schema.sql:13-25`, `supabase/tests/10_rls.test.sql:7-22` |
| Status | Verified (SQL test) |

### BR-AUTH-005 — Email confirmation gate
| Field | Value |
| --- | --- |
| Description | When Supabase requires email confirmation, sign-up returns no session and the user must open the emailed link |
| Preconditions | `signUp` succeeded |
| Conditions | `data.session === null` ⇒ confirmation needed |
| Expected behavior | Needs confirmation → "Check your email" card showing the address; otherwise `onSignedUp` → `replace(next)` + `refresh()` |
| Exceptions | Sign-in before confirming → "Your email isn't confirmed yet. Open the link in your sign-up email." (`email_not_confirmed`). No "resend" action exists (F-AUTH-03) |
| Related screens | SCR-AUTH-02, SCR-AUTH-01 |
| Evidence | `packages/features/src/auth/api/auth.api.ts:34`, `packages/features/src/auth/screens/sign-up-screen.tsx:45-60`, `apps/web/src/app/(auth)/auth-pages.tsx:32-44` |
| Status | Verified (code); whether confirmation is enabled in each Supabase project: Unknown (no `supabase/config.toml` in repo) |

### BR-AUTH-006 — Email links land on `/auth/callback` (PKCE)
| Field | Value |
| --- | --- |
| Description | Confirmation and password-reset links point at `<appOrigin>/auth/callback?next=<safe path>`; the route exchanges the one-time `code` for a session cookie |
| Preconditions | User opens an emailed link |
| Conditions | `code` present and `exchangeCodeForSession` succeeds |
| Expected behavior | Redirect to `next` (sanitised by BR-AUTH-007). Any failure or missing code → `/login?error=callback`, which shows the notice "The sign-in link is invalid or has expired. Please try again." |
| Exceptions | The `error`/`error_description` parameters Supabase may append are ignored (generic notice). A link opened in a different browser than the one that requested it cannot be exchanged (PKCE verifier) — F-AUTH-04 |
| Related screens | SCR-AUTH-01, SCR-AUTH-04 |
| Evidence | `apps/web/src/app/auth/callback/route.ts:11-22`, `packages/features/src/auth/model/auth-urls.ts:4-7`, `packages/features/src/auth/hooks/use-auth-actions.ts:32,46`, `apps/web/src/app/(auth)/login/page.tsx:13-14`, `apps/web/src/app/auth/callback/route.test.ts` |
| Status | Verified |

### BR-AUTH-007 — Safe return path (`next`)
| Field | Value |
| --- | --- |
| Description | Any destination taken from a URL is reduced to a same-site relative path |
| Preconditions | `next` read from query string, cookie-less redirect or `requireUser(returnTo)` |
| Conditions | Must start with a single `/`; rejects `//…`, backslashes, control characters, absolute or other-origin URLs |
| Expected behavior | Unsafe or empty → fallback `/`. Path, query and hash of a safe value are preserved. Links between `/login` and `/register` keep a safe `next` (but drop `/`) |
| Exceptions | — |
| Related screens | SCR-AUTH-01, SCR-AUTH-02 |
| Evidence | `packages/utils/src/redirect.ts:6-22`, `packages/features/src/auth/model/auth-urls.ts:10-14`, `apps/web/src/lib/auth/route-guard.test.ts:55-60`, `apps/web/src/lib/auth/require-user.test.ts:48-51`, `packages/features/src/auth/auth-screens.test.tsx:141-148` |
| Status | Verified |

### BR-AUTH-008 — Protected routes
| Field | Value |
| --- | --- |
| Description | A single list of path prefixes needs a signed-in user: `/me`, `/studio`, `/library`, `/settings`, `/notifications`, `/following`, `/moderation` (and everything below, matched per path segment) |
| Preconditions | Request passes through `src/proxy.ts` (all paths except static assets) |
| Conditions | Visitor has no valid, non-anonymous JWT (`getClaims()`) |
| Expected behavior | Redirect to `/login?next=<path+query>`; refreshed cookies and no-cache headers are copied onto the redirect |
| Exceptions | Public: `/`, `/story/**`, `/author/**`, `/lists/**`, `/search`, `/ranking`, `/dev/gallery`, credential pages. The proxy is optimistic; every protected page re-checks (BR-AUTH-010) and RLS is the real boundary |
| Related screens | All protected screens |
| Evidence | `apps/web/src/lib/auth/route-guard.ts:4-23,35-49`, `apps/web/src/proxy.ts:17-39`, `apps/web/src/lib/auth/route-guard.test.ts:4-47` |
| Status | Verified |

### BR-AUTH-009 — Guest-only credential pages
| Field | Value |
| --- | --- |
| Description | `/login` and `/register` are for guests only |
| Preconditions | Signed-in visitor requests one of them |
| Conditions | `isAuthenticated && isGuestOnlyPath` |
| Expected behavior | Redirect to the safe `next` (default `/`) |
| Exceptions | `/forgot-password` and `/reset-password` stay reachable when signed in (a recovery session counts as signed in) |
| Related screens | SCR-AUTH-01, SCR-AUTH-02, SCR-AUTH-03, SCR-AUTH-04 |
| Evidence | `apps/web/src/lib/auth/route-guard.ts:14-15,45-47`, `apps/web/src/lib/auth/route-guard.test.ts:23-30,55-60` |
| Status | Verified |

### BR-AUTH-010 — Server-side identity check (`requireUser`)
| Field | Value |
| --- | --- |
| Description | Server Components of protected pages call `requireUser(ownPath)`; identity comes from `getClaims()` (JWT signature verified), never from cookie contents |
| Preconditions | Protected page renders |
| Conditions | No claims, or `is_anonymous = true` |
| Expected behavior | `redirect('/login?next=<safe ownPath>')`; otherwise returns `{ id, email, isModerator }` |
| Exceptions | `isModerator` is read from `app_metadata.role` only; `user_metadata.role` (user-editable) is ignored |
| Related screens | SCR-PRF-01, SCR-PRF-02, SCR-SET-01 and every protected page |
| Evidence | `apps/web/src/lib/auth/require-user.ts:17-33`, `apps/web/src/lib/auth/require-user.test.ts:16-52`, `apps/web/src/lib/supabase/session.ts:29-31` |
| Status | Verified |

### BR-AUTH-011 — Missing Supabase configuration
| Field | Value |
| --- | --- |
| Description | Without `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` the UI still runs in development, but auth is never silently skipped in production |
| Preconditions | Env vars missing or invalid (zod: URL + non-empty key) |
| Conditions | `NODE_ENV === 'production'` |
| Expected behavior | Production: proxy throws (HTTP 500). Development: requests pass, `AuthProvider` reports `unauthenticated`, data hooks throw "Supabase is not configured …" on first use |
| Exceptions | — |
| Related screens | All |
| Evidence | `apps/web/src/proxy.ts:9-15`, `apps/web/src/lib/env.ts:3-32`, `packages/features/src/_shared/data.tsx:17-49`, `packages/features/src/_shared/auth.tsx:52-60` |
| Status | Verified |

### BR-AUTH-012 — Account status gates writing, not signing in
| Field | Value |
| --- | --- |
| Description | `app_users.account_status ∈ {active, suspended, deactivated}`; only `service_role` or the moderation RPC change it. RLS insert policies require `is_active_account()` (active and not soft-deleted) to create content; non-active profiles are hidden from the public |
| Preconditions | Account suspended (BR-MOD-*) or deactivated |
| Conditions | — |
| Expected behavior | Sign-in still succeeds (no check in app or proxy). Creating stories, chapters, comments, votes, follows, lists, reports, avatars is refused by RLS (`forbidden`) |
| Exceptions | The app loads `account_status` into the auth profile but never shows it: a suspended user only sees generic errors (F-AUTH-08). Own-profile UPDATE and `user_settings` writes are not gated |
| Related screens | All write screens |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:19-20`, `supabase/migrations/20261103000100_auth_and_rls.sql:74-80,182-188,207-208`, `packages/features/src/_shared/auth.tsx:11-21` |
| Status | Verified |

### BR-AUTH-013 — Credential error messages
| Field | Value |
| --- | --- |
| Description | Auth failures are mapped first by Supabase error code, then by `AppError.kind`; the UI never reveals which of email/password was wrong |
| Preconditions | Auth call failed |
| Conditions | `invalid_credentials` → "Incorrect email or password."; `email_not_confirmed`; `user_already_exists`/`email_exists` → "This email is already registered."; `weak_password`; `same_password` → "The new password must be different from the old one."; `over_*_rate_limit` or HTTP 429 → "You're going too fast. Try again in a few minutes."; network → "No connection. Check your network and try again."; unauthenticated → "The link has expired. Request a new one."; else "Something went wrong. Please try again." |
| Expected behavior | Banner `role="alert"` above the form; form stays usable |
| Exceptions | Unknown schema codes show the generic text, never raw English from the server |
| Related screens | SCR-AUTH-01..04 |
| Evidence | `packages/features/src/auth/model/messages.ts:16-51`, `packages/features/src/_shared/errors.ts:101-117`, `packages/features/src/auth/components/auth-card.tsx:27-38`, `packages/features/src/auth/auth-screens.test.tsx:97-124` |
| Status | Verified |

### BR-AUTH-014 — No account enumeration on password reset
| Field | Value |
| --- | --- |
| Description | Requesting a reset link shows the same confirmation whether or not the address has an account |
| Preconditions | Forgot-password form submitted with a valid email |
| Conditions | Request accepted by Supabase |
| Expected behavior | "Instructions sent" / "If this email has an account, you'll get a password reset link within a few minutes." Link target: `/auth/callback?next=%2Freset-password` |
| Exceptions | Rate limit / network errors are shown (BR-AUTH-013) |
| Related screens | SCR-AUTH-03 |
| Evidence | `packages/features/src/auth/screens/forgot-password-screen.tsx:24-40`, `packages/features/src/auth/strings.en.ts:31-41`, `packages/features/src/auth/hooks/use-auth-actions.ts:40-52`, `packages/features/src/auth/auth-screens.test.tsx:222-252` |
| Status | Verified |

### BR-AUTH-015 — Setting a new password needs a session
| Field | Value |
| --- | --- |
| Description | `/reset-password` calls `auth.updateUser({ password })`, which works with the recovery session created by the callback **or any normal session** |
| Preconditions | Session present |
| Conditions | No session → "This link is invalid or has expired" card with "Request a new link" (→ `/forgot-password`) |
| Expected behavior | Success → toast "Password changed." → `replace('/')` + `refresh()`. The user stays signed in |
| Exceptions | Current password is never asked for (F-AUTH-05); whether Supabase "secure password change" (reauthentication) is on: Unknown |
| Related screens | SCR-AUTH-04 |
| Evidence | `packages/features/src/auth/api/auth.api.ts:46-50`, `packages/features/src/auth/screens/reset-password-screen.tsx:21-50`, `apps/web/src/app/(auth)/auth-pages.tsx:50-59`, `apps/web/src/lib/auth/route-guard.ts:14` |
| Status | Verified |

### BR-AUTH-016 — Client session mirror
| Field | Value |
| --- | --- |
| Description | `AuthProvider` mirrors the Supabase session (states `loading` / `unauthenticated` / `authenticated` + profile) for rendering only; it is not an authorisation decision |
| Preconditions | App mounted inside `DataProvider` + `QueryProvider` |
| Conditions | `onAuthStateChange` (also broadcast between tabs) and an initial `getSession()` |
| Expected behavior | Profile row loaded by id (`id, username, display_name, bio, avatar_storage_key, account_status`). On `SIGNED_OUT` all `["auth", …]` queries are removed. Other per-user caches are keyed by user id |
| Exceptions | No Supabase client → `unauthenticated` |
| Related screens | All |
| Evidence | `packages/features/src/_shared/auth.tsx:21-115`, `packages/features/src/_shared/auth.test.tsx`, `packages/features/src/notifications/keys.ts:1-7` |
| Status | Verified |

### BR-AUTH-017 — Sign-out
| Field | Value |
| --- | --- |
| Description | "Sign out" in the account menu ends the session and leaves the member's pages |
| Preconditions | Signed in |
| Conditions | `client.auth.signOut()` with the library default scope `global` (every session of the account, all devices) |
| Expected behavior | `replace('/')` then `refresh()` so server components stop rendering member data. Other tabs update via the auth broadcast |
| Exceptions | Failure → toast "Could not sign out. Please try again." |
| Related screens | SCR-SHELL-01 |
| Evidence | `packages/features/src/shell/components/user-menu.tsx:40-48,77`, `packages/features/src/_shared/auth.tsx:87-91`, `node_modules/.pnpm/**/auth-js/dist/main/GoTrueClient.js` (`signOut(options = { scope: 'global' })`) |
| Status | Verified (scope from library source; see Q-AUTH-01) |

### BR-AUTH-018 — Auth mutations never auto-retry
| Field | Value |
| --- | --- |
| Description | A wrong password is reported once, immediately |
| Preconditions | Any auth mutation |
| Conditions | Global `mutations.retry = false` |
| Expected behavior | Button shows pending text ("Signing in…", "Creating account…", "Sending…", "Saving…") and is disabled while the request runs |
| Exceptions | — |
| Related screens | SCR-AUTH-01..04 |
| Evidence | `packages/features/src/_shared/query.ts:29-30`, `packages/features/src/auth/hooks/use-auth-actions.ts:11`, `packages/features/src/auth/auth-screens.test.tsx:126-139` |
| Status | Verified |

### BR-AUTH-019 — Credential pages are not indexed
| Field | Value |
| --- | --- |
| Description | `/login`, `/register`, `/forgot-password`, `/reset-password` carry `robots: { index: false }` and are disallowed in robots.txt (BR-SEO-008) |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Page titles (server, Vietnamese): "Đăng nhập", "Đăng ký", "Quên mật khẩu", "Đặt mật khẩu mới" + " · StoryNest" |
| Exceptions | Titles do not follow the UI language (BR-I18N-008) |
| Related screens | SCR-AUTH-01..04 |
| Evidence | `apps/web/src/app/(auth)/login/page.tsx:6`, `apps/web/src/app/(auth)/register/page.tsx:6`, `apps/web/src/app/(auth)/forgot-password/page.tsx:6`, `apps/web/src/app/(auth)/reset-password/page.tsx:6`, `apps/web/src/lib/strings.ts:9-13` |
| Status | Verified |

### BR-AUTH-020 — Google OAuth (documented, not implemented)
| Field | Value |
| --- | --- |
| Description | WBS 1.1 and decision Q6 put Google OAuth in milestone M1 |
| Preconditions | Google client ID/secret configured in Supabase |
| Conditions | — |
| Expected behavior | Not implemented: no provider button, no `signInWithOAuth` call. The trigger in BR-AUTH-004 already reads `full_name`/`name` metadata that OAuth would supply |
| Exceptions | — |
| Related screens | SCR-AUTH-01, SCR-AUTH-02 |
| Evidence | `docs/WBS.md:137,286`, `supabase/migrations/20261103000100_auth_and_rls.sql:48-52`; absence: `packages/features/src/auth/api/auth.api.ts` |
| Status | Documented (not implemented) — F-AUTH-02 |

### BR-AUTH-021 — Sign-up abuse protection (documented, not implemented in app)
| Field | Value |
| --- | --- |
| Description | WBS 6.8 asks for a sign-up rate limit and a captcha. Neither exists in the app or DB; only Supabase Auth's own rate limits apply (their codes are mapped to the rate-limit message) |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Not implemented. Comment/report limits are BR-ABU-* (D-TRUST) |
| Exceptions | — |
| Related screens | SCR-AUTH-02 |
| Evidence | `docs/WBS.md:226` ("chưa làm giới hạn đăng ký và captcha"), `packages/features/src/auth/model/messages.ts:30-32`, `supabase/migrations/20261104002200_abuse_limits.sql:26-38` (no sign-up row) |
| Status | Documented (not implemented) — F-AUTH-06 |

### BR-AUTH-022 — Account lifecycle (documented, not implemented)
| Field | Value |
| --- | --- |
| Description | Decision Q7: deleting an account = anonymise personal data and keep content; `auth.users` is never hard-deleted (`stories.owner_id` is `ON DELETE RESTRICT`). WBS 6.4 also covers deactivation and data export |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Not implemented: no deactivate/delete/export, no change-email, no in-app change-password entry |
| Exceptions | — |
| Related screens | SCR-SET-01 (natural home) |
| Evidence | `docs/WBS.md:35,222,287`, `supabase/migrations/20261103000100_auth_and_rls.sql:20-24` |
| Status | Documented (not implemented) — F-AUTH-07 |
