// No zod here on purpose: this module is imported by the root providers, so whatever it imports is in every route's
// bundle. The checks below match what the former schema accepted (z.url() is the WHATWG URL parser, like URL.canParse).
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

function readSupabaseEnv(): SupabaseEnv | null {
  // Must reference process.env.NEXT_PUBLIC_* literally so Next can inline them into the browser bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== "string" || !URL.canParse(url)) return null;
  if (typeof publishableKey !== "string" || publishableKey.length === 0) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseEnv() !== null;
}

/** Throws a readable error instead of letting the Supabase client fail later with an opaque one. */
export function getSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (env === null) {
    throw new Error(
      "Missing or invalid Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see apps/web/.env.example).",
    );
  }
  return env;
}
