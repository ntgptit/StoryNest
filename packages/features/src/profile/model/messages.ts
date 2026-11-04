import { PROFILE_ERROR } from "@storynest/validation";
import { AppError } from "../../_shared/errors.ts";
import { AvatarError } from "./avatar-image.ts";
import { profileText } from "../strings.ts";

// A function, not a constant: the text is read when it is needed, so it follows the language.
const VALIDATION_TEXT = (): Record<string, string> => ({
  [PROFILE_ERROR.usernameInvalid]: profileText.validation.usernameInvalid,
  [PROFILE_ERROR.displayNameRequired]: profileText.validation.displayNameRequired,
  [PROFILE_ERROR.displayNameTooLong]: profileText.validation.displayNameTooLong,
  [PROFILE_ERROR.bioTooLong]: profileText.validation.bioTooLong,
});

export function validationMessage(code: string | undefined): string | undefined {
  if (code === undefined) return undefined;
  return VALIDATION_TEXT()[code] ?? profileText.errors.generic;
}

/** A unique violation on this table can only be the username (the id is the user's own primary key). */
export function isUsernameTaken(error: AppError): boolean {
  return error.kind === "conflict";
}

/** Banner text for a failed save (a taken username is shown on the field instead, see isUsernameTaken). */
export function profileErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "forbidden":
      return profileText.errors.forbidden;
    case "notFound":
      return profileText.errors.notFound;
    case "network":
      return profileText.errors.network;
    default:
      return profileText.errors.generic;
  }
}

/** Text for a failed picture change: a file the browser could not use, or the server's answer. */
export function avatarErrorMessage(error: Error): string {
  if (error instanceof AvatarError) {
    switch (error.problem) {
      case "type":
        return profileText.avatar.errors.type;
      case "tooLarge":
        return profileText.avatar.errors.tooLarge;
      case "unreadable":
        return profileText.avatar.errors.unreadable;
    }
  }
  if (error instanceof AppError) {
    if (error.kind === "invalid") return profileText.avatar.errors.rejected;
    return profileErrorMessage(error);
  }
  return profileText.errors.generic;
}
