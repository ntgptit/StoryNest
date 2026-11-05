"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PlatformAdapter, PlatformLinkProps } from "@storynest/features";

function NextLink({ href, replace, ...rest }: PlatformLinkProps) {
  return <Link href={href} replace={replace} {...rest} />;
}

function useNextNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  return {
    push: (href: string) => router.push(href),
    replace: (href: string) => router.replace(href),
    back: () => router.back(),
    refresh: () => router.refresh(),
    pathname,
  };
}

/**
 * The adapter with shared links built on the site's canonical origin (`getSiteUrl()`, the base of every canonical and
 * Open Graph URL). The root layout reads it on the server and hands it down, because the environment variables it
 * comes from are not all available in the browser.
 */
export function nextPlatformAdapterFor(siteOrigin: string): PlatformAdapter {
  return { ...nextPlatformAdapter, shareOrigin: () => siteOrigin };
}

/** Platform adapter for the Next.js web app. The Capacitor shell provides its own (WBS WP 7.1). */
export const nextPlatformAdapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: NextLink,
  useNavigation: useNextNavigation,
  appOrigin: () => window.location.origin,
  openExternal(url) {
    // noopener: the opened page must not get a handle to this window.
    window.open(url, "_blank", "noopener,noreferrer");
  },
};
