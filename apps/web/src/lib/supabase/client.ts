import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@storynest/database";

import { getSupabaseEnv } from "@/lib/env";

/** Browser client (Client Components). Auth cookies are shared with the server client. */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
