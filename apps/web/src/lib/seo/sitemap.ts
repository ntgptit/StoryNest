import type { MetadataRoute } from "next";

/** URLs per sitemap file. The limit of the protocol is 50,000; stories and chapters get their own files. */
export const SITEMAP_PAGE_SIZE = 5000;

export const SITEMAP_KIND = { STORIES: "stories", CHAPTERS: "chapters" } as const;
export type SitemapKind = (typeof SITEMAP_KIND)[keyof typeof SITEMAP_KIND];

export interface SitemapStoryRow {
  id: string;
  slug: string;
  updated_at: string;
}

export interface SitemapChapterRow {
  slug: string;
  updated_at: string;
  story: { id: string; slug: string } | { id: string; slug: string }[] | null;
}

/** "stories-0", "chapters-3": which file, and which page of it. */
export const sitemapId = (kind: SitemapKind, page: number) => `${kind}-${page}`;

export function parseSitemapId(id: string): { kind: SitemapKind; page: number } | null {
  const match = /^(stories|chapters)-(\d{1,6})$/.exec(id);
  if (!match) return null;
  return {
    kind: match[1] === SITEMAP_KIND.CHAPTERS ? SITEMAP_KIND.CHAPTERS : SITEMAP_KIND.STORIES,
    page: Number(match[2]),
  };
}

/** One sitemap file per page of stories and per page of chapters; at least the first stories file (it holds the fixed pages). */
export function sitemapIds(storyCount: number, chapterCount: number): string[] {
  const pages = (count: number) => Math.ceil(count / SITEMAP_PAGE_SIZE);
  return [
    ...Array.from({ length: Math.max(1, pages(storyCount)) }, (_, page) => sitemapId(SITEMAP_KIND.STORIES, page)),
    ...Array.from({ length: pages(chapterCount) }, (_, page) => sitemapId(SITEMAP_KIND.CHAPTERS, page)),
  ];
}

/** Pages with no data behind them that are worth indexing; listed once, in the first stories file. */
export const FIXED_PATHS = ["/", "/ranking"] as const;

const valid = (value: string) => (Number.isNaN(Date.parse(value)) ? undefined : new Date(value));

export function storyEntries(
  rows: readonly SitemapStoryRow[],
  url: (path: string) => string,
  withFixedPages: boolean,
): MetadataRoute.Sitemap {
  const stories = rows.map((row) => ({
    url: url(`/story/${row.id}/${row.slug}`),
    ...(valid(row.updated_at) ? { lastModified: valid(row.updated_at) } : {}),
  }));
  return withFixedPages ? [...FIXED_PATHS.map((path) => ({ url: url(path) })), ...stories] : stories;
}

/** A chapter row whose story could not be read is skipped: it has no URL. */
export function chapterEntries(
  rows: readonly SitemapChapterRow[],
  url: (path: string) => string,
): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    const story = Array.isArray(row.story) ? row.story[0] : row.story;
    if (!story) return [];
    return [
      {
        url: url(`/story/${story.id}/${story.slug}/${row.slug}`),
        ...(valid(row.updated_at) ? { lastModified: valid(row.updated_at) } : {}),
      },
    ];
  });
}
