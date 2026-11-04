import type { Metadata } from "next";

import { appText } from "@/lib/strings";

import { SearchView } from "./search-view";

// Results depend on what was typed and change constantly, so they are not worth indexing; the page itself is open
// to guests (RLS and the search functions decide what each visitor may find).
export const metadata: Metadata = { title: appText.pageTitle.search, robots: { index: false } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tab?: string | string[] }>;
}) {
  const { q, tab } = await searchParams;
  const term = typeof q === "string" ? q : "";
  const tabName = typeof tab === "string" ? tab : undefined;
  return <SearchView term={term} tab={tabName} />;
}
