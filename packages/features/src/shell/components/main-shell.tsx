"use client";

import type { ReactNode } from "react";
import { AppShell } from "@storynest/ui/widgets/app-shell";
import { BottomNav } from "@storynest/ui/widgets/bottom-nav";
import { AdultContentSync } from "../../adult-content/index.ts";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { navItems } from "../model/nav-items.ts";
import { shellText } from "../strings.ts";
import { DesktopNav } from "./desktop-nav.tsx";
import { SiteHeader } from "./site-header.tsx";

/**
 * The frame of every regular page: header with the account menu, desktop navigation row (md and up), content column,
 * mobile bottom navigation. Both navigations are built from the same `navItems()`.
 */
export function MainShell({ children }: { children: ReactNode }) {
  const { pathname } = useNavigation();
  return (
    <AppShell
      header={<SiteHeader />}
      navigation={<DesktopNav pathname={pathname} />}
      bottomNav={
        <BottomNav items={navItems()} pathname={pathname} LinkComponent={AppLink} label={shellText.mainNavigation} />
      }
    >
      <AdultContentSync />
      {children}
    </AppShell>
  );
}
