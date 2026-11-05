// Inputs of the batch 4 "authoring4" features (migrations 20261106040000..040600): story parts, the weekly update
// schedule, the cover BlurHash, chapter review sign-off, version restore and the draft edit lock. Each rule mirrors a
// CHECK, a varchar length or an RPC check of those migrations; validation.test.ts keeps the lengths in sync.
import { z } from "zod";
import { DB_LIMITS } from "./limits.ts";

const uuid = z.uuid();
const revision = z.int().positive();

// ---- story parts (Lucian 102) -------------------------------------------------------------------------------------

/** The database refuses the part after this many in one story (trigger story_parts_limit, PT409). */
export const STORY_PARTS_MAX = 100;

export const PART_ERROR = { titleRequired: "part_title_required", titleTooLong: "part_title_too_long" } as const;

export const storyPartTitleSchema = z
  .string()
  .trim()
  .min(1, { message: PART_ERROR.titleRequired })
  .max(DB_LIMITS.storyPartTitle, { message: PART_ERROR.titleTooLong });

/** Insert payload for story_parts (id is client-generated, like chapters). */
export const storyPartCreateSchema = z.strictObject({
  id: uuid.optional(),
  story_id: uuid,
  title: storyPartTitleSchema,
});
export type StoryPartCreate = z.output<typeof storyPartCreateSchema>;

// ---- weekly update schedule (Lucian 109) -----------------------------------------------------------------------------

/** ISO weekdays, Monday first. Bit `i` of stories.update_days is WEEKDAYS[i]. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
/** All seven bits set: the CHECK chk_story_update_days allows 0..127. */
export const UPDATE_DAYS_MAX = 127;

export const updateDaysSchema = z.int().min(0).max(UPDATE_DAYS_MAX);

export function updateDaysToList(mask: number): Weekday[] {
  return WEEKDAYS.filter((_, index) => (mask & (1 << index)) !== 0);
}

export function listToUpdateDays(days: Iterable<Weekday>): number {
  let mask = 0;
  for (const day of days) {
    const index = WEEKDAYS.indexOf(day);
    if (index >= 0) mask |= 1 << index;
  }
  return mask;
}

// ---- cover BlurHash (Lucian 258) ---------------------------------------------------------------------------------------

/** Base-83 digits of BlurHash, in value order (https://github.com/woltapp/blurhash/blob/master/Algorithm.md). */
export const BLURHASH_DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
/** The CHECK chk_story_cover_blurhash allows 6..100 characters. */
export const BLURHASH_MAX_LENGTH = 100;

/** Same rule as chk_story_cover_blurhash: base-83 only, and exactly as long as its size flag says (4 + 2 x nx x ny). */
export function isBlurhashFormat(hash: string): boolean {
  if (hash.length < 6 || hash.length > BLURHASH_MAX_LENGTH) return false;
  for (const char of hash) if (!BLURHASH_DIGITS.includes(char)) return false;
  const flag = BLURHASH_DIGITS.indexOf(hash[0] as string);
  if (flag < 0 || flag > 80) return false;
  return hash.length === 4 + 2 * ((flag % 9) + 1) * (Math.floor(flag / 9) + 1);
}

export const blurhashSchema = z.string().refine(isBlurhashFormat, { message: "blurhash_invalid" });

// ---- review sign-off (Lucian 180) --------------------------------------------------------------------------------------

export const requestChapterReviewArgsSchema = z.object({
  p_chapter_id: uuid,
  p_expected_revision: revision,
  p_note: z.string().trim().max(DB_LIMITS.reviewNote).optional(),
});
export const decideChapterReviewArgsSchema = z.object({
  p_chapter_id: uuid,
  p_approve: z.boolean(),
  p_note: z.string().trim().max(DB_LIMITS.reviewNote).optional(),
});
export type RequestChapterReviewArgs = z.infer<typeof requestChapterReviewArgsSchema>;
export type DecideChapterReviewArgs = z.infer<typeof decideChapterReviewArgsSchema>;

// ---- restore a version (Lucian 177) and the edit lock (Lucian 196) -------------------------------------------------------

export const restoreChapterVersionArgsSchema = z.object({ p_version_id: uuid, p_expected_revision: revision });
export type RestoreChapterVersionArgs = z.infer<typeof restoreChapterVersionArgsSchema>;

/** How long a lock lasts without a heartbeat (the RPCs' interval '90 seconds'). */
export const EDIT_LOCK_TTL_SECONDS = 90;
