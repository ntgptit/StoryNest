// Types generated from supabase/migrations (see supabase/scripts/gen-types.sh).
// Caveats the generator cannot express:
//  * CHECK-constrained columns (status, visibility, ...) are plain `string`: use @storynest/validation enums.
//  * Insert/Update types describe the table, not what API roles may write: column privileges and RLS in
//    supabase/migrations/*_auth_and_rls.sql restrict that, and publish state is written only through RPCs.
//  * jsonb columns are `Json`; parse them with the matching schema in @storynest/validation.
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from "./database.types.ts";

import type { Database } from "./database.types.ts";

/** Arguments / return type of a public RPC, e.g. RpcArgs<"publish_chapter">. */
export type RpcArgs<Name extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][Name]["Args"];
export type RpcReturns<Name extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][Name]["Returns"];
