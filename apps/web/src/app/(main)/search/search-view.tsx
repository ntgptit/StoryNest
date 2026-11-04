"use client";

import { SearchScreen, tabFromParam } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function SearchView({ term, tab }: { term: string; tab: string | undefined }) {
  // key: a new term from the address resets the field to it (the draft is local state of the screen).
  return <SearchScreen key={term} term={term} tab={tabFromParam(tab)} coverUrlFor={getCoverUrlResolver()} />;
}
