# OBJ-PRF — Profile & avatar: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-PRF` |
| Name | Own profile (username, display name, bio) and avatar |
| Business purpose | Give each member a public identity shown on stories, comments, the author page and the header |
| User goals | See how their account looks; change name, username and bio; add, change or remove a profile picture |
| Actors / roles | Member (own row only); Guest/any member (read active public profiles); Moderator (reads all) |
| Related entities | `public.app_users` (`username` citext unique, `display_name`, `bio`, `avatar_storage_key`, `account_status`, `deleted_at`); Storage bucket `avatars`; helpers `is_valid_storage_key`, `can_write_avatar` |
| Code | `packages/features/src/profile/**`, `packages/features/src/_shared/{auth,avatar,image-prepare}.tsx/ts`, `packages/validation/src/profile.ts`, `apps/web/src/app/(main)/me/**` |
| Dependencies | OBJ-AUTH (row created by `handle_new_user`, BR-AUTH-004), OBJ-AUTHOR (public author page `/author/<username>` shows this data, BR-AUTHOR-*), OBJ-SHELL (header avatar) |
| WBS | 1.4 ✅, 1.5 ✅ (`docs/WBS.md:140-141`) |

Screens: [SCR-PRF-01 My profile](screens/my-profile.md) · [SCR-PRF-02 Edit profile](screens/edit-profile.md).

## 2. Rules

### BR-PRF-001 — Profile form validation
| Field | Value |
| --- | --- |
| Description | Shared Zod schema for the edit form |
| Preconditions | Edit form submitted |
| Conditions | `username` 3–30 chars, `^[A-Za-z0-9_]+$`; `display_name` trimmed, 1–100 chars (required); `bio` trimmed, ≤ 1000 chars, blank → `NULL` |
| Expected behavior | Messages: "Username can only contain letters, numbers and underscores (3-30 characters).", "Please enter a display name.", "Display name can be at most 100 characters.", "Bio can be at most 1000 characters." |
| Exceptions | Unknown codes → generic text |
| Related screens | SCR-PRF-02 |
| Evidence | `packages/validation/src/profile.ts:5-30`, `packages/validation/src/limits.ts:3-4,22`, `packages/features/src/profile/model/messages.ts:7-17`, `packages/features/src/profile/profile.test.tsx` |
| Status | Verified |

### BR-PRF-002 — Username uniqueness and storage
| Field | Value |
| --- | --- |
| Description | `username` is `citext UNIQUE`: unique regardless of case, but stored with the case the user typed (profile edit) |
| Preconditions | Insert/update of `app_users.username` |
| Conditions | CHECK `chk_username`: length 3–30 and `lower(username) ~ '^[a-z0-9_]+$'` |
| Expected behavior | Duplicate → `23505` → `AppError.kind = conflict` → field error "This username is already taken." |
| Exceptions | Usernames created at sign-up are always lower-case and ≤ 20 chars (BR-AUTH-004); edited ones may be mixed-case and up to 30 |
| Related screens | SCR-PRF-02 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:13-25`, `packages/features/src/_shared/errors.ts:61`, `packages/features/src/profile/model/messages.ts:19-22`, `packages/features/src/profile/screens/edit-profile-screen.tsx:83-88` |
| Status | Verified |

### BR-PRF-003 — Only the owner edits, only safe columns
| Field | Value |
| --- | --- |
| Description | A member may update only their own `app_users` row and only `username`, `display_name`, `bio`, `avatar_storage_key` |
| Preconditions | `authenticated` role |
| Conditions | Policy `app_users_update_self` (`id = auth.uid()`), column-level `GRANT UPDATE` |
| Expected behavior | Another user's row → 0 rows → `PGRST116` → `notFound` ("Profile not found."); `account_status`/`deleted_at` cannot be written by clients |
| Exceptions | The policy does not check `is_active_account()`: a suspended member can still edit their (publicly hidden) profile — see Q-PRF-01 |
| Related screens | SCR-PRF-02 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:185-188`, `supabase/tests/10_rls.test.sql:47-48`, `packages/features/src/profile/api/profile.api.ts:8-26` |
| Status | Verified (SQL test; runtime REST attempt recorded in `docs/WBS.md:140`) |

### BR-PRF-004 — Who can read a profile
| Field | Value |
| --- | --- |
| Description | Active, not-deleted profiles are public; a member always reads their own row; moderators read all |
| Preconditions | SELECT on `app_users` |
| Conditions | `app_users_read` policy |
| Expected behavior | Suspended/deactivated/deleted profiles disappear from public reads |
| Exceptions | — |
| Related screens | SCR-PRF-01, author page (OBJ-AUTHOR) |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:181-184` |
| Status | Verified |

### BR-PRF-005 — Saving the profile
| Field | Value |
| --- | --- |
| Description | Save is explicit and only possible after a change |
| Preconditions | Form dirty |
| Conditions | Submit disabled while pending or while `!isDirty` |
| Expected behavior | UPDATE … RETURNING profile columns → auth profile cache replaced (header name/avatar update without refetch) → toast "Profile saved." → `replace('/me')` + `refresh()` |
| Exceptions | Conflict → field error (BR-PRF-002); forbidden → "You don't have permission to edit this profile."; notFound; network; generic banner |
| Related screens | SCR-PRF-02, SCR-PRF-01 |
| Evidence | `packages/features/src/profile/screens/edit-profile-screen.tsx:68-89,162`, `packages/features/src/profile/hooks/use-update-profile.ts:10-24`, `packages/features/src/profile/model/messages.ts:24-36`, `apps/web/src/app/(main)/me/edit/edit-profile-page.tsx:6-15` |
| Status | Verified |

### BR-PRF-006 — Changing the username changes the public address
| Field | Value |
| --- | --- |
| Description | The author page is addressed by username (`/author/<username>`); there is no username history or redirect |
| Preconditions | Username saved with a new value |
| Conditions | — |
| Expected behavior | Hint warns: "Changing it changes your profile address." Old links stop resolving |
| Exceptions | — |
| Related screens | SCR-PRF-02 |
| Evidence | `packages/features/src/profile/strings.en.ts:7`, `packages/features/src/author/model/author.ts:8`; absence of any username history table in `supabase/migrations/` |
| Status | Verified — U-PRF-03 |

### BR-PRF-007 — Avatar file preparation (client)
| Field | Value |
| --- | --- |
| Description | The browser checks, crops and re-encodes the picked picture before upload |
| Preconditions | File picked in the avatar editor |
| Conditions | Type ∈ JPEG/PNG/WebP else "Only JPG, PNG or WebP pictures can be used."; size ≤ 10 MB else "That picture is too large (10 MB at most)."; undecodable → "This picture could not be read. Try another one." |
| Expected behavior | Type and size are checked before the crop dialog (#069 `ImageCropDialog`) opens; the user picks a square (zoom 1-3×, never leaving the picture; the untouched view is the largest centred square, identical to the earlier automatic crop). That square is scaled to ≤ 256 px (never enlarged), encoded WebP q 0.85 (JPEG if WebP encoding unavailable). Cancel uploads nothing |
| Exceptions | — |
| Related screens | SCR-PRF-02 |
| Evidence | `packages/features/src/_shared/image-prepare.ts` (`cropBox` with optional crop, `checkImageFile`), `packages/features/src/_shared/use-crop-source.ts`, `packages/ui/src/lib/crop-math.ts`, `packages/features/src/profile/model/avatar-image.ts`, `packages/features/src/profile/model/messages.ts:38-55`, `packages/features/src/profile/avatar.test.tsx` |
| Status | Verified |

### BR-PRF-008 — Avatar bucket and write policy (server)
| Field | Value |
| --- | --- |
| Description | Bucket `avatars` is public-read, ≤ 2 MiB per object, JPEG/PNG/WebP only. Insert/update/delete/select by `authenticated` only inside `avatars/<own uid>/<file>` and only while the account is active |
| Preconditions | Storage request |
| Conditions | `can_write_avatar(name)` = `is_valid_storage_key(name, auth.uid()) AND is_active_account()` |
| Expected behavior | Other folders, nested paths, `..`, upper-case uid, wrong extension, other buckets → refused (HTTP 400/403 → "The server did not accept this picture. Try another one." or forbidden text) |
| Exceptions | Guests read through the public URL only |
| Related screens | SCR-PRF-02 |
| Evidence | `supabase/migrations/20261104002300_avatars_bucket.sql:21-46`, `supabase/tests/290_avatars_bucket.test.sql`, `packages/features/src/profile/api/profile.api.ts:40-48` |
| Status | Verified (SQL test) |

### BR-PRF-009 — Avatar storage key
| Field | Value |
| --- | --- |
| Description | Key = `<uid lower-case>/<random uuid>.<webp|jpg>`; the DB CHECK forces `avatar_storage_key` into the row's own folder |
| Preconditions | Upload |
| Conditions | `chk_avatar_key` |
| Expected behavior | A new picture always gets a new address (cache 1 year, `upsert: false`) |
| Exceptions | — |
| Related screens | SCR-PRF-02 |
| Evidence | `packages/utils/src/storage.ts:33-38`, `supabase/migrations/20261104000300_storage_key_convention.sql:34-35`, `packages/features/src/profile/api/profile.api.ts:61-68` |
| Status | Verified |

### BR-PRF-010 — Avatar replace / remove ordering
| Field | Value |
| --- | --- |
| Description | Never leave the profile pointing at a missing file |
| Preconditions | Upload or remove |
| Conditions | — |
| Expected behavior | Replace: upload new → set key → delete old (best effort). If setting the key fails, the new object is deleted and the old picture stays. Remove: set key `NULL` → delete object (best effort) |
| Exceptions | Cleanup failures are swallowed (harmless leftover file) |
| Related screens | SCR-PRF-02 |
| Evidence | `packages/features/src/profile/api/profile.api.ts:50-107` |
| Status | Verified |

### BR-PRF-011 — Avatar changes apply immediately
| Field | Value |
| --- | --- |
| Description | The avatar editor is independent from the details form: a picked file is cropped in a dialog and, on "Use photo", uploaded at once, not on "Save changes" (changed by PR #60: the crop dialog now precedes the upload); "Cancel" does not undo it |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Success → toast "Profile picture updated." / "Profile picture removed."; auth profile cache updated so the header avatar changes |
| Exceptions | Error shown under the editor (`role="alert"`); buttons disabled while busy |
| Related screens | SCR-PRF-02, SCR-SHELL-01 |
| Evidence | `packages/features/src/profile/components/avatar-editor.tsx:16-108`, `packages/features/src/profile/hooks/use-avatar.ts:12-41` |
| Status | Verified |

### BR-PRF-012 — Avatar display and fallback
| Field | Value |
| --- | --- |
| Description | Public URL built client-side from the key (no request). Without a picture (or if it fails to load) a fallback is shown |
| Preconditions | — |
| Conditions | Header: up to two initials of display name (or email); editor and other places: first letter |
| Expected behavior | `alt=""` (decorative; the name is next to it) |
| Exceptions | No Supabase client → fallback only |
| Related screens | SCR-SHELL-01, SCR-PRF-02 |
| Evidence | `packages/features/src/_shared/avatar.tsx:13-41`, `packages/features/src/shell/model/initials.ts:1-11`, `packages/features/src/shell/components/user-menu.tsx:40,56` |
| Status | Verified |

### BR-PRF-013 — "My profile" content
| Field | Value |
| --- | --- |
| Description | `/me` shows display name, `@username`, email (from the verified JWT) and bio ("No bio yet." when empty), plus "Edit profile" |
| Preconditions | Signed in (BR-AUTH-010) |
| Conditions | Profile row read on the server by `user.id` |
| Expected behavior | No row → "No profile was found for this account." |
| Exceptions | A query error is treated as "no row" (F-PRF-01). Avatar, public-page link and stats are not shown (U-PRF-01) |
| Related screens | SCR-PRF-01 |
| Evidence | `apps/web/src/app/(main)/me/page.tsx:12-27`, `apps/web/src/app/(main)/me/me-view.tsx:16-43`, `apps/web/src/app/(main)/me/me-view.test.tsx` |
| Status | Verified |
