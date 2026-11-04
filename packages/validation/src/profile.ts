// Profile edit form. Messages are stable codes (translated by the UI), like the auth schemas.
import { z } from "zod";
import { APP_LIMITS, DB_LIMITS } from "./limits.ts";

export const PROFILE_ERROR = {
  usernameInvalid: "username_invalid",
  displayNameRequired: "display_name_required",
  displayNameTooLong: "display_name_too_long",
  bioTooLong: "bio_too_long",
} as const;

/** Forms submit "" for an empty optional field; for the bio that means "clear it" (NULL in the database). */
const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

export const profileFormSchema = z.strictObject({
  username: z
    .string()
    .min(DB_LIMITS.username.min, { message: PROFILE_ERROR.usernameInvalid })
    .max(DB_LIMITS.username.max, { message: PROFILE_ERROR.usernameInvalid })
    .regex(/^[A-Za-z0-9_]+$/, { message: PROFILE_ERROR.usernameInvalid }),
  display_name: z
    .string()
    .trim()
    .min(1, { message: PROFILE_ERROR.displayNameRequired })
    .max(DB_LIMITS.displayName, { message: PROFILE_ERROR.displayNameTooLong }),
  bio: z.preprocess(
    emptyToNull,
    z.string().trim().max(APP_LIMITS.bio, { message: PROFILE_ERROR.bioTooLong }).nullable(),
  ),
});

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileForm = z.output<typeof profileFormSchema>;
