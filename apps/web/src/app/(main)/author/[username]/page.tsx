import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadAuthor } from "@/lib/author/load-author";
import { appText } from "@/lib/strings";

import { AuthorView } from "./author-view";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const author = await loadAuthor(decodeURIComponent(username));
  if (!author) return { title: appText.pageTitle.author, robots: { index: false } };
  return { title: author.displayName, alternates: { canonical: `/author/${author.username}` } };
}

/** Public author page. An unknown or hidden author is a real 404 (the database decides which accounts have one). */
export default async function AuthorPage({ params }: { params: Params }) {
  const { username } = await params;
  const name = decodeURIComponent(username);
  if ((await loadAuthor(name)) === null) notFound();
  return <AuthorView username={name} />;
}
