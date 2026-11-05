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

// Body <-> reader blocks and the block diff moved to _shared/block-diff.ts; re-exported so history's API is unchanged.
export {
  bodyToReaderBlocks,
  readerBlocksToBody,
  DIFF_STATUS,
  sameBlock,
  diffBlocks,
  summarizeDiff,
  hasDifferences,
  type DiffStatus,
  type DiffEntry,
  type DiffSummary,
} from "../../_shared/block-diff.ts";

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
