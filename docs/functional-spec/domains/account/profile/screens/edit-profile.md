# SCR-PRF-02 — Edit profile

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | `SCR-PRF-02` |
| Business domain | [D-ACCOUNT Account & Identity](../../overview.md) |
| Business object | [OBJ-PRF](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Route | `/me/edit` (protected) |
| Route file | `apps/web/src/app/(main)/me/edit/page.tsx` (+ `edit-profile-page.tsx`: after save → `/me` + refresh) |
| Screen component | `packages/features/src/profile/screens/edit-profile-screen.tsx` (`EditProfileScreen`), `packages/features/src/profile/components/avatar-editor.tsx` (`AvatarEditor`) |
| Roles | Member (own profile only) |
| Workflows | WF-PRF-02, WF-PRF-03, WF-PRF-04 |
| Page title | "Chỉnh sửa hồ sơ · StoryNest", noindex |

## B. Components
| ID | Component | Notes / text (en; vi key `profile.*`) |
| --- | --- | --- |
| SCR-PRF-02-C01 | Heading (h1) + description | "Edit profile" / "This information is shown publicly on your page." |
| SCR-PRF-02-C02 | Avatar preview (80 px) | Picture or first letter of display name |
| SCR-PRF-02-C03 | Add/Change button | "Add a profile picture" / "Change picture" / "Uploading…" |
| SCR-PRF-02-C04 | Remove button | "Remove picture" (only when set) |
| SCR-PRF-02-C05 | Hidden file input | `aria-label` "Choose a profile picture", `accept` jpeg/png/webp, `tabIndex=-1` |
| SCR-PRF-02-C06 | Avatar hint + error | "JPG, PNG or WebP, up to 10 MB. You choose the square to keep before it is uploaded." / errors BR-PRF-007/008 |
| SCR-PRF-02-C06b | Crop dialog (after a valid pick) | "Adjust your profile picture", round mask over a square frame, zoom slider "Zoom", "Use photo" / "Cancel"; frame `role="application"` with arrows (move) and +/− (zoom) |
| SCR-PRF-02-C07 | Error banner (`role="alert"`) | Save failures except username taken |
| SCR-PRF-02-C08 | Display name input | "Display name" |
| SCR-PRF-02-C09 | Username input + hint | "Username" / "Letters, numbers and underscores, 3-30 characters. Changing it changes your profile address." |
| SCR-PRF-02-C10 | Bio textarea + hint | "Bio" (5 rows) / "Up to 1000 characters." (no live counter) |
| SCR-PRF-02-C11 | Save button | "Save changes" / "Saving…", disabled until dirty |
| SCR-PRF-02-C12 | Cancel link → `/me` | "Cancel" |
| SCR-PRF-02-C12b | Unsaved changes bar (Lucian 250) | While the form is dirty: "N unsaved changes", "Discard" (reset) / "Save" (same submit as C11). Closing the tab asks first; an in-app link outside the form is stopped and the bar warns "Save or discard your changes before leaving" (Cancel is not stopped). Avatar changes save instantly and do not count |
| SCR-PRF-02-C13 | Guard texts | Skeleton while loading; "You need to sign in to edit your profile." + "Sign in" (`/login?next=%2Fme%2Fedit`); "No profile found for this account." |
| SCR-PRF-02-C14 | Avatar drop zone (Lucian 032) | A picture dragged onto the avatar row highlights it ("Drop the picture here", marching dashed frame) and, dropped, goes through the same checks and crop dialog as a picked one. Hint gains "You can also drag a picture here." on fine pointers |

## C. User actions & system responses

| Field | SCR-PRF-02-A01 Save changes |
| --- | --- |
| Trigger | "Save changes" / Enter |
| Preconditions | Form dirty, not pending |
| Expected behavior | Validate → UPDATE own row → cache updated → toast "Profile saved." → `/me` |
| State change | `app_users` row; header name |
| Validation | BR-PRF-001 |
| Error behavior | Username taken → field error "This username is already taken."; other errors → C07 banner; values kept |
| Navigation | `/me` on success |
| Evidence | `edit-profile-screen.tsx:66-159`, `profile.test.tsx` |

| Field | SCR-PRF-02-A02 Add / change picture |
| --- | --- |
| Trigger | C03 → file picker → file chosen |
| Preconditions | Not busy |
| Expected behavior | Prepare, upload, save key, delete old; toast "Profile picture updated." |
| State change | `avatar_storage_key`, Storage object |
| Validation | BR-PRF-007 (client), BR-PRF-008 (server) |
| Error behavior | Inline `role="alert"` under the editor; previous picture kept |
| Navigation | Stays |
| Evidence | `avatar-editor.tsx:24-29,40-45,57-68`, `use-avatar.ts:11-25` |

| Field | SCR-PRF-02-A03 Remove picture |
| --- | --- |
| Trigger | C04 |
| Preconditions | Picture set, not busy |
| Expected behavior | Clear key, delete object; toast "Profile picture removed." (no confirmation) |
| State change | `avatar_storage_key = NULL` |
| Validation | — |
| Error behavior | Inline error |
| Navigation | Stays |
| Evidence | `avatar-editor.tsx:43-56`, `profile.api.ts:71-84` |

| Field | SCR-PRF-02-A04 Cancel |
| --- | --- |
| Trigger | C12 |
| Preconditions | — |
| Expected behavior | Navigate to `/me`; unsaved text discarded without warning; an already uploaded picture stays |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | `/me` |
| Evidence | `edit-profile-screen.tsx:151-153` |

## D. UI states
| State | Status | Evidence / note |
| --- | --- | --- |
| Initial | Implemented | Pre-filled from auth profile |
| Loading | Implemented | Skeleton while auth/profile loading (`:34-36`); route skeleton first |
| Empty | Not applicable | |
| Populated | Implemented | |
| Validation error | Implemented | Per field |
| Request error | Implemented | Banner / field / avatar inline |
| Success | Implemented | Toasts + navigation |
| Disabled | Implemented | Save disabled until dirty and while pending; avatar buttons while busy |
| Unauthorized | Implemented | Proxy + `requireUser`; client fallback text C13 |
| Offline | Implemented | "No connection. Check your network and try again." |
| Unsaved changes | Missing | No prompt on Cancel, route change or language switch (U-PRF-02) |
| Profile missing | Implemented | C13 text |

## E. Acceptance criteria
- SCR-PRF-02-AC01 Given an unchanged form, then "Save changes" is disabled.
- SCR-PRF-02-AC02 Given a valid change, when saving, then "Profile saved." shows, the user lands on `/me` and the header shows the new display name.
- SCR-PRF-02-AC03 Given a username used by someone else in any letter case, when saving, then "This username is already taken." appears under the username field.
- SCR-PRF-02-AC04 Given an empty display name, then "Please enter a display name." shows.
- SCR-PRF-02-AC05 Given a blank bio, when saving, then the bio becomes `NULL` and `/me` shows "No bio yet.".
- SCR-PRF-02-AC06 Given a 12 MB PNG, when picked, then "That picture is too large (10 MB at most)." shows and nothing is uploaded.
- SCR-PRF-02-AC07 Given a valid picture, when picked, then the crop dialog opens and nothing is uploaded yet; when "Use photo" is pressed, then the chosen ≤ 256 px square is uploaded to `avatars/<uid>/…`, the previous object is deleted and the header avatar changes. Given the dialog, when "Cancel" is pressed, then nothing is uploaded.
- SCR-PRF-02-AC08 Given a suspended account, when picking a picture, then the upload is refused by Storage policy.
- SCR-PRF-02-AC09 [Proposed] Given unsaved edits, when the user cancels, navigates away or switches language, then they are asked to confirm discarding (U-PRF-02).
- SCR-PRF-02-AC10 [Proposed] Given the user typed a new username, then availability is checked before save and old `/author/<old>` links redirect to the new address (U-PRF-03).

## F. Findings referenced
U-PRF-02, U-PRF-03, U-I18N-02.

## G. Open questions
Q-PRF-01 (should suspended members be able to edit their profile?).
