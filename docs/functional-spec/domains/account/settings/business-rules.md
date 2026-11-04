# OBJ-SET — Account settings & language: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-SET` |
| Name | Account settings (interface language, notification switches) and the settings page that also hosts reading preferences and the adult-content switch |
| Business purpose | Let a member's choices follow them to every device and let them silence notification types |
| User goals | Pick the interface language; turn notification types on/off; reach reading and 18+ preferences in one place |
| Actors / roles | Member (own row only) |
| Related entities | `public.user_settings` (one row per account: `language_code`, `age_confirmed`, `show_mature`, `notify_chapter_published`, `notify_comment_replied`, `notify_collaboration_answers`), `notification_enabled()`, trigger `notifications_respect_settings` on `notifications` |
| Code | `packages/features/src/settings/**`, `apps/web/src/app/(main)/settings/**`, `supabase/migrations/20261104001900_user_settings.sql` |
| Dependencies | OBJ-I18N (language store, BR-I18N-*), OBJ-NOTI (notification types, BR-NOTI-*), OBJ-MAT (adult-content columns and rules, **BR-MAT-*** — not redefined here), OBJ-READ (reader preferences, **BR-READ-*** — not redefined here) |
| WBS | 6.3 ✅ (`docs/WBS.md:221`); email/push channels not built (6.7 ⬜) |

Screen: [SCR-SET-01 Settings](screens/settings.md).

## 2. Rules

### BR-SET-001 — One settings row, defaults when absent
| Field | Value |
| --- | --- |
| Description | `user_settings` has at most one row per account, created on the first save; no row means the defaults |
| Preconditions | — |
| Conditions | Defaults: `language_code = 'vi'`, all three notification switches `true`, `age_confirmed = false`, `show_mature = false` |
| Expected behavior | Client `toSettings(null)` returns the same defaults; saves use upsert on `user_id` |
| Exceptions | Row deleted with the profile (`ON DELETE CASCADE`) |
| Related screens | SCR-SET-01 |
| Evidence | `supabase/migrations/20261104001900_user_settings.sql:20-30`, `packages/features/src/settings/model/settings.ts:15-44`, `packages/features/src/settings/api/settings.api.ts:5-13`, `supabase/tests/250_user_settings.test.sql:28-35` |
| Status | Verified (SQL test) |

### BR-SET-002 — Own row only
| Field | Value |
| --- | --- |
| Description | A member reads and writes only their own settings row |
| Preconditions | `authenticated` |
| Conditions | Policy `user_settings_own` (`user_id = auth.uid()`), column grants; anon has no access |
| Expected behavior | Another user's row: 0 rows read/updated |
| Exceptions | Not gated by `is_active_account()` |
| Related screens | SCR-SET-01 |
| Evidence | `supabase/migrations/20261104001900_user_settings.sql:34-44`, `supabase/tests/250_user_settings.test.sql:38` |
| Status | Verified (SQL test) |

### BR-SET-003 — Interface language values
| Field | Value |
| --- | --- |
| Description | `language_code` ∈ {`vi`, `en`} (CHECK); an unknown stored value (written by a newer client) is read as `vi` |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Settings select offers "Tiếng Việt" and "English"; choosing calls the global `setLanguage` (BR-I18N-005) — the change is immediate, no Save button |
| Exceptions | `xx` → `23514` |
| Related screens | SCR-SET-01 |
| Evidence | `supabase/migrations/20261104001900_user_settings.sql:22`, `packages/features/src/settings/model/settings.ts:31-38`, `packages/features/src/settings/api/language.api.ts:5-9`, `packages/features/src/settings/screens/settings-screen.tsx:113-129`, `supabase/tests/250_user_settings.test.sql:43` |
| Status | Verified |

### BR-SET-004 — Account language sync (LanguageSync)
| Field | Value |
| --- | --- |
| Description | For a signed-in member the account's language and the device's language are kept together |
| Preconditions | Session present; `LanguageSync` mounted once above `LanguageProvider` |
| Conditions | (1) Account row has a language → it wins and is applied to the device, unless the reader switched while the account was loading (then the reader's choice is saved). (2) No row → the device language is pushed if the reader ever chose one. (3) Afterwards every change is saved after 500 ms (debounced), writing only `language_code` |
| Expected behavior | A new device picks up the account language after sign-in |
| Exceptions | Guests and failures change nothing; save failures are silent and retried on the next change (U-SET-01) |
| Related screens | SCR-SET-01, header switcher (SCR-SHELL-01) |
| Evidence | `packages/features/src/settings/hooks/use-language-sync.ts:21-76`, `packages/features/src/settings/components/language-sync.tsx:5-13`, `apps/web/src/app/providers.tsx:36-39`, `packages/features/src/settings/settings.test.tsx` |
| Status | Verified (unit tests; runtime check in `docs/WBS.md:124`) |

### BR-SET-005 — Notification switches
| Field | Value |
| --- | --- |
| Description | Three in-app notification types can be switched off: "New chapters" (a followed story has a new chapter → `chapter_published`), "Replies to comments" (`comment_replied`), "Answers to invitations" (`collaboration_accepted`, `collaboration_declined`) |
| Preconditions | — |
| Conditions | `collaboration_invited` (invitations addressed to the member) has no switch and is always delivered; any other or future event type defaults to enabled |
| Expected behavior | Text: "Choose which in-app notifications you want. Collaboration invitations sent to you are always delivered." |
| Exceptions | No email/push channels (BR-SET-008) |
| Related screens | SCR-SET-01 |
| Evidence | `packages/features/src/settings/model/settings.ts:3-8`, `supabase/migrations/20261104001900_user_settings.sql:46-57`, `packages/features/src/settings/strings.en.ts:32-42` |
| Status | Verified |

### BR-SET-006 — Switched-off notifications are dropped at insert time
| Field | Value |
| --- | --- |
| Description | A single `BEFORE INSERT` trigger on `notifications` drops a row whose recipient switched that type off, whichever function created it (outbox worker, comment replies, collaboration RPCs) |
| Preconditions | Notification insert |
| Conditions | `notification_enabled(recipient, event_type) = false` |
| Expected behavior | Nothing is stored; switching back on does not show missed notifications. OBJ-NOTI links here rather than redefining it |
| Exceptions | `notification_enabled` / trigger function not executable by clients |
| Related screens | SCR-SET-01, notifications screen (OBJ-NOTI) |
| Evidence | `supabase/migrations/20261104001900_user_settings.sql:9-14,46-74`, `supabase/tests/250_user_settings.test.sql:56-62` |
| Status | Verified (SQL test) |

### BR-SET-007 — Settings save semantics
| Field | Value |
| --- | --- |
| Description | Each switch saves immediately with an optimistic update |
| Preconditions | Settings loaded |
| Conditions | Payload = language **in force** + the three switches (adult-content columns are not part of it) |
| Expected behavior | UI flips at once; on failure the previous values are restored and toast "Could not save your settings. The previous value was restored." |
| Exceptions | No per-switch pending/disabled state; no refetch after settle (U-SET-02) |
| Related screens | SCR-SET-01 |
| Evidence | `packages/features/src/settings/hooks/use-settings.ts:26-50`, `packages/features/src/settings/screens/settings-screen.tsx:93-96,131-142`, `packages/features/src/settings/api/settings.api.ts:10-13` |
| Status | Verified |

### BR-SET-008 — Channels
| Field | Value |
| --- | --- |
| Description | Only in-app notifications exist. WBS 6.3 lists email/push/in-app; push is WP 6.7 ⬜, email has no infrastructure, so no placeholder switches are shown |
| Preconditions | — |
| Conditions | — |
| Expected behavior | — |
| Exceptions | — |
| Related screens | SCR-SET-01 |
| Evidence | `docs/WBS.md:221,225`, `supabase/migrations/20261104001900_user_settings.sql:11-13` |
| Status | Documented — F-SET-01 |

### BR-SET-009 — Embedded preferences owned elsewhere
| Field | Value |
| --- | --- |
| Description | The settings page hosts (a) the reader preferences sheet and its account sync — rules **BR-READ-*** (OBJ-READ); (b) the "Show 18+ stories" switch, whose enabling requires the age-confirmation dialog — rules **BR-MAT-*** ([mature content](../../trust-safety/mature-content/business-rules.md)) |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Both work even when the settings query failed (they have their own stores) |
| Exceptions | — |
| Related screens | SCR-SET-01 |
| Evidence | `packages/features/src/settings/screens/settings-screen.tsx:88-91,146-172` |
| Status | Verified |
