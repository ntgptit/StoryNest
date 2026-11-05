"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useMediaQuery } from "@storynest/ui/lib/use-media-query";
import { resolveScheme, type ColorScheme, type SiteTheme } from "../model/site-theme.ts";
import {
  getServerSiteTheme,
  getStoredSiteTheme,
  setStoredSiteTheme,
  subscribeSiteTheme,
} from "../model/site-theme-store.ts";

/** This device's site theme, the scheme it shows right now, and a setter (applied and saved at once). */
export function useSiteTheme(): { theme: SiteTheme; scheme: ColorScheme; setTheme: (theme: SiteTheme) => void } {
  const theme = useSyncExternalStore(subscribeSiteTheme, getStoredSiteTheme, getServerSiteTheme);
  const deviceIsDark = useMediaQuery("(prefers-color-scheme: dark)");
  const setTheme = useCallback((next: SiteTheme) => setStoredSiteTheme(next), []);
  return { theme, scheme: resolveScheme(theme, deviceIsDark), setTheme };
}
