// BlurHash encoder and decoder (https://blurha.sh), written from the published algorithm
// (https://github.com/woltapp/blurhash/blob/master/Algorithm.md) so no dependency is needed. Pure functions on RGBA
// pixel arrays: the browser code that reads a canvas or paints one lives with the UI.

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

function encode83(value: number, length: number): string {
  let out = "";
  for (let i = 1; i <= length; i++) {
    const digit = Math.floor(value / 83 ** (length - i)) % 83;
    out += DIGITS[digit];
  }
  return out;
}

function decode83(text: string): number {
  let value = 0;
  for (const char of text) {
    const digit = DIGITS.indexOf(char);
    if (digit < 0) throw new Error("not a BlurHash digit");
    value = value * 83 + digit;
  }
  return value;
}

const toLinear = (value: number): number => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (value: number): number => {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308 ? Math.round(v * 12.92 * 255 + 0.5) : Math.round((1.055 * v ** (1 / 2.4) - 0.055) * 255 + 0.5);
};

const signPow = (value: number, exponent: number): number => Math.sign(value) * Math.abs(value) ** exponent;

/** True when `hash` has BlurHash digits only and the length its first digit announces. */
export function isBlurhash(hash: string): boolean {
  if (hash.length < 6) return false;
  for (const char of hash) if (!DIGITS.includes(char)) return false;
  const flag = DIGITS.indexOf(hash[0] as string);
  if (flag > 80) return false;
  return hash.length === 4 + 2 * ((flag % 9) + 1) * (Math.floor(flag / 9) + 1);
}

/**
 * Encodes RGBA pixels (`width` x `height`, 4 bytes each) into a BlurHash with `componentsX` x `componentsY` (1..9)
 * cosine components. Small inputs (a few dozen pixels a side) are enough and keep it fast.
 */
export function encodeBlurhash(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  componentsX: number,
  componentsY: number,
): string {
  if (componentsX < 1 || componentsX > 9 || componentsY < 1 || componentsY > 9) {
    throw new Error("BlurHash components must be 1 to 9");
  }
  if (width < 1 || height < 1 || pixels.length < width * height * 4) throw new Error("not enough pixels");

  const factors: [number, number, number][] = [];
  for (let j = 0; j < componentsY; j++) {
    for (let i = 0; i < componentsX; i++) {
      const normalisation = i === 0 && j === 0 ? 1 : 2;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const basis = normalisation * Math.cos((Math.PI * i * x) / width) * Math.cos((Math.PI * j * y) / height);
          const p = 4 * (x + y * width);
          r += basis * toLinear(pixels[p] as number);
          g += basis * toLinear(pixels[p + 1] as number);
          b += basis * toLinear(pixels[p + 2] as number);
        }
      }
      const scale = 1 / (width * height);
      factors.push([r * scale, g * scale, b * scale]);
    }
  }

  const [dc, ...ac] = factors as [[number, number, number], ...[number, number, number][]];
  let hash = encode83(componentsX - 1 + (componentsY - 1) * 9, 1);
  let maximum = 1;
  if (ac.length > 0) {
    const actualMax = Math.max(...ac.map((f) => Math.max(Math.abs(f[0]), Math.abs(f[1]), Math.abs(f[2]))));
    const quantised = Math.floor(Math.max(0, Math.min(82, Math.floor(actualMax * 166 - 0.5))));
    maximum = (quantised + 1) / 166;
    hash += encode83(quantised, 1);
  } else {
    hash += encode83(0, 1);
  }
  hash += encode83((toSrgb(dc[0]) << 16) + (toSrgb(dc[1]) << 8) + toSrgb(dc[2]), 4);
  for (const f of ac) {
    const q = (v: number) => Math.floor(Math.max(0, Math.min(18, Math.floor(signPow(v / maximum, 0.5) * 9 + 9.5))));
    hash += encode83(q(f[0]) * 19 * 19 + q(f[1]) * 19 + q(f[2]), 2);
  }
  return hash;
}

/** Decodes a BlurHash into `width` x `height` RGBA pixels (alpha 255). Throws on a malformed hash. */
export function decodeBlurhash(hash: string, width: number, height: number, punch = 1): Uint8ClampedArray {
  if (!isBlurhash(hash)) throw new Error("not a BlurHash");
  const flag = decode83(hash[0] as string);
  const numY = Math.floor(flag / 9) + 1;
  const numX = (flag % 9) + 1;
  const maximum = (decode83(hash[1] as string) + 1) / 166;

  const colors: [number, number, number][] = [];
  const dc = decode83(hash.slice(2, 6));
  colors.push([toLinear(dc >> 16), toLinear((dc >> 8) & 255), toLinear(dc & 255)]);
  for (let i = 1; i < numX * numY; i++) {
    const value = decode83(hash.slice(4 + i * 2, 6 + i * 2));
    const r = Math.floor(value / (19 * 19));
    const g = Math.floor(value / 19) % 19;
    const b = value % 19;
    colors.push([
      signPow((r - 9) / 9, 2) * maximum * punch,
      signPow((g - 9) / 9, 2) * maximum * punch,
      signPow((b - 9) / 9, 2) * maximum * punch,
    ]);
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const color = colors[i + j * numX] as [number, number, number];
          r += color[0] * basis;
          g += color[1] * basis;
          b += color[2] * basis;
        }
      }
      const p = 4 * (x + y * width);
      pixels[p] = toSrgb(r);
      pixels[p + 1] = toSrgb(g);
      pixels[p + 2] = toSrgb(b);
      pixels[p + 3] = 255;
    }
  }
  return pixels;
}

/** The average colour of a BlurHash as "rgb(r g b)", for a placeholder that needs no canvas; null when malformed. */
export function blurhashAverageColor(hash: string): string | null {
  if (!isBlurhash(hash)) return null;
  const dc = decode83(hash.slice(2, 6));
  return `rgb(${dc >> 16} ${(dc >> 8) & 255} ${dc & 255})`;
}
