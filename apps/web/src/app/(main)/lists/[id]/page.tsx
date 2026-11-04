import type { Metadata } from "next";

import { appText } from "@/lib/strings";

import { ListView } from "./list-view";

// Not indexed for now: a list is readable by link, and whether a public one should appear in search is decided with
// the SEO work. The page itself is open to guests; RLS decides what each visitor may read.
export const metadata: Metadata = { title: appText.pageTitle.list, robots: { index: false } };

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListView listId={id} />;
}
