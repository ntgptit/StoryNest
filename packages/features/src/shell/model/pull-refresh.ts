import { isNavItemActive } from "@storynest/ui/widgets/bottom-nav";
import { FOLLOWING_HREF } from "../../author/index.ts";

/**
 * Feeds that can be pulled to refresh in the installed app: Home, Notifications, Library and Following. Only these:
 * on other pages a downward drag at the top is more likely a mistake than a wish to reload.
 */
export const PULL_REFRESH_PAGES: readonly { href: string }[] = [
  { href: "/" },
  { href: "/notifications" },
  { href: "/library" },
  { href: FOLLOWING_HREF },
];

export function isPullRefreshPage(pathname: string): boolean {
  return PULL_REFRESH_PAGES.some((page) => isNavItemActive(page, pathname));
}

/**
 * Whether pull-to-refresh may be offered: only where the browser has no pull-to-refresh of its own, i.e. inside the
 * Capacitor shell (`isNative`) or an installed web app (display-mode standalone, or iOS's navigator.standalone),
 * and only on a touch screen. A normal browser tab keeps the browser's own gesture.
 */
export function canOfferPullToRefresh(env: {
  isNative: boolean;
  standalone: boolean;
  coarsePointer: boolean;
}): boolean {
  return (env.isNative || env.standalone) && env.coarsePointer;
}
