import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

import { GET } from "./route.ts";

const call = (query: string) => GET(new NextRequest(`https://app.test/auth/callback${query}`));
const location = (response: Response) => response.headers.get("location");

beforeEach(() => exchangeCodeForSession.mockReset());

describe("GET /auth/callback", () => {
  it("exchanges the code and redirects to next", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await call("?code=abc&next=%2Flibrary%3Ftab%3Dsaved");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(location(response)).toBe("https://app.test/library?tab=saved");
  });

  it("defaults to the home page without next", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    expect(location(await call("?code=abc"))).toBe("https://app.test/");
  });

  it.each(["//evil.com", "https://evil.com/x", "/\\evil.com", "javascript:alert(1)"])(
    "never redirects off-site (next=%s)",
    async (next) => {
      exchangeCodeForSession.mockResolvedValue({ error: null });
      const response = await call(`?code=abc&next=${encodeURIComponent(next)}`);
      expect(new URL(location(response) ?? "").origin).toBe("https://app.test");
      expect(new URL(location(response) ?? "").pathname).toBe("/");
    },
  );

  it("sends the user back to sign-in when the code is rejected", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
    expect(location(await call("?code=bad&next=%2Flibrary"))).toBe("https://app.test/login?error=callback");
  });

  it("does not try to exchange when there is no code", async () => {
    expect(location(await call("?next=%2Flibrary"))).toBe("https://app.test/login?error=callback");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
