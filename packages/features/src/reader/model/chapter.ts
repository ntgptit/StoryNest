import type { ChapterListItem } from "../../story/index.ts";

/** One row of chapter_version_blocks as the reader query returns it. */
export interface BlockRow {
  block_id: string;
  sort_order: number;
  block_type: string;
  text_content: string | null;
  rich_text: unknown;
  image_storage_key: string | null;
}

export interface ChapterContentRow {
  id: string;
  slug: string;
  sort_order: number;
  first_published_at: string | null;
  version: { title: string; word_count: number; blocks: BlockRow[] } | null;
}

export const MARK_TYPES = ["bold", "italic", "underline", "strike"] as const;
export type MarkType = (typeof MARK_TYPES)[number];
export interface TextMark {
  type: MarkType;
  /** Half-open range [from, to) of UTF-16 code units of the block text (the editor's and the RPC's unit). */
  from: number;
  to: number;
}

export type ReaderBlock =
  | { id: string; type: "paragraph" | "heading"; text: string; marks: TextMark[] }
  | { id: string; type: "image"; storageKey: string }
  | { id: string; type: "divider" };

export interface ChapterContent {
  id: string;
  slug: string;
  number: number;
  title: string;
  wordCount: number;
  blocks: ReaderBlock[];
}

function isMarkType(value: unknown): value is MarkType {
  return typeof value === "string" && (MARK_TYPES as readonly string[]).includes(value);
}

/** rich_text is `{"marks": [...]}` (see the publish RPC). Anything malformed is dropped: the text still renders. */
export function parseMarks(richText: unknown): TextMark[] {
  if (typeof richText !== "object" || richText === null || !("marks" in richText)) return [];
  const raw = (richText as { marks: unknown }).marks;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m: unknown): TextMark[] => {
    if (typeof m !== "object" || m === null) return [];
    const { type, from, to } = m as Record<string, unknown>;
    if (!isMarkType(type) || !Number.isInteger(from) || !Number.isInteger(to)) return [];
    return [{ type, from: from as number, to: to as number }];
  });
}

function toBlock(row: BlockRow): ReaderBlock | null {
  switch (row.block_type) {
    case "paragraph":
    case "heading":
      return { id: row.block_id, type: row.block_type, text: row.text_content ?? "", marks: parseMarks(row.rich_text) };
    case "image":
      return row.image_storage_key ? { id: row.block_id, type: "image", storageKey: row.image_storage_key } : null;
    case "divider":
      return { id: row.block_id, type: "divider" };
    default:
      // A block type added by a later migration must not break reading of the rest of the chapter.
      return null;
  }
}

/** Snapshot rows (any order) as the blocks the reader draws, in reading order. Unknown block types are skipped. */
export function toReaderBlocks(rows: readonly BlockRow[]): ReaderBlock[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order).flatMap((b) => toBlock(b) ?? []);
}

export function toChapterContent(row: ChapterContentRow): ChapterContent {
  const blocks = toReaderBlocks(row.version?.blocks ?? []);
  return {
    id: row.id,
    slug: row.slug,
    number: row.sort_order,
    title: row.version?.title ?? "",
    wordCount: row.version?.word_count ?? 0,
    blocks,
  };
}

export interface TextSegment {
  text: string;
  marks: MarkType[];
}

/**
 * Cuts `text` at every mark boundary so each segment carries the marks that cover it (overlapping marks allowed).
 * Ranges are clamped to the text; empty or inverted ranges are ignored.
 */
export function splitByMarks(text: string, marks: readonly TextMark[]): TextSegment[] {
  const valid = marks.flatMap((m) => {
    const from = Math.max(0, m.from);
    const to = Math.min(text.length, m.to);
    return to > from ? [{ type: m.type, from, to }] : [];
  });
  if (valid.length === 0) return text === "" ? [] : [{ text, marks: [] }];

  const cuts = [...new Set([0, text.length, ...valid.flatMap((m) => [m.from, m.to])])].sort((a, b) => a - b);
  const segments: TextSegment[] = [];
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const start = cuts[i] ?? 0;
    const end = cuts[i + 1] ?? text.length;
    const active = MARK_TYPES.filter((type) => valid.some((m) => m.type === type && m.from <= start && m.to >= end));
    segments.push({ text: text.slice(start, end), marks: active });
  }
  return segments;
}

export interface AdjacentChapters {
  previous: ChapterListItem | null;
  next: ChapterListItem | null;
}

/** Neighbours of a chapter in reading order, by its position in the published list (gaps in numbering are fine). */
export function adjacentChapters(chapters: readonly ChapterListItem[], chapterSlug: string): AdjacentChapters {
  const index = chapters.findIndex((c) => c.slug === chapterSlug);
  if (index === -1) return { previous: null, next: null };
  return { previous: chapters[index - 1] ?? null, next: chapters[index + 1] ?? null };
}

/** Stable DOM id of a block: the anchor for deep links and, later, paragraph comments (WBS M2). */
/** `id` of the comments section at the end of the reader page: notifications about a reply link to it. */
export const COMMENTS_ANCHOR = "comments";

export function blockAnchor(blockId: string): string {
  return `b-${blockId}`;
}
