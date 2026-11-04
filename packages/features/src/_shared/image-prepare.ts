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

/** Largest centred rectangle of the given aspect inside a width x height image. */
export function cropBox(
  width: number,
  height: number,
  aspect: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const wide = width / height > aspect;
  const sw = wide ? Math.floor(height * aspect) : width;
  const sh = wide ? height : Math.floor(width / aspect);
  return { sx: Math.floor((width - sw) / 2), sy: Math.floor((height - sh) / 2), sw, sh };
}

/** Size of the result for a crop of sw x sh: at most `maxWidth` wide, same aspect, never enlarged. */
export function outputSize(sw: number, sh: number, maxWidth: number): { width: number; height: number } {
  const width = Math.max(1, Math.min(sw, maxWidth));
  return { width, height: Math.max(1, Math.round((width * sh) / sw)) };
}

/** Draws the file into a canvas of the right shape and encodes it. Replaceable so tests need no canvas. */
export type ImageRenderer = (file: Blob) => Promise<PreparedImage>;

export function createBrowserRenderer(spec: ImageSpec): ImageRenderer {
  return async (file) => {
    const bitmap = await createImageBitmap(file);
    try {
      const { sx, sy, sw, sh } =
        spec.aspect === null
          ? { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height }
          : cropBox(bitmap.width, bitmap.height, spec.aspect);
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

/** Checks the picked file, then hands it to the renderer. Throws ImageError. */
export async function prepareImage(file: Blob, render: ImageRenderer): Promise<PreparedImage> {
  if (!(IMAGE_ACCEPTED_TYPES as readonly string[]).includes(file.type)) throw new ImageError("type");
  if (file.size > IMAGE_MAX_INPUT_BYTES) throw new ImageError("tooLarge");
  try {
    return await render(file);
  } catch {
    throw new ImageError("unreadable");
  }
}
