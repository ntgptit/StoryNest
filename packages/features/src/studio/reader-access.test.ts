import { STORY_STATUSES, VISIBILITIES } from "@storynest/validation";
import { describe, expect, it } from "vitest";

import { ACCESS_REASON, READER_ACCESS, readerAccess, removesReaderAccess } from "./model/reader-access.ts";

/** The database rule for a reader outside the team, written out as in `can_read_story`, plus "a chapter exists". */
function sqlReaderCanRead(visibility: string, status: string, deleted: boolean, published: number): boolean {
  return !deleted && (visibility === "public" || visibility === "unlisted") && status !== "draft" && published > 0;
}

describe("readerAccess", () => {
  it("agrees with the database rule for every combination", () => {
    for (const visibility of VISIBILITIES) {
      for (const status of STORY_STATUSES) {
        for (const deleted of [false, true]) {
          for (const published of [0, 3]) {
            const access = readerAccess({ visibility, status, deleted }, published);
            const open = access.state === READER_ACCESS.LIVE || access.state === READER_ACCESS.LINK_ONLY;
            expect(open, `${visibility}/${status}/${deleted}/${published}`).toBe(
              sqlReaderCanRead(visibility, status, deleted, published),
            );
          }
        }
      }
    }
  });

  it("names every reason that keeps readers out", () => {
    expect(readerAccess({ visibility: "private", status: "draft", deleted: false }, 0)).toEqual({
      state: READER_ACCESS.TEAM_ONLY,
      reasons: [ACCESS_REASON.PRIVATE, ACCESS_REASON.DRAFT_STATUS, ACCESS_REASON.NO_PUBLISHED_CHAPTER],
    });
    expect(readerAccess({ visibility: "public", status: "ongoing", deleted: true }, 5)).toEqual({
      state: READER_ACCESS.DELETED,
      reasons: [ACCESS_REASON.DELETED],
    });
  });

  it("tells public from link-only", () => {
    expect(readerAccess({ visibility: "public", status: "ongoing", deleted: false }, 1).state).toBe(READER_ACCESS.LIVE);
    expect(readerAccess({ visibility: "unlisted", status: "ongoing", deleted: false }, 1).state).toBe(
      READER_ACCESS.LINK_ONLY,
    );
  });

  it("warns only when readers would lose a story they can read", () => {
    const live = readerAccess({ visibility: "public", status: "ongoing", deleted: false }, 2);
    const hidden = readerAccess({ visibility: "private", status: "ongoing", deleted: false }, 2);
    expect(removesReaderAccess(live, hidden)).toBe(true);
    expect(removesReaderAccess(hidden, live)).toBe(false);
    expect(removesReaderAccess(hidden, hidden)).toBe(false);
  });
});
