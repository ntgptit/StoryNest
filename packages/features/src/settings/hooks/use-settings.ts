"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import type { NotificationPreferenceType } from "@storynest/validation";
import { getNotificationTypes, saveNotificationType } from "../api/notification-preferences.api.ts";
import { getSettings, saveSettings } from "../api/settings.api.ts";
import { settingsKeys } from "../keys.ts";
import type { AccountSettings, NotificationTypeSettings } from "../model/settings.ts";

function useUserId(): string | null {
  const auth = useAuth();
  return auth.status === "authenticated" ? auth.user.id : null;
}

export function useAccountSettings() {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useQuery<AccountSettings, AppError>({
    queryKey: settingsKeys.account(userId ?? "guest"),
    queryFn: () => getSettings(getClient()).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
  });
}

/** Saves the settings. The new values show at once; a refusal puts the previous ones back. */
export function useSaveSettings() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation<void, AppError, AccountSettings, { previous: AccountSettings | undefined }>({
    mutationFn: async (settings) => {
      if (userId === null) throw toAppError(new Error("not signed in"));
      try {
        await saveSettings(getClient(), userId, settings);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (settings) => {
      const key = settingsKeys.account(userId ?? "guest");
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AccountSettings>(key);
      queryClient.setQueryData(key, settings);
      return { previous };
    },
    onError: (_error, _settings, context) => {
      if (context?.previous) queryClient.setQueryData(settingsKeys.account(userId ?? "guest"), context.previous);
    },
  });
}

/** The per-type in-app switches under the group switches. */
export function useNotificationTypes() {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useQuery<NotificationTypeSettings, AppError>({
    queryKey: settingsKeys.notificationTypes(userId ?? "guest"),
    queryFn: () => getNotificationTypes(getClient()).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
  });
}

/** Saves one type's switch. It shows at once; a refusal puts the previous value back. */
export function useSaveNotificationType() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const key = settingsKeys.notificationTypes(userId ?? "guest");
  return useMutation<
    void,
    AppError,
    { type: NotificationPreferenceType; on: boolean },
    { previous: NotificationTypeSettings | undefined }
  >({
    mutationFn: async ({ type, on }) => {
      if (userId === null) throw toAppError(new Error("not signed in"));
      try {
        await saveNotificationType(getClient(), userId, type, on);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async ({ type, on }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationTypeSettings>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, [type]: on });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
  });
}
