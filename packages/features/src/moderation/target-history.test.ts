import { describe, expect, it } from "vitest";

import { toTargetActions } from "./model/target-history.ts";

describe("toTargetActions", () => {
  it("keeps known actions in order and drops ones this version does not know", () => {
    const rows = [
      { id: "a", action: "remove_story", reason: "claim", created_at: "2026-11-13T10:00:00+00:00" },
      { id: "b", action: "teleport", reason: "?", created_at: "2026-11-13T09:00:00+00:00" },
      { id: "c", action: "restore_story", reason: "withdrawn", created_at: "2026-11-12T09:00:00+00:00" },
    ];
    expect(toTargetActions(rows).map((entry) => entry.id)).toEqual(["a", "c"]);
    expect(toTargetActions(rows)[0]).toMatchObject({ action: "remove_story", reason: "claim" });
  });
});
