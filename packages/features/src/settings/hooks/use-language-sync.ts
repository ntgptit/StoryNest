"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { debounce } from "@storynest/utils";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import {
  getLanguage,
  languageChoices,
  readStoredLanguage,
  setLanguage,
  subscribeLanguage,
  type Language,
} from "../../_shared/i18n.ts";
import { getRemoteLanguage, saveRemoteLanguage } from "../api/language.api.ts";
import { settingsKeys } from "../keys.ts";

const SAVE_DELAY_MS = 500;

/**
 * Keeps a signed-in reader's account language and this device's language together (WP 0.4):
 *  - an account that has saved settings decides: its language becomes the device's (it follows the reader), unless the
 *    reader switched while it was being read;
 *  - an account with none gets the device's language if the reader ever chose one;
 *  - afterwards every change on the device is saved to the account.
 * Guests and failures change nothing: the device language always works on its own.
 */
export function useLanguageSync() {
  const auth = useAuth();
  const getClient = useDataClientGetter();
  const userId = auth.status === "authenticated" ? auth.user.id : null;

  const remote = useQuery({
    queryKey: settingsKeys.language(userId ?? "guest"),
    queryFn: () => getRemoteLanguage(getClient()),
    enabled: userId !== null,
    staleTime: 0,
    gcTime: 0,
  });

  const lastSynced = useRef<Language | null>(null);
  const choicesAtStart = useRef(languageChoices());

  useEffect(() => {
    if (userId === null || !remote.isSuccess) return;
    const save = debounce(() => {
      const current = getLanguage();
      if (lastSynced.current === current) return;
      void saveRemoteLanguage(getClient(), userId, current).then(
        () => {
          lastSynced.current = current;
        },
        () => undefined, // best effort: the next change tries again
      );
    }, SAVE_DELAY_MS);

    if (remote.data) {
      lastSynced.current = remote.data;
      if (remote.data !== getLanguage()) {
        // If the reader switched while the account was still being read, their choice is the newer one: it wins.
        if (languageChoices() > choicesAtStart.current) save();
        else setLanguage(remote.data, { fromAccount: true });
      }
    } else if (readStoredLanguage()) {
      save();
    }

    const unsubscribe = subscribeLanguage(save);
    return () => {
      unsubscribe();
      save.flush();
      save.cancel();
    };
  }, [userId, remote.isSuccess, remote.data, getClient]);
}
