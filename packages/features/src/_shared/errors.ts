import { ZodError } from "zod";
import { classifyRpcError } from "@storynest/validation";

/**
 * What went wrong, from the point of view of what the UI should do about it. UI code switches on `kind` and
 * shows a translated message (`errorMessageKey(kind)`); it never inspects raw Postgres/PostgREST codes.
 */
export type AppErrorKind =
  | "unauthenticated" // no/expired session: send the user to sign in
  | "forbidden" //       signed in but not allowed (RLS, role)
  | "notFound" //        missing, or hidden from this user
  | "conflict" //        stale revision, duplicate, wrong state: refresh and retry
  | "invalid" //         input rejected by validation or a constraint
  | "network" //         request never completed: retry later
  | "unknown";

export class AppError extends Error {
  readonly kind: AppErrorKind;
  /** Original SQLSTATE / PostgREST / auth code, for logs and support (never for branching in UI). */
  readonly code: string | undefined;
  /** Zod issues or server details when available (form field errors). */
  readonly details: unknown;

  constructor(
    kind: AppErrorKind,
    message: string,
    options: { code?: string; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.kind = kind;
    this.code = options.code;
    this.details = options.details;
  }
}

/** i18n key for the generic, user-facing text of each kind (translations arrive with WBS WP 0.4). */
export function errorMessageKey(kind: AppErrorKind): `errors.${AppErrorKind}` {
  return `errors.${kind}`;
}

/** Kinds where retrying the identical request cannot succeed. */
export function isPermanent(kind: AppErrorKind): boolean {
  return kind !== "network" && kind !== "unknown";
}

interface PostgrestLike {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
  name?: unknown;
}

// 42501, PT404, PT409 and 22023 (our RPC contract) are handled first by classifyRpcError from @storynest/validation,
// the single source of truth for them; this table covers the remaining codes PostgREST/Postgres can return.
const POSTGRES_KIND: Record<string, AppErrorKind> = {
  PGRST116: "notFound", // .single() matched zero rows
  "23505": "conflict", // unique_violation
  "23503": "conflict", // foreign_key_violation
  "40001": "conflict", // serialization_failure
  "40P01": "conflict", // deadlock_detected
  "23514": "invalid", // check_violation
  "23502": "invalid", // not_null_violation
  "22P02": "invalid", // invalid_text_representation
  "22001": "invalid", // string_data_right_truncation
  PGRST301: "unauthenticated", // JWT expired / invalid
  PGRST303: "unauthenticated",
};

/** Normalises anything thrown or returned as `{ error }` by supabase-js, fetch or Zod into an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError("invalid", "Validation failed", { details: error.issues, cause: error });
  }

  // fetch() rejects with TypeError when the network is down, DNS fails, CORS blocks, etc.
  if (error instanceof TypeError) {
    return new AppError("network", error.message || "Network request failed", { cause: error });
  }

  if (typeof error === "object" && error !== null) {
    const e = error as PostgrestLike;
    const code = typeof e.code === "string" ? e.code : undefined;
    const message = typeof e.message === "string" ? e.message : "Unknown error";
    const details = e.details ?? e.hint;

    // Same mapping the publish RPC contract documents (validation package), checked first.
    const rpc = classifyRpcError(code);
    if (rpc !== "unknown") {
      return new AppError(rpc, message, { code, details, cause: error });
    }

    const mapped = code === undefined ? undefined : POSTGRES_KIND[code];
    if (mapped) return new AppError(mapped, message, { code, details, cause: error });

    // supabase-js auth errors carry an HTTP-ish status and a name.
    const status = typeof e.status === "number" ? e.status : undefined;
    if (e.name === "AuthApiError" || e.name === "AuthSessionMissingError" || e.name === "AuthRetryableFetchError") {
      if (e.name === "AuthRetryableFetchError") return new AppError("network", message, { code, cause: error });
      if (status === 422 || status === 400) {
        // Wrong password, email taken, weak password, etc.: the user can fix the input.
        return new AppError("invalid", message, { code, details, cause: error });
      }
      return new AppError("unauthenticated", message, { code, details, cause: error });
    }
    if (status === 401) return new AppError("unauthenticated", message, { code, details, cause: error });
    if (status === 403) return new AppError("forbidden", message, { code, details, cause: error });
    if (status === 404) return new AppError("notFound", message, { code, details, cause: error });
    if (status === 409) return new AppError("conflict", message, { code, details, cause: error });

    return new AppError("unknown", message, { code, details, cause: error });
  }

  return new AppError("unknown", typeof error === "string" ? error : "Unknown error", { cause: error });
}

/** Runs a Supabase call and converts `{ data, error }` into data-or-throw with an AppError. */
export function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw toAppError(result.error);
  return result.data;
}
