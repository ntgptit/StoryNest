import { describe, expect, it } from "vitest";
import { blurhashAverageColor, decodeBlurhash, encodeBlurhash, isBlurhash } from "./blurhash.ts";

const solid = (w: number, h: number, rgb: [number, number, number]) => {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) pixels.set([...rgb, 255], p * 4);
  return pixels;
};

describe("BlurHash", () => {
  it("validates length against the size flag", () => {
    expect(isBlurhash("LEHV6nWB2yk8pyo0adR*.7kCMdnj")).toBe(true);
    expect(isBlurhash("LEHV6nWB2yk8pyo0adR*.7kCMdn")).toBe(false);
    expect(isBlurhash("00TI:j")).toBe(true);
    expect(isBlurhash('00TI:"')).toBe(false);
  });

  it("encodes a flat picture to a flat hash of the announced length", () => {
    const hash = encodeBlurhash(solid(8, 12, [200, 40, 30]), 8, 12, 4, 3);
    expect(hash).toHaveLength(28);
    expect(isBlurhash(hash)).toBe(true);
    expect(hash[0]).toBe("L"); // (4-1) + (3-1)*9 = 21
    // The DC term is the average colour; the cosine terms of a flat picture are small but not zero (as in the
    // reference implementation), so decoded pixels stay near it rather than equal to it.
    const back = decodeBlurhash(hash, 4, 6);
    expect(back[3]).toBe(255);
    expect(Math.abs((back[4 * 13] as number) - 200)).toBeLessThan(80);
    expect(blurhashAverageColor(hash)).toBe("rgb(200 40 30)");
  });

  it("round-trips a gradient closely", () => {
    const w = 16;
    const h = 16;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pixels.set([x * 16, y * 16, 128, 255], (x + y * w) * 4);
    const hash = encodeBlurhash(pixels, w, h, 4, 4);
    const back = decodeBlurhash(hash, w, h);
    let error = 0;
    for (let i = 0; i < pixels.length; i += 4) error += Math.abs((back[i] as number) - (pixels[i] as number));
    expect(error / (w * h)).toBeLessThan(20);
  });

  it("decodes the reference hash and refuses bad input", () => {
    expect(decodeBlurhash("LEHV6nWB2yk8pyo0adR*.7kCMdnj", 4, 6)).toHaveLength(4 * 6 * 4);
    expect(() => decodeBlurhash("nope", 2, 2)).toThrow();
    expect(() => encodeBlurhash(solid(1, 1, [0, 0, 0]), 1, 1, 0, 1)).toThrow();
    expect(blurhashAverageColor("x")).toBeNull();
  });
});
