import { DB_LIMITS, APP_LIMITS, VISIBILITIES, VISIBILITY, type Visibility } from "@storynest/validation";
import { toStorySummary, type StoryListRow, type StorySummary } from "../../discovery/index.ts";
import type { AppError } from "../../_shared/errors.ts";
import { listText } from "../strings.ts";

type Maybe<T> = T | T[] | null;
const one = <T>(value: Maybe<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

export const asVisibility = (value: string): Visibility => VISIBILITIES.find((v) => v === value) ?? VISIBILITY.PRIVATE;

/** The page of a reading list (whether it opens for the visitor is up to its visibility and RLS). */
export function listHref(listId: string): string {
  return `/lists/${listId}`;
}

// ---- my lists ---------------------------------------------------------------------------------------------------

export interface ListRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  visibility: string;
  updated_at: string;
  items?: { count: number }[] | null;
  /** The first few stories (by list order) for the cover pile of My lists; only that query asks for it. */
  preview?: ListPreviewRow[] | null;
  owner?: Maybe<{ username: string; display_name: string }>;
}

export interface ListPreviewRow {
  sort_order: number;
  story: Maybe<{ cover_storage_key: string | null; deleted_at: string | null }>;
}

/** How many covers the pile of a list in My lists shows. */
export const LIST_PREVIEW_COVERS = 3;

export interface ReadingList {
  id: string;
  ownerId: string;
  ownerName: string | null;
  title: string;
  description: string;
  visibility: Visibility;
  updatedAt: string;
  storyCount: number;
  /**
   * Cover keys of the first stories, in list order (null for a story without a cover). A story the reader may not
   * see (RLS) or that was deleted is left out, so it can hold fewer than LIST_PREVIEW_COVERS even in a long list.
   */
  previewCovers: (string | null)[];
}

export function toReadingList(row: ListRow): ReadingList {
  const owner = one(row.owner ?? null);
  const name = owner ? (owner.display_name.trim() === "" ? owner.username : owner.display_name) : null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: name,
    title: row.title,
    description: row.description,
    visibility: asVisibility(row.visibility),
    updatedAt: row.updated_at,
    storyCount: Number(row.items?.[0]?.count ?? 0),
    previewCovers: [...(row.preview ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((item) => {
        const story = one(item.story);
        return story && story.deleted_at === null ? [story.cover_storage_key] : [];
      })
      .slice(0, LIST_PREVIEW_COVERS),
  };
}

// ---- one list with its stories ---------------------------------------------------------------------------------

export type ListStoryRow = StoryListRow & { deleted_at: string | null };
export interface ListItemRow {
  story_id: string;
  sort_order: number;
  story: Maybe<ListStoryRow>;
}
export interface ListItem {
  storyId: string;
  story: StorySummary;
}

/** The stories of a list in the stored order. A story the reader cannot see never arrives (RLS); a deleted one is dropped. */
export function toListItems(rows: readonly ListItemRow[]): ListItem[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((row) => {
      const story = one(row.story);
      return story && story.deleted_at === null ? [{ storyId: row.story_id, story: toStorySummary(story) }] : [];
    });
}

/** The list with a step taken: the stories in the order they would have after moving one of them one place. */
export function moveStory(ids: readonly string[], storyId: string, direction: 1 | -1): string[] | null {
  const index = ids.indexOf(storyId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as string);
  return next;
}

// ---- the form ----------------------------------------------------------------------------------------------------

export interface ListFormValues {
  title: string;
  description: string;
  visibility: Visibility;
}

export type ListFormProblems = Partial<Record<"title" | "description", string>>;

export function checkListForm(values: ListFormValues): ListFormProblems {
  const problems: ListFormProblems = {};
  const title = values.title.trim();
  if (title === "") problems.title = listText.form.validation.nameRequired;
  else if (title.length > DB_LIMITS.readingListTitle) problems.title = listText.form.validation.nameTooLong;
  if (values.description.trim().length > APP_LIMITS.readingListDescription) {
    problems.description = listText.form.validation.descriptionTooLong;
  }
  return problems;
}

export function listErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "forbidden":
      return listText.errors.forbidden;
    case "notFound":
      return listText.errors.notFound;
    case "conflict":
      return listText.errors.conflict;
    case "network":
      return listText.errors.network;
    default:
      return listText.errors.generic;
  }
}
