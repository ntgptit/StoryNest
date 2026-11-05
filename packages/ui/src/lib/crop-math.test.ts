import { describe, expect, it } from "vitest";
import {
  baseCropSize,
  clampCropView,
  cropAreaOf,
  cropImageLayout,
  frameToSource,
  initialCropView,
  panCropView,
  zoomCropView,
  type CropImage,
} from "./crop-math.ts";

const landscape: CropImage = { width: 1200, height: 600, aspect: 1 };
const portrait: CropImage = { width: 600, height: 1200, aspect: 1 };
const coverWide: CropImage = { width: 1200, height: 600, aspect: 2 / 3 };
const coverTall: CropImage = { width: 300, height: 900, aspect: 2 / 3 };

/** The crop never leaves the picture and keeps the frame's aspect. */
function expectInside(image: CropImage, area: ReturnType<typeof cropAreaOf>) {
  expect(area.x).toBeGreaterThanOrEqual(-1e-9);
  expect(area.y).toBeGreaterThanOrEqual(-1e-9);
  expect(area.x + area.width).toBeLessThanOrEqual(image.width + 1e-9);
  expect(area.y + area.height).toBeLessThanOrEqual(image.height + 1e-9);
  expect(area.width / area.height).toBeCloseTo(image.aspect, 9);
}

describe("baseCropSize / initialCropView", () => {
  it("starts from the largest centred box of the aspect (today's centre crop)", () => {
    expect(cropAreaOf(initialCropView(landscape), landscape)).toEqual({ x: 300, y: 0, width: 600, height: 600 });
    expect(cropAreaOf(initialCropView(portrait), portrait)).toEqual({ x: 0, y: 300, width: 600, height: 600 });
    expect(cropAreaOf(initialCropView(coverWide), coverWide)).toEqual({ x: 400, y: 0, width: 400, height: 600 });
    expect(cropAreaOf(initialCropView(coverTall), coverTall)).toEqual({ x: 0, y: 225, width: 300, height: 450 });
  });

  it("is exact on the side that limits the picture", () => {
    expect(baseCropSize({ width: 1201, height: 601, aspect: 2 / 3 }).height).toBe(601);
    expect(baseCropSize({ width: 301, height: 901, aspect: 2 / 3 }).width).toBe(301);
  });
});

describe("clampCropView", () => {
  it("keeps the zoom between 1 and the maximum", () => {
    expect(clampCropView({ zoom: 0.2, cx: 600, cy: 300 }, landscape).zoom).toBe(1);
    expect(clampCropView({ zoom: 9, cx: 600, cy: 300 }, landscape, 3).zoom).toBe(3);
  });

  it("never lets the frame show an empty area", () => {
    for (const image of [landscape, portrait, coverWide, coverTall]) {
      for (const zoom of [1, 1.7, 3]) {
        for (const [cx, cy] of [
          [-5000, -5000],
          [5000, 5000],
          [0, image.height],
          [image.width / 2, image.height / 2],
        ] as const) {
          expectInside(image, cropAreaOf(clampCropView({ zoom, cx, cy }, image), image));
        }
      }
    }
  });

  it("at zoom 1 a square picture cannot move at all", () => {
    const square: CropImage = { width: 500, height: 500, aspect: 1 };
    expect(clampCropView({ zoom: 1, cx: 0, cy: 999 }, square)).toEqual({ zoom: 1, cx: 250, cy: 250 });
  });
});

describe("panCropView", () => {
  it("moves the crop against the drag, in frame fractions", () => {
    // Dragging the picture a quarter frame to the right shows what is left of it: the crop moves 150 px left.
    const moved = panCropView(initialCropView(landscape), landscape, 0.25, 0);
    expect(cropAreaOf(moved, landscape)).toEqual({ x: 150, y: 0, width: 600, height: 600 });
  });

  it("stops at the edge of the picture", () => {
    const moved = panCropView(initialCropView(landscape), landscape, 5, 5);
    expect(cropAreaOf(moved, landscape)).toEqual({ x: 0, y: 0, width: 600, height: 600 });
    const other = panCropView(initialCropView(landscape), landscape, -5, -5);
    expect(cropAreaOf(other, landscape)).toEqual({ x: 600, y: 0, width: 600, height: 600 });
  });
});

describe("zoomCropView", () => {
  it("zooms around the centre by default", () => {
    const zoomed = zoomCropView(initialCropView(portrait), portrait, 2);
    expect(cropAreaOf(zoomed, portrait)).toEqual({ x: 150, y: 450, width: 300, height: 300 });
  });

  it("keeps the point under the pointer where it is", () => {
    const view = initialCropView(portrait);
    const under = frameToSource(view, portrait, 0.25, 0.75);
    const zoomed = zoomCropView(view, portrait, 2, 0.25, 0.75);
    const after = frameToSource(zoomed, portrait, 0.25, 0.75);
    expect(after.x).toBeCloseTo(under.x, 9);
    expect(after.y).toBeCloseTo(under.y, 9);
  });

  it("is clamped near an edge, so zooming out from a corner pulls the crop back inside", () => {
    const corner = zoomCropView(
      panCropView(zoomCropView(initialCropView(coverWide), coverWide, 3), coverWide, 9, 9),
      coverWide,
      1,
    );
    expectInside(coverWide, cropAreaOf(corner, coverWide));
    expect(corner.zoom).toBe(1);
  });

  it("respects the zoom limits", () => {
    expect(zoomCropView(initialCropView(landscape), landscape, 10, 0.5, 0.5, 4).zoom).toBe(4);
    expect(zoomCropView(initialCropView(landscape), landscape, 0.1).zoom).toBe(1);
  });
});

describe("frameToSource", () => {
  it("maps frame corners to source pixels for a landscape and a portrait picture", () => {
    const l = zoomCropView(initialCropView(landscape), landscape, 2);
    expect(frameToSource(l, landscape, 0, 0)).toEqual({ x: 450, y: 150 });
    expect(frameToSource(l, landscape, 1, 1)).toEqual({ x: 750, y: 450 });
    const p = initialCropView(portrait);
    expect(frameToSource(p, portrait, 0, 0)).toEqual({ x: 0, y: 300 });
    expect(frameToSource(p, portrait, 0.5, 1)).toEqual({ x: 300, y: 900 });
  });

  it("maps a 2:3 frame on a wide picture", () => {
    const v = initialCropView(coverWide);
    expect(frameToSource(v, coverWide, 0, 0)).toEqual({ x: 400, y: 0 });
    expect(frameToSource(v, coverWide, 1, 1)).toEqual({ x: 800, y: 600 });
  });
});

describe("cropImageLayout", () => {
  it("sizes and shifts the picture so the crop fills the frame", () => {
    expect(cropImageLayout(initialCropView(landscape), landscape)).toEqual({ width: 200, x: -25, y: -0 });
    const zoomed = zoomCropView(initialCropView(portrait), portrait, 2);
    expect(cropImageLayout(zoomed, portrait)).toEqual({ width: 200, x: -25, y: -37.5 });
  });
});
