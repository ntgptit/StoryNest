"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { debounce } from "@storynest/utils";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { adultContentKeys } from "../keys.ts";
import { getRemoteAdultContent, saveRemoteAdultContent } from "../api/adult-content.api.ts";
import {
  getStoredAdultContent,
  setStoredAdultContent,
  subscribeAdultContent,
  type AdultContentChoice,
} from "../model/store.ts";

const SAVE_DELAY_MS = 500;

const same = (a: AdultContentChoice, b: AdultContentChoice) => a.ageConfirmed === b.ageConfirmed && a.show === b.show;

/**
 * Keeps a signed-in reader's account choice and this device's choice together (WP 6.3):
 *  - an account that has confirmed its age decides: its choice becomes the device's (it follows the reader to a new device);
 *  - otherwise the device keeps its choice, and a confirmed one is uploaded (a choice made as a guest is not lost);
 *  - afterwards every change on the device is saved to the account.
 * Guests and failures change nothing: the device choice always works on its own.
 */
export function useAdultContentSync() {
  const auth = useAuth();
  const getClient = useDataClientGetter();
  const userId = auth.status === "authenticated" ? auth.user.id : null;

  const remote = useQuery({
    queryKey: adultContentKeys.remote(userId ?? "guest"),
    queryFn: () => getRemoteAdultContent(getClient()),
    enabled: userId !== null,
    staleTime: 0,
    gcTime: 0,
  });

  const lastSynced = useRef<AdultContentChoice | null>(null);

  useEffect(() => {
    if (userId === null || !remote.isSuccess) return;
    const save = debounce(() => {
      const current = getStoredAdultContent();
      if (lastSynced.current && same(lastSynced.current, current)) return;
      void saveRemoteAdultContent(getClient(), userId, current).then(
        () => {
          lastSynced.current = current;
        },
        () => undefined, // best effort: the next change tries again
      );
    }, SAVE_DELAY_MS);

    if (remote.data?.ageConfirmed) {
      lastSynced.current = remote.data;
      if (!same(remote.data, getStoredAdultContent())) setStoredAdultContent(remote.data);
    } else if (getStoredAdultContent().ageConfirmed) {
      save();
    }

    const unsubscribe = subscribeAdultContent(save);
    return () => {
      unsubscribe();
      save.flush();
      save.cancel();
    };
  }, [userId, remote.isSuccess, remote.data, getClient]);
}
