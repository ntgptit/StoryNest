"use client";

import { useState, type ReactNode } from "react";
import { AuthProvider, DataProvider, PlatformProvider, QueryProvider, type DataClient } from "@storynest/features";

import { isSupabaseConfigured } from "@/lib/env";
import { nextPlatformAdapter } from "@/lib/platform/next-adapter";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Client-side providers for the whole app. Order matters: the query client is needed by auth, the data client by
 * auth, and platform navigation by every screen. ToastProvider joins when the toast library lands (WBS WP 0.5).
 */
export function Providers({ children }: { children: ReactNode }) {
  // Without Supabase configured (local UI work) the app still renders; data hooks fail with a clear message.
  const [client] = useState<DataClient | null>(() => (isSupabaseConfigured() ? createSupabaseBrowserClient() : null));

  return (
    <QueryProvider>
      <DataProvider client={client}>
        <PlatformProvider adapter={nextPlatformAdapter}>
          <AuthProvider>{children}</AuthProvider>
        </PlatformProvider>
      </DataProvider>
    </QueryProvider>
  );
}
