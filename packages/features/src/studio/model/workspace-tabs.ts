import type { StudioRole } from "./studio-story.ts";

export type WorkspaceTab = "details" | "chapters" | "team" | "stats";

/** Who sees which tab: the owner manages the team, and editors see neither the team nor the audience figures. */
const TAB_ROLES: Record<WorkspaceTab, readonly StudioRole[]> = {
  details: ["owner", "co_author", "editor"],
  chapters: ["owner", "co_author", "editor"],
  team: ["owner"],
  stats: ["owner", "co_author"],
};

const TAB_ORDER: readonly WorkspaceTab[] = ["details", "chapters", "team", "stats"];

/** The path of a tab; the URLs are the ones the pages already had. */
export function workspaceTabHref(storyId: string, tab: WorkspaceTab): string {
  const base = `/studio/story/${storyId}`;
  return tab === "details" ? base : `${base}/${tab}`;
}

export function workspaceTabsFor(role: StudioRole): WorkspaceTab[] {
  return TAB_ORDER.filter((tab) => TAB_ROLES[tab].includes(role));
}

/** The tab a path belongs to, or null (the editor, history and preview pages are not part of the workspace). */
export function activeWorkspaceTab(storyId: string, pathname: string): WorkspaceTab | null {
  const path = pathname.replace(/\/+$/, "");
  return TAB_ORDER.find((tab) => path === workspaceTabHref(storyId, tab)) ?? null;
}
