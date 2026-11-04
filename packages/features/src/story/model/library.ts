import type { AppError } from "../../_shared/errors.ts";
import { storyText } from "../strings.ts";

/** What the story page's buttons show: do I follow it, did I save it. Two separate things. */
export interface LibraryState {
  following: boolean;
  saved: boolean;
}

export const NOT_IN_LIBRARY: LibraryState = { following: false, saved: false };

/** The state shown at once while the server is still answering. */
export function withFollowing(state: LibraryState, following: boolean): LibraryState {
  return state.following === following ? state : { ...state, following };
}

export function withSaved(state: LibraryState, saved: boolean): LibraryState {
  return state.saved === saved ? state : { ...state, saved };
}

/** The follower count shown at once: one more or one fewer, never below zero, unchanged if nothing changes. */
export function followersAfter(followers: number, wasFollowing: boolean, following: boolean): number {
  if (wasFollowing === following) return followers;
  return Math.max(0, followers + (following ? 1 : -1));
}

export function libraryErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "forbidden":
      return storyText.library.errors.forbidden;
    case "network":
      return storyText.library.errors.network;
    default:
      return storyText.library.errors.generic;
  }
}
