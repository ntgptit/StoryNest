# OBJ-PRF — Profile & avatar: workflows

Rules: [business-rules.md](business-rules.md).

## WF-PRF-01 — View my profile
| Field | Value |
| --- | --- |
| User goal | Check how the account is set up |
| Trigger | Bottom nav "Me" (mobile), account menu "Profile", redirect after saving |
| Preconditions | Signed in (guests go through WF-AUTH-05) |
| Main flow | 1. Server `requireUser('/me')`. 2. Reads `username, display_name, bio`. 3. `MeView` renders labels in the current language |
| Alternative flows | A1. No profile row → "No profile was found for this account." |
| Exception flows | E1. Query error → same message as A1 (F-PRF-01) |
| Success criteria | User sees name, username, email, bio |
| Postconditions | — |
| Affected objects | OBJ-PRF |
| Related screens | SCR-PRF-01 |
| Status | Verified |

## WF-PRF-02 — Edit profile details
| Field | Value |
| --- | --- |
| User goal | Change display name, username or bio |
| Trigger | "Edit profile" on SCR-PRF-01 or direct `/me/edit` |
| Preconditions | Signed in; profile loaded in `AuthProvider` |
| Main flow | 1. Form pre-filled from the auth profile. 2. User edits → Save enabled. 3. Validation (BR-PRF-001). 4. UPDATE own row (BR-PRF-003). 5. Cache updated, toast "Profile saved.", navigate to `/me` and refresh server data |
| Alternative flows | A1. "Cancel" → `/me`, changes discarded without confirmation |
| Exception flows | E1. Username taken → field error. E2. forbidden/notFound/network → banner. E3. Language switch or navigation discards edits silently (U-PRF-02) |
| Success criteria | New values visible on `/me`, header and public author page |
| Postconditions | Changed username changes `/author/<username>` (BR-PRF-006) |
| Affected objects | OBJ-PRF, OBJ-AUTHOR |
| Related screens | SCR-PRF-02, SCR-PRF-01 |
| Status | Verified |

## WF-PRF-03 — Add or change the profile picture
| Field | Value |
| --- | --- |
| User goal | Show a picture next to their name |
| Trigger | "Add a profile picture" / "Change picture" on SCR-PRF-02 |
| Preconditions | Signed in, account active (BR-PRF-008) |
| Main flow | 1. Hidden file input opens the picker (JPEG/PNG/WebP). 2. Type and size are checked, then the crop dialog opens (round mask): drag, zoom (slider, wheel, pinch), arrows/+/−; "Use photo". 3. Prepare the chosen square (BR-PRF-007). 4. Upload to own folder (BR-PRF-008/009). 5. Save key, delete old (BR-PRF-010). 6. Toast "Profile picture updated."; header avatar updates |
| Alternative flows | A1. Same file picked twice still triggers (input value reset). A2. "Cancel" (or Escape) in the crop dialog closes it and uploads nothing |
| Exception flows | E1. Wrong type / too large / unreadable → inline error, no crop dialog, nothing uploaded. E2. Server refuses → "The server did not accept this picture. Try another one." E3. Profile save fails → uploaded object removed, old picture kept |
| Success criteria | New picture shown everywhere `UserAvatar` is used |
| Postconditions | Exactly one avatar object referenced |
| Affected objects | OBJ-PRF |
| Related screens | SCR-PRF-02, SCR-SHELL-01 |
| Status | Verified (`packages/features/src/profile/avatar.test.tsx`; runtime notes `docs/WBS.md:141`) |

## WF-PRF-04 — Remove the profile picture
| Field | Value |
| --- | --- |
| User goal | Go back to initials |
| Trigger | "Remove picture" (only when one is set) |
| Preconditions | Picture set |
| Main flow | 1. Key set to `NULL`. 2. Object deleted (best effort). 3. Toast "Profile picture removed." |
| Alternative flows | — |
| Exception flows | E1. Update fails → inline error, picture kept. No confirmation dialog before removal |
| Success criteria | Fallback initial shown |
| Postconditions | — |
| Affected objects | OBJ-PRF |
| Related screens | SCR-PRF-02 |
| Status | Verified |
