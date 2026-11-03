"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DataClient } from "./client.ts";

const DataContext = createContext<{ client: DataClient | null } | undefined>(undefined);

/**
 * Supplies the Supabase client created by the host app. `client` may be null when the app runs without
 * Supabase configured (local UI work): screens then fail on first use with a clear message instead of
 * crashing at startup.
 */
export function DataProvider({ client, children }: { client: DataClient | null; children: ReactNode }) {
  return <DataContext value={{ client }}>{children}</DataContext>;
}

export function useDataClient(): DataClient {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error("useDataClient must be used inside <DataProvider>.");
  if (context.client === null) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  }
  return context.client;
}

/** For infrastructure that must tolerate a missing client (e.g. AuthProvider). Prefer useDataClient elsewhere. */
export function useOptionalDataClient(): DataClient | null {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error("useOptionalDataClient must be used inside <DataProvider>.");
  return context.client;
}
