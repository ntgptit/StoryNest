import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs.tsx";
import { increased, turnedOn, useTriggerCount } from "../lib/use-trigger-count.ts";
import { AutosaveIcon } from "./autosave-icon.tsx";
import { CardCarousel } from "./card-carousel.tsx";
import { HeartBurstIcon } from "./heart-burst-icon.tsx";
import { RingingBellIcon } from "./ringing-bell-icon.tsx";

afterEach(cleanup);

describe("useTriggerCount", () => {
  it("starts at 0 and counts only accepted changes", () => {
    const { result, rerender } = renderHook(({ value }) => useTriggerCount(value, turnedOn), {
      initialProps: { value: false as boolean | undefined },
    });
    expect(result.current).toBe(0);
    rerender({ value: true });
    expect(result.current).toBe(1);
    rerender({ value: true });
    expect(result.current).toBe(1);
    rerender({ value: false });
    expect(result.current).toBe(1);
    rerender({ value: true });
    expect(result.current).toBe(2);
  });

  it("does not treat the first load (undefined → value) as a change", () => {
    expect(turnedOn(undefined, true)).toBe(false);
    expect(turnedOn(false, true)).toBe(true);
    expect(turnedOn(true, false)).toBe(false);
    expect(increased(undefined, 3)).toBe(false);
    expect(increased(3, 4)).toBe(true);
    expect(increased(4, 2)).toBe(false);
    expect(increased(4, undefined)).toBe(false);
  });
});

describe("HeartBurstIcon", () => {
  const burst = (container: HTMLElement) => container.querySelector('[data-part="burst"]');
  const fill = (container: HTMLElement) => container.querySelector('[data-part="fill"]');

  it("renders an already-active heart filled and still", () => {
    const { container } = render(<HeartBurstIcon active />);
    expect(fill(container)).toBeTruthy();
    expect(container.querySelector("svg")?.getAttribute("class")).not.toContain("animate-heart-beat");
    expect(burst(container)).toBeNull();
  });

  it("beats and bursts when it turns on, and only empties when it turns off", () => {
    const { container, rerender } = render(<HeartBurstIcon active={false} />);
    expect(fill(container)).toBeNull();
    rerender(<HeartBurstIcon active />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("animate-heart-beat");
    expect(burst(container)?.getAttribute("class")).toContain("motion-safe:block");
    expect(burst(container)?.querySelectorAll(".animate-heart-fly")).toHaveLength(7);
    rerender(<HeartBurstIcon active={false} />);
    expect(fill(container)).toBeNull();
    expect(burst(container)).toBeNull();
  });
});

describe("RingingBellIcon", () => {
  const bell = (container: HTMLElement) => container.querySelector('[data-slot="ringing-bell"]');

  it("stays still at 0 rings and swings, remounted, on every new ring", () => {
    const { container, rerender } = render(<RingingBellIcon rings={0} />);
    expect(bell(container)?.getAttribute("class")).not.toContain("animate-bell-ring");
    rerender(<RingingBellIcon rings={1} />);
    const first = bell(container);
    expect(first?.getAttribute("class")).toContain("animate-bell-ring");
    rerender(<RingingBellIcon rings={2} />);
    expect(bell(container)).not.toBe(first);
  });

  it("switches to the ringing icon when active", () => {
    const { container, rerender } = render(<RingingBellIcon rings={0} />);
    const idle = container.querySelector("svg")?.getAttribute("class");
    rerender(<RingingBellIcon rings={0} active />);
    expect(container.querySelector("svg")?.getAttribute("class")).not.toBe(idle);
  });
});

describe("AutosaveIcon", () => {
  it("renders nothing when idle and a decorative cloud otherwise", () => {
    const { container, rerender } = render(<AutosaveIcon state="idle" />);
    expect(container.firstChild).toBeNull();
    rerender(<AutosaveIcon state="pending" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  it("bobs three dots while saving, draws a check when saved and a slash when failed", () => {
    const { container, rerender } = render(<AutosaveIcon state="saving" />);
    expect(container.querySelectorAll("circle.animate-autosave-bob")).toHaveLength(3);
    rerender(<AutosaveIcon state="saved" />);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
    expect(container.querySelectorAll("path.animate-draw-in")).toHaveLength(1);
    rerender(<AutosaveIcon state="failed" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("text-destructive");
    expect(container.querySelector("svg")?.getAttribute("data-state")).toBe("failed");
  });
});

describe("TabsList sliding indicator", () => {
  function renderTabs() {
    return render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">First</TabsTrigger>
          <TabsTrigger value="b">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
      </Tabs>,
    );
  }

  it("keeps the active trigger's own background when nothing is laid out (SSR, jsdom)", () => {
    const { container } = renderTabs();
    expect(screen.getByRole("tablist").getAttribute("data-indicator")).toBeNull();
    expect(container.querySelector('[data-slot="tabs-indicator"]')).toBeNull();
  });

  it("draws one pill on the active trigger and moves it when the tab changes", async () => {
    // jsdom has no layout: give every tab a box based on its position in the list.
    const widths = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const lefts = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetLeft");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 80 });
    Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
      configurable: true,
      get(this: HTMLElement) {
        return this.getAttribute("role") === "tab" ? Array.from(this.parentElement!.children).indexOf(this) * 80 : 0;
      },
    });
    try {
      const { container } = renderTabs();
      const list = screen.getByRole("tablist");
      const pill = () => container.querySelector<HTMLElement>('[data-slot="tabs-indicator"]');
      expect(list.getAttribute("data-indicator")).toBe("ready");
      const startX = pill()?.style.translate;
      // Radix activates on mousedown; the mutation observer then re-measures.
      await act(async () => {
        fireEvent.mouseDown(screen.getByRole("tab", { name: "Second" }), { button: 0 });
        await Promise.resolve();
      });
      expect(screen.getByRole("tab", { name: "Second" }).getAttribute("data-state")).toBe("active");
      expect(pill()?.style.translate).not.toBe(startX);
      expect(pill()?.getAttribute("aria-hidden")).toBe("true");
    } finally {
      if (widths) Object.defineProperty(HTMLElement.prototype, "offsetWidth", widths);
      if (lefts) Object.defineProperty(HTMLElement.prototype, "offsetLeft", lefts);
    }
  });
});

describe("CardCarousel", () => {
  function renderCarousel() {
    return render(
      <CardCarousel title="Popular" previousLabel="Previous" nextLabel="Next">
        {["a", "b", "c", "d"].map((id) => (
          <a key={id} href={`/story/${id}`}>
            Story {id}
          </a>
        ))}
      </CardCarousel>,
    );
  }

  it("renders one list item per card under a named list, without arrows when nothing overflows", () => {
    renderCarousel();
    const list = screen.getByRole("list", { name: "Popular" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("shows the arrows once the row overflows and disables the one at the current end", () => {
    const sizes = {
      scrollWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth"),
      clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth"),
    };
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => 800 });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 300 });
    try {
      renderCarousel();
      const previous = screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement;
      const next = screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
      expect(previous.disabled).toBe(true);
      expect(next.disabled).toBe(false);
      const list = screen.getByRole("list", { name: "Popular" });
      list.scrollLeft = 500;
      act(() => {
        fireEvent.scroll(list);
      });
      expect(previous.disabled).toBe(false);
      expect(next.disabled).toBe(true);
    } finally {
      for (const [key, descriptor] of Object.entries(sizes)) {
        if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
      }
    }
  });

  it("snaps cards inside the track's side padding, so the row rests at the very start (previous disabled)", () => {
    // Without scroll padding the first snap point is the 4px padding, the browser parks the row at scrollLeft 4 and
    // "previous" stays enabled at the start while the first card is clipped.
    renderCarousel();
    const list = screen.getByRole("list", { name: "Popular" });
    expect(list.className).toMatch(/(^|\s)px-1(\s|$)/);
    expect(list.className).toMatch(/(^|\s)scroll-px-1(\s|$)/);
  });

  it("cancels the card click after a mouse drag, but not after a plain click", () => {
    renderCarousel();
    const list = screen.getByRole("list", { name: "Popular" });
    const link = screen.getByRole("link", { name: "Story a" });
    const clicks: boolean[] = [];
    link.addEventListener("click", (event) => {
      clicks.push(event.defaultPrevented);
      event.preventDefault();
    });

    fireEvent.pointerDown(list, { pointerType: "mouse", button: 0, clientX: 100 });
    fireEvent.pointerUp(list, { pointerType: "mouse", clientX: 100 });
    fireEvent.click(link);

    fireEvent.pointerDown(list, { pointerType: "mouse", button: 0, clientX: 100 });
    fireEvent.pointerMove(list, { pointerType: "mouse", clientX: 40 });
    fireEvent.pointerUp(list, { pointerType: "mouse", clientX: 40 });
    fireEvent.click(link);

    // First click reached the link; the one after the drag was stopped in the capture phase.
    expect(clicks).toEqual([false]);
  });
});
