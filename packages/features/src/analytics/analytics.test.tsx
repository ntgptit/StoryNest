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
  alignDaily,
  barPercent,
  chapterScatter,
  DEFAULT_RANGE,
  formatChange,
  formatDay,
  formatMonth,
  formatPercent,
  formatRetention,
  HEATMAP_DAYS,
  heatLegend,
  heatLevel,
  isRangeDays,
  lowReadsThreshold,
  publishedByDay,
  readThroughFunnel,
  sumDaily,
  toChapterStat,
  toDailyPoint,
  weekColumns,
  weekdayNames,
  type ChapterStat,
  type ChapterStatRow,
  type DailyRow,
} from "./model/stats.ts";
import { DailyChart } from "./components/daily-chart.tsx";
import { ReadsHeatmap } from "./components/reads-heatmap.tsx";
import { ReadThroughFunnel } from "./components/read-through-funnel.tsx";
import { ChapterScatter } from "./components/chapter-scatter.tsx";
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

describe("daily series alignment", () => {
  const point = (day: string, reads: number, votes = 0, comments = 0) => ({ day, reads, votes, comments });

  it("puts every series on one sorted, gap-free day axis, adding up a day sent twice and dropping a bad day", () => {
    const series = alignDaily([
      point("2026-11-03", 3, 1, 0),
      point("2026-11-01", 1, 0, 2),
      point("2026-11-03", 2, 0, 1),
      point("not-a-day", 99, 99, 99),
    ]);
    expect(series).toEqual({
      days: ["2026-11-01", "2026-11-02", "2026-11-03"],
      reads: [1, 0, 5],
      votes: [0, 0, 1],
      comments: [2, 0, 1],
    });
  });

  it("crosses month ends, keeps a zero-filled series as it is and handles nothing", () => {
    expect(alignDaily([point("2026-10-31", 1), point("2026-11-01", 0)]).days).toEqual(["2026-10-31", "2026-11-01"]);
    const zeros = alignDaily([point("2026-11-01", 0), point("2026-11-02", 0)]);
    expect(zeros.reads).toEqual([0, 0]);
    expect(alignDaily([])).toEqual({ days: [], reads: [], votes: [], comments: [] });
  });

  it("flags the UTC day each chapter was first published, only inside the axis", () => {
    expect(
      publishedByDay(
        ["2026-11-01", "2026-11-02"],
        [
          { number: 3, publishedAt: "2026-11-02T23:30:00+00:00" },
          { number: 2, publishedAt: "2026-11-02T01:00:00Z" },
          { number: 1, publishedAt: "2026-10-01T00:00:00Z" },
          { number: 4, publishedAt: null },
          { number: 5, publishedAt: "2026-11-01T23:30:00-02:00" }, // 01:30 UTC on 2 Nov
          { number: 6, publishedAt: "garbage" },
        ],
      ),
    ).toEqual({ "2026-11-02": [2, 3, 5] });
  });

  it("formats a UTC day for people and leaves anything else as it is", () => {
    expect(formatDay("2026-11-05", "en", "short")).toBe("11/5");
    expect(formatDay("2026-11-05", "en", "long")).toBe("Thu, Nov 5");
    expect(formatDay("2026-11-05", "vi", "short")).toBe("5/11");
    expect(formatDay("later", "en", "long")).toBe("later");
  });
});

describe("read-through funnel", () => {
  const stat = (number: number, reads: number): ChapterStat => ({
    chapterId: `c${number}`,
    slug: `chuong-${number}`,
    number,
    title: `Chương ${number}`,
    reads,
    votes: 0,
    comments: 0,
    retention: null,
  });
  const funnelOf = (...reads: number[]) => readThroughFunnel(reads.map((r, i) => stat(i + 1, r)));

  it("compares each chapter with the first and the one before, and finds the biggest drop", () => {
    const funnel = funnelOf(100, 80, 20, 18);
    expect(funnel.steps.map((s) => s.ofFirst)).toEqual([1, 0.8, 0.2, 0.18]);
    expect(funnel.steps.map((s) => s.fromPrevious)).toEqual([null, 0.8, 0.25, 0.9]);
    expect(funnel.steps.map((s) => (s.dropOff === null ? null : Math.round(s.dropOff * 100)))).toEqual([
      null,
      20,
      75,
      10,
    ]);
    expect(funnel.steps.map((s) => s.widthPercent)).toEqual([100, 80, 20, 18]);
    expect(funnel.biggestDrop).toBe(2);
    expect(funnel.overall).toBe(0.18);
    expect(funnel.totalReads).toBe(218);
  });

  it("follows reading order whatever order the rows come in, and matches the server's retention", () => {
    const funnel = readThroughFunnel([stat(3, 40), stat(1, 80), stat(2, 60)]);
    expect(funnel.steps.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(funnel.steps[1]?.fromPrevious).toBe(0.75); // = retention of chapter 2 in BR-STAT-003
  });

  it("shows more reads than the chapter before as a negative drop, not a drop", () => {
    const funnel = funnelOf(10, 12);
    expect(funnel.steps[1]?.dropOff).toBeCloseTo(-0.2);
    expect(funnel.biggestDrop).toBeNull();
    expect(funnel.overall).toBe(1.2);
  });

  it("has no basis after a chapter with no reads, and counts a fall to zero as a full drop", () => {
    const fromZero = funnelOf(0, 5, 2);
    expect(fromZero.steps.map((s) => s.ofFirst)).toEqual([null, null, null]);
    expect(fromZero.steps.map((s) => s.fromPrevious)).toEqual([null, null, 0.4]);
    expect(fromZero.biggestDrop).toBe(2);
    expect(fromZero.overall).toBeNull();

    const toZero = funnelOf(5, 0);
    expect(toZero.steps[1]?.dropOff).toBe(1);
    expect(toZero.biggestDrop).toBe(1);
    expect(toZero.overall).toBe(0);
    expect(toZero.steps[1]?.widthPercent).toBe(0);
  });

  it("handles no reads at all, a single chapter, no chapter and a tie", () => {
    const silent = funnelOf(0, 0);
    expect(silent.totalReads).toBe(0);
    expect(silent.biggestDrop).toBeNull();
    expect(silent.overall).toBeNull();
    expect(silent.steps.map((s) => s.widthPercent)).toEqual([0, 0]);

    const single = funnelOf(7);
    expect(single.steps).toHaveLength(1);
    expect(single.steps[0]).toMatchObject({ ofFirst: 1, fromPrevious: null, dropOff: null, widthPercent: 100 });
    expect(single.biggestDrop).toBeNull();
    expect(single.overall).toBeNull();

    expect(readThroughFunnel([])).toEqual({ steps: [], biggestDrop: null, overall: null, totalReads: 0 });
    expect(funnelOf(100, 50, 25).biggestDrop).toBe(1); // 50% twice: the earliest wins
  });

  it("writes ratios and changes as whole percents", () => {
    expect(formatPercent(0.684)).toBe("68%");
    expect(formatChange(0.18)).toBe("−18%");
    expect(formatChange(1)).toBe("−100%");
    expect(formatChange(-0.05)).toBe("+5%");
    expect(formatChange(0.004)).toBe("0%");
  });
});

type RpcResult = { data: unknown; error: unknown };

/** Fake client: RPCs by name, and `from("chapters")` (the story's published chapter list) answering `chapterRows`. */
function fakeClient(
  handlers: Record<string, (args: Record<string, unknown>) => RpcResult> = {},
  chapterRows: unknown[] = [],
) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    calls.push({ name, args });
    return handlers[name]?.(args) ?? { data: [], error: null };
  });
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order"]) builder[method] = () => builder;
  builder.returns = () => Promise.resolve({ data: chapterRows, error: null });
  const from = vi.fn(() => builder);
  return { rpc, from, calls, of: (name: string) => calls.filter((c) => c.name === name) };
}

const dayPoints = [
  { day: "2026-11-01", reads: 10, votes: 1, comments: 0 },
  { day: "2026-11-02", reads: 5, votes: 0, comments: 2 },
  { day: "2026-11-03", reads: 0, votes: 3, comments: 1 },
];
const chartOf = (series: string) => screen.getByRole("group", { name: t.daily.seriesChart(series) });
const valueIn = (series: string) => chartOf(series).querySelector('[data-slot="value"]')?.textContent;
const liveReadout = () => document.querySelector('[data-slot="readout"]');

describe("DailyChart", () => {
  it("scrubbing one chart with ←/→ moves the cursor in every chart and announces the day", () => {
    render(<DailyChart points={dayPoints} published={[{ number: 2, publishedAt: "2026-11-02T08:00:00Z" }]} />);
    expect(screen.getByRole("figure", { name: t.daily.chartLabel(3, 15, 4, 3) })).toBeTruthy();
    // Latest day before anything is picked; nothing is announced.
    expect([t.daily.series.reads, t.daily.series.votes, t.daily.series.comments].map(valueIn)).toEqual(["0", "3", "1"]);
    expect(liveReadout()?.textContent).toBe("");
    expect(liveReadout()?.getAttribute("aria-live")).toBe("polite");

    fireEvent.keyDown(chartOf(t.daily.series.reads), { key: "ArrowLeft" });
    expect([t.daily.series.reads, t.daily.series.votes, t.daily.series.comments].map(valueIn)).toEqual(["5", "0", "2"]);
    expect(liveReadout()?.textContent).toBe(
      t.daily.readout(formatDay("2026-11-02", "vi", "long"), 5, 0, 2, t.daily.published([2])),
    );

    fireEvent.keyDown(chartOf(t.daily.series.comments), { key: "ArrowLeft" });
    expect([t.daily.series.reads, t.daily.series.votes, t.daily.series.comments].map(valueIn)).toEqual([
      "10",
      "1",
      "0",
    ]);
    expect(liveReadout()?.textContent).toBe(t.daily.readout(formatDay("2026-11-01", "vi", "long"), 10, 1, 0, null));
  });

  it("keeps one bar slot per day of the longest range and colours each series with its own chart token", () => {
    render(<DailyChart points={dayPoints} />);
    const bars = chartOf(t.daily.series.reads).querySelectorAll<HTMLElement>('[data-slot="bar"]');
    expect(bars).toHaveLength(90);
    expect([...bars].slice(-3).map((bar) => bar.style.height)).toEqual(["100%", "50%", "0%"]);
    expect(bars[0]?.className).toContain("bg-chart-1");
    expect(chartOf(t.daily.series.votes).querySelector('[data-slot="bar"]')?.className).toContain("bg-chart-2");
    expect(chartOf(t.daily.series.comments).querySelector('[data-slot="bar"]')?.className).toContain("bg-chart-3");
  });

  it("lists the same numbers, and the publish days, in a table", () => {
    render(<DailyChart points={dayPoints} published={[{ number: 2, publishedAt: "2026-11-02T08:00:00Z" }]} />);
    fireEvent.click(screen.getByRole("button", { name: t.daily.showTable }));
    const table = within(screen.getByRole("table"));
    const row = table.getByRole("rowheader", { name: formatDay("2026-11-02", "vi", "long") }).closest("tr");
    expect(
      within(row as HTMLElement)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["5", "0", "2", t.daily.published([2])]);
  });

  it("says so when the range is empty", () => {
    render(<DailyChart points={[{ day: "2026-11-01", reads: 0, votes: 0, comments: 0 }]} />);
    expect(screen.getByText(t.daily.empty)).toBeTruthy();
    expect(screen.queryByRole("figure")).toBeNull();
  });
});

describe("ReadThroughFunnel", () => {
  const rows = (...reads: number[]) =>
    reads.flatMap((r, i) => toChapterStat(chapterRow(i + 1, { reads: r, retention: null })) ?? []);
  const status = () => document.querySelector('[data-slot="funnel-status"]')?.textContent;

  it("sums up the read-through, highlights the biggest drop and explains a pressed chapter", () => {
    render(<ReadThroughFunnel chapters={rows(100, 80, 20)} />);
    expect(status()).toBe(`${t.funnel.summary(3, 1, "20%")} ${t.funnel.biggestDrop(3, formatChange(0.75))}`);
    const third = screen.getByRole("button", { name: new RegExp(t.chapters.chapterLabel(3)) });
    expect(third.textContent).toContain(t.funnel.highlight);
    expect(third.textContent).toContain(formatChange(0.75));
    fireEvent.click(third);
    expect(status()).toBe(
      t.funnel.detail({
        number: 3,
        title: "Tựa chương 3",
        reads: "20",
        first: 1,
        ofFirst: "20%",
        previous: 2,
        change: formatChange(0.75),
      }),
    );
  });

  it("says when there is nothing to compare: one chapter, or no reads at all", () => {
    render(<ReadThroughFunnel chapters={rows(7)} />);
    expect(status()).toBe(t.funnel.single);
    cleanup();
    render(<ReadThroughFunnel chapters={rows(0, 0)} />);
    expect(screen.getByText(t.funnel.empty)).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("chapter scatter model", () => {
  const stat = (number: number, reads: number, votes: number, retention: number | null): ChapterStat => ({
    chapterId: `c${number}`,
    slug: `chuong-${number}`,
    number,
    title: `Chương ${number}`,
    reads,
    votes,
    comments: 0,
    retention,
  });
  const chapters = [stat(2, 50, 1, 0.5), stat(1, 100, 4, null), stat(3, 0, 0, 0), stat(4, 8, 2, null)];

  it("plots likes per 100 reads in reading order and leaves out chapters without reads", () => {
    const { points, omitted } = chapterScatter(chapters, "likesPer100");
    expect(points.map((p) => [p.number, p.reads, p.value])).toEqual([
      [1, 100, 4],
      [2, 50, 2],
      [4, 8, 25],
    ]);
    expect(omitted).toBe(1);
  });

  it("plots retention and leaves out the chapters without a basis", () => {
    const { points, omitted } = chapterScatter(chapters, "retention");
    expect(points.map((p) => [p.number, p.value])).toEqual([
      [2, 0.5],
      [3, 0],
    ]);
    expect(omitted).toBe(2);
  });

  it("fades under a tenth of the most-read chapter, and has no filter when that is 1 read or less", () => {
    expect(lowReadsThreshold(chapters)).toBe(10);
    expect(lowReadsThreshold([stat(1, 101, 0, null)])).toBe(11);
    expect(lowReadsThreshold([stat(1, 10, 0, null)])).toBe(0);
    expect(lowReadsThreshold([])).toBe(0);
  });
});

describe("ChapterScatter", () => {
  const rows = (...pairs: [number, number][]) =>
    pairs.flatMap(([reads, votes], i) => toChapterStat(chapterRow(i + 1, { reads, votes })) ?? []);
  const status = () => document.querySelector('[data-slot="scatter-status"]')?.textContent;

  it("shows a chapter's reads and likes, switches the axis to retention and fades chapters with few reads", () => {
    render(<ChapterScatter chapters={rows([200, 10], [100, 1], [5, 1])} locale="en" />);
    const s = t.scatter;
    expect(status()).toBe(s.summary(3, 0));
    const second = screen.getByRole("button", { name: /Tựa chương 2/ });
    fireEvent.click(second);
    const detail = s.detail({
      number: 2,
      title: "Tựa chương 2",
      reads: "100",
      likes: "1",
      metric: s.metrics.likesPer100,
      value: "1",
    });
    expect(status()).toBe(detail);

    fireEvent.click(screen.getByRole("button", { name: s.metrics.retention }));
    expect(screen.getByRole("button", { name: s.metrics.retention }).getAttribute("aria-pressed")).toBe("true");
    // chapterRow gives chapters 2 and 3 a retention of 80% and chapter 1 none.
    expect(screen.getByRole("group", { name: s.label(s.metrics.retention) })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Tựa chương/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: s.filter("20") }));
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Tựa chương 3/ }).disabled).toBe(true);
    expect(status()).toBe(`${s.summary(2, 1)} ${s.omittedRetention(1)}`);
  });

  it("offers no filter when no chapter is far below the most read", () => {
    render(<ChapterScatter chapters={rows([20, 1], [18, 2])} locale="en" />);
    expect(screen.queryByRole("button", { name: /^Fade|^Làm mờ/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Tựa chương/ })).toHaveLength(2);
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
    expect(screen.getByRole("figure", { name: t.daily.chartLabel(3, 15, 3, 4) })).toBeTruthy();

    // Read-through funnel from the per-chapter reads (80, 60, 40): 50% overall, the biggest drop into chapter 3.
    const funnel = within(screen.getByRole("region", { name: t.funnel.title }));
    expect(funnel.getAllByRole("listitem")).toHaveLength(3);
    expect(
      funnel.getByText(`${t.funnel.summary(3, 1, "50%")} ${t.funnel.biggestDrop(3, formatChange(1 - 40 / 60))}`),
    ).toBeTruthy();

    // Chapters compared: one dot per chapter with reads.
    const scatter = within(screen.getByRole("region", { name: t.scatter.title }));
    expect(scatter.getAllByRole("button", { name: /Tựa chương/ })).toHaveLength(3);

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
    const chart = await screen.findByRole("figure");
    const tab = screen.getByRole("tab", { name: t.range.options[7] });
    fireEvent.mouseDown(tab, { button: 0 });
    fireEvent.click(tab);
    await waitFor(() => expect(c.of("author_story_daily").at(-1)?.args.p_days).toBe(7));
    expect(screen.getByRole("tab", { name: t.range.options[30] }).getAttribute("aria-selected")).toBe("false");
    // The chart stays mounted across the switch (previous range kept while loading), so its bars can morph.
    expect(screen.getByRole("figure")).toBe(chart);
  });

  it("flags the days chapters were published, from the story's chapter list", async () => {
    const c = fakeClient(
      {
        author_chapter_stats: () => ({ data: [chapterRow(1), chapterRow(2)], error: null }),
        author_story_daily: () => ({ data: [dayRow(1, { reads: 5 }), dayRow(2, { reads: 3 })], error: null }),
      },
      [
        { id: "c1", slug: "chuong-1", sort_order: 1, first_published_at: "2026-10-01T08:00:00Z", version: null },
        { id: "c2", slug: "chuong-2", sort_order: 2, first_published_at: "2026-11-02T08:00:00Z", version: null },
      ],
    );
    renderScreen(c);
    await screen.findByRole("figure");
    fireEvent.click(screen.getByRole("button", { name: t.daily.showTable }));
    await waitFor(() => expect(screen.getAllByText(t.daily.published([2])).length).toBeGreaterThan(0));
    expect(c.from).toHaveBeenCalledWith("chapters");
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
    expect(screen.queryByRole("figure")).toBeNull();
    expect(screen.queryByRole("region", { name: t.funnel.title })).toBeNull();
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

  it("draws the reads heatmap from a 90-day request, whatever range is picked", async () => {
    const c = full();
    renderScreen(c);
    const heatmap = within(await screen.findByRole("region", { name: t.heatmap.title }));
    expect(await heatmap.findByRole("grid", { name: t.heatmap.label })).toBeTruthy();
    expect(heatmap.getAllByRole("gridcell").filter((cell) => cell.hasAttribute("aria-label"))).toHaveLength(3);
    expect(c.of("author_story_daily").map((call) => call.args.p_days)).toEqual([30, HEATMAP_DAYS]);
    expect(heatmap.getByText(t.heatmap.note)).toBeTruthy();
  });

  it("brings the totals to the new range's figures when the range changes", async () => {
    const c = fakeClient({
      author_story_daily: (args) => ({
        data: args.p_days === 7 ? [dayRow(3, { reads: 2, votes: 7, comments: 1 })] : [dayRow(1, { reads: 40 })],
        error: null,
      }),
    });
    renderScreen(c);
    const totals = within(await screen.findByRole("region", { name: t.totals.title }));
    await waitFor(() => expect(totals.getByText("40")).toBeTruthy());
    const tab = screen.getByRole("tab", { name: t.range.options[7] });
    fireEvent.mouseDown(tab, { button: 0 });
    fireEvent.click(tab);
    // Whether it counts or (without animation frames) jumps, it ends on the 7-day totals and is read only once.
    await waitFor(() => expect(totals.getByText("7")).toBeTruthy());
    await waitFor(() => expect(totals.queryByText("40")).toBeNull());
    expect(totals.getByText("2")).toBeTruthy();
  });
});

describe("reads heatmap model", () => {
  it("shades a day by the quarter of the busiest day it falls in", () => {
    expect([0, 1, 2, 3, 5, 6, 7, 8, 10].map((reads) => heatLevel(reads, 10))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(heatLevel(5, 0)).toBe(0);
    expect(heatLevel(1, 1)).toBe(4);
  });

  it("labels each shade with the whole numbers it covers and leaves out shades no count can reach", () => {
    expect(heatLegend(10)).toEqual([
      { level: 0, from: 0, to: 0 },
      { level: 1, from: 1, to: 2 },
      { level: 2, from: 3, to: 5 },
      { level: 3, from: 6, to: 7 },
      { level: 4, from: 8, to: 10 },
    ]);
    expect(heatLegend(2)).toEqual([
      { level: 0, from: 0, to: 0 },
      { level: 2, from: 1, to: 1 },
      { level: 4, from: 2, to: 2 },
    ]);
    // The legend always agrees with the shading.
    for (let max = 1; max <= 40; max += 1) {
      const legend = heatLegend(max);
      for (let reads = 0; reads <= max; reads += 1) {
        const entry = legend.find((item) => item.level === heatLevel(reads, max));
        expect(entry && reads >= entry.from && reads <= entry.to).toBe(true);
      }
    }
  });

  it("lays the days out Monday to Sunday, week by week, and marks where months start", () => {
    // Wed 28 Oct to Thu 5 Nov 2026.
    const days = alignDaily([
      { day: "2026-10-28", reads: 1, votes: 0, comments: 0 },
      { day: "2026-11-05", reads: 1, votes: 0, comments: 0 },
    ]).days;
    expect(weekColumns(days)).toEqual({
      columns: [
        [null, null, 0, 1, 2, 3, 4],
        [5, 6, 7, 8, null, null, null],
      ],
      weekStarts: ["2026-10-26", "2026-11-02"],
      monthStarts: ["2026-11-01", null],
    });
  });

  it("labels the first week with its own month only when no month starts right after it", () => {
    const axis = (from: string, to: string) =>
      alignDaily([
        { day: from, reads: 0, votes: 0, comments: 0 },
        { day: to, reads: 0, votes: 0, comments: 0 },
      ]).days;
    expect(weekColumns(axis("2026-10-20", "2026-11-03")).monthStarts).toEqual([null, "2026-11-01", null]);
    expect(weekColumns(axis("2026-10-05", "2026-10-25")).monthStarts).toEqual(["2026-10-05", null, null]);
    expect(weekColumns(["not a day"])).toEqual({ columns: [], weekStarts: [], monthStarts: [] });
    expect(weekColumns([])).toEqual({ columns: [], weekStarts: [], monthStarts: [] });
  });

  it("names the weekdays from Monday and the month of a day", () => {
    const names = weekdayNames("en");
    expect(names).toHaveLength(7);
    expect(names[0]).toEqual({ long: "Monday", short: "Mon" });
    expect(names[6]?.long).toBe("Sunday");
    expect(formatMonth("2026-11-05", "en")).toBe("Nov");
    expect(formatMonth("nope", "en")).toBe("nope");
  });
});

describe("ReadsHeatmap", () => {
  const nineDays = [
    { day: "2026-10-28", reads: 4, votes: 1, comments: 0 },
    { day: "2026-11-02", reads: 8, votes: 0, comments: 3 },
    { day: "2026-11-05", reads: 1, votes: 0, comments: 0 },
  ];

  it("shades every day of the window by reads and reads out the day's three numbers", () => {
    render(<ReadsHeatmap points={nineDays} published={[{ number: 4, publishedAt: "2026-11-02T09:00:00Z" }]} />);
    const grid = screen.getByRole("grid", { name: t.heatmap.label });
    expect(
      within(grid)
        .getAllByRole("gridcell")
        .filter((cell) => cell.hasAttribute("aria-label")),
    ).toHaveLength(9);
    const busiest = within(grid).getByRole("gridcell", {
      name: t.daily.readout(formatDay("2026-11-02", "vi", "long"), 8, 0, 3, t.daily.published([4])),
    });
    expect(busiest.getAttribute("data-level")).toBe("4");
    const quiet = within(grid).getByRole("gridcell", {
      name: t.daily.readout(formatDay("2026-10-29", "vi", "long"), 0, 0, 0, null),
    });
    expect(quiet.getAttribute("data-level")).toBe("0");
    expect(screen.getByText(t.heatmap.summary(9, "13", formatDay("2026-11-02", "vi", "long"), "8"))).toBeTruthy();
    fireEvent.click(busiest);
    expect(document.querySelector('[data-slot="heatmap-status"]')?.textContent).toBe(
      busiest.getAttribute("aria-label"),
    );
  });

  it("says so when there were no reads, even with likes or comments", () => {
    render(<ReadsHeatmap points={[{ day: "2026-11-05", reads: 0, votes: 2, comments: 1 }]} />);
    expect(screen.getByText(t.heatmap.empty)).toBeTruthy();
    expect(screen.queryByRole("grid")).toBeNull();
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
