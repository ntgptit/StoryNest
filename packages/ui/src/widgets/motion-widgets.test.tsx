import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs.tsx";
import { increased, turnedOn, useTriggerCount } from "../lib/use-trigger-count.ts";
import { AutosaveIcon } from "./autosave-icon.tsx";
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
