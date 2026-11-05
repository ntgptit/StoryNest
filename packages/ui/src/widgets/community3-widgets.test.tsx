import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARRIVAL_MS, useArrivals } from "../lib/use-arrivals.ts";
import { CharacterRing } from "./character-ring.tsx";
import { ChoicePills } from "./choice-pills.tsx";
import { SizeShrink, savedPercent } from "./size-shrink.tsx";
import { REPLY_DISTANCE, SwipeToReply } from "./swipe-to-reply.tsx";
import { UploadVeil } from "./upload-veil.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const touch = (x: number, y = 0) => ({ pointerType: "touch", isPrimary: true, pointerId: 1, clientX: x, clientY: y });

describe("ChoicePills", () => {
  function Pills({ initial = "" as "" | "a" | "b" }) {
    const [value, setValue] = useState<"" | "a" | "b">(initial);
    return (
      <ChoicePills
        aria-label="Kind"
        value={value}
        onValueChange={setValue}
        options={[
          { value: "a", label: "Apples", count: 3 },
          { value: "b", label: "Pears" },
        ]}
      />
    );
  }

  it("is a radio group with nothing chosen at first when the value is empty, and chooses on press", () => {
    render(<Pills />);
    expect(screen.getByRole("radiogroup", { name: "Kind" })).toBeTruthy();
    const apples = screen.getByRole("radio", { name: "Apples 3" });
    const pears = screen.getByRole("radio", { name: "Pears" });
    expect(apples.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(pears);
    expect(pears.getAttribute("aria-checked")).toBe("true");
    expect(apples.getAttribute("aria-checked")).toBe("false");
  });

  it("marks the chosen option itself while no pill is measured (first paint, no layout)", () => {
    render(<Pills initial="a" />);
    expect(document.querySelector('[data-part="pill"]')).toBeNull();
    expect(screen.getByRole("radio", { name: "Apples 3" }).className).toContain("bg-background");
  });
});

describe("CharacterRing", () => {
  it("fills with the share typed, warns near the limit, and gives the count as text", () => {
    const { rerender } = render(<CharacterRing id="count" length={0} max={100} label="0 of 100" />);
    const fill = () => document.querySelector<SVGCircleElement>('[data-part="fill"]')!;
    expect(Number(fill().getAttribute("stroke-dashoffset"))).toBeCloseTo(2 * Math.PI * 9);
    rerender(<CharacterRing id="count" length={50} max={100} label="50 of 100" />);
    expect(Number(fill().getAttribute("stroke-dashoffset"))).toBeCloseTo(Math.PI * 9);
    expect(fill().getAttribute("data-near")).toBeNull();
    rerender(<CharacterRing id="count" length={95} max={100} label="95 of 100" />);
    expect(fill().getAttribute("data-near")).toBe("true");
    expect(document.getElementById("count")?.textContent).toBe("95 of 100");
  });
});

describe("UploadVeil", () => {
  it("veils the picture while busy and hops only when done goes up, never on mount", () => {
    const { rerender } = render(
      <UploadVeil busy={false} done={3}>
        <img alt="cover" />
      </UploadVeil>,
    );
    const root = () => document.querySelector<HTMLElement>('[data-slot="upload-veil"]')!;
    expect(root().className).not.toContain("animate-upload-hop");
    expect(document.querySelector('[data-part="veil"]')!.className).toContain("opacity-0");
    const picture = screen.getByAltText("cover");
    rerender(
      <UploadVeil busy done={3}>
        <img alt="cover" />
      </UploadVeil>,
    );
    expect(root().getAttribute("data-busy")).toBe("true");
    expect(document.querySelector('[data-part="veil"]')!.className).toContain("opacity-100");
    rerender(
      <UploadVeil busy={false} done={4}>
        <img alt="cover" />
      </UploadVeil>,
    );
    expect(root().className).toContain("animate-upload-hop");
    expect(screen.getByAltText("cover")).toBe(picture); // the picture is not remounted
    fireEvent.animationEnd(root());
    expect(root().className).not.toContain("animate-upload-hop");
  });
});

describe("SizeShrink", () => {
  const labels = {
    original: "Original",
    result: "Uploaded",
    saved: (percent: number) => `${percent}% smaller`,
    summary: (original: string, result: string, percent: number) => `${original} to ${result}, ${percent}%`,
  };

  it("works out the saving in whole percent, zero when nothing was saved", () => {
    expect(savedPercent(2_400_000, 84_000)).toBe(97);
    expect(savedPercent(1000, 1000)).toBe(0);
    expect(savedPercent(1000, 1500)).toBe(0);
    expect(savedPercent(0, 10)).toBe(0);
  });

  it("gives screen readers one sentence and shrinks the second bar to its share", async () => {
    render(<SizeShrink original={2000} result={500} formatSize={(b) => `${b} B`} labels={labels} />);
    expect(screen.getByText("2000 B to 500 B, 75%")).toBeTruthy();
    const bars = document.querySelectorAll<HTMLElement>('[data-part="bar"]');
    expect(bars[1]!.style.width).toBe("100%"); // starts full…
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(bars[1]!.style.width).toBe("25%"); // …and shrinks
  });
});

describe("SwipeToReply", () => {
  it("replies after a long enough swipe to the right, not after a short one, and swallows the click", () => {
    const onReply = vi.fn();
    const onClick = vi.fn();
    render(
      <SwipeToReply onReply={onReply}>
        <button type="button" onClick={onClick}>
          Message
        </button>
      </SwipeToReply>,
    );
    const content = screen.getByRole("button", { name: "Message" }).parentElement!;
    fireEvent.pointerDown(content, touch(10));
    fireEvent.pointerMove(content, touch(40));
    fireEvent.pointerUp(content, touch(40));
    fireEvent.click(screen.getByRole("button", { name: "Message" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(onReply).not.toHaveBeenCalled();

    fireEvent.pointerDown(content, touch(10));
    fireEvent.pointerMove(content, touch(10 + REPLY_DISTANCE + 30));
    expect(document.querySelector('[data-part="arrow"]')?.getAttribute("data-full")).toBe("true");
    fireEvent.pointerUp(content, touch(10 + REPLY_DISTANCE + 30));
    expect(onReply).toHaveBeenCalledTimes(1);
    expect(content.style.transform).toBe(""); // springs back
  });

  it("ignores a swipe to the left, a vertical move, a mouse drag and a disabled message", () => {
    const onReply = vi.fn();
    const { rerender } = render(
      <SwipeToReply onReply={onReply}>
        <span>Message</span>
      </SwipeToReply>,
    );
    const content = () => screen.getByText("Message").parentElement!;
    const swipe = (from: ReturnType<typeof touch>, to: ReturnType<typeof touch>) => {
      fireEvent.pointerDown(content(), from);
      fireEvent.pointerMove(content(), to);
      fireEvent.pointerUp(content(), to);
    };
    swipe(touch(200), touch(50));
    swipe(touch(10, 0), touch(30, 200));
    swipe({ ...touch(10), pointerType: "mouse" }, { ...touch(200), pointerType: "mouse" });
    rerender(
      <SwipeToReply onReply={onReply} disabled>
        <span>Message</span>
      </SwipeToReply>,
    );
    swipe(touch(10), touch(200));
    expect(onReply).not.toHaveBeenCalled();
  });
});

describe("useArrivals", () => {
  const key = (item: string) => item;

  it("names the rows that appear in front of the old first row, never on the first load or a page appended", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ items }) => useArrivals(items, key), {
      initialProps: { items: [] as string[] },
    });
    rerender({ items: ["c", "b", "a"] });
    expect([...result.current]).toEqual([]);
    rerender({ items: ["c", "b", "a", "z"] });
    expect([...result.current]).toEqual([]);
    rerender({ items: ["e", "d", "c", "b", "a", "z"] });
    expect([...result.current]).toEqual(["e", "d"]);
    act(() => vi.advanceTimersByTime(ARRIVAL_MS));
    expect([...result.current]).toEqual([]);
  });
});
