// Contract for chapter_drafts.body (jsonb array in reading order), consumed by the publish RPC.
// The RPC (private.validate_chapter_body) is the authority; this schema is deliberately STRICTER so the
// editor can fail early: `type` is required, unknown keys are rejected, ids must be uuids, limits apply.
import { z } from "zod";
import { APP_LIMITS } from "./limits.ts";

/** Inline formatting over a half-open [from, to) range of UTF-16 code units of the block text. */
export const MARK_TYPES = ["bold", "italic", "underline", "strike"] as const;
export const markSchema = z
  .strictObject({
    type: z.enum(MARK_TYPES),
    from: z.int().nonnegative(),
    to: z.int().positive(),
  })
  .refine((m) => m.to > m.from, { message: "mark must cover at least one character", path: ["to"] });

const blockId = z.uuid();
const marks = z.array(markSchema).optional();

function marksWithinText(block: { text: string; marks?: { to: number }[] | undefined }, ctx: z.RefinementCtx) {
  block.marks?.forEach((m, i) => {
    if (m.to > block.text.length) {
      ctx.addIssue({ code: "custom", message: "mark exceeds text length", path: ["marks", i, "to"] });
    }
  });
}

const text = z.string().max(APP_LIMITS.blockTextLength);

export const paragraphBlockSchema = z
  .strictObject({ block_id: blockId, type: z.literal("paragraph"), text, marks })
  .superRefine(marksWithinText);
export const headingBlockSchema = z
  .strictObject({ block_id: blockId, type: z.literal("heading"), text, marks })
  .superRefine(marksWithinText);
export const imageBlockSchema = z.strictObject({
  block_id: blockId,
  type: z.literal("image"),
  image_storage_key: z.string().trim().min(1).max(APP_LIMITS.storageKey),
});
export const dividerBlockSchema = z.strictObject({ block_id: blockId, type: z.literal("divider") });

export const chapterBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  imageBlockSchema,
  dividerBlockSchema,
]);

export const chapterBodySchema = z
  .array(chapterBlockSchema)
  .min(1, "a chapter needs at least one block")
  .max(APP_LIMITS.blocksPerChapter)
  .superRefine((blocks, ctx) => {
    const seen = new Set<string>();
    blocks.forEach((b, i) => {
      if (seen.has(b.block_id)) {
        ctx.addIssue({ code: "custom", message: "duplicate block_id", path: [i, "block_id"] });
      }
      seen.add(b.block_id);
    });
  });

export type Mark = z.infer<typeof markSchema>;
export type ChapterBlock = z.infer<typeof chapterBlockSchema>;
export type ChapterBody = z.infer<typeof chapterBodySchema>;

/** Same counting rule as the RPC: whitespace-separated words of paragraph and heading text. */
export function countWords(body: readonly ChapterBlock[]): number {
  let words = 0;
  for (const block of body) {
    if (block.type !== "paragraph" && block.type !== "heading") continue;
    const trimmed = block.text.trim();
    if (trimmed !== "") words += trimmed.split(/\s+/).length;
  }
  return words;
}
