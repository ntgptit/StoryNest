"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PlatformAdapter, PlatformLinkProps } from "@storynest/features";

function NextLink({ href, replace, shallow, ...rest }: PlatformLinkProps) {
  if (!shallow) return <Link href={href} replace={replace} {...rest} />;
  // Shallow: the screen re-renders from useSearchParams, which Next keeps in sync with the native history API, so
  // asking the server to render the page again would only freeze the screen for a round trip. onNavigate fires for
  // in-app clicks only: Ctrl/Cmd-click and middle-click still open the full page in a new tab.
  return (
    <Link
      href={href}
      replace={replace}
      prefetch={false}
      scroll={false}
      onNavigate={(event) => {
        event.preventDefault();
        if (replace) window.history.replaceState(null, "", href);
        else window.history.pushState(null, "", href);
      }}
      {...rest}
    />
  );
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
