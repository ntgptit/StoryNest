# D-ACCOUNT — Account & Identity: overview

## Purpose
Give every person a verified account, a public identity (username, display name, bio, avatar) and personal settings
that follow them across devices. Everything a member writes (library, progress, stories, comments) depends on this
domain; RLS uses `auth.uid()` and `is_active_account()` from it.

## Actors
| Actor | Description |
| --- | --- |
| Guest | Anonymous visitor: can sign up, sign in, request a reset; reads public content |
| Member | `authenticated` user with an `app_users` row (`account_status = 'active'`) |
| Suspended member | Can still sign in; writes refused by RLS; no in-app notice (F-AUTH-08) |
| Moderator | Member whose JWT `app_metadata.role = 'moderator'` (set server-side only) |
| Supabase Auth | Issues sessions, sends confirmation/reset emails, enforces its own rate limits (project settings not in repo) |

## Business objects
| ID | Name | Folder | Screens | Workflows | Rules |
| --- | --- | --- | --- | --- | --- |
| `OBJ-AUTH` | Authentication | [authentication](authentication/business-rules.md) | [SCR-AUTH-01 Sign in `/login`](authentication/screens/sign-in.md), [SCR-AUTH-02 Sign up `/register`](authentication/screens/sign-up.md), [SCR-AUTH-03 Forgot password `/forgot-password`](authentication/screens/forgot-password.md), [SCR-AUTH-04 Reset password `/reset-password`](authentication/screens/reset-password.md); endpoint `GET /auth/callback` | [WF-AUTH-01..08](authentication/workflows.md) | BR-AUTH-001..022 |
| `OBJ-PRF` | Profile & avatar | [profile](profile/business-rules.md) | [SCR-PRF-01 My profile `/me`](profile/screens/my-profile.md), [SCR-PRF-02 Edit profile `/me/edit`](profile/screens/edit-profile.md) | [WF-PRF-01..04](profile/workflows.md) | BR-PRF-001..013 |
| `OBJ-SET` | Account settings & language | [settings](settings/business-rules.md) | [SCR-SET-01 Settings `/settings`](settings/screens/settings.md) | [WF-SET-01..04](settings/workflows.md) | BR-SET-001..009 |

## Scope vs WBS
| WP | Status in WBS | Observed in code |
| --- | --- | --- |
| 1.1 Sign-up/in, verification, reset, callback, **Google OAuth** | 🟡 | Email/password flows complete; Google OAuth absent (F-AUTH-02) |
| 1.2 Sign-out, route guard, cross-tab session | ✅ | Matches (BR-AUTH-008..010, 016, 017) |
| 1.3 Auth-aware shell | ✅ | Matches; WBS note "bottom nav only Home and Me" is stale (now 4 items) |
| 1.4 Profile edit | ✅ | Matches |
| 1.5 Avatar upload | ✅ | Matches |
| 6.3 Settings | ✅ | Matches for in-app; no email/push (F-SET-01) |
| 6.4 Account lifecycle (Q7) | ⬜ | Absent (F-AUTH-07) |
| 6.8 Sign-up limit + captcha | 🟡 (not done for sign-up) | Absent (F-AUTH-06) |
| 0.0 Leaked-password protection, Auth redirect URLs, OAuth keys | 🟡 (owner action) | Not verifiable from repo (Q-AUTH-02) |

## Cross-domain dependencies
| Depends on / used by | What |
| --- | --- |
| D-PLATFORM / OBJ-SHELL | Header user menu, sign-in button, sign-out, bottom-nav "Me" |
| D-PLATFORM / OBJ-I18N | Language store; OBJ-SET persists it per account |
| D-COMMUNITY / OBJ-NOTI | Notification types switched off by BR-SET-006 |
| D-TRUST / OBJ-MAT | 18+ switch on the settings page (BR-MAT-*) and adult-content columns of `user_settings` |
| D-TRUST / OBJ-MOD | Suspend/reinstate changes `account_status` (BR-MOD-*) |
| D-TRUST / OBJ-ABU | Rate limits (no sign-up limit yet) |
| D-READING / OBJ-READ | Reader preferences sheet hosted on the settings page (BR-READ-*) |
| D-DISCOVERY / OBJ-AUTHOR | Public author page uses the profile; address = username |

## Domain-level open questions
- Q-AUTH-01 — Sign-out ends every session of the account (library default `scope: 'global'`). Intended, or should it be this device only with a separate "sign out everywhere"?
- Q-AUTH-02 — Supabase Auth project settings (email confirmation, secure password change, rate limits, redirect allow-list, SMTP) are not in the repo (`supabase/config.toml` absent). Where are they recorded per environment (dev/prod, Q5)?
- Q-AUTH-03 — Should a suspended member be told on sign-in (and what may they still do)?
- Q-PRF-01 — Should a suspended member still be able to edit their (publicly hidden) profile and settings? RLS allows it today.
- Q-PRF-02 — Should old usernames redirect to the new author address after a rename?
- Legal policy for Q7 (retention, takedown) is still open (`docs/WBS.md:289`) and blocks WP 6.4.
