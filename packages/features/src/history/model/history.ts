import { chapterBodySchema, type ChapterBlock, type ChapterBody, type Mark } from "@storynest/validation";
import type { ReaderBlock, TextMark } from "../../reader/index.ts";
import type { AppError } from "../../_shared/errors.ts";
import { historyText } from "../strings.ts";

export interface VersionRow {
  id: string;
  version_no: number;
  title: string;
  word_count: number;
  created_at: string;
  published_at: string | null;
  author: { username: string; display_name: string } | { username: string; display_name: string }[] | null;
}

export interface ChapterVersion {
  id: string;
  number: number;
  title: string;
  wordCount: number;
  createdAt: string;
  publishedAt: string | null;
  authorName: string;
  /** True for the version readers see right now. */
  live: boolean;
}

export function toChapterVersions(rows: readonly VersionRow[], liveVersionId: string | null): ChapterVersion[] {
  return rows
    .map((row) => {
      const author = Array.isArray(row.author) ? row.author[0] : row.author;
      const name = author ? (author.display_name.trim() === "" ? author.username : author.display_name) : "";
      return {
        id: row.id,
        number: row.version_no,
        title: row.title,
        wordCount: row.word_count,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        authorName: name,
        live: row.id === liveVersionId,
      };
    })
    .sort((a, b) => b.number - a.number);
}

// ---- draft body <-> reader blocks -------------------------------------------------------------------------------

/** The draft body as the blocks the reader draws, so a preview and a comparison use the reader's own rendering. */
export function bodyToReaderBlocks(body: readonly ChapterBlock[]): ReaderBlock[] {
  return body.map((block): ReaderBlock => {
    switch (block.type) {
      case "paragraph":
      case "heading":
        return { id: block.block_id, type: block.type, text: block.text, marks: block.marks ?? [] };
      case "image":
        return { id: block.block_id, type: "image", storageKey: block.image_storage_key };
      case "divider":
        return { id: block.block_id, type: "divider" };
    }
  });
}

/**
 * Reader blocks back into a draft body, keeping every block id (comments and reading progress hang on them). Null when
 * the result is not a body the editor and the publish RPC accept (for instance a version without any block).
 */
export function readerBlocksToBody(blocks: readonly ReaderBlock[]): ChapterBody | null {
  const body = blocks.map((block): ChapterBlock => {
    switch (block.type) {
      case "paragraph":
      case "heading": {
        const marks: Mark[] = block.marks.map((mark) => ({ type: mark.type, from: mark.from, to: mark.to }));
        return marks.length > 0
          ? { block_id: block.id, type: block.type, text: block.text, marks }
          : { block_id: block.id, type: block.type, text: block.text };
      }
      case "image":
        return { block_id: block.id, type: "image", image_storage_key: block.storageKey };
      case "divider":
        return { block_id: block.id, type: "divider" };
    }
  });
  const parsed = chapterBodySchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

// ---- comparison -------------------------------------------------------------------------------------------------

export const DIFF_STATUS = { SAME: "same", ADDED: "added", REMOVED: "removed", CHANGED: "changed" } as const;
export type DiffStatus = (typeof DIFF_STATUS)[keyof typeof DIFF_STATUS];

export interface DiffEntry {
  status: DiffStatus;
  /** The block to show: the new one, or the old one for a removed block. */
  block: ReaderBlock;
  /** For a changed block: what it was before. */
  previous?: ReaderBlock;
}

const sameMarks = (a: readonly TextMark[], b: readonly TextMark[]) =>
  a.length === b.length &&
  a.every((mark, i) => mark.type === b[i]?.type && mark.from === b[i]?.from && mark.to === b[i]?.to);

export function sameBlock(a: ReaderBlock, b: ReaderBlock): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "image" && b.type === "image") return a.storageKey === b.storageKey;
  if ((a.type === "paragraph" || a.type === "heading") && (b.type === "paragraph" || b.type === "heading")) {
    return a.text === b.text && sameMarks(a.marks, b.marks);
  }
  return true; // dividers
}

/**
 * What `after` has that `before` does not. Blocks are matched by their permanent id, so editing a paragraph is
 * "changed", not "removed and added". A block that was removed is listed where it used to be (right after the block
 * that preceded it). A pure move is not reported: the list follows the order of `after`.
 */
export function diffBlocks(before: readonly ReaderBlock[], after: readonly ReaderBlock[]): DiffEntry[] {
  const beforeById = new Map(before.map((block) => [block.id, block]));
  const afterIds = new Set(after.map((block) => block.id));

  const entries: DiffEntry[] = after.map((block) => {
    const previous = beforeById.get(block.id);
    if (!previous) return { status: DIFF_STATUS.ADDED, block };
    return sameBlock(previous, block)
      ? { status: DIFF_STATUS.SAME, block }
      : { status: DIFF_STATUS.CHANGED, block, previous };
  });

  let anchor = -1;
  for (const block of before) {
    if (afterIds.has(block.id)) {
      anchor = entries.findIndex((entry) => entry.status !== DIFF_STATUS.REMOVED && entry.block.id === block.id);
      continue;
    }
    anchor += 1;
    entries.splice(anchor, 0, { status: DIFF_STATUS.REMOVED, block });
  }
  return entries;
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
}

export function summarizeDiff(entries: readonly DiffEntry[]): DiffSummary {
  const count = (status: DiffStatus) => entries.filter((entry) => entry.status === status).length;
  return { added: count(DIFF_STATUS.ADDED), removed: count(DIFF_STATUS.REMOVED), changed: count(DIFF_STATUS.CHANGED) };
}

export const hasDifferences = (summary: DiffSummary) => summary.added + summary.removed + summary.changed > 0;

/** Text for a failed history action. */
export function historyErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "conflict":
      return historyText.errors.conflict;
    case "forbidden":
      return historyText.errors.forbidden;
    case "notFound":
      return historyText.errors.notFound;
    case "invalid":
      return historyText.errors.invalid;
    case "network":
      return historyText.errors.network;
    default:
      return historyText.errors.generic;
  }
}
