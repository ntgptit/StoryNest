"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getServerAdultContent,
  getStoredAdultContent,
  setStoredAdultContent,
  subscribeAdultContent,
} from "../model/store.ts";

/** The reader's choice about adult content on this device, and the two ways to change it. */
export function useAdultContent() {
  const choice = useSyncExternalStore(subscribeAdultContent, getStoredAdultContent, getServerAdultContent);
  /** Confirms "I am 18 or older" and shows adult content: only call it from the button that says so. */
  const enable = useCallback(() => setStoredAdultContent({ ageConfirmed: true, show: true }), []);
  /** Hides adult content again; the age confirmation is kept, so showing it again is one tap. */
  const disable = useCallback(() => setStoredAdultContent({ ...getStoredAdultContent(), show: false }), []);
  return { show: choice.show, ageConfirmed: choice.ageConfirmed, enable, disable };
}

/** Whether lists should include adult stories: the one flag every list passes to its query (and puts in its key). */
export function useShowMature(): boolean {
  return useAdultContent().show;
}
