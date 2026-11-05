import { Bell, Plus, Settings, Trophy, Users, type LucideIcon } from "lucide-react";
import { slugify } from "@storynest/utils";
import { FOLLOWING_HREF } from "../../author/index.ts";
import { rankingHref } from "../../ranking/index.ts";
import { shellText } from "../strings.ts";
import { navItems } from "./nav-items.ts";

/** A page the command palette (Lucian 046) can open. */
export interface PaletteCommand {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The palette's "go to" commands: the same sections as the navigation (navItems, ranking, following), plus the
 * account pages that the menus offer. Members-only pages are left out for a visitor.
 */
export function paletteCommands(signedIn: boolean): PaletteCommand[] {
  const t = shellText;
  return [
    ...navItems().map((item) => ({ href: item.href, label: item.label, icon: item.icon })),
    { href: rankingHref(), label: t.desktopNav.ranking, icon: Trophy },
    ...(signedIn
      ? [
          { href: FOLLOWING_HREF, label: t.desktopNav.following, icon: Users },
          { href: "/notifications", label: t.palette.notifications, icon: Bell },
          { href: "/studio/new", label: t.palette.newStory, icon: Plus },
        ]
      : []),
    { href: "/settings", label: t.settings, icon: Settings },
  ];
}

/** Commands whose label contains the query, ignoring case and Vietnamese diacritics ("thu vien" finds "Thư viện"). */
export function filterCommands(commands: readonly PaletteCommand[], query: string): PaletteCommand[] {
  const needle = slugify(query);
  if (needle === "") return [...commands];
  return commands.filter((command) => slugify(command.label).includes(needle));
}

/** Ctrl+K (Cmd+K on a Mac) outside text editing: inside a field or the editor, the key keeps its own meaning. */
export function isPaletteShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}): boolean {
  if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey)
    return false;
  const target = event.target;
  if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
    if (target.isContentEditable || target.closest("input, textarea, select, [contenteditable]")) return false;
  }
  return true;
}
