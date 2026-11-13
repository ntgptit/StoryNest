import { COLLABORATOR_ROLES, VISIBILITIES, VISIBILITY, type Visibility } from "@storynest/validation";

/** Role of the signed-in user on a story: the owner, or an invited collaborator. */
export type StudioRole = "owner" | (typeof COLLABORATOR_ROLES)[number];

export interface StudioStoryRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  visibility: string;
  is_mature: boolean;
  cover_storage_key: string | null;
  updated_at: string;
  /** `published:chapters(count)` embed (published, not deleted): PostgREST returns one row holding the count. */
  published: { count: number }[] | null;
}

export interface StudioStory {
  id: string;
  slug: string;
  title: string;
  status: string;
  visibility: Visibility;
  isMature: boolean;
  coverStorageKey: string | null;
  /** Exact timestamp string from the database (sortable, and the same format everywhere). */
  updatedAt: string;
  /** Chapters readers can open. */
  chapterCount: number;
  role: StudioRole;
}

export function toStudioStory(row: StudioStoryRow, role: StudioRole): StudioStory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    // An unknown value is shown as the most restrictive one.
    visibility: VISIBILITIES.find((v) => v === row.visibility) ?? VISIBILITY.PRIVATE,
    isMature: row.is_mature,
    coverStorageKey: row.cover_storage_key,
    updatedAt: row.updated_at,
    chapterCount: row.published?.[0]?.count ?? 0,
    role,
  };
}

/**
 * Owned and shared stories as one list, newest update first. A story appears once: if the same id arrives twice (an
 * owner who is also listed as a collaborator) the owner role wins.
 */
export function mergeStudioStories(owned: readonly StudioStory[], shared: readonly StudioStory[]): StudioStory[] {
  const byId = new Map<string, StudioStory>();
  for (const story of shared) byId.set(story.id, story);
  for (const story of owned) byId.set(story.id, story);
  return [...byId.values()].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.id < b.id ? 1 : -1,
  );
}

export function isCollaboratorRole(value: string): value is (typeof COLLABORATOR_ROLES)[number] {
  return (COLLABORATOR_ROLES as readonly string[]).includes(value);
}
