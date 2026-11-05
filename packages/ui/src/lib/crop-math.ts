/* Lucian UX/UI Prompt #069 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#069 */ // token-check-ignore: element number in the required license line, not a colour
/**
 * Pure maths of the image crop editor (ImageCropDialog). Everything is in SOURCE-IMAGE pixels, so it does not depend
 * on how big the frame is drawn: a view is a zoom level and the centre of the crop in the picture.
 *
 *  - At zoom 1 the crop is the largest box of the frame's aspect that fits in the picture (the centred crop the
 *    upload pipeline used before the editor existed); zooming in by z makes it z times smaller.
 *  - A view is always clamped so the crop stays inside the picture: the frame never shows an empty area.
 */

/** The picture and the shape of the frame (width / height: 1 = square, 2/3 = a cover). */
export interface CropImage {
  width: number;
  height: number;
  aspect: number;
}

/** What the editor shows: `zoom` ≥ 1 and the centre of the crop (cx, cy) in source pixels. */
export interface CropView {
  zoom: number;
  cx: number;
  cy: number;
}

/** The chosen rectangle in source pixels (not rounded; the encoder rounds it). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CROP_MIN_ZOOM = 1;
export const CROP_DEFAULT_MAX_ZOOM = 3;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Size of the crop at zoom 1: the largest box of the aspect inside the picture (exact on the limiting side). */
export function baseCropSize({ width, height, aspect }: CropImage): { width: number; height: number } {
  return width / height > aspect ? { width: height * aspect, height } : { width, height: width / aspect };
}

/** The starting view: no zoom, centred, i.e. today's centre crop. */
export function initialCropView(image: CropImage): CropView {
  return { zoom: CROP_MIN_ZOOM, cx: image.width / 2, cy: image.height / 2 };
}

/** Keeps the zoom in [1, maxZoom] and the crop inside the picture. */
export function clampCropView(view: CropView, image: CropImage, maxZoom = CROP_DEFAULT_MAX_ZOOM): CropView {
  const zoom = clamp(view.zoom, CROP_MIN_ZOOM, Math.max(CROP_MIN_ZOOM, maxZoom));
  const base = baseCropSize(image);
  const halfW = base.width / zoom / 2;
  const halfH = base.height / zoom / 2;
  return {
    zoom,
    cx: clamp(view.cx, halfW, image.width - halfW),
    cy: clamp(view.cy, halfH, image.height - halfH),
  };
}

/** The rectangle of the picture that a view keeps. */
export function cropAreaOf(view: CropView, image: CropImage): CropArea {
  const base = baseCropSize(image);
  const width = base.width / view.zoom;
  const height = base.height / view.zoom;
  return { x: view.cx - width / 2, y: view.cy - height / 2, width, height };
}

/** Maps a point of the frame (fx, fy as fractions 0..1 of its width and height) to source pixels. */
export function frameToSource(view: CropView, image: CropImage, fx: number, fy: number): { x: number; y: number } {
  const area = cropAreaOf(view, image);
  return { x: area.x + fx * area.width, y: area.y + fy * area.height };
}

/**
 * Moves the PICTURE by (dx, dy) frame fractions (dragging right by a quarter of the frame = dx 0.25): the crop moves
 * the other way. Clamped.
 */
export function panCropView(
  view: CropView,
  image: CropImage,
  dx: number,
  dy: number,
  maxZoom = CROP_DEFAULT_MAX_ZOOM,
): CropView {
  const area = cropAreaOf(view, image);
  return clampCropView({ ...view, cx: view.cx - dx * area.width, cy: view.cy - dy * area.height }, image, maxZoom);
}

/**
 * Sets the zoom while the picture point under frame fraction (fx, fy) stays where it is (the pointer for wheel and
 * pinch, the centre for the slider and the keyboard). Clamped, so near an edge the point may shift a little.
 */
export function zoomCropView(
  view: CropView,
  image: CropImage,
  zoom: number,
  fx = 0.5,
  fy = 0.5,
  maxZoom = CROP_DEFAULT_MAX_ZOOM,
): CropView {
  const anchor = frameToSource(view, image, fx, fy);
  const z = clamp(zoom, CROP_MIN_ZOOM, Math.max(CROP_MIN_ZOOM, maxZoom));
  const base = baseCropSize(image);
  const width = base.width / z;
  const height = base.height / z;
  const x = anchor.x - fx * width;
  const y = anchor.y - fy * height;
  return clampCropView({ zoom: z, cx: x + width / 2, cy: y + height / 2 }, image, maxZoom);
}

/**
 * Where to draw the picture inside the frame, in percent: `width` of the frame's width, `x`/`y` as a translate of
 * the picture's own size. Frame-size independent, so the frame can be responsive.
 */
export function cropImageLayout(view: CropView, image: CropImage): { width: number; x: number; y: number } {
  const area = cropAreaOf(view, image);
  return {
    width: (image.width / area.width) * 100,
    x: (-area.x / image.width) * 100,
    y: (-area.y / image.height) * 100,
  };
}
