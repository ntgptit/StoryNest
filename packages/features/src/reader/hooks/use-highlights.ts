"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HighlightStyle } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { addHighlight, listMyHighlights, removeHighlights } from "../api/highlights.api.ts";
import { readerKeys } from "../keys.ts";
import type { Highlight } from "../model/highlights.ts";

/** My highlights in a chapter. A guest has none and nothing is asked. */
export function useMyHighlights(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  const query = useQuery<Highlight[], AppError>({
    queryKey: readerKeys.highlights(chapterId, userId),
    queryFn: () => listMyHighlights(getClient(), chapterId).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
  });
  return { ...query, signedIn: userId !== null };
}

export function useAddHighlight(chapterId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<string, AppError, { blockId: string; start: number; end: number; style: HighlightStyle }>({
    mutationFn: async (input) => {
      try {
        return await addHighlight(getClient(), { ...input, chapterId });
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: readerKeys.highlightsOf(chapterId) }),
  });
}

export function useRemoveHighlights(chapterId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, readonly string[]>({
    mutationFn: async (ids) => {
      try {
        await removeHighlights(getClient(), ids);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: readerKeys.highlightsOf(chapterId) }),
  });
}
