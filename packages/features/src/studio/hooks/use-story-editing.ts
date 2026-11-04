"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoryForm } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { prepareImage, type ImageRenderer } from "../../_shared/image-prepare.ts";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { discoveryKeys } from "../../discovery/index.ts";
import { storyKeys } from "../../story/index.ts";
import {
  createStory,
  removeCover,
  uploadCover,
  setStoryDeleted,
  setStoryTags,
  updateStory,
  type DeletedStory,
  type StoryForEdit,
} from "../api/story-write.api.ts";
import { studioKeys } from "../keys.ts";
import type { TagChip } from "../model/tags.ts";
import { deletedStoriesQueryOptions, storyForEditQueryOptions } from "../queries.ts";

/** The story to edit with the caller's role (null = not found / not theirs). Idle until the session is known. */
export function useStoryForEdit(storyId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useQuery<StoryForEdit | null, AppError>({
    ...storyForEditQueryOptions(getClient, userId ?? "none", storyId),
    enabled: userId !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useDeletedStories() {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useQuery<DeletedStory[], AppError>({
    ...deletedStoriesQueryOptions(getClient, userId ?? "none"),
    enabled: userId !== null,
    staleTime: 0,
  });
}

/** Everything that shows a story's settings: the studio lists, the public story page and the discovery feed. */
function useInvalidateStoryViews() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: studioKeys.all }),
      queryClient.invalidateQueries({ queryKey: storyKeys.all }),
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all }),
    ]);
}

function requireUserId(userId: string | null): string {
  if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
  return userId;
}

/** Creates a story with a client-generated id; resolves to that id. */
export function useCreateStory(newStoryId: () => string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const invalidate = useInvalidateStoryViews();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useMutation<string, AppError, StoryForm>({
    mutationFn: async (form) => {
      try {
        return await createStory(getClient(), requireUserId(userId), newStoryId(), form);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: invalidate,
  });
}

export function useUpdateStory(storyId: string) {
  const getClient = useDataClientGetter();
  const invalidate = useInvalidateStoryViews();
  return useMutation<void, AppError, StoryForm>({
    mutationFn: async (form) => {
      try {
        await updateStory(getClient(), storyId, form);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: invalidate,
  });
}

/** Soft delete (`deleted: true`) or restore (`false`) one story. */
export function useSetStoryDeleted() {
  const getClient = useDataClientGetter();
  const invalidate = useInvalidateStoryViews();
  return useMutation<void, AppError, { storyId: string; deleted: boolean }>({
    mutationFn: async ({ storyId, deleted }) => {
      try {
        await setStoryDeleted(getClient(), storyId, deleted);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: invalidate,
  });
}

/** Replaces a story's tags. Resolves to the tags as stored (cleaned and merged by the database). */
export function useSetStoryTags() {
  const getClient = useDataClientGetter();
  const invalidate = useInvalidateStoryViews();
  return useMutation<TagChip[], AppError, { storyId: string; names: string[] }>({
    mutationFn: async ({ storyId, names }) => {
      try {
        return await setStoryTags(getClient(), storyId, names);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: invalidate,
  });
}

/** Prepares (2:3 crop), uploads and saves a cover. ImageError passes through for the screen to explain. */
export function useUploadCover(story: { id: string; coverStorageKey: string | null }, render: ImageRenderer) {
  const getClient = useDataClientGetter();
  const invalidate = useInvalidateStoryViews();
  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      const cover = await prepareImage(file, render);
      try {
        return await uploadCover(getClient(), story, cover);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: invalidate,
  });
}

export function useRemoveCover(story: { id: string; coverStorageKey: string | null }) {
  const getClient = useDataClientGetter();
  const invalidate = useInvalidateStoryViews();
  return useMutation<void, AppError, void>({
    mutationFn: async () => {
      try {
        await removeCover(getClient(), story);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: invalidate,
  });
}
