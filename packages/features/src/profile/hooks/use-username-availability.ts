"use client";

import { useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { useDebouncedValue } from "../../search/index.ts";
import { isUsernameInUse } from "../api/profile.api.ts";
import {
  USERNAME_CHECK_DELAY_MS,
  usernameAvailability,
  usernameToCheck,
  type UsernameAvailability,
} from "../model/username.ts";

export const usernameKeys = {
  inUse: (name: string) => ["profile", "username-in-use", name] as const,
};

/**
 * Live "free / taken" hint for a username field (Lucian 300): looks the name up after a pause in typing, through the
 * public app_users read. Only a hint: a failed lookup shows nothing, and the save or sign-up stays the real check.
 * `current` is the person's own name (edit profile), which is never reported as taken.
 */
export function useUsernameAvailability(value: string, current?: string | null): UsernameAvailability {
  const getClient = useDataClientGetter();
  const typed = usernameToCheck(value, current);
  const settled = useDebouncedValue(typed, USERNAME_CHECK_DELAY_MS);
  const query = useQuery<boolean, AppError>({
    queryKey: usernameKeys.inUse(settled ?? ""),
    queryFn: () => isUsernameInUse(getClient(), settled ?? "").catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: settled !== null && settled === typed,
    staleTime: 30_000,
    retry: false,
  });
  if (query.isError) return "idle";
  return usernameAvailability({ typed, settled, inUse: query.data });
}
