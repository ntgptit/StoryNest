"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RollingBanner, type RollingBannerItem } from "@storynest/ui/widgets/rolling-banner";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useActiveAnnouncements } from "../hooks/use-announcements.ts";
import { isInternalLink, readClosedBanners, writeClosedBanners } from "../model/announcement.ts";
import { announcementsText } from "../strings.ts";

/** Renders an announcement link: inside the app through the router, anything else in a new tab. */
export function renderAnnouncementLink(href: string, children: ReactNode, className: string): ReactNode {
  return isInternalLink(href) ? (
    <AppLink href={href} className={className}>
      {children}
    </AppLink>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/**
 * The rolling announcement strip at the top of every page (BR-SHELL-015). It shows the active banners for the
 * interface language, minus the ones this device closed. Closing hides them on this device until a new banner
 * appears; right after closing, a bell lets the reader take it back (until they move to another page).
 */
export function AnnouncementBanner() {
  const banners = useActiveAnnouncements("banner");
  const { pathname } = useNavigation();
  const [closedIds, setClosedIds] = useState<string[] | null>(null);
  const [reopenable, setReopenable] = useState(false);

  // Device storage is read after hydration, so the server and the first client render agree (nothing shows yet).
  useEffect(() => setClosedIds(readClosedBanners()), []);
  useEffect(() => setReopenable(false), [pathname]);

  const all = banners.data ?? [];
  if (closedIds === null || all.length === 0) return null;
  const items: RollingBannerItem[] = all.map((a) => ({ id: a.id, title: a.title, body: a.body, href: a.href }));
  const showing = items.filter((item) => !closedIds.includes(item.id));
  const closed = showing.length === 0;
  if (closed && !reopenable) return null;

  const ids = items.map((item) => item.id);
  return (
    <RollingBanner
      items={closed ? items : showing}
      labels={announcementsText.banner}
      closed={closed}
      reopenable={reopenable}
      onClose={() => {
        const next = [...new Set([...closedIds, ...ids])];
        setClosedIds(next);
        writeClosedBanners(next, ids);
        setReopenable(true);
      }}
      onReopen={() => {
        const next = closedIds.filter((id) => !ids.includes(id));
        setClosedIds(next);
        writeClosedBanners(next, ids);
        setReopenable(false);
      }}
      renderLink={(item, children, className) =>
        item.href ? renderAnnouncementLink(item.href, children, className) : children
      }
    />
  );
}
