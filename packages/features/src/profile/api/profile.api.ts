import { buildStorageKey } from "@storynest/utils";
import type { ProfileForm } from "@storynest/validation";
import { PROFILE_COLUMNS, type Profile } from "../../_shared/auth.tsx";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, toAppError, unwrap } from "../../_shared/errors.ts";
import type { PreparedAvatar } from "../model/avatar-image.ts";

/**
 * Updates the signed-in user's own profile. RLS only lets a user update their own row and only the columns granted
 * to `authenticated` (account_status and deleted_at are not among them), so a tampered request cannot escalate.
 * Errors reach the caller as AppError: a taken username is `conflict` (unique violation), a row the user may not
 * touch is `notFound` (zero rows matched).
 */
export async function updateProfile(client: DataClient, userId: string, input: ProfileForm): Promise<Profile> {
  const row = unwrap(
    await client
      .from("app_users")
      .update({ username: input.username, display_name: input.display_name, bio: input.bio })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single(),
  );
  // unwrap() throws on any error; a null here would mean "no row", which single() reports as an error already.
  if (row === null) throw new AppError("notFound", "Profile not found");
  return row;
}

const AVATAR_BUCKET = "avatars";

function toStorageError(error: { message: string; statusCode?: string | number; status?: number }): AppError {
  // supabase-js reports Storage failures as { message, statusCode } (string) or { status }; map the ones the UI cares about.
  const status = Number(error.statusCode ?? error.status);
  if (status === 401) return new AppError("unauthenticated", error.message, { cause: error });
  if (status === 403) return new AppError("forbidden", error.message, { cause: error });
  if (status === 413 || status === 415 || status === 400)
    return new AppError("invalid", error.message, { cause: error });
  return toAppError(error);
}

/**
 * Uploads a prepared picture into the user's own folder and points the profile at it. The file name is generated
 * (never the user's), so a replaced picture gets a new address and caches never show the old one. If saving the
 * profile fails the uploaded object is removed; once the profile points at the new one the previous object is removed
 * (best effort: a leftover file is harmless, a failed cleanup must not fail the change).
 */
export async function uploadAvatar(
  client: DataClient,
  profile: Pick<Profile, "id" | "avatar_storage_key">,
  avatar: PreparedAvatar,
): Promise<Profile> {
  const key = buildStorageKey(profile.id, avatar.extension);
  const bucket = client.storage.from(AVATAR_BUCKET);
  const { error } = await bucket.upload(key, avatar.blob, {
    contentType: avatar.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error !== null) throw toStorageError(error);

  let saved: Profile;
  try {
    saved = await setAvatarKey(client, profile.id, key);
  } catch (failure) {
    await bucket.remove([key]).catch(() => undefined);
    throw failure;
  }
  if (profile.avatar_storage_key !== null) await bucket.remove([profile.avatar_storage_key]).catch(() => undefined);
  return saved;
}

/** Clears the picture (the initial shows again) and deletes the object. */
export async function removeAvatar(
  client: DataClient,
  profile: Pick<Profile, "id" | "avatar_storage_key">,
): Promise<Profile> {
  const saved = await setAvatarKey(client, profile.id, null);
  if (profile.avatar_storage_key !== null) {
    await client.storage
      .from(AVATAR_BUCKET)
      .remove([profile.avatar_storage_key])
      .catch(() => undefined);
  }
  return saved;
}

async function setAvatarKey(client: DataClient, userId: string, key: string | null): Promise<Profile> {
  const row = unwrap(
    await client
      .from("app_users")
      .update({ avatar_storage_key: key })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single(),
  );
  if (row === null) throw new AppError("notFound", "Profile not found");
  return row;
}
