import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseEnv, isSupabaseConfigured } from "./env.ts";

afterEach(() => vi.unstubAllEnvs());

describe("supabase env", () => {
  it("is not configured when variables are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects a URL that is not a URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns the parsed configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(getSupabaseEnv()).toEqual({ url: "https://abc.supabase.co", publishableKey: "sb_publishable_x" });
  });
});
