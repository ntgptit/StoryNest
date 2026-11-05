import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FunnelSteps, type FunnelStep } from "./funnel-steps.tsx";
import { CalendarHeatmap, type HeatmapCell } from "./calendar-heatmap.tsx";
import { SyncedSmallMultiples, zoomInWindow, type SmallMultipleDay } from "./synced-small-multiples.tsx";

afterEach(cleanup);

const text = {
  chartLabel: (series: string) => `${series} by day`,
  hint: "Use arrows",
  latest: (day: string) => `Latest ${day}`,
  average: "avg",
  showTable: "Show table",
  hideTable: "Hide table",
  tableCaption: "Figures",
  dayColumn: "Day",
  noteColumn: "Note",
};

const days: SmallMultipleDay[] = [
  { key: "d1", label: "Day one", short: "1" },
  { key: "d2", label: "Day two", short: "2", note: "Launch" },
  { key: "d3", label: "Day three", short: "3" },
];

function renderCharts(overrides: { days?: SmallMultipleDay[]; a?: number[]; b?: number[]; slots?: number } = {}) {
  const d = overrides.days ?? days;
  const a = overrides.a ?? [10, 5, 0];
  const b = overrides.b ?? [1, 2, 3];
  return (
    <SyncedSmallMultiples
      days={d}
      slots={overrides.slots}
      series={[
        { key: "a", label: "Alpha", values: a, tone: 1 },
        { key: "b", label: "Beta", values: b, tone: 2 },
      ]}
      formatValue={(value) => String(value)}
      formatDelta={(delta) => (delta > 0 ? `+${delta}` : String(delta))}
      describeDay={(index) => `${d[index]?.label}: ${a[index]} alpha, ${b[index]} beta`}
      summary="Two charts"
      text={text}
    />
  );
}

const chart = (name: string) => screen.getByRole("group", { name: `${name} by day` });
const valueOf = (name: string) => chart(name).querySelector('[data-slot="value"]')?.textContent;
const readout = () => document.querySelector('[data-slot="readout"]')?.textContent;

describe("SyncedSmallMultiples", () => {
  it("shows the latest day in every chart and announces nothing until a day is picked", () => {
    render(renderCharts());
    expect(screen.getByRole("figure", { name: "Two charts" })).toBeTruthy();
    expect(valueOf("Alpha")).toBe("0");
    expect(valueOf("Beta")).toBe("3");
    expect(readout()).toBe("");
    expect(screen.getByText("Latest Day three")).toBeTruthy();
  });

  it("moves one cursor through every chart with the keyboard of any chart", () => {
    render(renderCharts());
    fireEvent.keyDown(chart("Alpha"), { key: "ArrowLeft" });
    expect(valueOf("Alpha")).toBe("5");
    expect(valueOf("Beta")).toBe("2");
    expect(readout()).toBe("Day two: 5 alpha, 2 beta");
    expect(screen.getByText("Day two · Launch")).toBeTruthy();

    fireEvent.keyDown(chart("Beta"), { key: "Home" });
    expect(valueOf("Alpha")).toBe("10");
    expect(valueOf("Beta")).toBe("1");
    fireEvent.keyDown(chart("Beta"), { key: "ArrowLeft" }); // stays on the first day
    expect(readout()).toBe("Day one: 10 alpha, 1 beta");
    fireEvent.keyDown(chart("Alpha"), { key: "End" });
    expect(valueOf("Alpha")).toBe("0");
    expect(chart("Alpha").querySelector('[data-slot="delta"]')?.textContent).toBe("-5");

    fireEvent.keyDown(chart("Alpha"), { key: "Escape" });
    expect(readout()).toBe("");
  });

  it("picks the day under a pointer or a finger", () => {
    render(renderCharts());
    const plot = chart("Beta").querySelector<HTMLElement>('[data-slot="plot"]');
    expect(plot).toBeTruthy();
    plot!.getBoundingClientRect = () => ({ left: 0, width: 300, top: 0, height: 56 }) as DOMRect;
    fireEvent.pointerDown(plot!, { clientX: 10, pointerType: "touch" });
    expect(valueOf("Alpha")).toBe("10");
    fireEvent.pointerMove(plot!, { clientX: 150, pointerType: "touch" });
    expect(valueOf("Alpha")).toBe("5");
    expect(readout()).toBe("Day two: 5 alpha, 2 beta");
  });

  it("dims every bar but the picked day and keeps one slot per day of the longest range", () => {
    const { rerender } = render(renderCharts({ slots: 5 }));
    const bars = () => [...chart("Alpha").querySelectorAll<HTMLElement>('[data-slot="bar"]')];
    expect(bars()).toHaveLength(5);
    expect(bars().map((bar) => bar.style.height)).toEqual(["0%", "0%", "100%", "50%", "0%"]);
    fireEvent.keyDown(chart("Alpha"), { key: "ArrowLeft" });
    expect(bars().filter((bar) => bar.className.includes("opacity-45"))).toHaveLength(4);

    // Fewer days: the same slots stay (and rescale) instead of being replaced; the picked day is dropped.
    const first = bars()[4];
    rerender(renderCharts({ slots: 5, days: days.slice(1), a: [5, 0], b: [2, 3] }));
    expect(bars()[4]).toBe(first);
    expect(bars().map((bar) => bar.style.height)).toEqual(["0%", "0%", "0%", "100%", "0%"]);
    expect(readout()).toBe("");
  });

  it("offers the same numbers as a table", () => {
    render(renderCharts());
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show table" }));
    const table = within(screen.getByRole("table"));
    const row = table.getByRole("rowheader", { name: "Day two" }).closest("tr");
    expect(
      within(row!)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["5", "2", "Launch"]);
    expect(screen.getByRole("button", { name: "Hide table" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("lets the figure shrink below the open table's width, so the table scrolls in its box instead of widening the page", () => {
    // As a grid or flex item the figure would otherwise take the table's min-content width (a phone page scrolled sideways).
    render(renderCharts());
    fireEvent.click(screen.getByRole("button", { name: "Show table" }));
    expect(screen.getByRole("figure").className).toMatch(/(^|\s)min-w-0(\s|$)/);
    expect(screen.getByRole("region", { name: "Figures" }).className).toContain("overflow-auto");
  });
});

const step = (n: number, overrides: Partial<FunnelStep> = {}): FunnelStep => ({
  key: `s${n}`,
  label: `Step ${n}`,
  valueText: String(100 / n),
  widthPercent: 100 / n,
  detail: `Detail ${n}`,
  ...overrides,
});

describe("FunnelSteps", () => {
  const props = {
    label: "Funnel",
    summary: "Overall",
    highlightLabel: "biggest drop",
    showAllLabel: (count: number) => `All ${count}`,
    showFewerLabel: "Fewer",
  };

  it("shows the summary, then a pressed step's detail, and the summary again on a second press", () => {
    render(<FunnelSteps {...props} steps={[step(1), step(2, { changeText: "-50%", highlight: true })]} />);
    const status = document.querySelector('[data-slot="funnel-status"]');
    expect(status?.textContent).toBe("Overall");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    const second = screen.getByRole("button", { name: /Step 2/ });
    expect(second.textContent).toContain("biggest drop");
    fireEvent.click(second);
    expect(second.getAttribute("aria-pressed")).toBe("true");
    expect(status?.textContent).toBe("Detail 2");
    fireEvent.click(second);
    expect(status?.textContent).toBe("Overall");
  });

  it("draws each step as wide as its share and folds long funnels", () => {
    const steps = Array.from({ length: 10 }, (_, i) => step(i + 1));
    render(<FunnelSteps {...props} steps={steps} initialVisible={3} />);
    const list = within(screen.getByRole("list", { name: "Funnel" }));
    expect(list.getAllByRole("listitem")).toHaveLength(3);
    const bar = list.getAllByRole("button")[1]?.querySelector<HTMLElement>('[data-slot="funnel-bar"]');
    expect(bar?.style.width).toBe("50%");
    fireEvent.click(screen.getByRole("button", { name: "All 10" }));
    expect(list.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Fewer" })).toBeTruthy();
  });
});

const zoomText = {
  ...text,
  zoom: {
    zoomIn: "Zoom in",
    reset: "Show all",
    selection: (from: string, to: string, n: number) => `Selected ${from}-${to} (${n})`,
    zoomed: (from: string, to: string, n: number, total: number) => `Showing ${from}-${to} (${n}/${total})`,
  },
};

const eightDays: SmallMultipleDay[] = Array.from({ length: 8 }, (_, i) => ({
  key: `d${i}`,
  label: `Day ${i}`,
  short: `s${i}`,
  ...(i === 1 ? { note: "Launch" } : {}),
}));
const eightValues = [1, 2, 3, 4, 8, 6, 2, 0];

function zoomable(withZoom = true, from = 0) {
  const d = eightDays.slice(from);
  const v = eightValues.slice(from);
  return (
    <SyncedSmallMultiples
      days={d}
      series={[{ key: "a", label: "Alpha", values: v, tone: 1 }]}
      formatValue={(value) => String(value)}
      describeDay={(index) => `${d[index]?.label}: ${v[index]}`}
      summary="Zoomable"
      text={withZoom ? zoomText : text}
    />
  );
}

const zoomStatus = () => document.querySelector('[data-slot="zoom-status"]')?.textContent;
const onBars = () =>
  [...chart("Alpha").querySelectorAll<HTMLElement>('[data-slot="bar"]')].filter(
    (bar) => !bar.parentElement?.className.includes("grow-0"),
  );
const brushBand = () => document.querySelector<HTMLElement>('[data-slot="brush"]');

describe("SyncedSmallMultiples zoom", () => {
  it("halves the window around a day, never below three days, and stays inside the axis", () => {
    expect(zoomInWindow({ start: 0, end: 89 }, 89, 90)).toEqual({ start: 45, end: 89 });
    expect(zoomInWindow({ start: 0, end: 89 }, 0, 90)).toEqual({ start: 0, end: 44 });
    expect(zoomInWindow({ start: 0, end: 6 }, 3, 7)).toEqual({ start: 2, end: 5 });
    expect(zoomInWindow({ start: 2, end: 5 }, 3, 7)).toEqual({ start: 2, end: 4 });
    expect(zoomInWindow({ start: 2, end: 4 }, 3, 7)).toBeNull();
  });

  it("offers no zoom without its text", () => {
    render(zoomable(false));
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    fireEvent.keyDown(chart("Alpha"), { key: "ArrowLeft", shiftKey: true });
    expect(brushBand()).toBeNull();
  });

  it("zooms in around the picked day with a button, rescales to the visible days and shows all again", () => {
    render(zoomable());
    expect(onBars()).toHaveLength(8);
    expect(zoomStatus()).toBe("");
    fireEvent.keyDown(chart("Alpha"), { key: "Home" });
    fireEvent.keyDown(chart("Alpha"), { key: "ArrowRight" }); // Day 1
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoomStatus()).toBe("Showing Day 0-Day 3 (4/8)");
    // Rescaled to the busiest visible day (4), not the busiest of the range (8).
    expect(onBars().map((bar) => bar.style.height)).toEqual(["25%", "50%", "75%", "100%"]);
    // The shared cursor stays on the picked day, and the keys stay inside the window.
    expect(valueOf("Alpha")).toBe("2");
    fireEvent.keyDown(chart("Alpha"), { key: "End" });
    expect(valueOf("Alpha")).toBe("4");
    fireEvent.keyDown(chart("Alpha"), { key: "ArrowRight" });
    expect(valueOf("Alpha")).toBe("4");

    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(onBars()).toHaveLength(8);
    expect(zoomStatus()).toBe("");
    expect(screen.queryByRole("button", { name: "Show all" })).toBeNull();
  });

  it("brushes a range with Shift and the arrows, zooms with Enter and steps back with Esc", () => {
    render(zoomable());
    const plot = chart("Alpha");
    fireEvent.keyDown(plot, { key: "ArrowLeft", shiftKey: true }); // from the last day
    expect(zoomStatus()).toBe("Selected Day 6-Day 7 (2)");
    fireEvent.keyDown(plot, { key: "Enter" }); // two days are too few: the brush is dropped
    expect(brushBand()).toBeNull();
    expect(onBars()).toHaveLength(8);

    fireEvent.keyDown(plot, { key: "ArrowLeft", shiftKey: true });
    fireEvent.keyDown(plot, { key: "ArrowLeft", shiftKey: true });
    fireEvent.keyDown(plot, { key: "ArrowLeft", shiftKey: true });
    expect(zoomStatus()).toBe("Selected Day 3-Day 6 (4)");
    expect(brushBand()?.style.width).toBe("50%");
    fireEvent.keyDown(plot, { key: "Enter" });
    expect(zoomStatus()).toBe("Showing Day 3-Day 6 (4/8)");
    expect(onBars()).toHaveLength(4);

    fireEvent.keyDown(plot, { key: "Escape" }); // the picked day first
    expect(readout()).toBe("");
    expect(onBars()).toHaveLength(4);
    fireEvent.keyDown(plot, { key: "Escape" }); // then the zoom
    expect(onBars()).toHaveLength(8);
  });

  it("zooms into the days a mouse drags across, and treats a short drag as a click", () => {
    render(zoomable());
    const plot = chart("Alpha").querySelector<HTMLElement>('[data-slot="plot"]')!;
    plot.getBoundingClientRect = () => ({ left: 0, width: 800, top: 0, height: 56 }) as DOMRect;
    const mouse = { pointerType: "mouse", pointerId: 1, button: 0 };
    fireEvent.pointerDown(plot, { ...mouse, clientX: 150 }); // day 1
    fireEvent.pointerMove(plot, { ...mouse, clientX: 250 }); // day 2: only two days
    fireEvent.pointerUp(plot, { ...mouse, clientX: 250 });
    expect(onBars()).toHaveLength(8);
    expect(valueOf("Alpha")).toBe("3");

    fireEvent.pointerDown(plot, { ...mouse, clientX: 150 });
    fireEvent.pointerMove(plot, { ...mouse, clientX: 450 });
    expect(zoomStatus()).toBe("Selected Day 1-Day 4 (4)");
    fireEvent.pointerUp(plot, { ...mouse, clientX: 450 });
    expect(zoomStatus()).toBe("Showing Day 1-Day 4 (4/8)");
    expect(onBars()).toHaveLength(4);
    // The publish flag of day 1 is now in the first of four slots.
    expect(plot.querySelector<HTMLElement>(".border-dotted")?.style.left).toBe("12.5%");

    // A finger scrubs the cursor and never brushes.
    fireEvent.pointerDown(plot, { pointerType: "touch", pointerId: 2, button: 0, clientX: 10 });
    fireEvent.pointerMove(plot, { pointerType: "touch", pointerId: 2, button: 0, clientX: 790 });
    expect(brushBand()).toBeNull();
    expect(valueOf("Alpha")).toBe("8");
  });

  it("drops the zoom when the number of days changes", () => {
    const { rerender } = render(zoomable());
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onBars()).toHaveLength(4);
    rerender(zoomable(true, 2));
    expect(onBars()).toHaveLength(6);
    expect(zoomStatus()).toBe("");
  });
});

const heatText = {
  hint: "Use arrows",
  legend: "Reads per day",
  showTable: "Show table",
  hideTable: "Hide table",
  tableCaption: "Reads by week",
  columnHeader: "Week of",
};

const heatCell = (n: number): HeatmapCell => ({
  key: `day-${n}`,
  level: (n % 5) as HeatmapCell["level"],
  label: `Day ${n}: ${n} reads`,
  valueText: String(n),
});

/** Two weeks: the first starts on its third row (days 0..4), the second is full (days 5..11). */
const heatColumns = [
  [null, null, heatCell(0), heatCell(1), heatCell(2), heatCell(3), heatCell(4)],
  [heatCell(5), heatCell(6), heatCell(7), heatCell(8), heatCell(9), heatCell(10), heatCell(11)],
];
const heatRows = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((label, i) => ({
  label,
  abbr: label.slice(0, 3),
  showLabel: i % 2 === 0,
}));

function renderHeatmap() {
  return render(
    <CalendarHeatmap
      columns={heatColumns}
      rows={heatRows}
      columnLabels={[
        { short: "Oct", long: "Mon 26 Oct" },
        { short: "", long: "Mon 2 Nov" },
      ]}
      legend={[
        { level: 0, label: "0" },
        { level: 4, label: "1-11" },
      ]}
      label="Reads heatmap"
      summary="Twelve days"
      text={heatText}
    />,
  );
}

const cell = (n: number) => screen.getByRole("gridcell", { name: `Day ${n}: ${n} reads` });
const heatStatus = () => document.querySelector('[data-slot="heatmap-status"]')?.textContent;

describe("CalendarHeatmap", () => {
  it("lays days out as weekday rows and week columns with one tab stop on the latest day", () => {
    renderHeatmap();
    const grid = screen.getByRole("grid", { name: "Reads heatmap" });
    const rows = within(grid).getAllByRole("row");
    expect(rows).toHaveLength(7);
    expect(within(rows[0]!).getByRole("rowheader", { name: "Monday" })).toBeTruthy();
    // Monday: an empty slot (before the first day), then day 5.
    expect(
      within(rows[0]!)
        .getAllByRole("gridcell")
        .map((c) => c.getAttribute("aria-label")),
    ).toEqual([null, "Day 5: 5 reads"]);
    expect(cell(11).tabIndex).toBe(0);
    expect(cell(3).tabIndex).toBe(-1);
    expect(cell(4).getAttribute("data-level")).toBe("4");
    expect(heatStatus()).toBe("Twelve days");
  });

  it("moves a day with ↑/↓ and a week with ←/→, and stops at the edges", () => {
    renderHeatmap();
    cell(11).focus();
    fireEvent.keyDown(cell(11), { key: "ArrowLeft" }); // a week back: day 4
    expect(document.activeElement).toBe(cell(4));
    expect(cell(4).getAttribute("aria-selected")).toBe("true");
    expect(heatStatus()).toBe("Day 4: 4 reads");
    expect(cell(4).tabIndex).toBe(0);
    fireEvent.keyDown(cell(4), { key: "ArrowDown" }); // the next day starts the next week
    expect(document.activeElement).toBe(cell(5));
    fireEvent.keyDown(cell(5), { key: "ArrowLeft" }); // the Monday before the first day: no move
    expect(document.activeElement).toBe(cell(5));
    fireEvent.keyDown(cell(5), { key: "Home" });
    expect(document.activeElement).toBe(cell(0));
    fireEvent.keyDown(cell(0), { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell(0));
    fireEvent.keyDown(cell(0), { key: "End" });
    expect(document.activeElement).toBe(cell(11));
    fireEvent.keyDown(cell(11), { key: "Escape" });
    expect(heatStatus()).toBe("Twelve days");
    expect(cell(11).getAttribute("aria-selected")).toBe("false");
  });

  it("picks a pressed day and lets go of it on a second press", () => {
    renderHeatmap();
    fireEvent.click(cell(7));
    expect(heatStatus()).toBe("Day 7: 7 reads");
    expect(cell(7).className).toContain("-translate-y-0.5");
    fireEvent.click(cell(7));
    expect(heatStatus()).toBe("Twelve days");
  });

  it("explains the shades and offers the values as a weekly table", () => {
    renderHeatmap();
    expect(within(screen.getByRole("list", { name: "Reads per day" })).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Show table" }));
    const table = within(screen.getByRole("table"));
    const first = table.getByRole("rowheader", { name: "Mon 26 Oct" }).closest("tr");
    expect(
      within(first!)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["", "", "0", "1", "2", "3", "4"]);
    expect(table.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Week of",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
});
