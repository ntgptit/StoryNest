import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sheet } from "../components/sheet.tsx";
import { BACK_TO_TOP_AFTER_SCREENS, BackToTopButton } from "./back-to-top-button.tsx";
import { DETENT_HEIGHTS, DetentSheetContent, rubberBand, settleDetent } from "./detent-sheet.tsx";
import { HIGHLIGHT_SWEEP_MS, HighlightSweep } from "./highlight-sweep.tsx";
import { clampPan, clampZoom, fitSize, ImageLightbox, LIGHTBOX_MAX_ZOOM, zoomAbout } from "./image-lightbox.tsx";
import { ReadingTimeLeft } from "./reading-time-left.tsx";
import { SelectionToolbar, useBlockSelection } from "./selection-toolbar.tsx";
import { SpoilerText } from "./spoiler-text.tsx";

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ReadingTimeLeft", () => {
  it("shows the time left (short on phones, full otherwise) and turns into a check when done", () => {
    const { rerender } = render(<ReadingTimeLeft ratio={0.4} done={false} label="6 min left" shortLabel="6 min" />);
    const root = document.querySelector("[data-slot=reading-time-left]");
    expect(screen.getByText("6 min left")).toBeTruthy();
    expect(screen.getByText("6 min").getAttribute("aria-hidden")).toBe("true");
    expect(root?.getAttribute("data-done")).toBe("false");
    expect(document.querySelector("circle[stroke-dashoffset]")?.getAttribute("stroke-dashoffset")).toBe("60");

    rerender(<ReadingTimeLeft ratio={1} done label="Finished" shortLabel="Finished" />);
    expect(root?.getAttribute("data-done")).toBe("true");
  });
});

describe("HighlightSweep", () => {
  it("draws nothing at first, sweeps once when played and lets go after the sweep", () => {
    vi.useFakeTimers();
    const { rerender } = render(<HighlightSweep>Đoạn văn</HighlightSweep>);
    expect(document.querySelector(".highlight-sweep")).toBeNull();

    rerender(<HighlightSweep play={1}>Đoạn văn</HighlightSweep>);
    expect(document.querySelector(".highlight-sweep")?.textContent).toBe("Đoạn văn");
    act(() => vi.advanceTimersByTime(HIGHLIGHT_SWEEP_MS));
    expect(document.querySelector(".highlight-sweep")).toBeNull();
    expect(screen.getByText("Đoạn văn")).toBeTruthy();
  });

  it("stops at once when another paragraph takes over", () => {
    const { rerender } = render(<HighlightSweep play={2}>A</HighlightSweep>);
    expect(document.querySelector(".highlight-sweep")).toBeTruthy();
    rerender(<HighlightSweep play={0}>A</HighlightSweep>);
    expect(document.querySelector(".highlight-sweep")).toBeNull();
  });
});

describe("BackToTopButton", () => {
  it("is hidden (inert) near the top, shows after scrolling far, and takes the page and focus back to the top", () => {
    function Page() {
      const top = useRef<HTMLHeadingElement>(null);
      return (
        <>
          <h1 ref={top} tabIndex={-1}>
            Title
          </h1>
          <BackToTopButton label="Back to top" focusTargetRef={top} />
        </>
      );
    }
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    render(<Page />);
    const button = document.querySelector("[data-slot=back-to-top]") as HTMLButtonElement;
    expect(button.getAttribute("aria-hidden")).toBe("true");
    expect(button.hasAttribute("inert")).toBe(true);

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: window.innerHeight * (BACK_TO_TOP_AFTER_SCREENS + 1),
    });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    const shown = screen.getByRole("button", { name: "Back to top" });
    expect(shown.hasAttribute("inert")).toBe(false);

    fireEvent.click(shown);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(document.activeElement?.textContent).toBe("Title");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });
});

describe("SpoilerText", () => {
  it("is a covered button that does not read out its text, and shows it on press, Enter or Space", () => {
    render(
      <p>
        At the end <SpoilerText coverLabel="Spoiler, tap to show">the detective did it</SpoilerText>.
      </p>,
    );
    const spoiler = screen.getByRole("button", { name: "Spoiler, tap to show" });
    expect(spoiler.getAttribute("aria-expanded")).toBe("false");
    expect(spoiler.getAttribute("data-state")).toBe("covered");

    fireEvent.click(spoiler);
    expect(spoiler.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "the detective did it" })).toBe(spoiler);

    fireEvent.keyDown(spoiler, { key: "Enter" });
    expect(spoiler.getAttribute("data-state")).toBe("covered");
    fireEvent.keyDown(spoiler, { key: " " });
    expect(spoiler.getAttribute("data-state")).toBe("shown");
  });
});

describe("lightbox math", () => {
  it("zooms around a point so that point stays put", () => {
    expect(zoomAbout({ x: 0, y: 0 }, 1, 2, { x: 100, y: -50 })).toEqual({ x: -100, y: 50 });
    expect(zoomAbout({ x: -100, y: 50 }, 2, 1, { x: 100, y: -50 })).toEqual({ x: 0, y: 0 });
  });

  it("keeps a zoomed photo covering the view and centres one that does not overflow", () => {
    const image = { width: 400, height: 300 };
    const view = { width: 400, height: 800 };
    expect(clampPan({ x: 500, y: 500 }, 2, image, view)).toEqual({ x: 200, y: 0 });
    expect(clampPan({ x: -500, y: 0 }, 2, image, view)).toEqual({ x: -200, y: 0 });
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(99)).toBe(LIGHTBOX_MAX_ZOOM);
  });

  it("fits the photo to the view, keeping its aspect ratio, and draws nothing before it has a size", () => {
    expect(fitSize({ width: 100, height: 150 }, { width: 375, height: 800 })).toEqual({ width: 375, height: 563 });
    expect(fitSize({ width: 4000, height: 1000 }, { width: 1280, height: 800 })).toEqual({ width: 1280, height: 320 });
    expect(fitSize({ width: 0, height: 0 }, { width: 375, height: 800 })).toEqual({ width: 0, height: 0 });
  });
});

describe("ImageLightbox", () => {
  it("opens the photo in a dialog, zooms with + and resets with 0, and gives focus back to the photo on Esc", async () => {
    render(
      <ImageLightbox
        src="/a.png"
        alt=""
        openLabel="Open image"
        closeLabel="Close image"
        title="Image"
        hint="Pinch to zoom"
      >
        <img src="/a.png" alt="" />
      </ImageLightbox>,
    );
    const trigger = screen.getByRole("button", { name: "Open image" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Image" });
    expect(screen.getByText("Pinch to zoom")).toBeTruthy();
    const photo = dialog.querySelector("img") as HTMLImageElement;
    expect(photo.style.transform).toContain("scale(1)");

    fireEvent.keyDown(dialog, { key: "+" });
    expect(photo.style.transform).toContain("scale(1.5)");
    fireEvent.keyDown(dialog, { key: "0" });
    expect(photo.style.transform).toContain("scale(1)");

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("closes from the close button", async () => {
    render(
      <ImageLightbox src="/a.png" alt="" openLabel="Open image" closeLabel="Close image" title="Image" hint="h">
        <img src="/a.png" alt="" />
      </ImageLightbox>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open image" }));
    fireEvent.click(await screen.findByRole("button", { name: "Close image" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("detent sheet", () => {
  it("resists past the ends like a rubber band", () => {
    expect(rubberBand(500, 200, 800)).toBe(500);
    expect(rubberBand(100, 200, 800)).toBe(175);
    expect(rubberBand(1000, 200, 800)).toBe(850);
  });

  it("settles on the detent nearest to where the throw carries it, or closes when pulled down", () => {
    const vh = 1000;
    expect(settleDetent(DETENT_HEIGHTS.half * vh, 0, vh)).toBe("half");
    expect(settleDetent(DETENT_HEIGHTS.half * vh + 40, 0, vh)).toBe("half");
    expect(settleDetent(DETENT_HEIGHTS.half * vh, 1500, vh)).toBe("full");
    expect(settleDetent(DETENT_HEIGHTS.half * vh, -1500, vh)).toBe("peek");
    expect(settleDetent(DETENT_HEIGHTS.peek * vh - 100, 0, vh)).toBeNull();
    expect(settleDetent(DETENT_HEIGHTS.peek * vh, -2000, vh)).toBeNull();
  });

  it("opens at half height; the grabber steps through the heights by press and by arrow keys", async () => {
    const dismiss = vi.fn();
    render(
      <Sheet open>
        <DetentSheetContent header={<p>Header</p>} handleLabel={(d) => `Height ${d}`} onDismiss={dismiss}>
          <p>Body</p>
        </DetentSheetContent>
      </Sheet>,
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("data-detent")).toBe("half");
    expect(dialog.style.height).toBe(`${DETENT_HEIGHTS.half * window.innerHeight}px`);

    fireEvent.click(screen.getByRole("button", { name: "Height half" }));
    expect(dialog.getAttribute("data-detent")).toBe("full");
    fireEvent.keyDown(screen.getByRole("button", { name: "Height full" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Height half" }), { key: "ArrowDown" });
    expect(dialog.getAttribute("data-detent")).toBe("peek");
    fireEvent.click(screen.getByRole("button", { name: "Height peek" }));
    expect(dialog.getAttribute("data-detent")).toBe("half");
  });

  it("follows a drag of the top area and closes when pulled down far enough", async () => {
    const dismiss = vi.fn();
    render(
      <Sheet open>
        <DetentSheetContent header={<p>Header</p>} handleLabel={(d) => d} onDismiss={dismiss}>
          <p>Body</p>
        </DetentSheetContent>
      </Sheet>,
    );
    await screen.findByRole("dialog");
    const area = document.querySelector("[data-slot=detent-sheet-handle-area]") as HTMLElement;
    fireEvent.pointerDown(area, { clientY: 300, button: 0, pointerId: 1 });
    fireEvent.pointerMove(area, { clientY: 300 + window.innerHeight, pointerId: 1 });
    fireEvent.pointerUp(area, { clientY: 300 + window.innerHeight, pointerId: 1 });
    expect(dismiss).toHaveBeenCalled();
  });
});

describe("SelectionToolbar", () => {
  it("renders nothing without a selection and a labelled toolbar over one; Esc dismisses", () => {
    function Harness({ rect }: { rect: { top: number; bottom: number; left: number; width: number } | null }) {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <SelectionToolbar rect={rect} label="Quote tools" onDismiss={dismiss} toolbarRef={ref}>
          <button type="button">Copy</button>
        </SelectionToolbar>
      );
    }
    const dismiss = vi.fn();
    const { rerender } = render(<Harness rect={null} />);
    expect(screen.queryByRole("toolbar")).toBeNull();
    rerender(<Harness rect={{ top: 400, bottom: 420, left: 100, width: 80 }} />);
    const toolbar = screen.getByRole("toolbar", { name: "Quote tools" });
    expect(toolbar.style.top).not.toBe("");
    fireEvent.keyDown(screen.getByRole("button", { name: "Copy" }), { key: "Escape" });
    expect(dismiss).toHaveBeenCalled();
  });

  it("reports a selection inside one block, and none across two blocks", async () => {
    Range.prototype.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 5, width: 50 }) as DOMRect;
    let seen: ReturnType<typeof useBlockSelection>["selection"] = null;
    function Harness() {
      const container = useRef<HTMLDivElement>(null);
      const keep = useRef<HTMLDivElement>(null);
      seen = useBlockSelection(container, keep).selection;
      return (
        <div ref={container}>
          <p data-block-id="one">Một câu văn để chọn.</p>
          <p data-block-id="two">Câu thứ hai.</p>
        </div>
      );
    }
    render(<Harness />);
    const [one, two] = document.querySelectorAll("p") as unknown as [HTMLElement, HTMLElement];

    const range = document.createRange();
    range.setStart(one.firstChild!, 4);
    range.setEnd(one.firstChild!, 7);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    await waitFor(() => expect(seen).toMatchObject({ blockId: "one", text: "câu", rect: { top: 10 } }));

    const across = document.createRange();
    across.setStart(one.firstChild!, 0);
    across.setEnd(two.firstChild!, 3);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(across);
    document.dispatchEvent(new Event("selectionchange"));
    await waitFor(() => expect(seen).toBeNull());
  });
});
