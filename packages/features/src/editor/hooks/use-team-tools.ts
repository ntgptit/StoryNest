"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { callEditLock, getEditLock, releaseEditLock } from "../api/edit-lock.api.ts";
import { decideChapterReview, getChapterReview, requestChapterReview } from "../api/review.api.ts";
import { EDIT_LOCK_HEARTBEAT_MS, type EditLock } from "../model/edit-lock.ts";
import type { ChapterReview } from "../model/review.ts";

export const teamKeys = {
  review: (chapterId: string) => ["editor", "review", chapterId] as const,
  lock: (chapterId: string) => ["editor", "lock", chapterId] as const,
};

// ---- review sign-off (Lucian 180) -------------------------------------------------------------------------------

export function useChapterReview(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<ChapterReview | null, AppError>({
    queryKey: teamKeys.review(chapterId),
    queryFn: () =>
      getChapterReview(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
    enabled: auth.status === "authenticated",
    staleTime: 30_000,
  });
}

/** Ask for a sign-off: the unsaved text is saved first (`ensureSaved`), and that revision is what gets reviewed. */
export function useRequestReview(chapterId: string, ensureSaved: () => Promise<number | null>) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (note) => {
      try {
        const revision = await ensureSaved();
        if (revision === null) throw toAppError({ code: "PT409", message: "The draft could not be saved first" });
        await requestChapterReview(getClient(), chapterId, revision, note);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKeys.review(chapterId) }),
  });
}

export function useDecideReview(chapterId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { approve: boolean; note: string }>({
    mutationFn: async ({ approve, note }) => {
      try {
        await decideChapterReview(getClient(), chapterId, approve, note);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKeys.review(chapterId) }),
  });
}

// ---- edit lock (Lucian 196) ---------------------------------------------------------------------------------------

/**
 * The chapter's advisory edit lock while the editor is open. On open, and every 30 s while the tab is visible, it
 * claims the lock: that takes it when it is free or expired and renews it when it is mine; when someone else holds
 * it nothing changes. Closing the editor releases it (best effort; otherwise it expires after 90 s). Changes arrive
 * through Supabase Realtime (the project already uses it for notifications) and a 20 s poll, so a missed event or
 * an unavailable socket only delays the update. Saving is never blocked: the draft's revision check stays the guard.
 */
export function useEditLock(chapterId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const signedIn = auth.status === "authenticated";
  const key = teamKeys.lock(chapterId);

  const lock = useQuery<EditLock | null, AppError>({
    queryKey: key,
    queryFn: () => getEditLock(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
    enabled: signedIn,
    refetchInterval: 20_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (!signedIn) return;
    const client = getClient();
    const refresh = () => void queryClient.invalidateQueries({ queryKey: key });
    const claim = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      callEditLock(client, "claim_edit_lock", chapterId).then(refresh, () => undefined);
    };
    claim();
    const timer = setInterval(claim, EDIT_LOCK_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", claim);

    let channel: ReturnType<typeof client.channel> | null = null;
    try {
      channel = client
        .channel(`edit-lock:${chapterId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chapter_edit_locks", filter: `chapter_id=eq.${chapterId}` },
          refresh,
        )
        .subscribe();
    } catch {
      channel = null; // no realtime: the poll keeps the screen current
    }
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", claim);
      if (channel) void client.removeChannel(channel);
      releaseEditLock(client, chapterId).catch(() => undefined);
    };
    // `key` is derived from chapterId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getClient, queryClient, chapterId, signedIn]);

  const action = useMutation<
    void,
    AppError,
    "claim_edit_lock" | "request_edit_lock" | "hand_over_edit_lock" | "decline_edit_request"
  >({
    mutationFn: async (name) => {
      try {
        await callEditLock(getClient(), name, chapterId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { lock, action };
}
