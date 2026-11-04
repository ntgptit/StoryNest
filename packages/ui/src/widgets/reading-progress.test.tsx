import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReadingProgress, scrollRatio } from "./reading-progress.tsx";

afterEach(cleanup);

describe("scrollRatio", () => {
  it("is the scrolled fraction of the scrollable distance, clamped to 0..1", () => {
    expect(scrollRatio(0, 2000, 1000)).toBe(0);
    expect(scrollRatio(500, 2000, 1000)).toBe(0.5);
    expect(scrollRatio(1000, 2000, 1000)).toBe(1);
    expect(scrollRatio(5000, 2000, 1000)).toBe(1);
    expect(scrollRatio(-50, 2000, 1000)).toBe(0);
  });

  it("is 0 when the page does not scroll or the input is not a number", () => {
    expect(scrollRatio(0, 800, 1000)).toBe(0);
    expect(scrollRatio(0, 1000, 1000)).toBe(0);
    expect(scrollRatio(Number.NaN, 2000, 1000)).toBe(0);
  });
});

describe("ReadingProgress", () => {
  it("exposes a labelled progressbar", () => {
    render(<ReadingProgress label="Tiến độ" />);
    const bar = screen.getByRole("progressbar", { name: "Tiến độ" });
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });
});
