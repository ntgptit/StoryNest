import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isPermanent, toAppError, type AppError } from "./errors.ts";

const MAX_RETRIES = 2;

/** Retry only what can succeed later (network, unknown); never repeat forbidden/notFound/conflict/invalid. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isPermanent(toAppError(error).kind)) return false;
  return failureCount < MAX_RETRIES;
}

export interface QueryClientOptions {
  /** Called once per failed query/mutation (after retries). Use it for logging; screens decide what to show. */
  onError?: (error: AppError) => void;
}

export function createQueryClient(options: QueryClientOptions = {}): QueryClient {
  const report = (error: unknown) => options.onError?.(toAppError(error));
  return new QueryClient({
    queryCache: new QueryCache({ onError: report }),
    mutationCache: new MutationCache({ onError: report }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
      // Writes are not idempotent by default: never retry them automatically.
      mutations: { retry: false },
    },
  });
}
