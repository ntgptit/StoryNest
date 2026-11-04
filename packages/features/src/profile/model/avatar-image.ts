import {
  IMAGE_ACCEPTED_TYPES,
  IMAGE_MAX_INPUT_BYTES,
  ImageError,
  cropBox,
  createBrowserRenderer,
  outputSize,
  prepareImage,
  type ImageRenderer,
  type PreparedImage,
} from "../../_shared/image-prepare.ts";

/** What a picked file must be, before and after the browser prepares it. The bucket enforces the same limits. */
export const AVATAR_ACCEPTED_TYPES = IMAGE_ACCEPTED_TYPES;
export const AVATAR_MAX_INPUT_BYTES = IMAGE_MAX_INPUT_BYTES;
/** Edge of the square that is uploaded. 256 px is sharp at the largest place an avatar is shown (64 px at 3x). */
export const AVATAR_SIZE = 256;

export { ImageError as AvatarError };
export type PreparedAvatar = PreparedImage;
export type AvatarRenderer = ImageRenderer;

/** Largest centred square inside a width x height image. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const { sx, sy, sw } = cropBox(width, height, 1);
  return { sx, sy, side: sw };
}

/** Edge of the output: AVATAR_SIZE, never larger than the source (no upscaling). */
export function outputSide(side: number): number {
  return outputSize(side, side, AVATAR_SIZE).width;
}

export const renderInBrowser: AvatarRenderer = createBrowserRenderer({ aspect: 1, maxWidth: AVATAR_SIZE });

/** Checks the picked file, then crops it to a square and re-encodes it. Throws AvatarError. */
export function prepareAvatar(file: Blob, render: AvatarRenderer = renderInBrowser): Promise<PreparedAvatar> {
  return prepareImage(file, render);
}
