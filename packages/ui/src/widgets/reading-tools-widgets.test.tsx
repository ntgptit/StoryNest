import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { revealFrom, revealRadius, THEME_REVEAL_ATTRIBUTE } from "../lib/view-transition.ts";
import { AccordionList } from "./accordion-list.tsx";
import { FinishCelebration } from "./finish-celebration.tsx";
import { PlayPauseButton, playPausePoints } from "./play-pause-button.tsx";
import { RollingStepper } from "./rolling-stepper.tsx";
import { ScrubIndex, bowOf, markAt } from "./scrub-index.tsx";
import { SectionOutline } from "./section-outline.tsx";
import { SwatchPicker } from "./swatch-picker.tsx";

/** jsdom has no matchMedia: answer the reduced-motion query. */
function reducedMotion(matches: boolean) {
  window.matchMedia = vi.fn(() => ({ matches }) as MediaQueryList);
}

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PlayPauseButton", () => {
  it("draws the triangle at 0 and the two bars at 1", () => {
    expect(playPausePoints(0)).toEqual(["13.00,8.00 22.50,13.60 22.50,26.40 13.00,32.00", expect.any(String)]);
    expect(playPausePoints(1)).toEqual([
      "11.00,9.00 17.00,9.00 17.00,31.00 11.00,31.00",
      "23.00,9.00 29.00,9.00 29.00,31.00 23.00,31.00",
    ]);
  });

  it("switches its label, morphs on a change only and shows progress as the ring", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <PlayPauseButton playing={false} progress={0} onToggle={onToggle} playLabel="Play" pauseLabel="Pause" />,
    );
    const button = screen.getByRole("button", { name: "Play" });
    const piece = () => button.querySelectorAll("polygon")[0]?.getAttribute("points");
    expect(piece()).toBe(playPausePoints(0)[0]);
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();

    // Reduced motion: the new shape is drawn at once.
    reducedMotion(true);
    rerender(<PlayPauseButton playing progress={0.5} onToggle={onToggle} playLabel="Play" pauseLabel="Pause" />);
    expect(screen.getByRole("button", { name: "Pause" })).toBe(button);
    expect(piece()).toBe(playPausePoints(1)[0]);
    expect(button.querySelector("circle[stroke-dashoffset]")?.getAttribute("stroke-dashoffset")).toBe("50");
  });
});

describe("RollingStepper", () => {
  function Stepper() {
    const names = ["S", "M", "L"];
    const [i, setI] = useState(1);
    return (
      <RollingStepper
        label="Size"
        valueText={names[i] ?? ""}
        position={i}
        canDecrease={i > 0}
        canIncrease={i < names.length - 1}
        onStep={(d) => setI((n) => n + d)}
        decreaseLabel="Smaller"
        increaseLabel="Larger"
      />
    );
  }

  it("rolls the name up or down with the step and does not roll on first render", () => {
    render(<Stepper />);
    const value = () => screen.getByText(/^[SML]$/);
    expect(value().className).not.toContain("animate-label");
    fireEvent.click(screen.getByRole("button", { name: "Larger" }));
    expect(value().textContent).toBe("L");
    expect(value().className).toContain("animate-label-roll");
    fireEvent.click(screen.getByRole("button", { name: "Smaller" }));
    expect(value().className).toContain("animate-label-drop");
  });

  it("shakes instead of stepping past an end, keeps focus, and steps with arrow keys", () => {
    render(<Stepper />);
    const larger = screen.getByRole("button", { name: "Larger" });
    fireEvent.keyDown(larger, { key: "ArrowUp" });
    expect(screen.getByText("L")).toBeTruthy();
    expect(larger.getAttribute("aria-disabled")).toBe("true");
    larger.focus();
    fireEvent.click(larger);
    expect(screen.getByText("L")).toBeTruthy();
    const row = document.querySelector("[data-slot=rolling-stepper-row]")!;
    expect(row.className).toContain("animate-shake");
    expect(document.activeElement).toBe(larger);
  });
});

describe("SwatchPicker", () => {
  const options = [
    { value: "light", label: "Light", className: "bg-paper-light" },
    { value: "sepia", label: "Sepia", className: "bg-paper-sepia" },
    { value: "dark", label: "Dark", className: "bg-paper-dark" },
  ] as const;

  it("is a radio group with one tab stop; a press or an arrow key picks and hands over the swatch", () => {
    const onChange = vi.fn();
    render(<SwatchPicker label="Background" options={options} value="light" onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    expect(screen.getByRole("radiogroup", { name: "Background" })).toBeTruthy();
    expect(radios.map((r) => [r.getAttribute("aria-checked"), r.tabIndex])).toEqual([
      ["true", 0],
      ["false", -1],
      ["false", -1],
    ]);
    fireEvent.click(radios[2]!);
    expect(onChange).toHaveBeenLastCalledWith("dark", radios[2]);
    fireEvent.keyDown(radios[0]!, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("dark", radios[2]);
    expect(document.activeElement).toBe(radios[2]);
    // Pressing the current swatch is no change.
    onChange.mockClear();
    fireEvent.click(radios[0]!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("glides the ring to the pick and rolls the name over only after a change", () => {
    const { rerender } = render(<SwatchPicker label="Background" options={options} value="light" onChange={vi.fn()} />);
    const ring = document.querySelector<HTMLElement>("[data-slot=swatch-ring]")!;
    const name = () => screen.getByText(/^(Light|Sepia|Dark)$/);
    expect(name().className).not.toContain("animate-label-roll");
    rerender(<SwatchPicker label="Background" options={options} value="sepia" onChange={vi.fn()} />);
    expect(ring.style.transform).toContain("1 *");
    expect(name().textContent).toBe("Sepia");
    expect(name().className).toContain("animate-label-roll");
  });
});

describe("revealFrom", () => {
  it("covers the screen from the farthest corner", () => {
    expect(revealRadius(0, 0, 300, 400)).toBe(500);
    expect(revealRadius(150, 200, 300, 400)).toBe(250);
  });

  it("just runs the update without the View Transitions API, leaving nothing on <html>", () => {
    const update = vi.fn();
    const button = document.createElement("button");
    revealFrom(button, update);
    expect(update).toHaveBeenCalledOnce();
    expect(document.documentElement.hasAttribute(THEME_REVEAL_ATTRIBUTE)).toBe(false);
  });

  it("runs the update in a view transition from the button's centre, then cleans up", async () => {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const start = vi.fn((update: () => void) => {
      update();
      return { finished };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    reducedMotion(false);
    const button = document.createElement("button");
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, width: 20, height: 20 } as DOMRect);
    const update = vi.fn();
    revealFrom(button, update);
    const root = document.documentElement;
    expect(update).toHaveBeenCalledOnce();
    expect(root.hasAttribute(THEME_REVEAL_ATTRIBUTE)).toBe(true);
    expect(root.style.getPropertyValue("--reveal-x")).toBe("20px");
    expect(root.style.getPropertyValue("--reveal-y")).toBe("30px");
    finish();
    await finished;
    await Promise.resolve();
    expect(root.hasAttribute(THEME_REVEAL_ATTRIBUTE)).toBe(false);
    expect(root.style.getPropertyValue("--reveal-x")).toBe("");
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
});

describe("SectionOutline", () => {
  it("lists the sections, marks the current one and reports a press", () => {
    const onSelect = vi.fn();
    render(
      <SectionOutline
        title="In this chapter"
        items={[
          { id: "a", label: "One" },
          { id: "b", label: "Two" },
        ]}
        currentId="b"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("navigation", { name: "In this chapter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Two" }).getAttribute("aria-current")).toBe("location");
    expect(screen.getByRole("button", { name: "One" }).getAttribute("aria-current")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "One" }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });
});

describe("ScrubIndex", () => {
  it("maps a fingertip to the mark under it and bows the nearest marks out most", () => {
    expect(markAt(0, 200, 4)).toBe(0);
    expect(markAt(120, 200, 4)).toBe(2);
    expect(markAt(999, 200, 4)).toBe(3);
    expect(markAt(-5, 200, 4)).toBe(0);
    expect(bowOf(0, 25, 200, 4)).toBeCloseTo(1);
    expect(bowOf(3, 25, 200, 4)).toBe(0);
  });

  it("jumps by drag, press or arrow keys, with one tab stop on the active mark", () => {
    const onSelect = vi.fn();
    render(
      <ScrubIndex
        label="Jump to chapter"
        marks={["1", "51", "101", "151"]}
        active={1}
        onSelect={onSelect}
        markLabel={(m) => `From chapter ${m}`}
      />,
    );
    const rail = screen.getByRole("group", { name: "Jump to chapter" });
    vi.spyOn(rail, "getBoundingClientRect").mockReturnValue({ top: 0, height: 200 } as DOMRect);
    const marks = screen.getAllByRole("button");
    expect(marks.map((m) => m.tabIndex)).toEqual([-1, 0, -1, -1]);
    expect(marks[1]?.getAttribute("aria-current")).toBe("true");

    fireEvent.pointerDown(rail, { clientY: 160, pointerId: 1 });
    expect(onSelect).toHaveBeenLastCalledWith(3);
    expect(document.querySelector("[data-slot=scrub-bubble]")?.textContent).toBe("151");
    fireEvent.pointerMove(rail, { clientY: 10, pointerId: 1 });
    expect(onSelect).toHaveBeenLastCalledWith(0);
    fireEvent.pointerUp(rail, { pointerId: 1 });
    expect(document.querySelector("[data-slot=scrub-bubble]")?.className).toContain("opacity-0");

    fireEvent.keyDown(marks[1]!, { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "From chapter 101" }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
  });
});

describe("FinishCelebration", () => {
  it("is simply there on first render and pops (with a polite announcement) when played", () => {
    const { rerender } = render(<FinishCelebration title="You finished!" description="Thanks." />);
    expect(screen.getByRole("heading", { name: "You finished!" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(document.querySelector(".motion-safe\\:animate-badge-rise")).toBeNull();

    // jsdom has no canvas: the confetti quietly does nothing.
    reducedMotion(false);
    rerender(<FinishCelebration title="You finished!" description="Thanks." play={1} />);
    expect(screen.getByRole("status").textContent).toBe("You finished!");
    expect(document.querySelector(".motion-safe\\:animate-badge-rise")).toBeTruthy();
  });
});

describe("AccordionList", () => {
  function Accordion() {
    const [open, setOpen] = useState<string | null>("a");
    return (
      <AccordionList
        openId={open}
        onOpenChange={setOpen}
        items={[
          { id: "a", title: "First", meta: "2", content: <a href="#1">Link one</a> },
          { id: "b", title: "Second", content: <a href="#2">Link two</a> },
        ]}
      />
    );
  }

  it("keeps one panel open, builds a panel the first time it opens and moves between headers with arrows", () => {
    render(<Accordion />);
    const first = screen.getByRole("button", { name: /First/ });
    const second = screen.getByRole("button", { name: /Second/ });
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region", { name: /First/ })).toBeTruthy();
    expect(screen.queryByText("Link two")).toBeNull();

    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(first.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Link two")).toBeTruthy();
    expect(document.getElementById(first.getAttribute("aria-controls")!)?.hasAttribute("inert")).toBe(true);

    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("false");

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: "ArrowDown" });
    expect(document.activeElement).toBe(first);
    act(() => undefined);
  });
});
