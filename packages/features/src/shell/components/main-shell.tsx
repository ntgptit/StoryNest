"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMediaQuery } from "@storynest/ui/lib/use-media-query";
import { AppShell } from "@storynest/ui/widgets/app-shell";
import { BottomNav } from "@storynest/ui/widgets/bottom-nav";
import { PullToRefresh } from "@storynest/ui/widgets/pull-to-refresh";
import { AdultContentSync } from "../../adult-content/index.ts";
import { AppLink, useNavigation, usePlatform } from "../../_shared/platform.tsx";
import { useStandaloneDisplay } from "../hooks/use-installed-app.ts";
import { navItems } from "../model/nav-items.ts";
import { canOfferPullToRefresh, isPullRefreshPage } from "../model/pull-refresh.ts";
import { shellText } from "../strings.ts";
import { ConnectionStatus } from "./connection-status.tsx";
import { DesktopNav } from "./desktop-nav.tsx";
import { SiteHeader } from "./site-header.tsx";

/**
 * The frame of every regular page: header with the account menu (and the full-screen menu on phones), desktop
 * navigation row (md and up), offline strip, content column, mobile bottom navigation. Both navigations are built
 * from the same `navItems()`. In the installed app the feeds can be pulled to refresh.
 */
export function MainShell({ children }: { children: ReactNode }) {
  const { pathname } = useNavigation();
  const { isNative } = usePlatform();
  const standalone = useStandaloneDisplay();
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const queryClient = useQueryClient();
  const pullToRefresh = canOfferPullToRefresh({ isNative, standalone, coarsePointer }) && isPullRefreshPage(pathname);

  return (
    <AppShell
      header={<SiteHeader />}
      navigation={
        <>
          <DesktopNav pathname={pathname} />
          <ConnectionStatus />
        </>
      }
      bottomNav={
        <BottomNav items={navItems()} pathname={pathname} LinkComponent={AppLink} label={shellText.mainNavigation} />
      }
    >
      <AdultContentSync />
      {/* The page's own queries are the active ones: refetching them is the page's "reload". */}
      <PullToRefresh
        enabled={pullToRefresh}
        onRefresh={() => queryClient.refetchQueries({ type: "active" })}
        labels={shellText.pullRefresh}
      >
        {children}
      </PullToRefresh>
    </AppShell>
  );
}
