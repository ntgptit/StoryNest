import { describe, expect, it, vi } from "vitest";
import { cropAreaOf, initialCropView, panCropView, zoomCropView, type CropImage } from "@storynest/ui/lib/crop-math";
import {
  IMAGE_MAX_INPUT_BYTES,
  ImageError,
  checkImageFile,
  cropBox,
  outputSize,
  prepareImage,
  type ImageRenderer,
  type PreparedImage,
} from "./image-prepare.ts";

const prepared: PreparedImage = { blob: new Blob(["x"]), contentType: "image/webp", extension: "webp" };
const renderOk: ImageRenderer = async () => prepared;
const file = (type: string, size = 10) => new File([new Uint8Array(size)], "a", { type });

describe("cropBox", () => {
  it("crops a wide picture to a centred 2:3 column", () => {
    expect(cropBox(1200, 600, 2 / 3)).toEqual({ sx: 400, sy: 0, sw: 400, sh: 600 });
  });

  it("crops a tall picture to a centred 2:3 band", () => {
    expect(cropBox(300, 900, 2 / 3)).toEqual({ sx: 0, sy: 225, sw: 300, sh: 450 });
  });

  it("keeps a picture that already has the shape", () => {
    expect(cropBox(400, 600, 2 / 3)).toEqual({ sx: 0, sy: 0, sw: 400, sh: 600 });
  });

  it("squares work the same way", () => {
    expect(cropBox(400, 200, 1)).toEqual({ sx: 100, sy: 0, sw: 200, sh: 200 });
    expect(cropBox(200, 401, 1)).toEqual({ sx: 0, sy: 100, sw: 200, sh: 200 });
  });

  it("never leaves the picture", () => {
    for (const [w, h] of [
      [1, 1],
      [7, 1000],
      [1000, 7],
      [333, 500],
      [4000, 3000],
    ] as const) {
      for (const aspect of [1, 2 / 3]) {
        const { sx, sy, sw, sh } = cropBox(w, h, aspect);
        expect(sx).toBeGreaterThanOrEqual(0);
        expect(sy).toBeGreaterThanOrEqual(0);
        expect(sx + sw).toBeLessThanOrEqual(w);
        expect(sy + sh).toBeLessThanOrEqual(h);
      }
    }
  });
});

describe("cropBox with a crop from the editor", () => {
  const SIZES = [
    [1200, 600],
    [300, 900],
    [400, 600],
    [1201, 601],
    [601, 1201],
    [4032, 3024],
    [3024, 4032],
    [333, 500],
    [7, 1000],
    [1000, 7],
    [1, 1],
  ] as const;

  it("the editor's untouched starting view gives exactly today's centred crop", () => {
    const sweep: (readonly [number, number])[] = [...SIZES];
    for (let w = 1; w <= 90; w += 1) for (let h = 1; h <= 90; h += 1) sweep.push([w * 17, h * 13]);
    for (const [w, h] of sweep) {
      for (const aspect of [1, 2 / 3]) {
        const image: CropImage = { width: w, height: h, aspect };
        const today = cropBox(w, h, aspect);
        const edited = cropBox(w, h, aspect, cropAreaOf(initialCropView(image), image));
        // A 1 x 1 picture has no 2:3 box today (width 0); the editor path keeps at least one pixel instead.
        if (today.sw === 0) expect(edited.sw).toBe(1);
        else expect(edited).toEqual(today);
      }
    }
  });

  it("maps a zoomed and moved crop of a landscape picture to source pixels", () => {
    const image: CropImage = { width: 1200, height: 600, aspect: 1 };
    const view = panCropView(zoomCropView(initialCropView(image), image, 2), image, 0.5, 0); // move the picture right
    expect(cropBox(1200, 600, 1, cropAreaOf(view, image))).toEqual({ sx: 300, sy: 150, sw: 300, sh: 300 });
  });

  it("maps a crop of a portrait picture to a 2:3 cover box", () => {
    const image: CropImage = { width: 600, height: 1200, aspect: 2 / 3 };
    const view = panCropView(zoomCropView(initialCropView(image), image, 1.5), image, 0, 9); // all the way to the top
    expect(cropBox(600, 1200, 2 / 3, cropAreaOf(view, image))).toEqual({ sx: 100, sy: 0, sw: 400, sh: 600 });
  });

  it("rounds a fractional crop, keeps an avatar square and stays inside the picture", () => {
    expect(cropBox(1000, 800, 1, { x: 100.4, y: 50.6, width: 333.3, height: 333.3 })).toEqual({
      sx: 100,
      sy: 50,
      sw: 333,
      sh: 333,
    });
    expect(cropBox(1000, 800, 1, { x: 900, y: 700, width: 300, height: 300 })).toEqual({
      sx: 700,
      sy: 500,
      sw: 300,
      sh: 300,
    });
    expect(cropBox(1000, 800, 1, { x: -50, y: -50, width: 5000, height: 5000 })).toEqual({
      sx: 200, // its centre is far right: kept at the right edge
      sy: 0,
      sw: 800,
      sh: 800,
    });
  });
});

describe("outputSize", () => {
  it("shrinks to the maximum width and keeps the shape", () => {
    expect(outputSize(1200, 1800, 600)).toEqual({ width: 600, height: 900 });
  });

  it("never enlarges", () => {
    expect(outputSize(100, 150, 600)).toEqual({ width: 100, height: 150 });
  });

  it("is never empty", () => {
    expect(outputSize(1, 1, 600)).toEqual({ width: 1, height: 1 });
  });
});

describe("prepareImage", () => {
  it("hands an accepted file to the renderer", async () => {
    await expect(prepareImage(file("image/jpeg"), renderOk)).resolves.toBe(prepared);
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])("refuses the type %j", async (type) => {
    await expect(prepareImage(file(type), renderOk)).rejects.toMatchObject({ problem: "type" });
  });

  it("refuses a file over the limit and accepts one exactly at it", async () => {
    await expect(prepareImage(file("image/png", IMAGE_MAX_INPUT_BYTES + 1), renderOk)).rejects.toMatchObject({
      problem: "tooLarge",
    });
    await expect(prepareImage(file("image/png", IMAGE_MAX_INPUT_BYTES), renderOk)).resolves.toBe(prepared);
  });

  it("passes the chosen crop to the renderer, and nothing without one", async () => {
    const render = vi.fn(renderOk);
    const crop = { x: 1, y: 2, width: 30, height: 30 };
    await prepareImage(file("image/png"), render, crop);
    expect(render).toHaveBeenLastCalledWith(expect.any(Blob), crop);
    await prepareImage(file("image/png"), render);
    expect(render.mock.lastCall).toHaveLength(1);
  });

  it("checkImageFile names the problem without decoding", () => {
    expect(checkImageFile(file("image/webp"))).toBeNull();
    expect(checkImageFile(file("image/gif"))).toBe("type");
    expect(checkImageFile(file("image/jpeg", IMAGE_MAX_INPUT_BYTES + 1))).toBe("tooLarge");
  });

  it("reports a file the browser cannot decode as unreadable", async () => {
    const error = await prepareImage(file("image/png"), async () => {
      throw new Error("decode");
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImageError);
    expect(error).toMatchObject({ problem: "unreadable" });
  });
});
