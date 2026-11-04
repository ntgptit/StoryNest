import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ prefetchStory: vi.fn(), prefetchChapter: vi.fn() }));
vi.mock("@storynest/features", () => ({
  createQueryClient: () => ({}),
  prefetchStory: mocks.prefetchStory,
  prefetchChapter: mocks.prefetchChapter,
}));
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));

import { loadChapter } from "./load-chapter.ts";

describe("loadChapter", () => {
  it("fetches the chapter in parallel with its story", async () => {
    let releaseStory: (story: unknown) => void = () => {};
    mocks.prefetchStory.mockReturnValue(new Promise((resolve) => (releaseStory = resolve)));
    mocks.prefetchChapter.mockResolvedValue({ id: "c1" });

    const loading = loadChapter("s1", "chuong-1");
    // The story is still pending: the chapter request must already be on its way.
    await vi.waitFor(() => expect(mocks.prefetchChapter).toHaveBeenCalledWith(expect.anything(), {}, "s1", "chuong-1"));
    releaseStory({ id: "s1" });

    await expect(loading).resolves.toMatchObject({ story: { id: "s1" }, chapter: { id: "c1" } });
  });

  it("reports a failed chapter as not loaded (undefined) so the client retries", async () => {
    mocks.prefetchStory.mockResolvedValue({ id: "s1" });
    mocks.prefetchChapter.mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(loadChapter("s1", "chuong-2")).resolves.toMatchObject({ story: { id: "s1" }, chapter: undefined });
  });
});
