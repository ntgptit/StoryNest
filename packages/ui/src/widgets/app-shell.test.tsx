import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HIDE_ON_SCROLL_TOP_ZONE, useHideOnScroll } from "../lib/use-hide-on-scroll.ts";
import { AppShell, useAutoHideHeader } from "./app-shell.tsx";

// Scroll events are read on the next animation frame: run frames on demand.
let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  frames = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  window.scrollY = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Scroll the window to `y` and let the throttled reader run. */
function scrollTo(y: number) {
  act(() => {
    window.scrollY = y;
    window.dispatchEvent(new Event("scroll"));
    const pending = frames;
    frames = [];
    for (const frame of pending) frame(0);
  });
}

describe("useHideOnScroll", () => {
  it("hides after a scroll down past the threshold and shows again on a small scroll up", () => {
    const { result } = renderHook(() => useHideOnScroll(true).hidden);
    expect(result.current).toBe(false);
    scrollTo(200);
    expect(result.current).toBe(true);
    scrollTo(196); // less than the threshold: still hidden
    expect(result.current).toBe(true);
    scrollTo(180);
    expect(result.current).toBe(false);
    scrollTo(185); // a small jiggle down does not hide it again
    expect(result.current).toBe(false);
    scrollTo(300);
    expect(result.current).toBe(true);
  });

  it("always shows near the top of the page", () => {
    const { result } = renderHook(() => useHideOnScroll(true).hidden);
    scrollTo(HIDE_ON_SCROLL_TOP_ZONE - 10);
    expect(result.current).toBe(false);
  });

  it("reads scroll events at most once per frame", () => {
    renderHook(() => useHideOnScroll(true));
    act(() => {
      window.scrollY = 100;
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(frames).toHaveLength(1);
  });

  it("does nothing while disabled, and resets when it gets disabled", () => {
    const { result, rerender } = renderHook(({ on }) => useHideOnScroll(on).hidden, { initialProps: { on: false } });
    scrollTo(400);
    expect(result.current).toBe(false);
    expect(frames).toHaveLength(0);
    rerender({ on: true });
    scrollTo(800);
    expect(result.current).toBe(true);
    rerender({ on: false });
    expect(result.current).toBe(false);
  });
});

function ReaderPage({ autoHide = true }: { autoHide?: boolean }) {
  useAutoHideHeader(autoHide);
  return <div data-testid="toolbar" className="sticky top-below-header" />;
}

describe("AppShell", () => {
  const header = () => screen.getByRole("banner");

  it("renders the navigation row inside the header", () => {
    render(
      <AppShell header={<span>head</span>} navigation={<nav aria-label="sections">links</nav>}>
        <p>page</p>
      </AppShell>,
    );
    expect(header().querySelector("nav")?.textContent).toBe("links");
  });

  it("keeps the header in place on pages that do not ask for hide-on-scroll", () => {
    render(
      <AppShell header={<span>head</span>}>
        <ReaderPage autoHide={false} />
      </AppShell>,
    );
    scrollTo(500);
    expect(header().hasAttribute("data-tucked")).toBe(false);
  });

  it("tucks the header away on scroll-down on a page that asks for it, and the offset follows", () => {
    render(
      <AppShell header={<span>head</span>}>
        <ReaderPage />
      </AppShell>,
    );
    const frame = header().parentElement as HTMLElement;
    // Not tucked yet: the offset is the header's own height (0 in jsdom, which has no layout).
    expect(header().className).not.toContain("header-tucked");
    expect(frame.style.getPropertyValue("--app-header-offset")).toBe("0px");
    scrollTo(500);
    expect(header().hasAttribute("data-tucked")).toBe(true);
    expect(header().className).toContain("header-tucked");
    expect(frame.style.getPropertyValue("--app-header-offset")).toBe("env(safe-area-inset-top)");
    scrollTo(450);
    expect(header().hasAttribute("data-tucked")).toBe(false);
  });

  it("brings the header back when the focus moves into it, until the next scroll-down", () => {
    render(
      <AppShell header={<button type="button">menu</button>}>
        <ReaderPage />
      </AppShell>,
    );
    scrollTo(500);
    expect(header().hasAttribute("data-tucked")).toBe(true);
    fireEvent.focus(screen.getByRole("button", { name: "menu" }));
    expect(header().hasAttribute("data-tucked")).toBe(false);
    scrollTo(505); // below the threshold: the revealed header stays
    expect(header().hasAttribute("data-tucked")).toBe(false);
    scrollTo(600);
    expect(header().hasAttribute("data-tucked")).toBe(true);
  });

  it("stops hiding the header once the page that asked for it is gone", () => {
    const { rerender } = render(
      <AppShell header={<span>head</span>}>
        <ReaderPage />
      </AppShell>,
    );
    scrollTo(500);
    expect(header().hasAttribute("data-tucked")).toBe(true);
    rerender(
      <AppShell header={<span>head</span>}>
        <p>another page</p>
      </AppShell>,
    );
    expect(header().hasAttribute("data-tucked")).toBe(false);
    scrollTo(1000);
    expect(header().hasAttribute("data-tucked")).toBe(false);
  });
});
