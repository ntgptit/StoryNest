export const POPULAR_TAGS_LIMIT = 12;

export interface PopularTagRow {
  tag_id: number | string;
  slug: string;
  display_name: string;
  stories_count: number | string;
}

export interface PopularTag {
  slug: string;
  name: string;
  storiesCount: number;
}

export function toPopularTag(row: PopularTagRow): PopularTag {
  return { slug: row.slug, name: row.display_name, storiesCount: Number(row.stories_count) };
}
