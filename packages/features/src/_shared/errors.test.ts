import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, errorMessageKey, isPermanent, toAppError, unwrap, type AppErrorKind } from "./errors.ts";

const pg = (code: string, message = "boom") => ({ code, message, details: null, hint: null });

describe("toAppError: Postgres / PostgREST codes", () => {
  const cases: [string, AppErrorKind][] = [
    ["42501", "forbidden"],
    ["PT404", "notFound"],
    ["PGRST116", "notFound"],
    ["PT409", "conflict"],
    ["23505", "conflict"],
    ["23503", "conflict"],
    ["40001", "conflict"],
    ["22023", "invalid"],
    ["23514", "invalid"],
    ["23502", "invalid"],
    ["22P02", "invalid"],
    ["PGRST301", "unauthenticated"],
    ["XX000", "unknown"],
  ];
  it.each(cases)("%s -> %s", (code, kind) => {
    const error = toAppError(pg(code));
    expect(error.kind).toBe(kind);
    expect(error.code).toBe(code);
    expect(error.message).toBe("boom");
  });
});

describe("toAppError: other sources", () => {
  it("passes AppError through unchanged", () => {
    const original = new AppError("conflict", "x");
    expect(toAppError(original)).toBe(original);
  });

  it("maps Zod errors to invalid and keeps the issues for form fields", () => {
    const parsed = z.object({ title: z.string().min(1) }).safeParse({ title: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const error = toAppError(parsed.error);
    expect(error.kind).toBe("invalid");
    expect(Array.isArray(error.details)).toBe(true);
  });

  it("maps fetch failures (TypeError) to network", () => {
    expect(toAppError(new TypeError("Failed to fetch")).kind).toBe("network");
  });

  it("maps supabase auth errors by status", () => {
    const auth = (name: string, status: number) => ({ name, status, message: "m", code: "c" });
    expect(toAppError(auth("AuthApiError", 400)).kind).toBe("invalid"); // wrong password / email taken
    expect(toAppError(auth("AuthApiError", 422)).kind).toBe("invalid");
    expect(toAppError(auth("AuthApiError", 401)).kind).toBe("unauthenticated");
    expect(toAppError(auth("AuthApiError", 429)).kind).toBe("rateLimited");
    expect(toAppError(auth("AuthSessionMissingError", 400)).kind).toBe("invalid");
    expect(toAppError(auth("AuthRetryableFetchError", 0)).kind).toBe("network");
  });

  it("falls back to the HTTP status when there is no code", () => {
    expect(toAppError({ status: 401, message: "m" }).kind).toBe("unauthenticated");
    expect(toAppError({ status: 403, message: "m" }).kind).toBe("forbidden");
    expect(toAppError({ status: 404, message: "m" }).kind).toBe("notFound");
    expect(toAppError({ status: 409, message: "m" }).kind).toBe("conflict");
    expect(toAppError({ status: 429, message: "m" }).kind).toBe("rateLimited");
    expect(toAppError({ status: 500, message: "m" }).kind).toBe("unknown");
  });

  it("never throws on odd input", () => {
    for (const odd of [null, undefined, 42, "text", {}, [], Symbol.iterator]) {
      expect(toAppError(odd)).toBeInstanceOf(AppError);
    }
    expect(toAppError("text").message).toBe("text");
  });

  it("keeps the original error as cause", () => {
    const original = pg("42501");
    expect(toAppError(original).cause).toBe(original);
  });
});

describe("helpers", () => {
  it("errorMessageKey / isPermanent", () => {
    expect(errorMessageKey("notFound")).toBe("errors.notFound");
    for (const kind of ["unauthenticated", "forbidden", "notFound", "conflict", "invalid", "rateLimited"] as const) {
      expect(isPermanent(kind)).toBe(true);
    }
    expect(isPermanent("network")).toBe(false);
    expect(isPermanent("unknown")).toBe(false);
  });

  it("unwrap returns data or throws an AppError", () => {
    expect(unwrap({ data: [1], error: null })).toEqual([1]);
    expect(() => unwrap({ data: null, error: pg("PT409") })).toThrowError(AppError);
    try {
      unwrap({ data: null, error: pg("PT409") });
    } catch (e) {
      expect((e as AppError).kind).toBe("conflict");
    }
  });
});
