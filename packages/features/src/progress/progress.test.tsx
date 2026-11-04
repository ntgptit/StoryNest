import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { getChapterProgress, getStoryProgress, saveReadingProgress } from "./api/progress.api.ts";
import { useReadingTracker } from "./hooks/use-reading-tracker.ts";
import {
  PROGRESS_WRITE_INTERVAL_MS,
  READING_COMPLETED_PERCENT,
  lastIndexAbove,
  resolveContinueChapter,
  shouldRestore,
  toPercent,
  type ReadingPosition,
} from "./model/progress.ts";
import { createProgressWriter } from "./model/progress-writer.ts";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("progress model", () => {
  it("counts a chapter as finished at 95% (the same threshold as the database function)", () => {
    expect(READING_COMPLETED_PERCENT).toBe(95);
    const sql = readFileSync("../../supabase/migrations/20261104000000_save_reading_progress.sql", "utf8");
    expect(sql).toContain(`c_completed_percent constant numeric := ${READING_COMPLETED_PERCENT};`);
  });

  it("converts a scroll ratio to a stored percent with one decimal, clamped", () => {
    expect(toPercent(0.5)).toBe(50);
    expect(toPercent(0.12345)).toBe(12.3);
    expect(toPercent(2)).toBe(100);
    expect(toPercent(-1)).toBe(0);
    expect(toPercent(Number.NaN)).toBe(0);
  });

  it("restores only an unfinished chapter that has a real position", () => {
    const base = { lastVersionId: null, completed: false };
    expect(shouldRestore(null)).toBe(false);
    expect(shouldRestore({ ...base, lastBlockId: null, percent: 0 })).toBe(false);
    expect(shouldRestore({ ...base, lastBlockId: "b", percent: 0 })).toBe(true);
    expect(shouldRestore({ ...base, lastBlockId: null, percent: 30 })).toBe(true);
    expect(shouldRestore({ ...base, lastBlockId: "b", percent: 99, completed: true })).toBe(false);
  });

  it("finds the last element above a line with a binary search", () => {
    expect(lastIndexAbove([-300, -100, 50, 400], 100)).toBe(2);
    expect(lastIndexAbove([200, 300], 100)).toBe(-1);
    expect(lastIndexAbove([-5, -4, -3], 0)).toBe(2);
    expect(lastIndexAbove([], 0)).toBe(-1);
    expect(lastIndexAbove([-1, Infinity, Infinity], 10)).toBe(0);
  });

  it("continues in the current chapter, or the next one when the current is finished", () => {
    const chapters = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(resolveContinueChapter(chapters, null)).toBeNull();
    expect(resolveContinueChapter(chapters, { currentChapterId: "b", currentChapterCompleted: false })).toBe(
      chapters[1],
    );
    expect(resolveContinueChapter(chapters, { currentChapterId: "b", currentChapterCompleted: true })).toBe(
      chapters[2],
    );
    expect(resolveContinueChapter(chapters, { currentChapterId: "c", currentChapterCompleted: true })).toBeNull();
    expect(resolveContinueChapter(chapters, { currentChapterId: "gone", currentChapterCompleted: false })).toBeNull();
  });
});

describe("createProgressWriter", () => {
  const at = (percent: number, lastBlockId: string | null = null): ReadingPosition => ({ lastBlockId, percent });
  function setup() {
    vi.useFakeTimers();
    const save = vi.fn(async (position: ReadingPosition) => void position);
    const writer = createProgressWriter({ save, intervalMs: 5000, now: () => Date.now() });
    return { save, writer };
  }

  it("writes the first position at once and then at most once per interval, with the newest position", () => {
    const { save, writer } = setup();
    writer.push(at(1));
    expect(save).toHaveBeenCalledTimes(1);
    writer.push(at(2));
    writer.push(at(3));
    vi.advanceTimersByTime(4999);
    expect(save).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(at(3));
  });

  it("never writes the same position twice", async () => {
    const { save, writer } = setup();
    writer.push(at(10, "b1"));
    await vi.advanceTimersByTimeAsync(PROGRESS_WRITE_INTERVAL_MS);
    writer.push(at(10, "b1"));
    await vi.advanceTimersByTimeAsync(PROGRESS_WRITE_INTERVAL_MS);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush writes the pending position immediately, and dispose drops it", () => {
    const { save, writer } = setup();
    writer.push(at(1));
    writer.push(at(2));
    writer.flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(at(2));
    writer.push(at(3));
    writer.dispose();
    vi.advanceTimersByTime(20_000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("retries after a failed write instead of treating the position as saved", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const writer = createProgressWriter({ save, intervalMs: 1000, now: () => Date.now() });
    writer.push(at(5));
    await vi.advanceTimersByTimeAsync(0);
    writer.push(at(5));
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(2);
  });
});

describe("progress api", () => {
  it("sends the percent and the block, and omits the block when unknown", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const client = { rpc } as unknown as DataClient;
    await saveReadingProgress(client, "c1", { lastBlockId: "b1", percent: 42.5 });
    await saveReadingProgress(client, "c1", { lastBlockId: null, percent: 0 });
    expect(rpc).toHaveBeenNthCalledWith(1, "save_reading_progress", {
      p_chapter_id: "c1",
      p_percent: 42.5,
      p_last_block_id: "b1",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "save_reading_progress", { p_chapter_id: "c1", p_percent: 0 });
  });

  it("surfaces an RPC error", async () => {
    const client = {
      rpc: async () => ({ data: null, error: { message: "x", code: "PT404" } }),
    } as unknown as DataClient;
    await expect(saveReadingProgress(client, "c1", { lastBlockId: null, percent: 1 })).rejects.toBeDefined();
  });

  it("maps the stored rows (numeric arrives as a string) and reports completion", async () => {
    const rows: Record<string, unknown> = {
      user_chapter_progress: {
        last_block_id: "b",
        last_version_id: "v",
        percent_complete: "37.50",
        completed_at: null,
      },
    };
    const builder = (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.maybeSingle = async () => ({ data: rows[table] ?? null, error: null });
      return b;
    };
    const client = { from: builder } as unknown as DataClient;
    expect(await getChapterProgress(client, "c")).toEqual({
      lastBlockId: "b",
      lastVersionId: "v",
      percent: 37.5,
      completed: false,
    });
    expect(await getStoryProgress(client, "s")).toBeNull();

    rows.user_story_progress = { current_chapter_id: "c" };
    rows.user_chapter_progress = { completed_at: "2026-11-04T00:00:00Z" };
    expect(await getStoryProgress(client, "s")).toEqual({ currentChapterId: "c", currentChapterCompleted: true });
  });
});

const blockIds = ["b1", "b2", "b3"];
const anchorFor = (id: string) => `anchor-${id}`;

function Probe() {
  useReadingTracker({ chapterId: "c1", blockIds, anchorFor });
  return (
    <div>
      {blockIds.map((id) => (
        <p key={id} id={anchorFor(id)}>
          {id}
        </p>
      ))}
    </div>
  );
}

function trackerClient(saved: unknown) {
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const maybeSingle = vi.fn(async () => ({ data: saved, error: null }));
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.maybeSingle = maybeSingle;
  const from = vi.fn(() => builder);
  return { rpc, from, maybeSingle };
}

function renderProbe(client: DataClient, children: ReactNode = <Probe />) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("useReadingTracker", () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    window.history.replaceState(null, "", "/");
    // Layout: three blocks, the first two already scrolled past the reading line (30% of 800px = 240px).
    const tops: Record<string, number> = { "anchor-b1": -400, "anchor-b2": 100, "anchor-b3": 600 };
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      return { top: tops[this.id] ?? 0 } as DOMRect;
    });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(document.documentElement, "clientHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 600, configurable: true });
  });

  it("does nothing for a guest: no progress query, no write", async () => {
    const t = trackerClient(null);
    renderProbe(withAuth(t, null));
    await act(async () => {});
    expect(t.from).not.toHaveBeenCalled();
    expect(t.rpc).not.toHaveBeenCalled();
  });

  it("for a signed-in reader records the block at the reading line and the percent on open", async () => {
    const t = trackerClient(null);
    renderProbe(withAuth(t, testSession()));
    await waitFor(() => expect(t.rpc).toHaveBeenCalledTimes(1));
    expect(t.rpc).toHaveBeenCalledWith("save_reading_progress", {
      p_chapter_id: "c1",
      p_percent: 50,
      p_last_block_id: "b2",
    });
  });

  it("restores the saved block before anything is written, and never overwrites it with the top of the page", async () => {
    const t = trackerClient({ last_block_id: "b3", last_version_id: "v", percent_complete: "80", completed_at: null });
    renderProbe(withAuth(t, testSession()));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("anchor-b3"));
    // the restore ran before the first write
    await waitFor(() => expect(t.rpc).toHaveBeenCalled());
    expect(scrollIntoView.mock.invocationCallOrder[0]).toBeLessThan(t.rpc.mock.invocationCallOrder[0] ?? 0);
  });

  it("falls back to the percentage when the saved block no longer exists, and skips restore for a finished chapter or a deep link", async () => {
    const gone = trackerClient({
      last_block_id: "removed",
      last_version_id: "v",
      percent_complete: "50",
      completed_at: null,
    });
    renderProbe(withAuth(gone, testSession()));
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 600 })); // 50% of (2000 - 800)
    cleanup();

    vi.mocked(window.scrollTo).mockClear();
    const finished = trackerClient({
      last_block_id: "b3",
      last_version_id: "v",
      percent_complete: "99",
      completed_at: "2026-11-04T00:00:00Z",
    });
    renderProbe(withAuth(finished, testSession()));
    await waitFor(() => expect(finished.rpc).toHaveBeenCalled());
    expect(scrollIntoView).not.toHaveBeenCalled();
    cleanup();

    window.history.replaceState(null, "", "/#anchor-b2");
    const deepLink = trackerClient({
      last_block_id: "b3",
      last_version_id: "v",
      percent_complete: "80",
      completed_at: null,
    });
    renderProbe(withAuth(deepLink, testSession()));
    await waitFor(() => expect(deepLink.rpc).toHaveBeenCalled());
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("flushes the latest position when the reader leaves", async () => {
    const t = trackerClient(null);
    renderProbe(withAuth(t, testSession()));
    await waitFor(() => expect(t.rpc).toHaveBeenCalledTimes(1));
    Object.defineProperty(window, "scrollY", { value: 900, configurable: true });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
    expect(t.rpc).toHaveBeenCalledTimes(1); // throttled
    cleanup(); // unmount flushes
    await waitFor(() => expect(t.rpc).toHaveBeenCalledTimes(2));
    expect(t.rpc).toHaveBeenLastCalledWith("save_reading_progress", {
      p_chapter_id: "c1",
      p_percent: 75,
      p_last_block_id: "b2",
    });
  });
});

describe("server/client boundary", () => {
  it('queries.ts must not be a "use client" module, hooks must be', () => {
    expect(readFileSync("src/progress/queries.ts", "utf8")).not.toMatch(/^\s*["']use client["']/m);
    expect(readFileSync("src/progress/hooks/use-progress.ts", "utf8")).toMatch(/^"use client"/);
  });
});
