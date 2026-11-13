import { cache } from "react";
import { getAuthorProfile, type AuthorProfile } from "@storynest/features";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Looks an author up once per request (metadata and page share it).
 * null = no such visible author; undefined = could not be loaded (no env / error), so the client decides.
 */
export const loadAuthor = cache(async (username: string): Promise<AuthorProfile | null | undefined> => {
  if (!isSupabaseConfigured()) return undefined;
  try {
    return await getAuthorProfile(await createSupabaseServerClient(), username);
  } catch (error) {
    console.error("author: lookup failed", error);
    return undefined;
  }
});
