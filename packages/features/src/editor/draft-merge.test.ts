import { describe, expect, it } from "vitest";
import { chapterBodySchema, type ChapterBlock } from "@storynest/validation";
import { applyMerge, chooseAll, isMergeResolved, planMerge, TITLE_CHOICE } from "./model/draft-merge.ts";

const id = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const p = (n: number, text: string, extra: Partial<ChapterBlock> = {}): ChapterBlock =>
  ({ block_id: id(n), type: "paragraph", text, ...extra }) as ChapterBlock;

// Server: 1 2 3 4 (someone else edited 2 and added 4).  Mine: 1 2' 5 3' (I edited 2 and 3, added 5).
const SERVER = { title: "Chương một", body: [p(1, "Một"), p(2, "Hai (họ sửa)"), p(3, "Ba"), p(4, "Bốn (họ thêm)")] };
const MINE = { title: "Chương 1", body: [p(1, "Một"), p(2, "Hai (tôi sửa)"), p(5, "Năm (tôi thêm)"), p(3, "Ba!")] };

describe("planMerge", () => {
  it("lists only the blocks that differ, matched by block id, in my order with server-only blocks in place", () => {
    const plan = planMerge(MINE, SERVER);
    expect(plan.entries.map((e) => (e.kind === "same" ? `=${e.block.block_id}` : `?${e.conflict.id}`))).toEqual([
      `=${id(1)}`,
      `?${id(2)}`,
      `?${id(5)}`,
      `?${id(3)}`,
      `?${id(4)}`,
    ]);
    const byId = Object.fromEntries(plan.conflicts.map((c) => [c.id, c]));
    expect(byId[id(2)]).toMatchObject({ mine: MINE.body[1], server: SERVER.body[1], formattingOnly: false });
    expect(byId[id(5)]).toMatchObject({ mine: MINE.body[2], server: null }); // only mine
    expect(byId[id(4)]).toMatchObject({ mine: null, server: SERVER.body[3] }); // only the server's
    expect(plan.title).toEqual({ mine: "Chương 1", server: "Chương một" });
  });

  it("flags a block whose text is the same and only the formatting differs", () => {
    const plan = planMerge(
      { title: "T", body: [p(1, "đậm", { marks: [{ type: "bold", from: 0, to: 3 }] } as Partial<ChapterBlock>)] },
      { title: "T", body: [p(1, "đậm")] },
    );
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]?.formattingOnly).toBe(true);
    expect(plan.title).toBeNull();
  });

  it("has nothing to decide for identical versions", () => {
    const plan = planMerge(SERVER, SERVER);
    expect(plan.conflicts).toEqual([]);
    expect(isMergeResolved(plan, {})).toBe(true);
    expect(applyMerge(plan, {})).toEqual(SERVER);
  });
});

describe("applyMerge", () => {
  it("builds the body from the picked side of each conflict, dropping a block the picked side lacks", () => {
    const plan = planMerge(MINE, SERVER);
    const choices = {
      [id(2)]: "mine",
      [id(5)]: "mine",
      [id(3)]: "server",
      [id(4)]: "server",
      [TITLE_CHOICE]: "server",
    } as const;
    expect(isMergeResolved(plan, choices)).toBe(true);
    const merged = applyMerge(plan, choices);
    expect(merged.title).toBe("Chương một");
    expect(merged.body).toEqual([
      p(1, "Một"),
      p(2, "Hai (tôi sửa)"),
      p(5, "Năm (tôi thêm)"),
      p(3, "Ba"),
      p(4, "Bốn (họ thêm)"),
    ]);
    expect(chapterBodySchema.safeParse(merged.body).success).toBe(true);

    const dropping = applyMerge(plan, { [id(2)]: "server", [id(5)]: "server", [id(3)]: "mine", [id(4)]: "mine" });
    expect(dropping.body.map((b) => b.block_id)).toEqual([id(1), id(2), id(3)]);
  });

  it("'take all' picks one side everywhere: all mine is my version, all theirs is the server's", () => {
    const plan = planMerge(MINE, SERVER);
    expect(applyMerge(plan, chooseAll(plan, "mine"))).toEqual(MINE);
    expect(applyMerge(plan, chooseAll(plan, "server"))).toEqual(SERVER);
  });

  it("is not resolved while a conflict or the title is undecided, and keeps the server's side for it", () => {
    const plan = planMerge(MINE, SERVER);
    const partial = { ...chooseAll(plan, "mine"), [id(4)]: undefined, [TITLE_CHOICE]: undefined };
    expect(isMergeResolved(plan, partial)).toBe(false);
    expect(isMergeResolved(plan, { ...partial, [id(4)]: "mine" })).toBe(false); // the title is still open
    const merged = applyMerge(plan, partial);
    expect(merged.title).toBe("Chương một");
    expect(merged.body.map((b) => b.block_id)).toContain(id(4));
  });

  it("never repeats a block id, so the merged body keeps one block per id", () => {
    const plan = planMerge(MINE, SERVER);
    const merged = applyMerge(plan, chooseAll(plan, "mine"));
    const ids = merged.body.map((b) => b.block_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
