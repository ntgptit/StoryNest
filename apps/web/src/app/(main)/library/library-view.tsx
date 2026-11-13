"use client";

import { LibraryScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

/** `?tab=` keeps the shelf tab through reloads and shared links; replaceState adds no history entry per switch. */
export function LibraryView({ initialTab }: { initialTab?: string | undefined }) {
  const keepTab = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  };
  return <LibraryScreen coverUrlFor={getCoverUrlResolver()} initialTab={initialTab} onTabChange={keepTab} />;
}
