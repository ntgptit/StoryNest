"use client";

import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  DEFAULT_LANGUAGE,
  getLanguage,
  readStoredLanguage,
  setLanguage,
  subscribeLanguage,
  type Language,
} from "./i18n.ts";

/** The current language, re-rendering the component when it changes. The server snapshot is always the default. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage, () => DEFAULT_LANGUAGE);
}

/**
 * Applies the stored language after hydration (so the first client render equals the server's), keeps `<html lang>`
 * right, and re-mounts the page below it when the language changes: every text is read again, without a reload.
 * Auth, queries and everything above it stay as they are.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useLanguage();

  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored) setLanguage(stored, { persist: false });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <Fragment key={language}>{children}</Fragment>;
}
