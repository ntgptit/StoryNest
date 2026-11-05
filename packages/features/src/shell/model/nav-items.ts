import { Home, Library, PenLine, User } from "lucide-react";
import type { BottomNavItem } from "@storynest/ui/widgets/bottom-nav";
import { shellText } from "../strings.ts";

/**
 * The app's main sections, shared by the mobile bottom navigation and the desktop navigation row so both stay in
 * step. A function, not a constant: the labels are read when the shell renders, so they follow the language.
 */
export const navItems = (): readonly BottomNavItem[] => [
  { href: "/", label: shellText.nav.home, icon: Home },
  { href: "/library", label: shellText.nav.library, icon: Library },
  { href: "/studio", label: shellText.nav.studio, icon: PenLine },
  { href: "/me", label: shellText.nav.me, icon: User },
];
