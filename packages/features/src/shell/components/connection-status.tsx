"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@storynest/ui/lib/use-media-query";
import { ConnectionBanner, type ConnectionState } from "@storynest/ui/widgets/connection-banner";
import { shellText } from "../strings.ts";

/** How long "Back online" stays before the strip folds away. */
export const BACK_ONLINE_MS = 3000;

/**
 * Offline strip under the header (Lucian 091). Offline: says so until the network returns. Back online: says so
 * for a moment and refetches the queries on screen that failed meanwhile; the rest is left to what already exists
 * (React Query refetches stale queries on reconnect and holds mutations started offline until then, the chapter
 * editor's autosave retries on "online"). Nothing new is queued here.
 */
export function ConnectionStatus() {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConnectionState>("online");
  // Only a change seen while the page is open unfolds the strip; a page loaded offline shows it at once.
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const onChange = () => setChanged(true);
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  }, []);

  const wasOffline = useRef(false);
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setState("offline");
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setState("back");
    void queryClient.refetchQueries(
      { type: "active", predicate: (query) => query.state.status === "error" },
      { cancelRefetch: false },
    );
    const timer = setTimeout(() => setState("online"), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [online, queryClient]);

  return <ConnectionBanner state={state} animate={changed} labels={shellText.connection} />;
}
