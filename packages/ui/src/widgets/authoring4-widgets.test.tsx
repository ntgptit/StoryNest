import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalLine, type ApprovalStep } from "./approval-line.tsx";
import { BlurUpImage } from "./blur-up-image.tsx";
import { BranchGraph, layoutBranches, type BranchNode } from "./branch-graph.tsx";
import { ControlHandoff } from "./control-handoff.tsx";
import { NextChapterCountdown, remainingShare, timeLeft } from "./next-chapter-countdown.tsx";
import { TreeFolder } from "./part-tree.tsx";
import { StoryCover } from "./story-cover.tsx";
import { WeekdayPainter } from "./weekday-painter.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TreeFolder (102)", () => {
  it("opens and closes its branch", () => {
    render(
      <TreeFolder label="Book one" meta="2 chapters">
        <p>Chapter 1</p>
      </TreeFolder>,
    );
    const toggle = screen.getByRole("button", { name: /Book one/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Chapter 1")).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")?.hidden).toBe(true);
  });
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function Painter({ initial = [false, false, false, false, false, false, false] }: { initial?: boolean[] }) {
  const [value, setValue] = useState(initial);
  return (
    <WeekdayPainter
      value={value}
      onChange={setValue}
      dayLabels={DAYS}
      dayNames={DAYS.map((d) => `${d}day`)}
      summary={`${value.filter(Boolean).length} days`}
      label="Update days"
    />
  );
}

describe("WeekdayPainter (109)", () => {
  it("toggles with the keyboard path and clears on Escape", () => {
    render(<Painter />);
    fireEvent.click(screen.getByRole("button", { name: "Monday" }));
    fireEvent.click(screen.getByRole("button", { name: "Thuday" }));
    expect(screen.getByRole("button", { name: "Monday" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("2 days")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Monday" }), { key: "Escape" });
    expect(screen.getByText("0 days")).toBeTruthy();
  });

  it("paints across the cells a drag passes over", () => {
    render(<Painter />);
    const cells = screen.getAllByRole("button");
    const spy = vi.fn((_x: number, y: number) => cells[y] ?? null);
    Object.defineProperty(document, "elementFromPoint", { value: spy, configurable: true });
    fireEvent.pointerDown(cells[0]!, { button: 0, pointerId: 1 });
    fireEvent.pointerMove(cells[0]!, { pointerId: 1, clientX: 0, clientY: 1 });
    fireEvent.pointerMove(cells[0]!, { pointerId: 1, clientX: 0, clientY: 2 });
    fireEvent.pointerUp(cells[0]!, { pointerId: 1 });
    expect(screen.getByText("3 days")).toBeTruthy();
    // A drag that starts on a painted cell clears.
    fireEvent.pointerDown(cells[1]!, { button: 0, pointerId: 2 });
    fireEvent.pointerMove(cells[1]!, { pointerId: 2, clientX: 0, clientY: 2 });
    expect(screen.getByText("1 days")).toBeTruthy();
  });
});

describe("NextChapterCountdown (265)", () => {
  it("splits the time left and the share of the wait", () => {
    expect(timeLeft(90_061_000, 0)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(timeLeft(0, 5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(remainingShare(0, 100, 25)).toBe(0.75);
    expect(remainingShare(null, 100, 25)).toBe(1);
    expect(remainingShare(0, 100, 200)).toBe(0);
  });

  it("ticks each second and swaps to the due line at zero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00Z"));
    render(
      <NextChapterCountdown
        target="2026-11-05T10:00:03Z"
        start="2026-11-05T09:00:00Z"
        headline="Next chapter in"
        dueLabel="Any moment now"
        format={(l) => `${l.minutes}m ${l.seconds}s`}
        whenLabel="Thursday 17:00"
      />,
    );
    expect(screen.getByText("0m 3s")).toBeTruthy();
    expect(screen.getByText("Next chapter in").className).not.toContain("animate-headline-in");
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByText("0m 2s")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByText("Any moment now").className).toContain("animate-headline-in");
  });
});

describe("BranchGraph (177)", () => {
  const nodes: BranchNode[] = [
    { id: "v1", parentId: null, label: "1", name: "Version 1" },
    { id: "v2", parentId: "v1", label: "2", name: "Version 2" },
    { id: "v3", parentId: "v1", label: "3", name: "Version 3, live" },
    { id: "v4", parentId: "v3", label: "4", name: "Version 4" },
  ];

  it("keeps the main line on row 0 and puts other children on new rows", () => {
    const placed = Object.fromEntries(layoutBranches(nodes, "v4").map((n) => [n.id, [n.depth, n.row]]));
    expect(placed).toEqual({ v1: [0, 0], v3: [1, 0], v4: [2, 0], v2: [1, 1] });
    const other = Object.fromEntries(layoutBranches(nodes, "v2").map((n) => [n.id, n.row]));
    expect(other.v2).toBe(0);
    expect(other.v3).toBe(1);
  });

  it("selects a version and animates only versions added later", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <BranchGraph nodes={nodes} mainId="v3" liveId="v3" selectedId="v1" onSelect={onSelect} label="Graph" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Version 2" }));
    expect(onSelect).toHaveBeenCalledWith("v2");
    expect(screen.getByRole("button", { name: "Version 1" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Version 4" }).className).not.toContain("animate-node-in");
    rerender(
      <BranchGraph
        nodes={[...nodes, { id: "v5", parentId: "v4", label: "5", name: "Version 5" }]}
        mainId="v5"
        liveId="v5"
        selectedId="v5"
        onSelect={onSelect}
        label="Graph"
      />,
    );
    expect(screen.getByRole("button", { name: "Version 5" }).className).toContain("animate-node-in");
    expect(screen.getByRole("button", { name: "Version 4" }).className).not.toContain("animate-node-in");
  });
});

describe("ApprovalLine (180)", () => {
  const steps = (review: ApprovalStep["state"]): ApprovalStep[] => [
    { key: "draft", label: "Draft", name: "Binh", state: "done" },
    { key: "review", label: "Review", name: review === "empty" ? "" : "An", state: review },
    { key: "approve", label: "Approved", name: "", state: "empty" },
  ];

  it("stamps a seal only when it gets signed while open", () => {
    const { container, rerender } = render(<ApprovalLine title="Chapter 3" steps={steps("empty")} status="Waiting" />);
    expect(container.querySelector(".animate-seal-stamp, [class*='animate-seal-stamp']")).toBeNull();
    rerender(<ApprovalLine title="Chapter 3" steps={steps("rejected")} status="Sent back" />);
    expect(container.innerHTML).toContain("animate-seal-stamp");
    expect(screen.getByRole("status").textContent).toBe("Sent back");
  });
});

describe("BlurUpImage (258) and StoryCover", () => {
  it("shows the blurred preview until the picture loads, then lifts it", () => {
    const { container } = render(<BlurUpImage src="/c.webp" hash="LEHV6nWB2yk8pyo0adR*.7kCMdnj" />);
    const img = container.querySelector("img")!;
    expect(img.dataset.state).toBe("loading");
    expect(container.querySelector("canvas")).not.toBeNull();
    fireEvent.load(img);
    expect(img.dataset.state).toBe("loaded");
  });

  it("ignores a malformed hash and StoryCover keeps its plain image without one", () => {
    const { container, rerender } = render(<BlurUpImage src="/c.webp" hash="nope" />);
    expect(container.querySelector("canvas")).toBeNull();
    rerender(<StoryCover title="T" coverUrl="/c.webp" />);
    expect(container.querySelector("img")?.dataset.state).toBeUndefined();
    rerender(<StoryCover title="T" coverUrl="/c.webp" placeholder="00TI:j" />);
    expect(container.querySelector("img")?.dataset.state).toBe("loading");
  });
});

describe("ControlHandoff (196)", () => {
  it("marks who edits and who asked", () => {
    render(
      <ControlHandoff
        label="Who is editing"
        editingLabel="editing"
        askedLabel="asked to edit"
        status="An is editing"
        people={[
          { id: "a", name: "An", editing: true, asked: false },
          { id: "b", name: "Binh", editing: false, asked: true },
        ]}
      >
        <button type="button">Hand over</button>
      </ControlHandoff>,
    );
    expect(screen.getByText("An · editing")).toBeTruthy();
    expect(screen.getByText("Binh · asked to edit")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("An is editing");
  });
});
