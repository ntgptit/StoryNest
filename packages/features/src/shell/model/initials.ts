/** Up to two uppercase initials for an avatar fallback: "Nguyễn Văn An" -> "NA", "reader@x.io" -> "R". */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) return "?";
  const first = Array.from(words[0] ?? "")[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1] ?? "")[0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase();
}
