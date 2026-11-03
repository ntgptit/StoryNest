import { z } from "zod";

const supabaseEnvSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

function readSupabaseEnv() {
  // Must reference process.env.NEXT_PUBLIC_* literally so Next can inline them into the browser bundle.
  return supabaseEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseEnv().success;
}

/** Throws a readable error instead of letting the Supabase client fail later with an opaque one. */
export function getSupabaseEnv(): SupabaseEnv {
  const parsed = readSupabaseEnv();
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see apps/web/.env.example).",
    );
  }
  return parsed.data;
}
