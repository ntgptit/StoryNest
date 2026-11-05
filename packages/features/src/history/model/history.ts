import { DIFF_STATUS, type DiffEntry } from "../../_shared/block-diff.ts";
import type { AppError } from "../../_shared/errors.ts";
import { historyText } from "../strings.ts";

export interface VersionRow {
  id: string;
  version_no: number;
  title: string;
  word_count: number;
  created_at: string;
  published_at: string | null;
  /** The version this one grew from (branching history); null for the first one and for versions from before it. */
  parent_version_id?: string | null;
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
  /**
   * The version this one was published from. Versions from before the branching history have no stored parent and
   * are read as a straight line (the previous number); the first version has none.
   */
  parentId: string | null;
}

export function toChapterVersions(rows: readonly VersionRow[], liveVersionId: string | null): ChapterVersion[] {
  const byNumber = new Map(rows.map((row) => [row.version_no, row.id]));
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
        parentId: row.parent_version_id ?? byNumber.get(row.version_no - 1) ?? null,
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

/** A stretch of the comparison: unchanged blocks in a row, or a change (one or more changed blocks in a row). */
export type DiffSegment =
  | { kind: "same"; key: string; entries: DiffEntry[] }
  | { kind: "change"; key: string; entries: DiffEntry[]; /** 0-based number of the change. */ index: number };

const entryKey = (entry: DiffEntry) => `${entry.status}-${entry.block.id}`;

/**
 * The diffBlocks result cut into runs: "same" runs can fold away ("differences only") and "change" runs are what
 * previous / next change steps through. The entries keep their order, so laying the runs end to end gives the diff.
 */
export function groupDiff(entries: readonly DiffEntry[]): DiffSegment[] {
  const segments: DiffSegment[] = [];
  let changes = 0;
  for (const entry of entries) {
    const kind = entry.status === DIFF_STATUS.SAME ? "same" : "change";
    const last = segments.at(-1);
    if (last?.kind === kind) {
      last.entries.push(entry);
    } else if (kind === "same") {
      segments.push({ kind, key: entryKey(entry), entries: [entry] });
    } else {
      segments.push({ kind, key: entryKey(entry), entries: [entry], index: changes });
      changes += 1;
    }
  }
  return segments;
}

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
