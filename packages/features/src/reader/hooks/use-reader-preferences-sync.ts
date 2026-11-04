"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { debounce } from "@storynest/utils";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { getRemoteReaderPreferences, saveRemoteReaderPreferences } from "../api/preferences.api.ts";
import { isDefaultPreferences, samePreferences } from "../model/preferences.ts";
import {
  getStoredReaderPreferences,
  setStoredReaderPreferences,
  subscribeReaderPreferences,
} from "../model/preferences-store.ts";

const SAVE_DELAY_MS = 1500;

export const readerPreferencesKeys = {
  remote: (userId: string) => ["reader", "preferences", userId] as const,
};

/**
 * Keeps a signed-in reader's account copy and this device's copy together:
 *  - the account copy, when it exists, becomes the device copy (settings follow the reader to a new device);
 *  - otherwise a customised device copy is uploaded;
 *  - afterwards every change on the device is saved to the account after a short pause (and on leaving).
 * Guests and failures change nothing: the device copy always works on its own.
 */
export function useReaderPreferencesSync() {
  const auth = useAuth();
  const getClient = useDataClientGetter();
  const userId = auth.status === "authenticated" ? auth.user.id : null;

  const remote = useQuery({
    queryKey: readerPreferencesKeys.remote(userId ?? "guest"),
    queryFn: () => getRemoteReaderPreferences(getClient()),
    enabled: userId !== null,
    staleTime: 0,
    gcTime: 0,
  });

  const lastSynced = useRef<ReturnType<typeof getStoredReaderPreferences> | null>(null);

  useEffect(() => {
    if (userId === null || !remote.isSuccess) return;
    const save = debounce(() => {
      const current = getStoredReaderPreferences();
      if (lastSynced.current && samePreferences(lastSynced.current, current)) return;
      void saveRemoteReaderPreferences(getClient(), userId, current).then(
        () => {
          lastSynced.current = current;
        },
        () => undefined, // best effort: the next change tries again
      );
    }, SAVE_DELAY_MS);

    if (remote.data) {
      lastSynced.current = remote.data;
      if (!samePreferences(remote.data, getStoredReaderPreferences())) setStoredReaderPreferences(remote.data);
    } else if (!isDefaultPreferences(getStoredReaderPreferences())) {
      save();
    }

    const unsubscribe = subscribeReaderPreferences(save);
    return () => {
      unsubscribe();
      save.flush();
      save.cancel();
    };
  }, [userId, remote.isSuccess, remote.data, getClient]);
}
