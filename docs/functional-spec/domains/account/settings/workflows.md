# OBJ-SET — Account settings & language: workflows

Rules: [business-rules.md](business-rules.md). Screen: [SCR-SET-01](screens/settings.md).

## WF-SET-01 — Change the interface language from Settings
| Field | Value |
| --- | --- |
| User goal | Use the app in English (or back in Vietnamese) on every device |
| Trigger | "Interface language" select on SCR-SET-01 (the header VI/EN button does the same, WF-I18N-01) |
| Preconditions | Signed in |
| Main flow | 1. User picks a language. 2. `setLanguage` stores it on the device and re-mounts the page in the new language (BR-I18N-005). 3. LanguageSync saves `language_code` 500 ms later (BR-SET-004) |
| Alternative flows | A1. Rapid switching → one debounced save of the final value |
| Exception flows | E1. Save fails → device keeps the language, account not updated, no message (U-SET-01) |
| Success criteria | Page text changes without reload; account row holds the new value |
| Postconditions | Next sign-in on another device applies it (WF-SET-04) |
| Affected objects | OBJ-SET, OBJ-I18N |
| Related screens | SCR-SET-01, SCR-SHELL-01 |
| Status | Verified |

## WF-SET-02 — Switch a notification type on or off
| Field | Value |
| --- | --- |
| User goal | Stop (or resume) a kind of in-app notification |
| Trigger | A switch in the "Notifications" section |
| Preconditions | Settings loaded |
| Main flow | 1. Switch flips immediately (optimistic). 2. Upsert of language + three switches. 3. From now on matching notifications are dropped at insert (BR-SET-006) |
| Alternative flows | — |
| Exception flows | E1. Save refused / network → previous values restored + toast "Could not save your settings. The previous value was restored." |
| Success criteria | Value persists after reload and on other devices |
| Postconditions | Missed notifications are never back-filled |
| Affected objects | OBJ-SET, OBJ-NOTI |
| Related screens | SCR-SET-01 |
| Status | Verified (runtime check in `docs/WBS.md:221`) |

## WF-SET-03 — Show or hide 18+ stories from Settings
Owned by OBJ-MAT (BR-MAT-*). On SCR-SET-01: turning the switch on opens a confirmation dialog ("Show adult stories?" / "I am 18 or older, show 18+ stories" / "Keep hidden"); turning it off applies at once (`packages/features/src/settings/screens/settings-screen.tsx:152-172`). Status: Verified.

## WF-SET-04 — Language follows the account to a new device
| Field | Value |
| --- | --- |
| User goal | See the chosen language after signing in elsewhere |
| Trigger | Sign-in (WF-AUTH-03) on a device with a different or no stored language |
| Preconditions | Account has a `user_settings` row |
| Main flow | 1. LanguageSync reads `language_code`. 2. If it differs and the reader did not switch meanwhile → `setLanguage(…, { fromAccount: true })` (stored on device, not counted as a choice) |
| Alternative flows | A1. Reader switched during the read → their choice is saved to the account instead. A2. No row and a device choice exists → device choice is saved |
| Exception flows | E1. Read fails → nothing changes |
| Success criteria | Same language on both devices |
| Postconditions | — |
| Affected objects | OBJ-SET, OBJ-I18N |
| Related screens | All |
| Status | Verified (`packages/features/src/settings/settings.test.tsx`) |
