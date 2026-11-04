"use client";

import { createContext, useContext, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";

/**
 * Everything a screen needs from the host platform. Web (Next.js) and mobile (Vite + Capacitor) each provide an
 * adapter, so screens never import next/* or a router directly (see docs/WBS.md section 1.1).
 */
export interface Navigation {
  push(href: string): void;
  replace(href: string): void;
  back(): void;
  /** Re-render server-provided data after a session change (router.refresh on Next; no-op where nothing is server-rendered). */
  refresh(): void;
  /** Current path without origin, e.g. "/story/123/my-story". Re-renders the caller on navigation. */
  pathname: string;
}

export type PlatformLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  /** Replace the current history entry instead of pushing. */
  replace?: boolean;
  /**
   * Change only the address: for links between views of the SAME screen that already re-renders from the URL
   * (filters, tabs). Web: no server render, no prefetch, no scroll to the top; the browser history still gets an
   * entry and the URL stays shareable. Platforms without a server treat it as a normal link.
   */
  shallow?: boolean;
};

export interface PlatformAdapter {
  platform: "web" | "ios" | "android";
  /** True inside the Capacitor shell: gate native-only features (haptics, share sheet, push). */
  isNative: boolean;
  /** Client-side navigation link (next/link on web, router Link on mobile). */
  Link: ComponentType<PlatformLinkProps>;
  /** A hook, called as `adapter.useNavigation()` from a component. */
  useNavigation: () => Navigation;
  /**
   * Public base URL of the app, used to build links that leave the app and come back: email confirmation, password
   * reset, OAuth. Web returns window.location.origin; the Capacitor shell returns its universal-link domain.
   */
  appOrigin(): string;
  /** Open a URL outside the app (system browser / in-app browser on mobile). */
  openExternal(url: string): void;
}

const PlatformContext = createContext<PlatformAdapter | undefined>(undefined);

export function PlatformProvider({ adapter, children }: { adapter: PlatformAdapter; children: ReactNode }) {
  return <PlatformContext value={adapter}>{children}</PlatformContext>;
}

export function usePlatform(): PlatformAdapter {
  const adapter = useContext(PlatformContext);
  if (adapter === undefined) throw new Error("usePlatform must be used inside <PlatformProvider>.");
  return adapter;
}

export function useNavigation(): Navigation {
  return usePlatform().useNavigation();
}

/** Internal navigation link. Use this instead of <a> or next/link in shared code. */
export function AppLink(props: PlatformLinkProps) {
  const { Link } = usePlatform();
  return <Link {...props} />;
}
