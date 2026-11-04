import type { AppError } from "../../_shared/errors.ts";
import { authorText } from "../strings.ts";

export const FOLLOWED_PAGE_SIZE = 12;

/** Address of an author's page: by username, which is what people see and share. */
export function authorHref(username: string): string {
  return `/author/${encodeURIComponent(username)}`;
}

export const FOLLOWING_HREF = "/following";

export interface AuthorProfileRow {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_storage_key: string | null;
  followers_count: number | string;
  stories_count: number | string;
  is_following: boolean;
}

export interface AuthorProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarStorageKey: string | null;
  followers: number;
  stories: number;
  following: boolean;
}

export function toAuthorProfile(row: AuthorProfileRow): AuthorProfile {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? "",
    avatarStorageKey: row.avatar_storage_key,
    followers: Number(row.followers_count),
    stories: Number(row.stories_count),
    following: row.is_following,
  };
}

/** The profile after the viewer followed or unfollowed, with the follower count the database answered. */
export function withFollowing(profile: AuthorProfile, following: boolean, followers: number): AuthorProfile {
  return { ...profile, following, followers };
}

export interface FollowedRow {
  story_id: string;
  updated_at: string;
}

export interface FollowedCursor {
  at: string;
  id: string;
}

/** The cursor after this page: where the last story of it sits. Null when the last page was short. */
export function followedCursorAfter(rows: readonly FollowedRow[], hasMore: boolean): FollowedCursor | null {
  const last = rows[rows.length - 1];
  return hasMore && last ? { at: last.updated_at, id: last.story_id } : null;
}

/** Text for a failed follow: the limit on followed authors (conflict) and an author that vanished are told apart. */
export function followErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "conflict":
      return authorText.errors.limit;
    case "notFound":
      return authorText.errors.gone;
    default:
      return authorText.errors.generic;
  }
}
