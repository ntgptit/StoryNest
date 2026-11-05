import { usernameSchema } from "@storynest/validation";

/** Live hint next to a username field (Lucian 300). Never a validation result: the save/sign-up decides. */
export type UsernameAvailability = "idle" | "checking" | "available" | "taken";

/** Pause after the last keystroke before the name is looked up. */
export const USERNAME_CHECK_DELAY_MS = 450;

/**
 * The name worth looking up, or null: empty, not a valid username (the field's own message covers that) or the
 * person's current name. The same rule as the form, from @storynest/validation, so nothing is checked that the form
 * would refuse anyway.
 */
export function usernameToCheck(value: string, current?: string | null): string | null {
  const name = value.trim();
  if (name === "" || !usernameSchema.safeParse(name).success) return null;
  if (current && current.toLowerCase() === name.toLowerCase()) return null;
  return name.toLowerCase();
}

/** What to show, from the typed name, the name last looked up and that lookup's answer (undefined while unknown). */
export function usernameAvailability({
  typed,
  settled,
  inUse,
}: {
  typed: string | null;
  settled: string | null;
  inUse: boolean | undefined;
}): UsernameAvailability {
  if (typed === null) return "idle";
  if (typed !== settled || inUse === undefined) return "checking";
  return inUse ? "taken" : "available";
}
