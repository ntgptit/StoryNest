import { describe, expect, it } from "vitest";
import {
  IMAGE_MAX_INPUT_BYTES,
  ImageError,
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

  it("reports a file the browser cannot decode as unreadable", async () => {
    const error = await prepareImage(file("image/png"), async () => {
      throw new Error("decode");
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImageError);
    expect(error).toMatchObject({ problem: "unreadable" });
  });
});
