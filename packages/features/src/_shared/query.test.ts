import { describe, expect, it, vi } from "vitest";
import { AppError } from "./errors.ts";
import { createQueryClient, shouldRetry } from "./query.ts";

describe("shouldRetry", () => {
  it("never retries permanent failures", () => {
    for (const kind of ["unauthenticated", "forbidden", "notFound", "conflict", "invalid"] as const) {
      expect(shouldRetry(0, new AppError(kind, "x"))).toBe(false);
    }
    expect(shouldRetry(0, { code: "42501", message: "rls" })).toBe(false); // raw errors are classified first
  });

  it("retries network/unknown errors at most twice", () => {
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(1, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(2, new TypeError("Failed to fetch"))).toBe(false);
    expect(shouldRetry(0, new Error("???"))).toBe(true);
  });
});

describe("createQueryClient", () => {
  it("has the agreed defaults", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("reports failed queries and mutations as AppError", async () => {
    const onError = vi.fn();
    const client = createQueryClient({ onError });
    await client
      .fetchQuery({ queryKey: ["q"], queryFn: () => Promise.reject({ code: "PT404", message: "gone" }), retry: false })
      .catch(() => undefined);
    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject({ code: "PT409", message: "stale" }) })
      .execute(undefined)
      .catch(() => undefined);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ kind: "notFound" });
    expect(onError.mock.calls[1]?.[0]).toMatchObject({ kind: "conflict" });
  });
});
