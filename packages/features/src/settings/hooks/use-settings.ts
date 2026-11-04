"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getSettings, saveSettings } from "../api/settings.api.ts";
import { settingsKeys } from "../keys.ts";
import type { AccountSettings } from "../model/settings.ts";

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
