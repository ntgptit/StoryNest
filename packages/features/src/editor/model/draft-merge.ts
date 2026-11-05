/* Lucian UX/UI Prompt #149 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#149 */ // token-check-ignore: element number in the required license line, not a colour
// Block-by-block merge of the author's unsaved text ("mine": the copy kept on this device) with the draft the server
// has now ("server"). The comparison is the version history's own (diffBlocks, blocks matched by their permanent id),
// so a paragraph edited on both sides is one choice, not a removal plus an addition. The result is a body the editor
// loads as an ordinary edit; saving it still goes through the revision check like any other save.
import type { ChapterBlock, ChapterBody } from "@storynest/validation";
import { bodyToReaderBlocks, diffBlocks, DIFF_STATUS } from "../../history/index.ts";

export type MergeSide = "mine" | "server";

/** One block where the two versions disagree. A missing side means "this block is not in that version". */
export interface MergeConflict {
  /** The block id: stable, so it also keys the author's choice. */
  id: string;
  mine: ChapterBlock | null;
  server: ChapterBlock | null;
  /** Both sides hold the same text and only the bold/italic/... ranges differ. */
  formattingOnly: boolean;
}

/** The title is merged like a block: one choice when the two titles differ. */
export interface MergeTitle {
  mine: string;
  server: string;
}

export interface MergePlan {
  /** Every block of both versions in reading order, each either agreed on or a conflict to decide. */
  entries: ({ kind: "same"; block: ChapterBlock } | { kind: "conflict"; conflict: MergeConflict })[];
  conflicts: MergeConflict[];
  /** null when both titles are the same. */
  title: MergeTitle | null;
  /** The title both agree on (the server's when they differ, until a side is picked). */
  serverTitle: string;
}

export type MergeChoices = Readonly<Record<string, MergeSide | undefined>>;

/** Choice key of the title (block ids are uuids, so this cannot collide). */
export const TITLE_CHOICE = "title";

const textOf = (block: ChapterBlock) =>
  block.type === "paragraph" || block.type === "heading" ? `${block.type}:${block.text}` : null;

/**
 * What differs between `mine` and `server`, in the order of my version (a block only the server has is listed where
 * it stands on the server, right after the block before it).
 */
export function planMerge(
  mine: { title: string; body: readonly ChapterBlock[] },
  server: { title: string; body: readonly ChapterBlock[] },
): MergePlan {
  const mineById = new Map(mine.body.map((block) => [block.block_id, block]));
  const serverById = new Map(server.body.map((block) => [block.block_id, block]));
  const entries: MergePlan["entries"] = diffBlocks(bodyToReaderBlocks(server.body), bodyToReaderBlocks(mine.body)).map(
    (entry) => {
      const id = entry.block.id;
      const mineBlock = mineById.get(id) ?? null;
      const serverBlock = serverById.get(id) ?? null;
      if (entry.status === DIFF_STATUS.SAME && mineBlock) return { kind: "same", block: mineBlock };
      const formattingOnly =
        mineBlock !== null &&
        serverBlock !== null &&
        textOf(mineBlock) !== null &&
        textOf(mineBlock) === textOf(serverBlock);
      return { kind: "conflict", conflict: { id, mine: mineBlock, server: serverBlock, formattingOnly } };
    },
  );
  return {
    entries,
    conflicts: entries.flatMap((entry) => (entry.kind === "conflict" ? [entry.conflict] : [])),
    title: mine.title === server.title ? null : { mine: mine.title, server: server.title },
    serverTitle: server.title,
  };
}

/** True when every conflict (and a differing title) has a side picked. */
export function isMergeResolved(plan: MergePlan, choices: MergeChoices): boolean {
  return (
    (plan.title === null || choices[TITLE_CHOICE] !== undefined) &&
    plan.conflicts.every((conflict) => choices[conflict.id] !== undefined)
  );
}

/** The same side for everything ("take all mine" / "take all theirs"). */
export function chooseAll(plan: MergePlan, side: MergeSide): Record<string, MergeSide> {
  const choices: Record<string, MergeSide> = Object.fromEntries(plan.conflicts.map((conflict) => [conflict.id, side]));
  if (plan.title) choices[TITLE_CHOICE] = side;
  return choices;
}

/**
 * The merged title and body. A conflict without a choice keeps the server's side (nothing of the server is dropped
 * by accident); a chosen side that does not have the block drops it. Block ids are kept, so comments and reading
 * progress stay attached to the paragraphs they belong to.
 */
export function applyMerge(plan: MergePlan, choices: MergeChoices): { title: string; body: ChapterBody | [] } {
  const body: ChapterBlock[] = [];
  for (const entry of plan.entries) {
    if (entry.kind === "same") {
      body.push(entry.block);
      continue;
    }
    const { conflict } = entry;
    const picked = choices[conflict.id] === "mine" ? conflict.mine : conflict.server;
    if (picked) body.push(picked);
  }
  const title = plan.title && choices[TITLE_CHOICE] === "mine" ? plan.title.mine : plan.serverTitle;
  return { title, body: body as ChapterBody | [] };
}
