import { describe, expect, it } from "vitest";

import { activeWorkspaceTab, workspaceTabHref, workspaceTabsFor } from "./model/workspace-tabs.ts";

describe("workspace tabs", () => {
  it("shows each role only the pages it can use", () => {
    expect(workspaceTabsFor("owner")).toEqual(["details", "chapters", "team", "stats"]);
    expect(workspaceTabsFor("co_author")).toEqual(["details", "chapters", "stats"]);
    expect(workspaceTabsFor("editor")).toEqual(["details", "chapters"]);
  });

  it("keeps the URLs the pages already had", () => {
    expect(workspaceTabHref("s1", "details")).toBe("/studio/story/s1");
    expect(workspaceTabHref("s1", "chapters")).toBe("/studio/story/s1/chapters");
    expect(workspaceTabHref("s1", "team")).toBe("/studio/story/s1/team");
    expect(workspaceTabHref("s1", "stats")).toBe("/studio/story/s1/stats");
  });

  it("finds the tab of a path, and none for the editor pages", () => {
    expect(activeWorkspaceTab("s1", "/studio/story/s1")).toBe("details");
    expect(activeWorkspaceTab("s1", "/studio/story/s1/chapters/")).toBe("chapters");
    expect(activeWorkspaceTab("s1", "/studio/story/s1/chapter/c1")).toBeNull();
    expect(activeWorkspaceTab("s1", "/studio/story/s2/chapters")).toBeNull();
  });
});
