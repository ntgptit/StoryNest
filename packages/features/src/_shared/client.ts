import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@storynest/database";

/**
 * The typed Supabase client every feature `api/` function receives as its first argument. Features never create
 * a client themselves: the app (web or mobile) provides one, which keeps the code testable and platform-neutral.
 */
export type DataClient = SupabaseClient<Database>;
