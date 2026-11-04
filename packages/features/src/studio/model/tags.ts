import { slugify } from "@storynest/utils";
import type { AppError } from "../../_shared/errors.ts";
import { studioText } from "../strings.ts";

// Limits of the tag editor. The database (set_story_tags, migration 20261104001400_tags) is the authority and refuses
// anything beyond them; the editor only keeps the author from finding out at save time.
export const MAX_STORY_TAGS = 10;
export const TAG_NAME_MAX_LENGTH = 40;
/** A tag name has to hold at least this many letters or digits, or its slug would be too short to mean anything. */
export const TAG_SLUG_MIN_LENGTH = 2;
/** The most popular tags offered as one-click suggestions. */
export const TAG_SUGGESTION_COUNT = 8;

/** A tag as the editor holds it: the slug is what makes two spellings the same tag, the name is what is shown. */
export interface TagChip {
  slug: string;
  name: string;
}

export type TagProblem = "invalid" | "tooMany";

/** Same cleaning the database does: trimmed, inner whitespace collapsed to single spaces. */
export function cleanTagName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** "Lãng mạn" and "lang  man!" give the same slug. Not cut off: an overlong slug must stay overlong so it is refused. */
export function tagSlug(name: string): string {
  return slugify(name, { maxLength: Number.MAX_SAFE_INTEGER });
}

/** What the author typed or pasted as separate tag names: split at commas, semicolons and line breaks. */
export function splitTagInput(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map(cleanTagName)
    .filter((piece) => piece !== "");
}

export function isValidTag(name: string): boolean {
  const slug = tagSlug(name);
  return name.length <= TAG_NAME_MAX_LENGTH && slug.length >= TAG_SLUG_MIN_LENGTH;
}

/**
 * Adds what was typed to the tags already chosen. A tag whose slug is already there is quietly ignored (it is the same
 * tag), an invalid one is skipped and reported, and nothing beyond the per-story maximum is taken. The rest is still added.
 */
export function addTags(current: readonly TagChip[], raw: string): { tags: TagChip[]; problem: TagProblem | null } {
  const tags = [...current];
  let problem: TagProblem | null = null;
  for (const name of splitTagInput(raw)) {
    if (!isValidTag(name)) {
      problem = "invalid";
      continue;
    }
    const slug = tagSlug(name);
    if (tags.some((tag) => tag.slug === slug)) continue;
    if (tags.length >= MAX_STORY_TAGS) {
      problem = "tooMany";
      break;
    }
    tags.push({ slug, name });
  }
  return { tags, problem };
}

export function removeTag(current: readonly TagChip[], slug: string): TagChip[] {
  return current.filter((tag) => tag.slug !== slug);
}

/** Do two lists hold the same tags, whatever their order? (Order is not stored, so it is not a change.) */
export function sameTags(a: readonly TagChip[], b: readonly TagChip[]): boolean {
  if (a.length !== b.length) return false;
  const slugs = new Set(a.map((tag) => tag.slug));
  return b.every((tag) => slugs.has(tag.slug));
}

/** Text for a failed tag save: the creation quota (conflict) and bad names (invalid) are told apart. */
export function tagsErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "conflict":
      return studioText.tags.errors.quota;
    case "invalid":
      return studioText.tags.errors.invalid;
    case "forbidden":
      return studioText.tags.errors.forbidden;
    case "network":
      return studioText.errors.network;
    default:
      return studioText.tags.errors.generic;
  }
}
