import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FunnelSteps, type FunnelStep } from "./funnel-steps.tsx";
import { SyncedSmallMultiples, type SmallMultipleDay } from "./synced-small-multiples.tsx";

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
