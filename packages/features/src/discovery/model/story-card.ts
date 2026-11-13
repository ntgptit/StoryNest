import type { StoryCardData } from "@storynest/ui/widgets/story-card";
import { discoveryText } from "../strings.ts";

/** Shape of one row of the discovery query (see api/discovery.api.ts); tags are kept for later filters/pages. */
export interface StoryListRow {
  id: string;
  slug: string;
  /** The owner account (the rest of the owner comes from the embed). */
  owner_id?: string;
  title: string;
  synopsis: string;
  cover_storage_key: string | null;
  status: string;
  is_mature: boolean;
  language_code: string;
  updated_at: string;
  owner: { username: string; display_name: string } | null;
  category: { slug: string; name: string } | null;
  stats: { reads: number; votes: number; comments: number; followers: number } | null;
  story_tags: { tag: { slug: string; display_name: string } | null }[];
}

export interface StorySummary {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  coverStorageKey: string | null;
  status: string;
  isMature: boolean;
  languageCode: string;
  /** Exact timestamp string from the database: it is also the cursor, so it must not lose precision. */
  updatedAt: string;
  /** The owner's account id (never shown a Report button for their own work); null when the row did not carry it. */
  ownerId: string | null;
  author: { username: string; displayName: string };
  category: { slug: string; name: string } | null;
  tags: { slug: string; name: string }[];
  stats: { reads: number; votes: number; comments: number; followers: number };
}

const NO_STATS = { reads: 0, votes: 0, comments: 0, followers: 0 } as const;

export function toStorySummary(row: StoryListRow): StorySummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    coverStorageKey: row.cover_storage_key,
    status: row.status,
    isMature: row.is_mature,
    languageCode: row.language_code,
    updatedAt: row.updated_at,
    ownerId: row.owner_id ?? null,
    // The owner is always readable for a public story; the fallback only covers a deactivated author.
    author: row.owner
      ? { username: row.owner.username, displayName: row.owner.display_name }
      : { username: "", displayName: discoveryText.unknownAuthor },
    category: row.category,
    tags: row.story_tags.flatMap((t) => (t.tag ? [{ slug: t.tag.slug, name: t.tag.display_name }] : [])),
    stats: row.stats ?? { ...NO_STATS },
  };
}

/** Canonical public URL of a story: id first, slug only for readability (a changed slug redirects, see WBS Q2). */
export function storyHref(story: Pick<StorySummary, "id" | "slug">): string {
  return `/story/${story.id}/${story.slug}`;
}

export function toStoryCardData(story: StorySummary, coverUrlFor?: (key: string) => string): StoryCardData {
  return {
    href: storyHref(story),
    title: story.title,
    authorName: story.author.displayName,
    synopsis: story.synopsis,
    coverUrl: story.coverStorageKey && coverUrlFor ? coverUrlFor(story.coverStorageKey) : null,
    categoryName: story.category?.name ?? null,
    statusLabel: statusLabel(story.status),
    matureLabel: story.isMature ? discoveryText.mature : null,
    reads: story.stats.reads,
    votes: story.stats.votes,
    updatedAt: story.updatedAt,
  };
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = discoveryText.status;
  return labels[status] ?? status;
}
