import { afterEach, describe, expect, it, vi } from "vitest";

import { absoluteUrl, getSiteUrl } from "./site.ts";

afterEach(() => vi.unstubAllEnvs());

describe("site url", () => {
  it("uses NEXT_PUBLIC_SITE_URL, reduced to its origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://storynest.example/some/path?x=1");
    expect(getSiteUrl().toString()).toBe("https://storynest.example/");
  });

  it("adds https to a bare host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "storynest.example");
    expect(getSiteUrl().toString()).toBe("https://storynest.example/");
  });

  it("falls back to the Vercel production domain, then to the local server", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.vercel.example");
    expect(getSiteUrl().toString()).toBe("https://app.vercel.example/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
  });

  it("ignores a value that is not a web address", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "ftp://files.example");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://");
    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
  });

  it("builds absolute URLs for paths", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://storynest.example");
    expect(absoluteUrl("/story/1/abc")).toBe("https://storynest.example/story/1/abc");
    expect(absoluteUrl("/")).toBe("https://storynest.example/");
  });
});
