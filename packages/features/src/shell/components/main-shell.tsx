"use client";

import { Home, User } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@storynest/ui/widgets/app-shell";
import { BottomNav, type BottomNavItem } from "@storynest/ui/widgets/bottom-nav";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { shellText } from "../strings.ts";
import { SiteHeader } from "./site-header.tsx";

const NAV_ITEMS: readonly BottomNavItem[] = [
  { href: "/", label: shellText.nav.home, icon: Home },
  { href: "/me", label: shellText.nav.me, icon: User },
];

/** The frame of every regular page: header with the account menu, content column, mobile bottom navigation. */
export function MainShell({ children }: { children: ReactNode }) {
  const { pathname } = useNavigation();
  return (
    <AppShell
      header={<SiteHeader />}
      bottomNav={
        <BottomNav items={NAV_ITEMS} pathname={pathname} LinkComponent={AppLink} label={shellText.mainNavigation} />
      }
    >
      {children}
    </AppShell>
  );
}
