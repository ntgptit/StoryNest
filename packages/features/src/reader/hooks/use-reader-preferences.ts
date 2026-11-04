"use client";

import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import type { ReaderPreferences } from "@storynest/validation";
import { applyReaderPreferences, clearReaderPreferences } from "../model/preferences.ts";
import {
  getServerReaderPreferences,
  getStoredReaderPreferences,
  setStoredReaderPreferences,
  subscribeReaderPreferences,
} from "../model/preferences-store.ts";

/** Layout effects do not run on the server; this avoids the warning where React still reports it. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Current preferences of this device and a function to change some of them (applied and saved at once). */
export function useReaderPreferences() {
  const preferences = useSyncExternalStore(
    subscribeReaderPreferences,
    getStoredReaderPreferences,
    getServerReaderPreferences,
  );
  const update = useCallback((patch: Partial<ReaderPreferences>) => {
    setStoredReaderPreferences({ ...getStoredReaderPreferences(), ...patch });
  }, []);
  return { preferences, update };
}

/**
 * Keeps the data-reader-* attributes of <html> equal to the stored preferences while the reader is open, and removes
 * them when it closes. Reads the store directly (not render state) so the very first application during hydration
 * already uses the real stored value instead of the server default.
 */
export function useApplyReaderPreferences() {
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const apply = () => applyReaderPreferences(getStoredReaderPreferences(), root);
    apply();
    const unsubscribe = subscribeReaderPreferences(apply);
    return () => {
      unsubscribe();
      clearReaderPreferences(root);
    };
  }, []);
}
