import type { ForgotPassword, SignIn, SignUp } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { toAppError } from "../../_shared/errors.ts";

export async function signInWithPassword(client: DataClient, input: SignIn): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error) throw toAppError(error);
}

export interface SignUpResult {
  /** True when the project requires email confirmation: no session exists until the user opens the email link. */
  needsEmailConfirmation: boolean;
}

/**
 * `username` and `display_name` travel as user metadata; the handle_new_user trigger turns them into the profile row
 * (sanitising the username and appending a suffix on collision), so signing up never fails on a taken username.
 */
export async function signUpWithPassword(
  client: DataClient,
  input: SignUp,
  options: { emailRedirectTo: string },
): Promise<SignUpResult> {
  const metadata: Record<string, string> = {};
  if (input.username) metadata.username = input.username;
  if (input.display_name) metadata.display_name = input.display_name;

  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: options.emailRedirectTo, data: metadata },
  });
  if (error) throw toAppError(error);
  return { needsEmailConfirmation: data.session === null };
}

export async function requestPasswordReset(
  client: DataClient,
  input: ForgotPassword,
  options: { redirectTo: string },
): Promise<void> {
  const { error } = await client.auth.resetPasswordForEmail(input.email, { redirectTo: options.redirectTo });
  if (error) throw toAppError(error);
}

/** Requires a session: either a signed-in user or the recovery session created by the reset-email link. */
export async function updatePassword(client: DataClient, password: string): Promise<void> {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw toAppError(error);
}
