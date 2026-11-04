import { AUTH_ERROR } from "@storynest/validation";
import type { AppError } from "../../_shared/errors.ts";
import { authText } from "../strings.ts";

// A function, not a constant: the text is read when it is needed, so it follows the language.
const VALIDATION_TEXT = (): Record<string, string> => ({
  [AUTH_ERROR.emailInvalid]: authText.validation.emailInvalid,
  [AUTH_ERROR.passwordRequired]: authText.validation.passwordRequired,
  [AUTH_ERROR.passwordTooShort]: authText.validation.passwordTooShort,
  [AUTH_ERROR.passwordTooLong]: authText.validation.passwordTooLong,
  [AUTH_ERROR.confirmMismatch]: authText.validation.confirmMismatch,
  [AUTH_ERROR.displayNameTooLong]: authText.validation.displayNameTooLong,
  username_invalid: authText.validation.usernameInvalid,
});

/** Translates a schema error code (see AUTH_ERROR); unknown codes get the generic text instead of raw English. */
export function validationMessage(code: string | undefined): string | undefined {
  if (code === undefined) return undefined;
  return VALIDATION_TEXT()[code] ?? authText.errors.generic;
}

// A function, not a constant: the text is read when it is needed, so it follows the language.
const BY_SUPABASE_CODE = (): Record<string, string> => ({
  invalid_credentials: authText.errors.invalidCredentials,
  email_not_confirmed: authText.errors.emailNotConfirmed,
  user_already_exists: authText.errors.emailTaken,
  email_exists: authText.errors.emailTaken,
  weak_password: authText.errors.weakPassword,
  same_password: authText.errors.samePassword,
  over_request_rate_limit: authText.errors.rateLimited,
  over_email_send_rate_limit: authText.errors.rateLimited,
  over_sms_send_rate_limit: authText.errors.rateLimited,
});

/** Text for a failed auth call: Supabase's specific code first, then the generic AppError kind. */
export function authErrorMessage(error: AppError): string {
  if (error.code !== undefined) {
    const specific = BY_SUPABASE_CODE()[error.code];
    if (specific) return specific;
  }
  switch (error.kind) {
    case "network":
      return authText.errors.network;
    case "rateLimited":
      return authText.errors.rateLimited;
    case "unauthenticated":
      return authText.errors.sessionExpired;
    default:
      return authText.errors.generic;
  }
}
