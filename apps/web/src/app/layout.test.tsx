import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./globals.css", () => ({}));
vi.mock("./providers", () => ({ Providers: () => null }));
// The layout only needs two bootstrap-script helpers from the features barrel. Loading the real barrel again after
// vi.resetModules() pulls in every feature module (~4 s cold), which pushed this test past its 5 s timeout under load.
vi.mock("@storynest/features", () => ({
  buildReaderBootstrapScript: () => "",
  SITE_THEME_BOOTSTRAP_SCRIPT: "",
  // @/lib/strings builds its catalogue with defineText; the Vietnamese texts are enough for metadata.
  defineText: <T,>(_id: string, vi: T) => vi,
}));

afterEach(() => vi.unstubAllEnvs());

describe("root metadata", () => {
  it("makes every relative canonical and Open Graph address absolute through the site address", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.test");
    vi.resetModules();
    const { metadata } = await import("./layout");
    expect(metadata.metadataBase?.toString()).toBe("https://site.test/");
    // A cold import of the whole layout graph (every feature) can take more than the default 5 s on a busy machine.
  }, 30_000);
});
