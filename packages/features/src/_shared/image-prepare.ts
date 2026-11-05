/** Browser-side preparation of a picked picture: check it, crop it to a fixed shape, shrink it, re-encode it. */

export const IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Picked files may be big photos: they are cropped and shrunk before upload, so this is only a sanity bound. */
export const IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024;

export interface ImageSpec {
  /** Width / height of the result (1 = square, 2/3 = a cover); null keeps the picture's own shape (shrink only). */
  aspect: number | null;
  /** Width of the result; smaller pictures are never enlarged. */
  maxWidth: number;
}

export type ImageProblem = "type" | "tooLarge" | "unreadable";

export class ImageError extends Error {
  readonly problem: ImageProblem;
  constructor(problem: ImageProblem) {
    super(`Image rejected: ${problem}`);
    this.name = "ImageError";
    this.problem = problem;
  }
}

/** The picture ready to upload. `extension` goes into the storage key, `contentType` into the upload. */
export interface PreparedImage {
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
}

/**
 * A rectangle of the source picture chosen in the crop editor, in source pixels (fractions allowed). Same shape as the
 * `CropArea` that ImageCropDialog emits.
 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Guards `floor` against float noise (a computed 399.9999999 must count as 400). */
const EPS = 1e-6;

/**
 * The integer rectangle of the given aspect to draw from a width x height image.
 *  - Without `crop`: the largest centred rectangle (what every upload did before the crop editor).
 *  - With `crop` (from the editor): the same rule applied to the chosen rectangle. Its size is rounded on the side
 *    that limits the picture and the other side is derived from the aspect exactly like the centred case, then it is
 *    positioned around the chosen centre and kept inside the picture. So the editor's untouched starting view gives
 *    exactly the centred result, and an avatar always stays a perfect square.
 */
export function cropBox(
  width: number,
  height: number,
  aspect: number,
  crop?: CropRect,
): { sx: number; sy: number; sw: number; sh: number } {
  const wide = width / height > aspect;
  if (crop === undefined) {
    const sw = wide ? Math.floor(height * aspect) : width;
    const sh = wide ? height : Math.floor(width / aspect);
    return { sx: Math.floor((width - sw) / 2), sy: Math.floor((height - sh) / 2), sw, sh };
  }
  const clampInt = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  let sw: number;
  let sh: number;
  if (wide) {
    sh = clampInt(Math.round(crop.height), 1, height);
    sw = clampInt(Math.floor(sh * aspect), 1, width);
  } else {
    sw = clampInt(Math.round(crop.width), 1, width);
    sh = clampInt(Math.floor(sw / aspect), 1, height);
  }
  const cx = crop.x + crop.width / 2;
  const cy = crop.y + crop.height / 2;
  return {
    sx: clampInt(Math.floor(cx - sw / 2 + EPS), 0, width - sw),
    sy: clampInt(Math.floor(cy - sh / 2 + EPS), 0, height - sh),
    sw,
    sh,
  };
}

/** What an upload mutation receives: the picked file and, after the crop editor, the rectangle to keep. */
export interface ImageUpload {
  file: File;
  crop?: CropRect;
}

/** Size of the result for a crop of sw x sh: at most `maxWidth` wide, same aspect, never enlarged. */
export function outputSize(sw: number, sh: number, maxWidth: number): { width: number; height: number } {
  const width = Math.max(1, Math.min(sw, maxWidth));
  return { width, height: Math.max(1, Math.round((width * sh) / sw)) };
}

/**
 * Draws the file into a canvas of the right shape and encodes it. Replaceable so tests need no canvas. `crop` is the
 * rectangle chosen in the crop editor; without it the centre is kept. Ignored when the spec keeps the picture's shape.
 */
export type ImageRenderer = (file: Blob, crop?: CropRect) => Promise<PreparedImage>;

export function createBrowserRenderer(spec: ImageSpec): ImageRenderer {
  return async (file, crop) => {
    const bitmap = await createImageBitmap(file);
    try {
      const { sx, sy, sw, sh } =
        spec.aspect === null
          ? { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height }
          : cropBox(bitmap.width, bitmap.height, spec.aspect, crop);
      const { width, height } = outputSize(sw, sh, spec.maxWidth);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context === null) throw new Error("No 2D canvas");
      context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
      const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
      const webp = await encode("image/webp");
      if (webp !== null && webp.type === "image/webp")
        return { blob: webp, contentType: "image/webp", extension: "webp" };
      const jpeg = await encode("image/jpeg"); // browsers that cannot encode WebP fall back to JPEG
      if (jpeg === null) throw new Error("Could not encode the image");
      return { blob: jpeg, contentType: "image/jpeg", extension: "jpg" };
    } finally {
      bitmap.close();
    }
  };
}

/** What is wrong with a picked file before it is even decoded (type, size), or null. */
export function checkImageFile(file: Blob): Exclude<ImageProblem, "unreadable"> | null {
  if (!(IMAGE_ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > IMAGE_MAX_INPUT_BYTES) return "tooLarge";
  return null;
}

/** Checks the picked file, then hands it (and the chosen crop, if any) to the renderer. Throws ImageError. */
export async function prepareImage(file: Blob, render: ImageRenderer, crop?: CropRect): Promise<PreparedImage> {
  const problem = checkImageFile(file);
  if (problem !== null) throw new ImageError(problem);
  try {
    return await (crop === undefined ? render(file) : render(file, crop));
  } catch {
    throw new ImageError("unreadable");
  }
}
