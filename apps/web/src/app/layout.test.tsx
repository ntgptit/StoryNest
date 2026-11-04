import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./globals.css", () => ({}));
vi.mock("./providers", () => ({ Providers: () => null }));

afterEach(() => vi.unstubAllEnvs());

describe("root metadata", () => {
  it("makes every relative canonical and Open Graph address absolute through the site address", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.test");
    vi.resetModules();
    const { metadata } = await import("./layout");
    expect(metadata.metadataBase?.toString()).toBe("https://site.test/");
  });
});
