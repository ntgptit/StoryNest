import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getClaims } }) }));
// next/navigation's redirect() throws a special error to stop rendering; model that.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { getCurrentUser, requireUser } from "./require-user.ts";

beforeEach(() => getClaims.mockReset());

describe("getCurrentUser", () => {
  it("returns the verified identity", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1", email: "a@b.co" } }, error: null });
    await expect(getCurrentUser()).resolves.toEqual({ id: "u1", email: "a@b.co", isModerator: false });
  });
  it("knows a moderator only from the signed token's app_metadata", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "m1", app_metadata: { role: "moderator" } } }, error: null });
    await expect(getCurrentUser()).resolves.toMatchObject({ isModerator: true });
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1", app_metadata: { role: "reader" } } }, error: null });
    await expect(getCurrentUser()).resolves.toMatchObject({ isModerator: false });
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1", user_metadata: { role: "moderator" } } }, error: null });
    await expect(getCurrentUser()).resolves.toMatchObject({ isModerator: false }); // user_metadata is editable by the user
  });
  it("returns null without a valid session and for anonymous users", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "no session" } });
    await expect(getCurrentUser()).resolves.toBeNull();
    getClaims.mockResolvedValue({ data: { claims: { sub: "u2", is_anonymous: true } }, error: null });
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe("requireUser", () => {
  it("passes the user through", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    await expect(requireUser("/me")).resolves.toMatchObject({ id: "u1" });
  });
  it("redirects to sign-in and remembers the page", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser("/studio/stories?x=1")).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fstudio%2Fstories%3Fx%3D1",
    );
  });
  it("never redirects to an unsafe return path", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser("//evil.com")).rejects.toThrow("NEXT_REDIRECT:/login?next=%2F");
  });
});
