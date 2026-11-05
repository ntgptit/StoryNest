import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BarRace, type RaceFrame } from "./bar-race.tsx";
import { CohortGrid, type CohortRow } from "./cohort-grid.tsx";
import { DateRangeCalendar } from "./date-range-calendar.tsx";
import { FlowSankey } from "./flow-sankey.tsx";
import { RangeHistogram, type HistogramBucket } from "./range-histogram.tsx";
import { SlopeChart, spreadLabels, type SlopeItem } from "./slope-chart.tsx";
import { TrendingTerms, type TrendingTerm } from "./trending-terms.tsx";
import { WaffleChart, waffleCells } from "./waffle-chart.tsx";
import { cloudSize, WordCloud, type CloudPeriod } from "./word-cloud.tsx";

const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DateRangeCalendar", () => {
  const text = {
    fromLabel: "From",
    toLabel: "To",
    placeholder: "Pick a day",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    gridLabel: "Days",
    apply: "Apply",
    pickStart: "Pick the first day",
    pickEnd: "Now the last day",
    summary: (days: number, from: string, to: string) => `${days} days · ${from} – ${to}`,
  };

  it("picks a range in either order and applies it", () => {
    const onApply = vi.fn();
    render(
      <DateRangeCalendar value={null} min="2026-10-01" max="2026-11-05" locale="en" text={text} onApply={onApply} />,
    );
    expect(isDisabled(screen.getByRole("button", { name: "Apply" }))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Nov 4$/ }));
    expect(screen.getByText("Now the last day")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Nov 2$/ }));
    expect(screen.getByText(/3 days/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({ from: "2026-11-02", to: "2026-11-04" });
  });

  it("disables days outside min..max and beyond the span, and stops at the bounds", () => {
    render(
      <DateRangeCalendar
        value={null}
        min="2026-10-01"
        max="2026-11-05"
        maxSpanDays={3}
        locale="en"
        text={text}
        onApply={() => {}}
      />,
    );
    expect(isDisabled(screen.getByRole("button", { name: /Nov 6$/ }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: "Next month" }))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Nov 5$/ }));
    expect(isDisabled(screen.getByRole("button", { name: /Nov 2$/ }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: /Nov 3$/ }))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText(/October 2026/)).toBeTruthy();
    expect(isDisabled(screen.getByRole("button", { name: "Previous month" }))).toBe(true);
  });

  it("shows the given range without the pick animation", () => {
    render(
      <DateRangeCalendar
        value={{ from: "2026-11-01", to: "2026-11-03" }}
        min="2026-10-01"
        max="2026-11-05"
        locale="en"
        text={text}
        onApply={() => {}}
      />,
    );
    const start = screen.getByRole("button", { name: /Nov 1$/ });
    expect(start.getAttribute("aria-pressed")).toBe("true");
    expect(start.className).not.toContain("animate-range-pick");
    expect(isDisabled(screen.getByRole("button", { name: "Apply" }))).toBe(false);
  });
});

describe("CohortGrid", () => {
  const rows: CohortRow[] = [
    { key: "a", label: "10/20", sizeText: "8 readers", cells: [1, 0.5, 0.25] },
    { key: "b", label: "10/27", sizeText: "too few", cells: [null, null], suppressed: true },
  ];
  const text = {
    label: "Cohorts",
    week: (n: number) => `W${n}`,
    idle: "Pick a cell",
    cell: (row: CohortRow, offset: number, percent: string) => `${row.label} week ${offset}: ${percent}`,
    hidden: (row: CohortRow) => `${row.label} hidden`,
  };

  it("picks and clears a cell; hidden cohorts have no figures", () => {
    render(<CohortGrid rows={rows} weeks={3} text={text} />);
    const cell = screen.getByRole("button", { name: "10/20 week 1: 50%" });
    fireEvent.click(cell);
    expect(cell.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("10/20 week 1: 50%", { selector: "p" })).toBeTruthy();
    fireEvent.click(cell);
    expect(screen.getByText("Pick a cell")).toBeTruthy();
    expect(screen.getAllByRole("img", { name: "10/27 hidden" })).toHaveLength(2);
    expect(screen.queryByText(/10\/27 week/)).toBeNull();
  });
});

describe("WaffleChart", () => {
  it("splits 100 cells by largest remainder", () => {
    expect(waffleCells([1, 1, 1])).toEqual([34, 33, 33]);
    expect(waffleCells([0, 0])).toEqual([0, 0]);
    expect(waffleCells([3, 1]).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("flips only changed cells after a change, never on first render; the legend focuses a segment", () => {
    const text = {
      label: "Reads",
      legend: "Legend",
      share: (s: { label: string }, p: number) => `${s.label}: ${p}%`,
      empty: "No reads",
    };
    const seg = (a: number, b: number) => [
      { key: "in", label: "Signed in", value: a, tone: 1 as const },
      { key: "anon", label: "Guests", value: b, tone: 2 as const },
    ];
    const { container, rerender } = render(<WaffleChart segments={seg(50, 50)} text={text} />);
    expect(container.querySelectorAll(".animate-cell-flip")).toHaveLength(0);
    rerender(<WaffleChart segments={seg(60, 40)} text={text} />);
    expect(container.querySelectorAll(".animate-cell-flip")).toHaveLength(10);
    const legend = screen.getByRole("button", { name: "Guests: 40%" });
    fireEvent.click(legend);
    expect(legend.getAttribute("aria-pressed")).toBe("true");
    rerender(<WaffleChart segments={seg(0, 0)} text={text} />);
    expect(screen.getByText("No reads")).toBeTruthy();
  });
});

describe("WordCloud", () => {
  const periods: CloudPeriod[] = [
    { key: "10", label: "Oct", words: [{ term: "plot", count: 4 }] },
    {
      key: "11",
      label: "Nov",
      words: [
        { term: "plot", count: 9 },
        { term: "ending", count: 3 },
      ],
    },
  ];
  const text = {
    periods: "Months",
    cloud: (p: CloudPeriod) => `Words of ${p.label}`,
    word: (w: { term: string; count: number }, change: number | null) =>
      `${w.term}: ${w.count} (${change === null ? "new" : change})`,
    idle: "Pick a word",
    empty: "No words",
  };

  it("sizes by count and shows change from the period before", () => {
    expect(cloudSize(9, 9)).toBeCloseTo(2.25);
    expect(cloudSize(0, 9)).toBeCloseTo(0.875);
    render(<WordCloud periods={periods} text={text} />);
    expect(screen.getByRole("group", { name: "Words of Nov" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "plot: 9 (5)" }));
    expect(screen.getByText("plot: 9 (5)", { selector: "p" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ending: 3 (new)" }).classList.contains("animate-word-pop")).toBe(false);
  });

  it("switching period pops in only the new words", () => {
    render(<WordCloud periods={periods} initialKey="10" text={text} />);
    fireEvent.click(screen.getByRole("button", { name: "Nov" }));
    expect(screen.getByRole("button", { name: "ending: 3 (new)" }).classList.contains("animate-word-pop")).toBe(true);
    expect(screen.getByRole("button", { name: "plot: 9 (5)" }).classList.contains("animate-word-pop")).toBe(false);
  });
});

describe("BarRace", () => {
  const frames: RaceFrame[] = [
    {
      key: "d1",
      label: "Day 1",
      bars: [
        { id: "a", label: "A", value: 10 },
        { id: "b", label: "B", value: 5 },
      ],
    },
    {
      key: "d2",
      label: "Day 2",
      bars: [
        { id: "b", label: "B", value: 12 },
        { id: "a", label: "A", value: 11 },
      ],
    },
  ];
  const text = {
    label: "Race",
    play: "Play",
    pause: "Pause",
    scrubber: "Day",
    bar: (rank: number, bar: { label: string }, value: string) => `${rank}. ${bar.label} ${value}`,
  };

  it("starts on the last frame, scrubs, and plays to the end without starting by itself", () => {
    vi.useFakeTimers();
    render(<BarRace frames={frames} text={text} />);
    expect(screen.getByRole("listitem", { name: "1. B 12" })).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: "Day" }), { target: { value: "0" } });
    expect(screen.getByRole("listitem", { name: "1. A 10" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("listitem", { name: "1. A 10" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole("listitem", { name: "1. B 12" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });
});

describe("SlopeChart", () => {
  const items: SlopeItem[] = [
    { id: "a", label: "A", from: { rank: 2, score: 5 }, to: { rank: 1, score: 9 } },
    { id: "b", label: "B", from: { rank: 1, score: 8 }, to: { rank: 2, score: 7 } },
    { id: "c", label: "C", from: null, to: { rank: 3, score: 2 } },
  ];
  const text = {
    label: "Ranks",
    fromLabel: "Before",
    toLabel: "Now",
    modes: "Show",
    rank: "Rank",
    score: "Score",
    item: (i: SlopeItem) => `${i.label}: ${i.from?.rank ?? "new"} → ${i.to.rank}`,
    idle: "Pick a story",
  };

  it("spreads names that would overlap and keeps them inside", () => {
    const placed = spreadLabels([
      { id: "a", y: 50 },
      { id: "b", y: 50 },
      { id: "c", y: 96 },
      { id: "d", y: 97 },
    ]);
    expect(placed.get("a")).toBe(50);
    expect(placed.get("b")).toBe(57);
    expect(placed.get("d")).toBeLessThanOrEqual(97);
    expect((placed.get("d") ?? 0) - (placed.get("c") ?? 0)).toBeGreaterThanOrEqual(7);
  });

  it("draws climbers and fallers, focuses one, switches mode", () => {
    const { container } = render(<SlopeChart items={items} text={text} />);
    expect(container.querySelector("path.stroke-chart-2")).not.toBeNull();
    expect(container.querySelector("path.stroke-destructive")).not.toBeNull();
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "A: 2 → 1" }));
    expect(screen.getByText("A: 2 → 1", { selector: "p" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Score" }));
    expect(screen.getByRole("button", { name: "Score" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(screen.getByRole("button", { name: "A: 2 → 1" })).getByText("9")).toBeTruthy();
  });
});

describe("TrendingTerms", () => {
  const items: TrendingTerm[] = [
    { term: "rồng lửa", rank: 1, change: 2 },
    { term: "kiếm", rank: 2, change: null },
    { term: "tiên", rank: 3, change: -1 },
  ];
  const text = {
    title: "Trending",
    open: "Show trending searches",
    close: "Hide trending searches",
    list: "Trending searches",
    isNew: "new",
    up: (n: number) => `up ${n}`,
    down: (n: number) => `down ${n}`,
    same: "same",
    pick: (term: string) => `Search ${term}`,
  };

  it("unfolds, picks a term and folds", () => {
    const onPick = vi.fn();
    render(<TrendingTerms items={items} text={text} onPick={onPick} />);
    const toggle = screen.getByRole("button", { name: "Show trending searches" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide trending searches" }).getAttribute("aria-expanded")).toBe("true");
    const list = within(screen.getByRole("list", { name: "Trending searches" }));
    expect(list.getByLabelText("up 2")).toBeTruthy();
    expect(list.getByLabelText("down 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Search kiếm" }));
    expect(onPick).toHaveBeenCalledWith("kiếm");
    expect(screen.getByRole("button", { name: "Show trending searches" })).toBeTruthy();
  });

  it("rolls through the terms only after a while, and flashes rows that moved on refresh", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<TrendingTerms items={items} text={text} onPick={() => {}} />);
    expect(container.querySelector(".animate-trend-roll")).toBeNull();
    act(() => vi.advanceTimersByTime(2600));
    expect(container.querySelector(".animate-trend-roll")?.textContent).toContain("kiếm");
    expect(container.querySelector(".animate-trend-flash")).toBeNull();
    rerender(
      <TrendingTerms
        items={[
          { term: "kiếm", rank: 1, change: 1 },
          { term: "rồng lửa", rank: 2, change: 1 },
          { term: "tiên", rank: 3, change: -1 },
        ]}
        text={text}
        onPick={() => {}}
      />,
    );
    expect(container.querySelectorAll(".animate-trend-flash")).toHaveLength(2);
  });

  it("renders nothing without terms", () => {
    const { container } = render(<TrendingTerms items={[]} text={text} onPick={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("RangeHistogram", () => {
  const buckets: HistogramBucket[] = [
    { key: "0", label: "0–2k", edge: "0", count: 4 },
    { key: "1", label: "2k–10k", edge: "2k", count: 6 },
    { key: "2", label: "10k+", edge: "10k", count: 2 },
  ];
  const text = {
    minThumb: "Shortest",
    maxThumb: "Longest",
    range: (from: HistogramBucket, to: HistogramBucket) => `${from.label} to ${to.label}`,
    results: (n: number) => `${n} stories`,
  };

  it("moves thumbs with the keyboard without crossing them", () => {
    const onChange = vi.fn();
    render(<RangeHistogram buckets={buckets} value={[0, 2]} onChange={onChange} text={text} />);
    expect(screen.getByText("0–2k to 10k+")).toBeTruthy();
    const min = screen.getByRole("slider", { name: "Shortest" });
    fireEvent.keyDown(min, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith([1, 2]);
    fireEvent.keyDown(min, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith([2, 2]);
    fireEvent.keyDown(screen.getByRole("slider", { name: "Longest" }), { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith([0, 0]);
    expect(min.getAttribute("aria-valuetext")).toBe("0–2k");
  });
});

describe("FlowSankey", () => {
  it("isolates a source and reports its rate", () => {
    const text = {
      stages: ["Readers", "Kept reading", "Followed"] as const,
      sources: "Sources",
      all: (a: number, b: number) => `${a} readers → ${b} followed`,
      one: (s: { label: string }, p: string) => `${s.label}: ${p}`,
    };
    render(
      <FlowSankey
        sources={[
          { key: "search", label: "Search", entered: 10, middle: 6, outcome: 2 },
          { key: "discover", label: "Discover", entered: 5, middle: 1, outcome: 0 },
        ]}
        text={text}
      />,
    );
    expect(screen.getByText("15 readers → 2 followed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText("Search: 20.0%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText("15 readers → 2 followed")).toBeTruthy();
  });
});
