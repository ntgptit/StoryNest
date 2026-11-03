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
