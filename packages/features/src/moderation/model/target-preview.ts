import type { ReportTarget } from "./report.ts";

/** What a moderator may re-read about a reported thing, even when it was removed or hidden. */
export type TargetPreview =
  | {
      kind: "story";
      title: string;
      synopsis: string;
      status: string;
      deleted: boolean;
      owner: string;
      chapters: PreviewChapter[];
    }
  | { kind: "chapter"; title: string; storyTitle: string; status: string; deleted: boolean; blocks: string[] }
  | { kind: "comment"; body: string; status: string; deleted: boolean; author: string }
  | { kind: "user"; username: string; displayName: string; bio: string; accountStatus: string };

export interface PreviewChapter {
  position: number;
  title: string;
  status: string;
  deleted: boolean;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const flag = (value: unknown): boolean => value === true;
const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** Reads the `moderation_preview` answer defensively: a field this version does not know is simply ignored. */
export function toTargetPreview(kind: ReportTarget, value: unknown): TargetPreview | null {
  const row = record(value);
  if (kind === "story") {
    const chapters = Array.isArray(row.chapters) ? row.chapters.map(record) : [];
    return {
      kind,
      title: text(row.title),
      synopsis: text(row.synopsis),
      status: text(row.status),
      deleted: row.deleted_at != null,
      owner: text(row.owner),
      chapters: chapters.map((chapter) => ({
        position: Number(chapter.position) || 0,
        title: text(chapter.title),
        status: text(chapter.status),
        deleted: flag(chapter.deleted),
      })),
    };
  }
  if (kind === "chapter") {
    const blocks = Array.isArray(row.blocks) ? row.blocks.filter((b): b is string => typeof b === "string") : [];
    return {
      kind,
      title: text(row.title),
      storyTitle: text(row.story_title),
      status: text(row.status),
      deleted: flag(row.deleted),
      blocks,
    };
  }
  if (kind === "comment") {
    return {
      kind,
      body: text(row.body),
      status: text(row.status),
      deleted: flag(row.deleted),
      author: text(row.author),
    };
  }
  if (kind === "user") {
    return {
      kind,
      username: text(row.username),
      displayName: text(row.display_name),
      bio: text(row.bio),
      accountStatus: text(row.account_status),
    };
  }
  return null;
}
