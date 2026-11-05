"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AuthProvider,
  DataProvider,
  LanguageProvider,
  LanguageSync,
  PlatformProvider,
  QueryProvider,
  ToastProvider,
  type DataClient,
} from "@storynest/features";
import { Toaster } from "@storynest/ui/components/sonner";
import { TooltipProvider } from "@storynest/ui/components/tooltip";

import { isSupabaseConfigured } from "@/lib/env";
import { nextPlatformAdapterFor } from "@/lib/platform/next-adapter";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sonnerToastPort } from "@/lib/toast";

/**
 * Client-side providers for the whole app. Order matters: the query client is needed by auth, the data client by
 * auth, and platform navigation by every screen. `siteOrigin` is the canonical origin (read on the server by the root
 * layout); shared links (copy link, share sheet) are built on it.
 */
export function Providers({ siteOrigin, children }: { siteOrigin: string; children: ReactNode }) {
  // Without Supabase configured (local UI work) the app still renders; data hooks fail with a clear message.
  const [client] = useState<DataClient | null>(() => (isSupabaseConfigured() ? createSupabaseBrowserClient() : null));
  const adapter = useMemo(() => nextPlatformAdapterFor(siteOrigin), [siteOrigin]);

  return (
    <QueryProvider>
      <DataProvider client={client}>
        <PlatformProvider adapter={adapter}>
          <ToastProvider port={sonnerToastPort}>
            <TooltipProvider>
              <AuthProvider>
                {/* Outside the language provider on purpose: that one re-mounts what is below it when the language changes. */}
                <LanguageSync />
                <LanguageProvider>{children}</LanguageProvider>
              </AuthProvider>
              <Toaster />
            </TooltipProvider>
          </ToastProvider>
        </PlatformProvider>
      </DataProvider>
    </QueryProvider>
  );
}
