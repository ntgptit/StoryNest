"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import {
  addStoryToList,
  createList,
  deleteList,
  getList,
  getMembership,
  listMyLists,
  removeStoryFromList,
  reorderList,
  updateList,
} from "../api/lists.api.ts";
import { listKeys } from "../keys.ts";
import type { ListFormValues, ListItem, ReadingList } from "../model/list.ts";

function useViewer() {
  const auth = useAuth();
  return { userId: auth.status === "authenticated" ? auth.user.id : null, ready: auth.status !== "loading" };
}

/** The signed-in reader's lists. Idle until the session is known and, with `enabled` false, until needed. */
export function useMyLists(enabled = true) {
  const getClient = useDataClientGetter();
  const { userId } = useViewer();
  return useQuery<ReadingList[], AppError>({
    queryKey: listKeys.mine(userId ?? "none"),
    queryFn: () => listMyLists(getClient(), userId ?? "").catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: enabled && userId !== null,
    staleTime: 0,
  });
}

export type ListWithItems = { list: ReadingList; items: ListItem[] } | null;

export function useList(listId: string) {
  const getClient = useDataClientGetter();
  const { userId, ready } = useViewer();
  return useQuery<ListWithItems, AppError>({
    queryKey: listKeys.detail(listId, userId),
    queryFn: () => getList(getClient(), listId).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: ready,
    staleTime: 0,
  });
}

/** Ids of my lists that already hold the story. */
export function useListMembership(storyId: string, lists: readonly ReadingList[] | undefined) {
  const getClient = useDataClientGetter();
  const { userId } = useViewer();
  const ids = (lists ?? []).map((list) => list.id);
  return useQuery<string[], AppError>({
    queryKey: [...listKeys.membership(storyId, userId ?? "none"), ids],
    queryFn: () => getMembership(getClient(), storyId, ids).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null && lists !== undefined,
    staleTime: 0,
  });
}

/** Every write changes what the overview, a list page and the "add to list" sheet show; they reload in the background. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: listKeys.all });
}

export function useCreateList() {
  const getClient = useDataClientGetter();
  const { userId } = useViewer();
  const refresh = useRefresh();
  return useMutation<string, AppError, { id: string } & ListFormValues>({
    mutationFn: async (input) => {
      try {
        if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
        return await createList(getClient(), userId, input);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: refresh,
  });
}

export function useUpdateList(listId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefresh();
  return useMutation<void, AppError, ListFormValues>({
    mutationFn: async (values) => {
      try {
        await updateList(getClient(), listId, values);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: refresh,
  });
}

export function useDeleteList(listId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefresh();
  return useMutation<void, AppError, void>({
    mutationFn: async () => {
      try {
        await deleteList(getClient(), listId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: refresh,
  });
}

export function useAddToList() {
  const getClient = useDataClientGetter();
  const refresh = useRefresh();
  return useMutation<number, AppError, { listId: string; storyId: string }>({
    mutationFn: async ({ listId, storyId }) => {
      try {
        return await addStoryToList(getClient(), listId, storyId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

export function useRemoveFromList() {
  const getClient = useDataClientGetter();
  const refresh = useRefresh();
  return useMutation<void, AppError, { listId: string; storyId: string }>({
    mutationFn: async ({ listId, storyId }) => {
      try {
        await removeStoryFromList(getClient(), listId, storyId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

/**
 * Moves a story. The new order is shown at once and put back if the server refuses (the list changed elsewhere); the
 * list reloads afterwards either way so the screen ends up with the truth.
 */
export function useReorderList(listId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const { userId } = useViewer();
  const refresh = useRefresh();
  const key = listKeys.detail(listId, userId);
  return useMutation<void, AppError, string[], { previous: ListWithItems | undefined }>({
    mutationFn: async (storyIds) => {
      try {
        await reorderList(getClient(), listId, storyIds);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (storyIds) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ListWithItems>(key);
      if (previous) {
        const byId = new Map(previous.items.map((item) => [item.storyId, item]));
        const items = storyIds.flatMap((id) => byId.get(id) ?? []);
        const next: NonNullable<ListWithItems> = { ...previous, items };
        queryClient.setQueryData<ListWithItems>(key, next);
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: refresh,
  });
}
