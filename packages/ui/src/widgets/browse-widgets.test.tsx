import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { Trash2 } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { morphCoverInto, canMorphCover } from "../lib/view-transition.ts";
import { FeaturedCarousel } from "./featured-carousel.tsx";
import { RollingNumber } from "./rolling-number.tsx";
import { StoryCard, type StoryCardData, type StoryLinkComponent } from "./story-card.tsx";
import { LONG_PRESS_MS, StoryPeekSheet } from "./story-peek-sheet.tsx";
import { StoryViewToggle, useStoredView } from "./story-view-toggle.tsx";
import { SwipeToRemove } from "./swipe-to-remove.tsx";
import { useSwipeTabs } from "./swipe-tabs.tsx";

afterEach(cleanup);

const Anchor: StoryLinkComponent = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);

const story: StoryCardData = {
  href: "/story/1/salt-and-ash",
  title: "Salt and Ash",
  authorName: "An Nhiên",
  synopsis: "A lighthouse, a storm and a letter that arrives forty years late.",
  coverUrl: null,
  categoryName: "Fantasy",
  statusLabel: "Ongoing",
  reads: 1234,
  votes: 56,
  updatedAt: "2026-11-04T00:00:00Z",
};
const labels = { reads: "Reads", votes: "Votes", updated: (relative: string) => `Updated ${relative}` };

const touch = (x: number, y = 0) => ({ pointerType: "touch", isPrimary: true, pointerId: 1, clientX: x, clientY: y });

describe("RollingNumber", () => {
  it("shows the formatted text once to screen readers and draws one digit column per digit", () => {
    const { container } = render(<RollingNumber value={1204} format={(n) => `${n} followers`} live />);
    const sr = screen.getByText("1204 followers");
    expect(sr.getAttribute("aria-live")).toBe("polite");
    const digits = Array.from(container.querySelectorAll("[data-digit]")).map((el) => el.getAttribute("data-digit"));
    expect(digits).toEqual(["1", "2", "0", "4"]);
    // The drawn copy adds no text of its own (generated content only), so the phrase is not read or copied twice.
    expect(container.textContent).toBe("1204 followers");
  });

  it("does not roll on the first render, only after a change", async () => {
    const { container, rerender } = render(<RollingNumber value={9} />);
    const column = () => container.querySelector<HTMLElement>("[data-digit]")!;
    expect(column().className).not.toContain("transition-transform");
    expect(column().style.transform).toBe("translateY(-90%)");
    await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
    rerender(<RollingNumber value={3} />);
    expect(column().className).toContain("transition-transform");
    expect(column().style.transform).toBe("translateY(-30%)");
    expect(screen.getByText("3")).toBeTruthy();
  });
});

describe("useSwipeTabs", () => {
  const values = ["a", "b", "c"] as const;
  function Panels({ value, onChange }: { value: (typeof values)[number]; onChange: (v: string) => void }) {
    const swipe = useSwipeTabs({ values, value, onValueChange: onChange });
    return (
      <div data-testid="panel" data-swipe={swipe.swipe} {...swipe.panelProps}>
        {value}
      </div>
    );
  }

  it("follows a horizontal touch swipe and switches to the neighbour past a quarter of the width", () => {
    const onChange = vi.fn();
    render(<Panels value="b" onChange={onChange} />);
    const panel = screen.getByTestId("panel");
    Object.defineProperty(panel, "clientWidth", { value: 400 });
    fireEvent.pointerDown(panel, touch(300));
    fireEvent.pointerMove(panel, touch(250));
    expect(panel.style.transform).toBe("translateX(-50px)");
    expect(Number(panel.dataset.swipe)).toBeCloseTo(0.125);
    fireEvent.pointerMove(panel, touch(150));
    fireEvent.pointerUp(panel, touch(150));
    expect(onChange).toHaveBeenCalledWith("c");

    fireEvent.pointerDown(panel, touch(100));
    fireEvent.pointerMove(panel, touch(300));
    fireEvent.pointerUp(panel, touch(300));
    expect(onChange).toHaveBeenLastCalledWith("a");
  });

  it("springs back on a short swipe, leaves vertical scrolls and mice alone, and stops at the ends", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Panels value="b" onChange={onChange} />);
    const panel = screen.getByTestId("panel");
    Object.defineProperty(panel, "clientWidth", { value: 400 });
    fireEvent.pointerDown(panel, touch(300));
    fireEvent.pointerMove(panel, touch(276));
    expect(panel.style.transform).toBe("translateX(-24px)");
    fireEvent.pointerUp(panel, touch(276));
    expect(panel.style.transform).toBe("");

    fireEvent.pointerDown(panel, touch(300, 0));
    fireEvent.pointerMove(panel, touch(295, 80));
    fireEvent.pointerUp(panel, touch(100, 80));

    fireEvent.pointerDown(panel, { ...touch(300), pointerType: "mouse" });
    fireEvent.pointerMove(panel, { ...touch(50), pointerType: "mouse" });
    fireEvent.pointerUp(panel, { ...touch(50), pointerType: "mouse" });

    rerender(<Panels value="c" onChange={onChange} />);
    fireEvent.pointerDown(panel, touch(300));
    fireEvent.pointerMove(panel, touch(100));
    expect(panel.style.transform).toBe("translateX(-60px)"); // rubber band: no tab after the last
    fireEvent.pointerUp(panel, touch(100));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SwipeToRemove", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("removes after a long enough swipe to the left, not after a short one, and swallows the click", () => {
    const onRemove = vi.fn();
    const onClick = vi.fn();
    render(
      <SwipeToRemove label="Unsave" icon={Trash2} onRemove={onRemove}>
        <button type="button" onClick={onClick}>
          Row
        </button>
      </SwipeToRemove>,
    );
    const row = screen.getByRole("button", { name: "Row" }).parentElement!;
    fireEvent.pointerDown(row, touch(300));
    fireEvent.pointerMove(row, touch(240));
    fireEvent.pointerUp(row, touch(240));
    fireEvent.click(screen.getByRole("button", { name: "Row" }));
    expect(onClick).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.pointerDown(row, touch(300));
    fireEvent.pointerMove(row, touch(150));
    fireEvent.pointerUp(row, touch(150));
    expect(row.style.transform).toBe("translateX(-110%)");
    act(() => vi.advanceTimersByTime(300));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a mouse drag (the row's button is the way there)", () => {
    const onRemove = vi.fn();
    render(
      <SwipeToRemove label="Unsave" icon={Trash2} onRemove={onRemove}>
        <span>Row</span>
      </SwipeToRemove>,
    );
    const row = screen.getByText("Row").parentElement!;
    fireEvent.pointerDown(row, { ...touch(300), pointerType: "mouse" });
    fireEvent.pointerMove(row, { ...touch(100), pointerType: "mouse" });
    fireEvent.pointerUp(row, { ...touch(100), pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(500));
    expect(onRemove).not.toHaveBeenCalled();
  });
});

describe("StoryCard behaviours", () => {
  afterEach(() => {
    delete (document as { startViewTransition?: unknown }).startViewTransition;
    vi.useRealTimers();
  });

  it("has a list variant with the same content", () => {
    render(<StoryCard story={story} labels={labels} LinkComponent={Anchor} variant="list" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("data-variant")).toBe("list");
    expect(within(link).getByRole("heading", { name: "Salt and Ash" })).toBeTruthy();
    expect(link.querySelector("[data-flip-key]")?.getAttribute("data-flip-key")).toBe(story.href);
  });

  it("opens the peek on the context menu and on a long-press, and a long-press does not also open the link", () => {
    vi.useFakeTimers();
    const onPeek = vi.fn();
    const onNavigate = vi.fn();
    render(<StoryCard story={story} labels={labels} LinkComponent={Anchor} onPeek={onPeek} onNavigate={onNavigate} />);
    const link = screen.getByRole("link");
    expect(fireEvent.contextMenu(link)).toBe(false); // default menu prevented
    expect(onPeek).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(1500));
    fireEvent.pointerDown(link, touch(10, 10));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onPeek).toHaveBeenCalledTimes(2);
    fireEvent.pointerUp(link, touch(10, 10));
    expect(fireEvent.click(link)).toBe(false);

    // A short tap is still a tap; moving cancels the press.
    fireEvent.pointerDown(link, touch(10, 10));
    fireEvent.pointerMove(link, touch(10, 60));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onPeek).toHaveBeenCalledTimes(2);
  });

  it("navigates inside a view transition when the browser has one, and is a plain link otherwise", async () => {
    const onNavigate = vi.fn();
    render(<StoryCard story={story} labels={labels} LinkComponent={Anchor} onNavigate={onNavigate} />);
    const link = screen.getByRole("link");
    expect(canMorphCover()).toBe(false);
    expect(fireEvent.click(link)).toBe(true); // not prevented: the link navigates by itself
    expect(onNavigate).not.toHaveBeenCalled();

    let update: (() => Promise<void> | void) | undefined;
    (document as { startViewTransition?: unknown }).startViewTransition = (callback: () => Promise<void>) => {
      update = callback;
      return { finished: Promise.resolve() };
    };
    expect(fireEvent.click(link)).toBe(false);
    const cover = link.querySelector<HTMLElement>("[data-flip-key]")!;
    expect(cover.style.viewTransitionName).toBe("story-cover");
    const target = document.createElement("div");
    target.setAttribute("data-morph-target", "");
    const done = update?.();
    expect(onNavigate).toHaveBeenCalledWith(story.href);
    document.body.append(target);
    await done;
    target.remove();
    // Modified clicks (new tab) are left to the browser.
    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
  });

  it("morphCoverInto does nothing without the API", () => {
    const navigate = vi.fn();
    expect(morphCoverInto(document.createElement("div"), navigate)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("StoryPeekSheet", () => {
  it("shows the story, the caller's actions and a link to it, and closes", () => {
    const onOpenChange = vi.fn();
    render(
      <StoryPeekSheet
        story={story}
        open
        onOpenChange={onOpenChange}
        LinkComponent={Anchor}
        labels={{ reads: "Reads", votes: "Votes", open: "Open story", close: "Close quick look" }}
        actions={<button type="button">Follow</button>}
        locale="en"
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Salt and Ash" });
    expect(within(dialog).getByText(story.synopsis)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Follow" })).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "Open story" }).getAttribute("href")).toBe(story.href);
    expect(within(dialog).getByText("Reads: 1.2K")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close quick look" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("StoryViewToggle and useStoredView", () => {
  afterEach(() => window.localStorage.clear());

  it("marks the chosen view and reports a change", () => {
    const onChange = vi.fn();
    render(
      <StoryViewToggle value="grid" onChange={onChange} labels={{ label: "Display", grid: "Grid", list: "List" }} />,
    );
    const group = screen.getByRole("group", { name: "Display" });
    expect(within(group).getByRole("button", { name: "Grid" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(group).getByRole("button", { name: "Grid" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(within(group).getByRole("button", { name: "List" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });

  it("starts as a grid, then restores and remembers the reader's choice", () => {
    window.localStorage.setItem("test.view", "list");
    const { result } = renderHook(() => useStoredView("test.view"));
    expect(result.current[0]).toBe("list");
    act(() => result.current[1]("grid"));
    expect(window.localStorage.getItem("test.view")).toBe("grid");
    window.localStorage.setItem("test.view", "bogus");
    const other = renderHook(() => useStoredView("test.view"));
    expect(other.result.current[0]).toBe("grid");
  });
});

describe("FeaturedCarousel", () => {
  const slideLabels = {
    pause: "Pause",
    play: "Play",
    dots: "Choose a story",
    slide: (index: number, count: number) => `Story ${index + 1} of ${count}`,
  };

  it("shows one slide, jumps with the dots and can be paused", () => {
    HTMLElement.prototype.scrollTo = vi.fn();
    render(
      <FeaturedCarousel title="Featured" labels={slideLabels}>
        <a href="/1">One</a>
        <a href="/2">Two</a>
        <a href="/3">Three</a>
      </FeaturedCarousel>,
    );
    const carousel = screen.getByRole("region", { name: "Featured" });
    expect(carousel.getAttribute("aria-roledescription")).toBe("carousel");
    const slides = carousel.querySelectorAll('[aria-roledescription="slide"]');
    expect(slides).toHaveLength(3);
    expect(slides[0]?.hasAttribute("inert")).toBe(false);
    expect(slides[1]?.hasAttribute("inert")).toBe(true);

    const dots = within(screen.getByRole("group", { name: "Choose a story" })).getAllByRole("button");
    expect(dots[0]?.getAttribute("aria-current")).toBe("true");
    fireEvent.click(dots[2]!);
    expect(dots[2]?.getAttribute("aria-current")).toBe("true");
    expect(slides[2]?.hasAttribute("inert")).toBe(false);
    // The new slide's text rises in only after a change, never on load.
    expect(slides[2]?.firstElementChild?.className).toContain("animate-featured-in");

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("runs the timer bar of the active dot, held while focus is inside and stopped by Pause", () => {
    HTMLElement.prototype.scrollTo = vi.fn();
    render(
      <FeaturedCarousel title="Featured" labels={slideLabels}>
        <a href="/1">One</a>
        <a href="/2">Two</a>
      </FeaturedCarousel>,
    );
    const bar = () => document.querySelector<HTMLElement>(".animate-featured-timer")!;
    expect(bar().style.animationPlayState).toBe("running");
    fireEvent.focus(screen.getByRole("link", { name: "One" }));
    expect(bar().style.animationPlayState).toBe("paused");
    fireEvent.blur(screen.getByRole("link", { name: "One" }));
    expect(bar().style.animationPlayState).toBe("running");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(bar().style.animationPlayState).toBe("paused");
  });
});
