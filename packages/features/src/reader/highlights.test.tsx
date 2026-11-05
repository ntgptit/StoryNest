import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { describeNotification, notificationGroup } from "../notifications/model/notification.ts";
import { notificationText } from "../notifications/strings.ts";
import { addHighlight, listMyHighlights, removeHighlights } from "./api/highlights.api.ts";
import { highlightRange, highlightsByBlock, overlapping, toHighlights, type HighlightRow } from "./model/highlights.ts";

const row = (n: number, over: Partial<HighlightRow> = {}): HighlightRow => ({
  id: `h${n}`,
  block_id: "b1",
  start_offset: 0,
  end_offset: 4,
  style: "underline",
  created_at: "2026-11-06T00:00:00Z",
  stale: false,
  ...over,
});

describe("highlight model", () => {
  it("drops unknown styles and empty ranges, and keeps stale ones out of the drawing", () => {
    const all = toHighlights([
      row(1),
      row(2, { style: "glitter" }),
      row(3, { start_offset: 5, end_offset: 5 }),
      row(4, { stale: true }),
      row(5, { block_id: "b2", style: "circle" }),
    ]);
    expect(all.map((h) => h.id)).toEqual(["h1", "h4", "h5"]);
    const byBlock = highlightsByBlock(all);
    expect(byBlock.b1?.map((h) => h.id)).toEqual(["h1"]);
    expect(byBlock.b2?.[0]?.style).toBe("circle");
  });

  it("keeps a selection inside the paragraph and the server limit", () => {
    expect(highlightRange(2, 50, 10)).toEqual({ start: 2, end: 10 });
    expect(highlightRange(10, 12, 10)).toBeNull();
    expect(highlightRange(0, 5000, 4000)).toEqual({ start: 0, end: 2000 });
  });

  it("finds the live highlights under a selection", () => {
    const all = toHighlights([row(1), row(2, { start_offset: 6, end_offset: 9 }), row(3, { stale: true })]);
    expect(overlapping(all, "b1", 3, 7).map((h) => h.id)).toEqual(["h1", "h2"]);
    expect(overlapping(all, "b1", 4, 6)).toEqual([]);
    expect(overlapping(all, "b2", 0, 9)).toEqual([]);
  });
});

describe("highlight api", () => {
  it("lists, adds and deletes through the right calls", async () => {
    const del = { in: vi.fn(async () => ({ data: null, error: null })) };
    const client = {
      rpc: vi.fn(async (name: string) =>
        name === "list_my_highlights" ? { data: [row(1)], error: null } : { data: "new-id", error: null },
      ),
      from: vi.fn(() => ({ delete: () => del })),
    } as unknown as DataClient;
    expect((await listMyHighlights(client, "c1"))[0]?.id).toBe("h1");
    expect(await addHighlight(client, { chapterId: "c1", blockId: "b1", start: 1, end: 3, style: "box" })).toBe(
      "new-id",
    );
    expect(client.rpc).toHaveBeenCalledWith("add_chapter_highlight", {
      p_chapter_id: "c1",
      p_block_id: "b1",
      p_start: 1,
      p_end: 3,
      p_style: "box",
    });
    await removeHighlights(client, []);
    expect(client.from).not.toHaveBeenCalled();
    await removeHighlights(client, ["h1"]);
    expect(del.in).toHaveBeenCalledWith("id", ["h1"]);
  });
});

describe("mention notifications", () => {
  it("words a mention, links to the thread and files it under replies", () => {
    const view = describeNotification({
      id: "n1",
      type: "comment_mentioned",
      storyId: "s1",
      chapterId: null,
      read: false,
      createdAt: "2026-11-06T00:00:00Z",
      actorName: "Mai",
      payload: { story_slug: "truyen", chapter_slug: "mot", block_id: "b9", excerpt: "@lan xem nè" },
    });
    expect(view.text).toBe(notificationText.text.commentMentioned("Mai", "@lan xem nè"));
    expect(view.href).toBe("/story/s1/truyen/mot#b-b9");
    expect(notificationGroup("comment_mentioned")).toBe("replies");
  });
});
