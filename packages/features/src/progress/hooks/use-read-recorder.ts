"use client";

import { useEffect } from "react";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { recordChapterRead } from "../api/progress.api.ts";
import { getAnonymousReaderId } from "../model/anonymous-reader.ts";
import { READ_DWELL_MS } from "../model/progress.ts";

/** Chapters already reported in this page session, per reader: SPA back/forward does not call the server again. */
const reported = new Set<string>();

/**
 * Reports a read once the chapter has been on screen for READ_DWELL_MS with the tab visible (hiding the tab pauses and
 * restarts the clock). Signed-in readers are counted by account, guests by an anonymous id. Waits for the session to
 * be known so one person is not counted twice as guest and member. Best effort: errors are ignored; the server
 * dedupes, so a refresh never adds a read.
 */
export function useReadRecorder(chapterId: string) {
  const auth = useAuth();
  const getClient = useDataClientGetter();
  const readerKey = auth.status === "authenticated" ? auth.user.id : auth.status === "unauthenticated" ? "guest" : null;

  useEffect(() => {
    if (readerKey === null) return;
    const key = `${readerKey}:${chapterId}`;
    if (reported.has(key)) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      timer = undefined;
      reported.add(key);
      const anonymousId = readerKey === "guest" ? getAnonymousReaderId() : null;
      void recordChapterRead(getClient(), chapterId, anonymousId).catch(() => reported.delete(key));
    };
    const sync = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = document.visibilityState === "visible" ? setTimeout(report, READ_DWELL_MS) : undefined;
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [readerKey, chapterId, getClient]);
}
