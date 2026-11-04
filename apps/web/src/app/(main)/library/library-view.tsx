"use client";

import { LibraryScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function LibraryView() {
  return <LibraryScreen coverUrlFor={getCoverUrlResolver()} />;
}
