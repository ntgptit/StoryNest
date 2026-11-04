"use client";

import { useLanguageSync } from "../hooks/use-language-sync.ts";

/**
 * Renders nothing; mounted once for the whole app, ABOVE the LanguageProvider (which re-mounts everything below it when
 * the language changes: a sync that lived there would start again on every switch and could read the account's old value
 * back before the new one was saved).
 */
export function LanguageSync() {
  useLanguageSync();
  return null;
}
