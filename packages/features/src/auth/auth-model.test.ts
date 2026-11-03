import { describe, expect, it } from "vitest";
import { AppError, toAppError } from "../_shared/errors.ts";
import { authCallbackUrl, withNext } from "./model/auth-urls.ts";
import { authErrorMessage, validationMessage } from "./model/messages.ts";
import { authText } from "./strings.ts";

describe("authCallbackUrl", () => {
  it("encodes next and tolerates a trailing slash on the origin", () => {
    expect(authCallbackUrl("https://app.test/", "/story/1?tab=c")).toBe(
      "https://app.test/auth/callback?next=%2Fstory%2F1%3Ftab%3Dc",
    );
  });
  it("never puts an unsafe destination into an emailed link", () => {
    for (const next of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/\\evil.com", ""]) {
      expect(authCallbackUrl("https://app.test", next)).toBe("https://app.test/auth/callback?next=%2F");
    }
  });
});

describe("withNext", () => {
  it("keeps only meaningful, safe destinations", () => {
    expect(withNext("/login", undefined)).toBe("/login");
    expect(withNext("/login", "/")).toBe("/login");
    expect(withNext("/login", "//evil.com")).toBe("/login");
    expect(withNext("/login", "/library")).toBe("/login?next=%2Flibrary");
  });
});

describe("messages", () => {
  const supabase = (code: string, status = 400) => toAppError({ name: "AuthApiError", status, code, message: code });

  it.each([
    ["invalid_credentials", authText.errors.invalidCredentials],
    ["email_not_confirmed", authText.errors.emailNotConfirmed],
    ["user_already_exists", authText.errors.emailTaken],
    ["email_exists", authText.errors.emailTaken],
    ["weak_password", authText.errors.weakPassword],
    ["same_password", authText.errors.samePassword],
    ["over_request_rate_limit", authText.errors.rateLimited],
    ["over_email_send_rate_limit", authText.errors.rateLimited],
    ["something_new", authText.errors.generic],
  ])("auth code %s", (code, text) => expect(authErrorMessage(supabase(code))).toBe(text));

  it("falls back on the error kind", () => {
    expect(authErrorMessage(new AppError("network", "x"))).toBe(authText.errors.network);
    expect(authErrorMessage(new AppError("rateLimited", "x"))).toBe(authText.errors.rateLimited);
    expect(authErrorMessage(new AppError("unauthenticated", "x"))).toBe(authText.errors.sessionExpired);
    expect(authErrorMessage(new AppError("unknown", "x"))).toBe(authText.errors.generic);
  });

  it("translates schema codes and never shows raw English for unknown ones", () => {
    expect(validationMessage("password_too_short")).toBe(authText.validation.passwordTooShort);
    expect(validationMessage("username_invalid")).toBe(authText.validation.usernameInvalid);
    expect(validationMessage("Too small: expected string to have >=1 characters")).toBe(authText.errors.generic);
    expect(validationMessage(undefined)).toBeUndefined();
  });
});
