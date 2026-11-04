// No "use client": query options are plain data shared by hooks (and, later, by server prefetch if ever needed).
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { listMyStories } from "./api/studio.api.ts";
import { listStudioChapters } from "./api/chapters.api.ts";
import { listCollaborators, listMyInvitations, listStoryInvitations } from "./api/collaboration.api.ts";
import { getStoryForEdit, listDeletedStories } from "./api/story-write.api.ts";
import { studioKeys } from "./keys.ts";

export function myStoriesQueryOptions(getClient: () => DataClient, userId: string) {
  return {
    queryKey: studioKeys.stories(userId),
    queryFn: () => listMyStories(getClient(), userId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function storyForEditQueryOptions(getClient: () => DataClient, userId: string, storyId: string) {
  return {
    queryKey: studioKeys.story(storyId),
    queryFn: () =>
      getStoryForEdit(getClient(), userId, storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function deletedStoriesQueryOptions(getClient: () => DataClient, userId: string) {
  return {
    queryKey: studioKeys.deleted(userId),
    queryFn: () => listDeletedStories(getClient(), userId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function studioChaptersQueryOptions(getClient: () => DataClient, storyId: string) {
  return {
    queryKey: studioKeys.chapters(storyId),
    queryFn: () =>
      listStudioChapters(getClient(), storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function collaboratorsQueryOptions(getClient: () => DataClient, storyId: string) {
  return {
    queryKey: studioKeys.collaborators(storyId),
    queryFn: () => listCollaborators(getClient(), storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function storyInvitationsQueryOptions(getClient: () => DataClient, storyId: string) {
  return {
    queryKey: studioKeys.storyInvitations(storyId),
    queryFn: () =>
      listStoryInvitations(getClient(), storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function myInvitationsQueryOptions(getClient: () => DataClient, userId: string) {
  return {
    queryKey: studioKeys.myInvitations(userId),
    queryFn: () => listMyInvitations(getClient()).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}
