// Credentials forms. Rules mirror what Supabase Auth accepts (GoTrue stores bcrypt hashes, which only use the first
// 72 bytes, so longer passwords are rejected instead of being silently truncated).
import { z } from "zod";
import { usernameSchema } from "./inputs.ts";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

/**
 * Messages in this file are stable codes, not prose: the UI maps them to translated text
 * (see features/auth strings), so the same schema serves the server, tests and every language.
 */
export const AUTH_ERROR = {
  emailInvalid: "email_invalid",
  passwordRequired: "password_required",
  passwordTooShort: "password_too_short",
  passwordTooLong: "password_too_long",
  confirmMismatch: "confirm_mismatch",
  displayNameTooLong: "display_name_too_long",
} as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { message: AUTH_ERROR.emailInvalid })
  .pipe(z.email({ message: AUTH_ERROR.emailInvalid }));

const byteLength = (value: string) => new TextEncoder().encode(value).length;

/** New passwords (sign-up, reset). Sign-in deliberately does not apply the length rule: old passwords must still work. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: AUTH_ERROR.passwordTooShort })
  .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, { message: AUTH_ERROR.passwordTooLong });

/** Forms submit "" for an empty optional field; treat it as absent. */
const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

export const signInSchema = z.strictObject({
  email: emailSchema,
  password: z
    .string()
    .min(1, { message: AUTH_ERROR.passwordRequired })
    .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, { message: AUTH_ERROR.passwordTooLong }),
});

export const signUpSchema = z.strictObject({
  email: emailSchema,
  password: newPasswordSchema,
  username: z.preprocess(emptyToUndefined, usernameSchema.optional()),
  display_name: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(100, { message: AUTH_ERROR.displayNameTooLong }).optional(),
  ),
});

export const forgotPasswordSchema = z.strictObject({ email: emailSchema });

export const resetPasswordSchema = z
  .strictObject({ password: newPasswordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: AUTH_ERROR.confirmMismatch, path: ["confirmPassword"] });

export type SignIn = z.output<typeof signInSchema>;
export type SignUp = z.output<typeof signUpSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPassword = z.output<typeof forgotPasswordSchema>;
export type ResetPassword = z.output<typeof resetPasswordSchema>;
