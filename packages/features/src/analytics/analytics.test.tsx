import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { getChapterStats, getDailyStats } from "./api/analytics.api.ts";
import { useChapterStats } from "./hooks/use-analytics.ts";
import { analyticsKeys } from "./keys.ts";
import {
  barPercent,
  DEFAULT_RANGE,
  formatRetention,
  isRangeDays,
  sumDaily,
  toChapterStat,
  toDailyPoint,
  type ChapterStatRow,
  type DailyRow,
} from "./model/stats.ts";
import { DailyChart } from "./components/daily-chart.tsx";
import { StoryStatsScreen } from "./index.ts";
import { analyticsText } from "./strings.ts";

afterEach(cleanup);

const t = analyticsText;
const STORY = "a0000000-0000-4000-8000-000000000001";

const chapterRow = (n: number, overrides: Partial<ChapterStatRow> = {}): ChapterStatRow => ({
  chapter_id: `c0000000-0000-4000-8000-00000000000${n}`,
  slug: `chuong-${n}`,
  sort_order: n,
  title: `Tựa chương ${n}`,
  reads: 100 - n * 20,
  votes: n,
  comments: n * 2,
  retention: n === 1 ? null : 0.8,
  ...overrides,
});

const dayRow = (n: number, overrides: Partial<DailyRow> = {}): DailyRow => ({
  day: `2026-11-0${n}`,
  reads: n,
  votes: 0,
  comments: 0,
  ...overrides,
});

describe("stats model", () => {
  it("maps a chapter row (counts may arrive as strings) and keeps a missing title as its slug", () => {
    expect(
      toChapterStat(chapterRow(2, { reads: "75" as unknown as number, retention: "0.75" as unknown as number })),
    ).toMatchObject({
      number: 2,
      reads: 75,
      retention: 0.75,
      title: "Tựa chương 2",
    });
    expect(toChapterStat(chapterRow(1, { title: null }))?.title).toBe("chuong-1");
    expect(toChapterStat(chapterRow(1))?.retention).toBeNull();
  });

  it("drops rows that cannot be drawn", () => {
    expect(toChapterStat(chapterRow(1, { chapter_id: null }))).toBeNull();
    expect(toChapterStat(chapterRow(1, { slug: null }))).toBeNull();
    expect(toDailyPoint(dayRow(1, { day: null }))).toBeNull();
  });

  it("reads a day with missing counts as zeros", () => {
    expect(toDailyPoint(dayRow(1, { reads: null, votes: null, comments: null }))).toEqual({
      day: "2026-11-01",
      reads: 0,
      votes: 0,
      comments: 0,
    });
  });

  it("adds up a series", () => {
    expect(sumDaily([])).toEqual({ reads: 0, votes: 0, comments: 0 });
    expect(
      sumDaily([
        { day: "a", reads: 1, votes: 2, comments: 3 },
        { day: "b", reads: 10, votes: 20, comments: 30 },
      ]),
    ).toEqual({ reads: 11, votes: 22, comments: 33 });
  });

  it("shows retention as a percentage, a dash without a basis, and more than 100% as it is", () => {
    expect(formatRetention(0.5)).toBe("50%");
    expect(formatRetention(0.3333)).toBe("33%");
    expect(formatRetention(0.6667)).toBe("67%"); // rounds, does not cut
    expect(formatRetention(1.25)).toBe("125%");
    expect(formatRetention(0)).toBe("0%");
    expect(formatRetention(null)).toBe(t.chapters.noRetention);
  });

  it("sizes a bar against the biggest value, never empty for something and never full for nothing", () => {
    expect(barPercent(50, 100)).toBe(50);
    expect(barPercent(100, 100)).toBe(100);
    expect(barPercent(1, 1000)).toBe(2);
    expect(barPercent(0, 100)).toBe(0);
    expect(barPercent(5, 0)).toBe(0);
    expect(barPercent(500, 100)).toBe(100);
  });

  it("knows the ranges it offers and keys by viewer", () => {
    expect([7, 30, 90].every(isRangeDays)).toBe(true);
    expect(isRangeDays(14)).toBe(false);
    expect(DEFAULT_RANGE).toBe(30);
    expect(analyticsKeys.daily("a", STORY, 7)).not.toEqual(analyticsKeys.daily("b", STORY, 7));
    expect(analyticsKeys.daily("a", STORY, 7)).not.toEqual(analyticsKeys.daily("a", STORY, 30));
    expect(analyticsKeys.chapters("a", STORY)).not.toEqual(analyticsKeys.chapters("b", STORY));
  });
});

type RpcResult = { data: unknown; error: unknown };

function fakeClient(handlers: Record<string, (args: Record<string, unknown>) => RpcResult> = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    calls.push({ name, args });
    return handlers[name]?.(args) ?? { data: [], error: null };
  });
  return { rpc, calls, of: (name: string) => calls.filter((c) => c.name === name) };
}

describe("DailyChart", () => {
  it("draws the busiest day full height and the others in proportion", () => {
    render(
      <DailyChart
        points={[
          { day: "2026-11-01", reads: 10, votes: 0, comments: 0 },
          { day: "2026-11-02", reads: 5, votes: 0, comments: 0 },
          { day: "2026-11-03", reads: 0, votes: 0, comments: 0 },
        ]}
      />,
    );
    const bars = screen.getByRole("img").children;
    expect((bars[0] as HTMLElement).style.height).toBe("100%");
    expect((bars[1] as HTMLElement).style.height).toBe("50%");
    expect((bars[2] as HTMLElement).style.height).toBe("0%");
    expect(bars[0]?.getAttribute("title")).toBe(t.daily.barTitle("2026-11-01", "10"));
  });
});

describe("analytics api", () => {
  it("asks for the chapters of one story and maps the rows", async () => {
    const c = fakeClient({ author_chapter_stats: () => ({ data: [chapterRow(1), chapterRow(2)], error: null }) });
    const rows = await getChapterStats(c as unknown as DataClient, STORY);
    expect(rows.map((r) => r.number)).toEqual([1, 2]);
    expect(c.of("author_chapter_stats")[0]?.args).toEqual({ p_story_id: STORY });
  });

  it("asks for a number of days and maps the rows", async () => {
    const c = fakeClient({ author_story_daily: () => ({ data: [dayRow(1), dayRow(2)], error: null }) });
    const rows = await getDailyStats(c as unknown as DataClient, STORY, 7);
    expect(rows).toHaveLength(2);
    expect(c.of("author_story_daily")[0]?.args).toEqual({ p_story_id: STORY, p_days: 7 });
  });

  it("treats an empty answer as an empty list and throws what the database refuses with", async () => {
    expect(
      await getChapterStats(
        fakeClient({ author_chapter_stats: () => ({ data: null, error: null }) }) as unknown as DataClient,
        STORY,
      ),
    ).toEqual([]);
    await expect(
      getDailyStats(
        fakeClient({
          author_story_daily: () => ({ data: null, error: { code: "42501", message: "no" } }),
        }) as unknown as DataClient,
        STORY,
        30,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _replace, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderScreen(client: ReturnType<typeof fakeClient>, signedIn = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedIn ? testSession() : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <StoryStatsScreen storyId={STORY} />
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

const full = () =>
  fakeClient({
    author_chapter_stats: () => ({
      data: [chapterRow(1), chapterRow(2), chapterRow(3, { retention: null })],
      error: null,
    }),
    author_story_daily: () => ({
      data: [
        dayRow(1, { reads: 5, votes: 1 }),
        dayRow(2, { reads: 0 }),
        dayRow(3, { reads: 10, votes: 2, comments: 4 }),
      ],
      error: null,
    }),
  });

describe("StoryStatsScreen", () => {
  it("asks a guest to sign in and requests nothing", async () => {
    const c = full();
    renderScreen(c, false);
    expect(await screen.findByRole("link", { name: t.signInLink })).toBeTruthy();
    expect(c.calls).toHaveLength(0);
  });

  it("shows the totals of the chosen window, the chart and the chapters with their retention", async () => {
    const c = full();
    renderScreen(c);
    const totals = within(await screen.findByRole("region", { name: t.totals.title }));
    await waitFor(() => expect(totals.getByText("15")).toBeTruthy()); // 5 + 0 + 10 reads
    expect(totals.getByText("3")).toBeTruthy(); // votes
    expect(totals.getByText("4")).toBeTruthy(); // comments
    expect(screen.getByRole("img", { name: t.daily.chartLabel(3, 15, 3, 4) })).toBeTruthy();

    const table = within(screen.getByRole("table"));
    const rowOf = (title: string) => table.getByText(title).closest("tr")!;
    expect(within(rowOf("Tựa chương 1")).getByText(t.chapters.noRetention)).toBeTruthy();
    expect(within(rowOf("Tựa chương 2")).getByText("80%")).toBeTruthy();
    expect(within(rowOf("Tựa chương 3")).getByText(t.chapters.noRetention)).toBeTruthy();
    expect(within(rowOf("Tựa chương 1")).getByText(t.chapters.chapterLabel(1))).toBeTruthy();
    expect(c.of("author_story_daily")[0]?.args.p_days).toBe(30);
  });

  it("asks again for the window the author picks", async () => {
    const c = full();
    renderScreen(c);
    await screen.findByRole("img");
    const tab = screen.getByRole("tab", { name: t.range.options[7] });
    fireEvent.mouseDown(tab, { button: 0 });
    fireEvent.click(tab);
    await waitFor(() => expect(c.of("author_story_daily").at(-1)?.args.p_days).toBe(7));
    expect(screen.getByRole("tab", { name: t.range.options[30] }).getAttribute("aria-selected")).toBe("false");
  });

  it("says so when there is no activity or no chapter yet", async () => {
    renderScreen(
      fakeClient({
        author_chapter_stats: () => ({ data: [], error: null }),
        author_story_daily: () => ({ data: [dayRow(1, { reads: 0 }), dayRow(2, { reads: 0 })], error: null }),
      }),
    );
    expect(await screen.findByText(t.daily.empty)).toBeTruthy();
    expect(await screen.findByText(t.chapters.empty)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("tells someone who may not see the figures, and someone asking about a story that is not theirs", async () => {
    renderScreen(fakeClient({ author_chapter_stats: () => ({ data: null, error: { code: "42501", message: "x" } }) }));
    expect(await screen.findByText(t.noAccess.title)).toBeTruthy();
    cleanup();
    renderScreen(fakeClient({ author_chapter_stats: () => ({ data: null, error: { code: "PT404", message: "x" } }) }));
    expect(await screen.findByText(t.notFound.title)).toBeTruthy();
  });

  it("explains any other failure and retries both requests", async () => {
    const c = fakeClient({ author_chapter_stats: () => ({ data: null, error: { code: "XX000", message: "x" } }) });
    renderScreen(c);
    fireEvent.click(await screen.findByRole("button", { name: t.error.retry }));
    await waitFor(() => expect(c.of("author_chapter_stats").length).toBeGreaterThan(1));
    expect(c.of("author_story_daily").length).toBeGreaterThan(1);
  });
});

describe("useChapterStats", () => {
  it("asks nothing for a guest", async () => {
    const c = full();
    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => useChapterStats(STORY), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={new QueryClient()}>
          <DataProvider client={withAuth(c, null)}>
            <AuthProvider>{children}</AuthProvider>
          </DataProvider>
        </QueryClientProvider>
      ),
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(c.calls).toHaveLength(0);
    expect(result.current.isPending).toBe(true);
  });
});
