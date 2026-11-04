/** What a picked file must be, before and after the browser prepares it. The bucket enforces the same limits. */
export const AVATAR_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Picked files may be big photos: they are cropped and shrunk before upload, so this is only a sanity bound. */
export const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024;
/** Edge of the square that is uploaded. 256 px is sharp at the largest place an avatar is shown (64 px at 3x). */
export const AVATAR_SIZE = 256;

export type AvatarProblem = "type" | "tooLarge" | "unreadable";

export class AvatarError extends Error {
  readonly problem: AvatarProblem;
  constructor(problem: AvatarProblem) {
    super(`Avatar rejected: ${problem}`);
    this.name = "AvatarError";
    this.problem = problem;
  }
}

/** The picture ready to upload. `extension` goes into the storage key, `contentType` into the upload. */
export interface PreparedAvatar {
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
}

/** Largest centred square inside a width x height image. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}

/** Edge of the output: AVATAR_SIZE, never larger than the source (no upscaling). */
export function outputSide(side: number): number {
  return Math.max(1, Math.min(side, AVATAR_SIZE));
}

/** Draws the file into a square canvas and encodes it. Replaceable so tests need no canvas. */
export type AvatarRenderer = (file: Blob) => Promise<PreparedAvatar>;

export const renderInBrowser: AvatarRenderer = async (file) => {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
    const edge = outputSide(side);
    const canvas = document.createElement("canvas");
    canvas.width = edge;
    canvas.height = edge;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("No 2D canvas");
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, edge, edge);
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

/** Checks the picked file, then crops it to a square and re-encodes it. Throws AvatarError. */
export async function prepareAvatar(file: Blob, render: AvatarRenderer = renderInBrowser): Promise<PreparedAvatar> {
  if (!(AVATAR_ACCEPTED_TYPES as readonly string[]).includes(file.type)) throw new AvatarError("type");
  if (file.size > AVATAR_MAX_INPUT_BYTES) throw new AvatarError("tooLarge");
  try {
    return await render(file);
  } catch {
    throw new AvatarError("unreadable");
  }
}
