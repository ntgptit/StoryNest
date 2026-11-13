"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useAuth } from "../../_shared/auth.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { publishErrorMessage } from "../model/publishing.ts";
import { editorText } from "../strings.ts";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { discoveryKeys } from "../../discovery/index.ts";
import { storyKeys } from "../../story/index.ts";
import {
  getChapterPublishState,
  getPublishPreview,
  publishChapter,
  scheduleChapter,
  unpublishChapter,
  type ChapterPublishState,
  type PublishPreview,
} from "../api/publishing.api.ts";

const publishStateKey = (chapterId: string) => ["editor", "publish-state", chapterId] as const;

/** Whether the chapter is a draft, scheduled, published or archived, and what this user may do about it. */
export function useChapterPublishState(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<ChapterPublishState | null, AppError>({
    queryKey: publishStateKey(chapterId),
    queryFn: () =>
      getChapterPublishState(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
    enabled: auth.status === "authenticated",
    staleTime: 0,
  });
}

/** What publishing will do (first publish, who is told). Quiet when it cannot be read: the panel then says nothing. */
export function usePublishPreview(chapterId: string, enabled: boolean) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<PublishPreview | null, AppError>({
    queryKey: ["editor", "publish-preview", chapterId] as const,
    queryFn: () =>
      getPublishPreview(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
    enabled: enabled && auth.status === "authenticated",
    staleTime: 0,
  });
}

type Action =
  | { kind: "publish"; expectedRevision: number }
  | { kind: "schedule"; expectedRevision: number; scheduledFor: string }
  | { kind: "unpublish" };

/** Publish, schedule or unpublish one chapter, then refresh everything that shows it (state, studio, story page, feed). */
export function usePublishAction(chapterId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, Action>({
    mutationFn: async (action) => {
      try {
        const client = getClient();
        if (action.kind === "publish") await publishChapter(client, chapterId, action.expectedRevision);
        else if (action.kind === "schedule")
          await scheduleChapter(client, chapterId, action.scheduledFor, action.expectedRevision);
        else await unpublishChapter(client, chapterId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: publishStateKey(chapterId) }),
        queryClient.invalidateQueries({ queryKey: ["studio"] }),
        queryClient.invalidateQueries({ queryKey: storyKeys.all }),
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all }),
      ]),
  });
}

/** Which await of a running action is in progress, for the button's label: saving the draft, then sending it. */
export type PublishPhase = "saving" | "publishing" | "scheduling" | "unpublishing";

/**
 * The publish / schedule / unpublish flow every surface shares (the editor's publish panel, the chapter manager's
 * scheduled list). One action at a time: locked from the first click until the answer is back, so a double click
 * cannot publish twice. Publish and schedule first ask `ensureSaved` for the draft revision to send (null: it could
 * not be saved, nothing is sent), so a draft someone else changed meanwhile is refused instead of published over.
 * A refusal is shown as `error` (the RPC contract's message); success shows `success` as a toast.
 * Each action resolves to whether it went through. `phase` says which step is running (Lucian 081's steps), and
 * `dismissError` hides the shown refusal.
 */
export function usePublishFlow(chapterId: string, ensureSaved: () => Promise<number | null>) {
  const toast = useAppToast();
  const action = usePublishAction(chapterId);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PublishPhase | null>(null);
  const lock = useRef(false);

  const run = async (
    task: (revision: number) => Promise<void>,
    sending: Exclude<PublishPhase, "saving">,
    needsSaved: boolean,
    success: string,
  ) => {
    if (lock.current) return false;
    lock.current = true;
    setPhase(needsSaved ? "saving" : sending);
    setError(null);
    try {
      let revision = 0;
      if (needsSaved) {
        const saved = await ensureSaved();
        if (saved === null) {
          setError(editorText.publish.saveFirst);
          return false;
        }
        revision = saved;
        setPhase(sending);
      }
      await task(revision);
      toast.success(success);
      return true;
    } catch (failure) {
      setError(publishErrorMessage(toAppError(failure)));
      return false;
    } finally {
      lock.current = false;
      setPhase(null);
    }
  };

  return {
    busy: phase !== null,
    phase,
    error,
    dismissError: () => setError(null),
    publish: (success: string) =>
      run(
        (revision) => action.mutateAsync({ kind: "publish", expectedRevision: revision }),
        "publishing",
        true,
        success,
      ),
    /** `scheduledFor` is the ISO instant from scheduleInstant (the picker's value already checked). */
    schedule: (scheduledFor: string, success: string) =>
      run(
        (revision) => action.mutateAsync({ kind: "schedule", expectedRevision: revision, scheduledFor }),
        "scheduling",
        true,
        success,
      ),
    unpublish: (success: string) =>
      run(() => action.mutateAsync({ kind: "unpublish" }), "unpublishing", false, success),
  };
}
