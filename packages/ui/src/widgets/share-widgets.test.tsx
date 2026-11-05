import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link2, Lock } from "lucide-react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COPIED_RESET_MS, CopyLinkButton, copyText } from "./copy-link-button.tsx";
import { ExpandableText } from "./expandable-text.tsx";
import { ShareDialog, type ShareAccessOption } from "./share-dialog.tsx";
import { StickyActionBar } from "./sticky-action-bar.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Puts a fake async clipboard on the page (jsdom has none) and returns its writeText. */
function fakeClipboard(writeText = vi.fn(() => Promise.resolve())) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  return writeText;
}

function noClipboard() {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
}

describe("copyText", () => {
  it("uses the async clipboard when the page may", async () => {
    const writeText = fakeClipboard();
    expect(await copyText("https://site.test/a")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://site.test/a");
  });

  it("falls back to the copy command on a temporary field, and cleans it up", async () => {
    noClipboard();
    const exec = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: exec });
    expect(await copyText("x")).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back as well when the clipboard refuses, and reports a copy that did not work", async () => {
    fakeClipboard(vi.fn(() => Promise.reject(new Error("denied"))));
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => false) });
    expect(await copyText("x")).toBe(false);
  });
});

describe("CopyLinkButton", () => {
  it("is still on first render, turns into a check and announces it after a copy, then resets", async () => {
    vi.useFakeTimers();
    const writeText = fakeClipboard();
    const onCopied = vi.fn();
    render(
      <CopyLinkButton value={() => "https://site.test/s"} label="Copy" copiedLabel="Copied" onCopied={onCopied} />,
    );
    const button = screen.getByRole("button", { name: "Copy" });
    expect(button.getAttribute("data-state")).toBe("idle");
    expect(screen.getByRole("status").textContent).toBe("");

    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith("https://site.test/s");
    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("data-state")).toBe("copied");
    expect(button.textContent).toBe("Copied");
    expect(screen.getByRole("status").textContent).toBe("Copied");
    expect(button.querySelector("[data-part=check]")?.getAttribute("stroke-dashoffset")).toBe("0");

    act(() => vi.advanceTimersByTime(COPIED_RESET_MS));
    expect(button.getAttribute("data-state")).toBe("idle");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("icon only: named by its label, with a Copied bubble kept away from assistive tech", async () => {
    fakeClipboard();
    render(<CopyLinkButton iconOnly value="v" label="Copy link" copiedLabel="Copied" />);
    const button = screen.getByRole("button", { name: "Copy link" });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.getAttribute("aria-label")).toBe("Copy link");
    expect(screen.getByRole("status").textContent).toBe("Copied");
  });

  it("says when copying failed and does not pretend it worked", async () => {
    noClipboard();
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => false) });
    const onCopyFailed = vi.fn();
    render(<CopyLinkButton value="v" label="Copy" copiedLabel="Copied" onCopyFailed={onCopyFailed} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(onCopyFailed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Copy" }).getAttribute("data-state")).toBe("idle");
  });
});

type Access = "private" | "unlisted";
const OPTIONS: readonly ShareAccessOption<Access>[] = [
  { value: "private", label: "Private", description: "Only you", icon: Lock, reachable: false },
  { value: "unlisted", label: "Link only", description: "Anyone with the link", icon: Link2, reachable: true },
];

describe("ShareDialog", () => {
  beforeEach(() => {
    // jsdom lacks these; Radix Select calls them when it opens.
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
  });

  const base = {
    title: "Share “List”",
    description: "Send the link",
    url: "https://site.test/lists/1",
    linkLabel: "Link",
    copyLabel: "Copy",
    copiedLabel: "Copied",
  };

  it("opens from its trigger with the link in a read-only field and a copy button; the field flashes after a copy", async () => {
    fakeClipboard();
    render(<ShareDialog {...base} trigger={<button type="button">Share</button>} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    const dialog = await screen.findByRole("dialog", { name: "Share “List”" });
    const field = within(dialog).getByRole("textbox", { name: "Link" }) as HTMLInputElement;
    expect(field.value).toBe("https://site.test/lists/1");
    expect(field.readOnly).toBe(true);
    expect(dialog.querySelector("[data-part=flash]")).toBeNull();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Copy" }));
    });
    expect(dialog.querySelector("[data-part=flash]")?.className).toContain("animate-link-flash");
    expect(within(dialog).queryByRole("button", { name: /share with/i })).toBeNull();
  });

  it("shows the access read-only without onChange, and offers the system share sheet when given", () => {
    const onShare = vi.fn();
    render(
      <ShareDialog
        {...base}
        open
        access={{ label: "Who can open it", value: "unlisted", options: OPTIONS }}
        nativeShare={{ label: "Share with another app", onShare }}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const access = within(dialog).getByRole("region", { name: "Who can open it" });
    expect(within(access).getByText("Link only")).toBeTruthy();
    expect(within(access).getByText("Anyone with the link")).toBeTruthy();
    expect(within(access).queryByRole("combobox")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Share with another app" }));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("lets the owner pick another access; the icon spins in only after a change, never on first render", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ShareDialog
        {...base}
        open
        access={{ label: "Who can open it", value: "private", options: OPTIONS, onChange }}
      />,
    );
    const access = screen.getByRole("region", { name: "Who can open it" });
    expect(access.querySelector(".animate-access-icon-in")).toBeNull();
    expect(within(access).getByText("Only you")).toBeTruthy();

    fireEvent.keyDown(within(access).getByRole("combobox", { name: "Who can open it" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Link only" }));
    expect(onChange).toHaveBeenCalledWith("unlisted");

    rerender(
      <ShareDialog
        {...base}
        open
        access={{ label: "Who can open it", value: "unlisted", options: OPTIONS, onChange }}
      />,
    );
    await waitFor(() => expect(access.querySelector(".animate-access-icon-in")).not.toBeNull());
    expect(access.querySelector("[data-reachable=true]")).not.toBeNull();
    expect(within(access).getByText("Anyone with the link")).toBeTruthy();
  });
});

type Observed = {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  disconnect: ReturnType<typeof vi.fn>;
};

function fakeIntersectionObserver() {
  const observers: Observed[] = [];
  class FakeObserver {
    disconnect = vi.fn();
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      observers.push({ callback, options, disconnect: this.disconnect });
    }
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  /** Reports the anchor as on screen, or as scrolled up past the top of the viewport. */
  const report = (state: "visible" | "above" | "below") =>
    act(() => {
      const entry = {
        isIntersecting: state === "visible",
        boundingClientRect: { top: state === "above" ? -200 : 900, bottom: state === "above" ? -150 : 950 },
        rootBounds: { top: 56 },
      } as unknown as IntersectionObserverEntry;
      observers.at(-1)?.callback([entry], {} as IntersectionObserver);
    });
  return { observers, report };
}

function BarPage() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={ref}>
        <a href="/read">Read</a>
      </div>
      <StickyActionBar anchorRef={ref} label="Reading bar">
        <a href="/read">Read</a>
      </StickyActionBar>
    </>
  );
}

/** The bar region even while it is hidden from assistive tech (getByRole cannot name an aria-hidden element). */
const barRegion = () => document.querySelector<HTMLElement>('[role=region][aria-label="Reading bar"]')!;

describe("StickyActionBar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts hidden (inert, out of the accessibility tree), so nothing moves on first render", () => {
    fakeIntersectionObserver();
    render(<BarPage />);
    const bar = barRegion();
    expect(bar.getAttribute("data-state")).toBe("hidden");
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(bar.hasAttribute("inert")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Read" })).toHaveLength(1);
  });

  it("rises once the page's own action scrolls up out of view and slips away when it is back", () => {
    const io = fakeIntersectionObserver();
    render(<BarPage />);
    const bar = () => barRegion();

    io.report("below"); // still below the fold (e.g. a short phone): the page's own button is coming, no bar
    expect(bar().getAttribute("data-state")).toBe("hidden");

    io.report("above");
    expect(bar().getAttribute("data-state")).toBe("visible");
    expect(bar().hasAttribute("inert")).toBe(false);
    expect(
      within(screen.getByRole("region", { name: "Reading bar" })).getByRole("link", { name: "Read" }),
    ).toBeTruthy();

    io.report("visible");
    expect(bar().getAttribute("data-state")).toBe("hidden");
  });

  it("observes an area reaching far below the fold, so a jump from below straight past the top is reported", () => {
    // With a plain viewport root, "below the fold" and "above the top" are both "not intersecting": an instant jump
    // between them (an in-page link, End) crosses no threshold and the bar would never rise.
    const io = fakeIntersectionObserver();
    render(<BarPage />);
    const [top, right, bottom, left] = (io.observers.at(-1)?.options?.rootMargin ?? "").split(" ");
    expect([top, right, left]).toEqual(["-56px", "0px", "0px"]);
    expect(Number.parseFloat(bottom ?? "0")).toBeGreaterThanOrEqual(10_000);
  });

  it("stays hidden without IntersectionObserver and stops observing when it goes away", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { unmount } = render(<BarPage />);
    expect(barRegion().getAttribute("data-state")).toBe("hidden");
    unmount();
    vi.unstubAllGlobals();

    const io = fakeIntersectionObserver();
    const second = render(<BarPage />);
    second.unmount();
    expect(io.observers[0]?.disconnect).toHaveBeenCalled();
  });
});

describe("ExpandableText", () => {
  const LONG = "Line one.\nLine two.\nLine three.";

  /** jsdom has no layout: give the text a height and the clamped box a smaller one. */
  function layout(content: number, box: number) {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(content);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(box);
  }

  it("shows no toggle when the text fits, and keeps the whole text in the DOM", () => {
    layout(100, 100);
    render(
      <ExpandableText moreLabel="Show more" lessLabel="Show less">
        {LONG}
      </ExpandableText>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/Line three\./)).toBeTruthy();
  });

  it("clamps overflowing text with a toggle that expands to the full height and collapses again", () => {
    layout(400, 120);
    render(
      <ExpandableText lines={4} moreLabel="Show more" lessLabel="Show less">
        {LONG}
      </ExpandableText>,
    );
    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const box = document.getElementById(toggle.getAttribute("aria-controls") ?? "")!;
    expect(box.style.maxHeight).toBe("4lh");
    expect(box.querySelector("[data-part=fade]")?.className).toContain("opacity-100");
    expect(box.textContent).toContain("Line three.");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("Show less");
    expect(box.style.maxHeight).toBe("400px");
    expect(box.querySelector("[data-part=fade]")?.className).toContain("opacity-0");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(box.style.maxHeight).toBe("4lh");
  });

  it("brings the start of the text back into view when collapsing after scrolling down", () => {
    layout(400, 120);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <ExpandableText moreLabel="Show more" lessLabel="Show less">
        {LONG}
      </ExpandableText>,
    );
    const toggle = screen.getByRole("button", { name: "Show more" });
    fireEvent.click(toggle);
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: -300 } as DOMRect);
    fireEvent.click(toggle);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
  });
});
