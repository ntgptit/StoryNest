// "404 that fixes the typo" (adapted from Lucian UX/UI Prompt 089, MIT (c) 2026 Seokwoooo, lucianlabs.dev/uxui-prompt):
// a missing address suggests the closest real one. Only addresses the app already knows are offered, nothing is
// guessed from the database: the fixed sections, and for a story or author address a search for the words in it.

import { FOLLOWING_HREF } from "../../author/index.ts";
import { rankingHref } from "../../ranking/index.ts";
import { searchHref } from "../../search/index.ts";
import { navItems } from "./nav-items.ts";

/** Fixed pages a typo can be corrected to (pages with an id in them cannot be guessed). */
export function knownPaths(): string[] {
  return [
    ...navItems().map((item) => item.href),
    rankingHref(),
    FOLLOWING_HREF,
    searchHref(""),
    "/notifications",
    "/settings",
    "/me/edit",
    "/studio/new",
    "/login",
    "/register",
    "/forgot-password",
  ];
}

/** Edit distance with adjacent swaps ("libaray" → "library" is one step per swap). */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        best = Math.min(best, d[i - 2]![j - 2]! + 1);
      d[i]![j] = best;
    }
  }
  return d[a.length]![b.length]!;
}

function normalize(pathname: string): string {
  let path = pathname.split(/[?#]/)[0] ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    // a malformed escape: compare it as typed
  }
  path = path.toLowerCase().replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

/**
 * The known page closest to a missing address, or null when none is close enough to be a typo (at most two edits,
 * and fewer than a third of the address) or the address is that page already.
 */
export function closestPath(pathname: string, candidates: readonly string[] = knownPaths()): string | null {
  const path = normalize(pathname);
  if (path === "" || path === "/") return null;
  let best: { path: string; distance: number } | null = null;
  for (const candidate of candidates) {
    if (candidate === "/") continue;
    const distance = editDistance(path, candidate);
    if (distance === 0) return null;
    if (best === null || distance < best.distance) best = { path: candidate, distance };
  }
  if (best === null) return null;
  return best.distance <= 2 && best.distance * 3 < best.path.length ? best.path : null;
}

/** Words to search for when a story or author address leads nowhere: the slug or username in it. */
export function searchSuggestion(pathname: string): { href: string; term: string } | null {
  const segments = normalize(pathname).split("/").filter(Boolean);
  if (segments[0] === "story" && segments[2]) {
    const term = segments[2].replace(/[-_]+/g, " ").trim();
    return term ? { href: searchHref(term), term } : null;
  }
  if (segments[0] === "author" && segments[1]) {
    return { href: searchHref(segments[1], "authors"), term: segments[1] };
  }
  return null;
}
