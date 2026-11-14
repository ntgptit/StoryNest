import { describe, expect, it } from "vitest";

import { isOpenReport, toMyReport, type MyReportRow } from "./model/my-reports.ts";

const row = (overrides: Partial<MyReportRow> = {}): MyReportRow => ({
  id: "r1",
  status: "pending",
  reason: "spam",
  created_at: "2026-11-13T10:00:00+00:00",
  story_id: null,
  chapter_id: null,
  comment_id: "c1",
  reported_user_id: null,
  ...overrides,
});

describe("my reports model", () => {
  it("finds the one target the report is about", () => {
    expect(toMyReport(row())).toMatchObject({ kind: "comment", targetId: "c1", status: "pending" });
    expect(toMyReport(row({ comment_id: null, story_id: "s1" }))).toMatchObject({ kind: "story", targetId: "s1" });
    expect(toMyReport(row({ comment_id: null, reported_user_id: "u1" }))).toMatchObject({ kind: "user" });
  });

  it("drops a row with no target and falls back to pending for an unknown status", () => {
    expect(toMyReport(row({ comment_id: null }))).toBeNull();
    expect(toMyReport(row({ status: "weird" }))?.status).toBe("pending");
  });

  it("counts only pending and reviewing reports as open", () => {
    expect(isOpenReport(toMyReport(row({ status: "reviewing" }))!)).toBe(true);
    expect(isOpenReport(toMyReport(row({ status: "dismissed" }))!)).toBe(false);
    expect(isOpenReport(toMyReport(row({ status: "resolved" }))!)).toBe(false);
  });
});

describe("a withdrawn report", () => {
  it("is marked as withdrawn and counts as closed", () => {
    const report = toMyReport(row({ status: "dismissed", withdrawn_at: "2026-11-14T10:00:00+00:00" }))!;
    expect(report.withdrawn).toBe(true);
    expect(isOpenReport(report)).toBe(false);
    expect(toMyReport(row({ status: "dismissed" }))!.withdrawn).toBe(false);
  });
});
