/**
 * Turns free text (including Vietnamese) into a URL slug accepted by the DB and by validation's slugSchema:
 * lowercase ascii letters and digits joined by single hyphens, e.g. "Đừng Bỏ Cuộc!" -> "dung-bo-cuoc".
 * Returns `fallback` (default "") when nothing usable remains, so callers choose how to handle it.
 */
export function slugify(input: string, options: { maxLength?: number; fallback?: string } = {}): string {
  const { maxLength = 120, fallback = "" } = options;
  const slug = input
    .normalize("NFD")
    .replace(/\p{M}+/gu, "") // strip combining marks (Vietnamese tones, circumflex, horn...)
    .replace(/đ/g, "d") // hardcode-check-ignore: diacritics are the point of slugify
    .replace(/Đ/g, "D") // hardcode-check-ignore: diacritics are the point of slugify
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug === "" ? fallback : slug;
}
