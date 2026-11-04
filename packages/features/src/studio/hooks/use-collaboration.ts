"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { storyKeys } from "../../story/index.ts";
import {
  cancelInvitation,
  inviteCollaborator,
  removeCollaborator,
  respondToInvitation,
} from "../api/collaboration.api.ts";
import { studioKeys } from "../keys.ts";
import type { Collaborator, CollaboratorRole, MyInvitation, StoryInvitation } from "../model/collaboration.ts";
import { collaboratorsQueryOptions, myInvitationsQueryOptions, storyInvitationsQueryOptions } from "../queries.ts";

/** Invitations addressed to me. Idle until the session is known. */
export function useMyInvitations() {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useQuery<MyInvitation[], AppError>({
    ...myInvitationsQueryOptions(getClient, userId ?? "none"),
    enabled: userId !== null,
    staleTime: 0,
  });
}

export function useCollaborators(storyId: string, enabled: boolean) {
  const getClient = useDataClientGetter();
  return useQuery<Collaborator[], AppError>({
    ...collaboratorsQueryOptions(getClient, storyId),
    enabled,
    staleTime: 0,
  });
}

export function useStoryInvitations(storyId: string, enabled: boolean) {
  const getClient = useDataClientGetter();
  return useQuery<StoryInvitation[], AppError>({
    ...storyInvitationsQueryOptions(getClient, storyId),
    enabled,
    staleTime: 0,
  });
}

/** Accept or decline. Accepting also changes my story list (and what I may read), so the studio is reloaded. */
export function useRespondToInvitation() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { invitationId: string; accept: boolean }>({
    mutationFn: async ({ invitationId, accept }) => {
      try {
        await respondToInvitation(getClient(), invitationId, accept);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: studioKeys.all }),
        queryClient.invalidateQueries({ queryKey: storyKeys.all }),
      ]),
  });
}

function useRefreshTeam(storyId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: studioKeys.collaborators(storyId) }),
      queryClient.invalidateQueries({ queryKey: studioKeys.storyInvitations(storyId) }),
    ]);
}

export function useInviteCollaborator(storyId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshTeam(storyId);
  return useMutation<string, AppError, { username: string; role: CollaboratorRole }>({
    mutationFn: async ({ username, role }) => {
      try {
        return await inviteCollaborator(getClient(), storyId, username, role);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

export function useCancelInvitation(storyId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshTeam(storyId);
  return useMutation<void, AppError, string>({
    mutationFn: async (invitationId) => {
      try {
        await cancelInvitation(getClient(), invitationId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

export function useRemoveCollaborator(storyId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshTeam(storyId);
  return useMutation<void, AppError, string>({
    mutationFn: async (userId) => {
      try {
        await removeCollaborator(getClient(), storyId, userId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}
