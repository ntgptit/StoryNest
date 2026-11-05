"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnnouncementKind, toAnnouncementPayload } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter, useOptionalDataClient } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { useLanguage } from "../../_shared/language.tsx";
import {
  createAnnouncement,
  deleteAnnouncement,
  endAnnouncement,
  listActiveAnnouncements,
  listAllAnnouncements,
} from "../api/announcements.api.ts";
import { announcementsKeys } from "../keys.ts";
import type { Announcement } from "../model/announcement.ts";

/** How long a fetched list stays fresh: announcements change rarely, and every page of the shell reads them. */
const ACTIVE_STALE_MS = 5 * 60_000;

/**
 * What is showing now of one kind, in the interface language. Without a data client (dev without Supabase) it is
 * simply empty, so the shell renders nothing extra.
 */
export function useActiveAnnouncements(kind: AnnouncementKind) {
  const client = useOptionalDataClient();
  const locale = useLanguage();
  return useQuery<Announcement[], AppError>({
    queryKey: announcementsKeys.active(kind, locale),
    queryFn: () =>
      client
        ? listActiveAnnouncements(client, { kind, locale }).catch((e: unknown) => Promise.reject(toAppError(e)))
        : Promise.resolve([]),
    staleTime: ACTIVE_STALE_MS,
    enabled: client !== null,
  });
}

function useUserId(): string | null {
  const auth = useAuth();
  return auth.status === "authenticated" ? auth.user.id : null;
}

/** The moderator's list (every state). */
export function useManagedAnnouncements(enabled: boolean) {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useQuery<Announcement[], AppError>({
    queryKey: announcementsKeys.manage(userId ?? "none"),
    queryFn: () => listAllAnnouncements(getClient()).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: enabled && userId !== null,
  });
}

function useAnnouncementMutation<T>(run: (input: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, T>({
    mutationFn: async (input) => {
      try {
        await run(input);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: announcementsKeys.all }),
  });
}

export function useCreateAnnouncement() {
  const getClient = useDataClientGetter();
  return useAnnouncementMutation((payload: ReturnType<typeof toAnnouncementPayload>) =>
    createAnnouncement(getClient(), payload),
  );
}

export function useEndAnnouncement() {
  const getClient = useDataClientGetter();
  return useAnnouncementMutation((id: string) => endAnnouncement(getClient(), id));
}

export function useDeleteAnnouncement() {
  const getClient = useDataClientGetter();
  return useAnnouncementMutation((id: string) => deleteAnnouncement(getClient(), id));
}
