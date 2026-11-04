import type { ProfileForm } from "@storynest/validation";
import { PROFILE_COLUMNS, type Profile } from "../../_shared/auth.tsx";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";

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
