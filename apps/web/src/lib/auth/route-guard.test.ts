import { describe, expect, it } from "vitest";
import { decideAuthRedirect, isGuestOnlyPath, isProtectedPath } from "./route-guard.ts";

describe("isProtectedPath", () => {
  it.each([
    "/me",
    "/me/edit",
    "/studio",
    "/studio/stories/1",
    "/library",
    "/settings/account",
    "/notifications",
    "/following",
    "/moderation",
    "/moderation/reports",
  ])("%s is protected", (path) => expect(isProtectedPath(path)).toBe(true));
  it.each(["/", "/login", "/story/1/a", "/members", "/menu", "/studio-fans", "/library-of-congress", "/dev/gallery"])(
    "%s is public (prefix matching is by path segment, not by string)",
    (path) => expect(isProtectedPath(path)).toBe(false),
  );
});

describe("isGuestOnlyPath", () => {
  it("covers sign-in and sign-up but not the reset or forgot pages", () => {
    expect(isGuestOnlyPath("/login")).toBe(true);
    expect(isGuestOnlyPath("/register")).toBe(true);
    expect(isGuestOnlyPath("/reset-password")).toBe(false);
    expect(isGuestOnlyPath("/forgot-password")).toBe(false);
  });
});

describe("decideAuthRedirect", () => {
  const anon = { isAuthenticated: false };
  const user = { isAuthenticated: true };

  it("sends an anonymous visitor to sign-in and remembers the destination, query included", () => {
    expect(decideAuthRedirect({ pathname: "/me", search: "", ...anon })).toBe("/login?next=%2Fme");
    expect(decideAuthRedirect({ pathname: "/library", search: "?tab=saved", ...anon })).toBe(
      "/login?next=%2Flibrary%3Ftab%3Dsaved",
    );
  });

  it("lets anonymous visitors see public pages and the credential pages", () => {
    for (const pathname of ["/", "/login", "/register", "/forgot-password", "/reset-password", "/story/1/x"]) {
      expect(decideAuthRedirect({ pathname, search: "", ...anon })).toBeNull();
    }
  });

  it("lets signed-in users through protected and public pages", () => {
    for (const pathname of ["/me", "/studio/stories", "/", "/story/1/x", "/reset-password"]) {
      expect(decideAuthRedirect({ pathname, search: "", ...user })).toBeNull();
    }
  });

  it("moves a signed-in user off /login and /register, honouring only a safe next", () => {
    expect(decideAuthRedirect({ pathname: "/login", search: "", ...user })).toBe("/");
    expect(decideAuthRedirect({ pathname: "/login", search: "?next=%2Flibrary", ...user })).toBe("/library");
    expect(decideAuthRedirect({ pathname: "/register", search: "?next=%2F%2Fevil.com", ...user })).toBe("/");
    expect(decideAuthRedirect({ pathname: "/login", search: "?next=https%3A%2F%2Fevil.com", ...user })).toBe("/");
  });
});
