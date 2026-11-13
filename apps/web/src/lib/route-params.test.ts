import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import { requireUuidParams } from "./route-params";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("requireUuidParams", () => {
  it("accepts UUIDs", () => {
    expect(() => requireUuidParams(UUID, UUID)).not.toThrow();
  });

  it("answers 404 for any segment that is not a UUID", () => {
    expect(() => requireUuidParams("abc")).toThrow("NEXT_NOT_FOUND");
    expect(() => requireUuidParams(UUID, "new")).toThrow("NEXT_NOT_FOUND");
  });
});
