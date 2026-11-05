# SCR-SET-01 — Settings

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-SET-01` |
| Business domain | [D-ACCOUNT Account & Identity](../../overview.md) |
| Business object | [OBJ-SET](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | `/settings` (protected) |
| Route file | `apps/web/src/app/(main)/settings/page.tsx` (+ `settings-view.tsx`) |
| Screen component | `packages/features/src/settings/screens/settings-screen.tsx` (`SettingsScreen`) |
| Roles | Member |
| Workflows | WF-SET-01, WF-SET-02, WF-SET-03, WF-SET-04 (indirect) |
| Page title | "Cài đặt · StoryNest", noindex |
| Entry points | Account menu "Settings" only (not linked from `/me` or the bottom nav — U-SHELL-01, U-PRF-01) |

## B. Components
| ID | Component | Notes / text (en; vi key `settings.*`) |
| --- | --- | --- |
| SCR-SET-01-C01 | Page header | "Settings" / "Saved in your account, used on every device." |
| SCR-SET-01-C02 | Settings skeleton / error state | Error: "Could not load your settings" / "Check your connection and try again." / "Try again" |
| SCR-SET-01-C03 | Language section + select | "Language" / "Choose the interface language. Anything not translated yet is shown in Vietnamese." / label "Interface language", options "Tiếng Việt", "English" |
| SCR-SET-01-C04 | Notifications section (expanding settings, Lucian 023) | Badge "n of 3 on" / "All off"; three group switches with icons (gray when off): "New chapters" – "A story you follow has a new chapter."; "Replies to comments" – "Someone replies to your comment."; "Answers to invitations" – "Someone you invited to collaborate accepts or declines." A group that is on unfolds: per-type switches "Accepted" / "Declined" and "Invitations to you · Always on" (answers group only), then "In the app: On · Email and push: Not available yet". "Turn all off" button (BR-SET-011, BR-SET-012) The replies group is labelled "Replies and mentions" and also covers @mention notifications (BR-NOTI-018, batch 4 · community4). |
| SCR-SET-01-C05 | Reading section | "Reading" / "Font size, line spacing, font and background of the reading page." + `ReaderSettingsSheet` trigger (OBJ-READ) |
| SCR-SET-01-C06 | Adult content section + switch | "Adult content (18+)" / "Show 18+ stories" / "Hidden by default. Turning it on means you confirm you are 18 or older." (OBJ-MAT) |
| SCR-SET-01-C07 | Age confirmation dialog | "Show adult stories?" / "Only turn this on if you are 18 or older. 18+ stories will appear in the lists." / "I am 18 or older, show 18+ stories" / "Keep hidden" |
| SCR-SET-01-C08 | Guest fallback | "Sign in to change your settings." + "Sign in" (`/login?next=%2Fsettings`) — only if the session disappears client-side |
| SCR-SET-01-C10 | Reading goal section (batch 4 habits4) | "Reading goal" / "How many chapters you want to read a day. Only you can see it." / `RollingStepper` "Chapters a day" 1–20, value "N chapters a day", "Lower the goal" / "Raise the goal"; saved on each step, refused save → previous value + toast "Couldn't save your goal" (BR-HAB-003) |
| SCR-SET-01-C09 | Appearance section (this device) | "Appearance" / "Saved on this device. While a chapter is open, the background chosen in the reading settings wins." / select "Theme": "Follow device", "Light", "Dark". Shown whatever the account settings query does (BR-SET-010) |

Each section is a `<section aria-label>` with an `h2`; switches have `<Label htmlFor>`.
Not present: account section (email, password, sign-out, deactivate/delete, export) — F-AUTH-07; email/push channels — F-SET-01 (the section now says they are not available, BR-SET-012).

## C. User actions & system responses

| Field | SCR-SET-01-A01 Change interface language |
| --- | --- |
| Trigger | Select C03 |
| Preconditions | Settings loaded (select is inside the loaded branch) |
| Expected behavior | Immediate language switch, page re-mounted; account save debounced 500 ms |
| State change | Device storage `storynest.language`; `user_settings.language_code` |
| Validation | Only `vi`/`en` accepted (`isLanguage`) |
| Error behavior | Account save failure is silent (U-SET-01) |
| Navigation | Stays |
| Evidence | `settings-screen.tsx:240-256`, `use-language-sync.ts:45-75` |

| Field | SCR-SET-01-A02 Toggle a notification type |
| --- | --- |
| Trigger | Switch in C04 |
| Preconditions | Settings loaded |
| Expected behavior | Optimistic flip + upsert |
| State change | `user_settings.notify_*` |
| Validation | — |
| Error behavior | Rollback + toast "Could not save your settings. The previous value was restored." |
| Navigation | Stays |
| Evidence | `settings-screen.tsx:121-122,157-168`, `use-settings.ts:29-52` |

| Field | SCR-SET-01-A09 Toggle one notification type |
| --- | --- |
| Trigger | Type switch inside an unfolded group of C04 |
| Preconditions | Group on; per-type switches loaded |
| Expected behavior | Optimistic flip + upsert of one `notification_preferences` row |
| State change | `notification_preferences(user_id, event_type, in_app)` |
| Validation | Type must be one of the four switchable types (CHECK) |
| Error behavior | Rollback + toast "Could not save your settings. The previous value was restored." |
| Navigation | Stays |
| Evidence | `settings-screen.tsx` (`NotificationSettings`), `use-settings.ts` (`useSaveNotificationType`) |

| Field | SCR-SET-01-A10 Turn all notifications off |
| --- | --- |
| Trigger | "Turn all off" in C04 |
| Preconditions | At least one group on |
| Expected behavior | Rows go off one by one, then one upsert with the three `notify_*` false |
| State change | `user_settings.notify_*` |
| Validation | — |
| Error behavior | As A02 |
| Navigation | Stays |
| Evidence | `expanding-settings.tsx`, `settings-screen.tsx` |

| Field | SCR-SET-01-A03 Open reading preferences |
| --- | --- |
| Trigger | C05 button |
| Preconditions | — |
| Expected behavior | Opens the reader settings sheet; behaviour per BR-READ-* |
| State change | Reader preferences (OBJ-READ) |
| Validation | BR-READ-* |
| Error behavior | BR-READ-* |
| Navigation | Sheet overlay |
| Evidence | `settings-screen.tsx:218,266-270` |

| Field | SCR-SET-01-A04 Turn 18+ on |
| --- | --- |
| Trigger | Switch C06 → on |
| Preconditions | Currently hidden |
| Expected behavior | Opens C07; confirm → `adult.enable()`; cancel → stays off |
| State change | Per BR-MAT-* |
| Validation | — |
| Error behavior | Per BR-MAT-* |
| Navigation | Dialog |
| Evidence | `settings-screen.tsx:276-296` |

| Field | SCR-SET-01-A05 Turn 18+ off |
| --- | --- |
| Trigger | Switch C06 → off |
| Preconditions | Currently shown |
| Expected behavior | `adult.disable()` immediately, no dialog |
| State change | Per BR-MAT-* |
| Validation | — |
| Error behavior | Per BR-MAT-* |
| Navigation | Stays |
| Evidence | `settings-screen.tsx:282` |

| Field | SCR-SET-01-A06 Retry loading |
| --- | --- |
| Trigger | "Try again" in C02 |
| Preconditions | Settings query failed |
| Expected behavior | Refetch |
| State change | — |
| Validation | — |
| Error behavior | Stays in error state |
| Navigation | — |
| Evidence | `settings-screen.tsx:130-136` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | |
| Loading | Implemented | Auth loading skeleton (`:70`), settings skeleton (`:102-103`) |
| Empty | Not applicable | No row = defaults (all switches on) |
| Populated | Implemented | |
| Validation error | Not applicable | |
| Request error | Implemented | Load: ErrorState with retry; save: rollback + toast; language save: Missing feedback |
| Success | Implemented (implicit) | No "saved" confirmation; the switch position is the feedback |
| Disabled | Missing | `SwitchRow` supports `disabled` but no switch is disabled while its save is pending (U-SET-02) |
| Unauthorized | Implemented | Proxy + `requireUser('/settings')`; C08 fallback |
| Offline | Implemented (partially) | Save fails → rollback toast; language save silent |
| Unsaved changes | Not applicable | Everything saves immediately |

## E. Acceptance criteria
- SCR-SET-01-AC01 Given a member without a settings row, when opening `/settings`, then Vietnamese is selected and all three notification switches are on.
- SCR-SET-01-AC02 Given the member turns "Replies and mentions" off, when someone replies to their comment, then no notification row is created and none appears later when turned back on.
- SCR-SET-01-AC03 Given the save fails, when toggling a switch, then it returns to its previous position and the failure toast is shown.
- SCR-SET-01-AC04 Given the member picks English, then the page re-renders in English without reload and another device shows English after sign-in.
- SCR-SET-01-AC05 Given the 18+ switch is off, when turned on, then the confirmation dialog appears and 18+ stays hidden unless confirmed.
- SCR-SET-01-AC06 Given the settings query fails, then "Could not load your settings" with "Try again" is shown while the Reading and 18+ sections remain usable.
- SCR-SET-01-AC07 Given a guest, when opening `/settings`, then they are redirected to `/login?next=%2Fsettings`.
- SCR-SET-01-AC08 [Proposed] Given the language could not be saved to the account, then the member is told the choice applies to this device only (U-SET-01).
- SCR-SET-01-AC09 [Proposed] Given a switch save is pending, then that switch is disabled until it settles (U-SET-02).
- SCR-SET-01-AC11 Given a member with no settings row, when opening `/settings`, then the reading goal shows "3 chapters a day"; pressing "Raise the goal" saves 4 (only `daily_chapter_goal` is sent) and the profile rings use 4; at 20 the raise button shakes instead (BR-HAB-003).
- SCR-SET-01-AC10 [Proposed] Given an "Account" section, then the member can change email/password, sign out and start deactivation/deletion (F-AUTH-07, WBS 6.4).

## F. Findings referenced
F-SET-01, U-SET-01, U-SET-02, F-AUTH-07, U-I18N-02.

## G. Open questions
—
