import { describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { isUsernameInUse } from "./api/profile.api.ts";
import { usernameAvailability, usernameToCheck } from "./model/username.ts";

describe("username availability (advisory)", () => {
  it("checks only valid names that differ from the current one, in lower case", () => {
    expect(usernameToCheck("  Reader_2 ")).toBe("reader_2");
    expect(usernameToCheck("")).toBeNull();
    expect(usernameToCheck("ab")).toBeNull();
    expect(usernameToCheck("bad name")).toBeNull();
    expect(usernameToCheck("a".repeat(31))).toBeNull();
    expect(usernameToCheck("READER", "reader")).toBeNull();
    expect(usernameToCheck("reader2", "reader")).toBe("reader2");
  });

  it("derives the hint from the typed name, the settled name and the answer", () => {
    expect(usernameAvailability({ typed: null, settled: null, inUse: undefined })).toBe("idle");
    expect(usernameAvailability({ typed: "abc", settled: "ab", inUse: false })).toBe("checking");
    expect(usernameAvailability({ typed: "abc", settled: "abc", inUse: undefined })).toBe("checking");
    expect(usernameAvailability({ typed: "abc", settled: "abc", inUse: true })).toBe("taken");
    expect(usernameAvailability({ typed: "abc", settled: "abc", inUse: false })).toBe("available");
  });

  it("asks app_users for one row with that name", async () => {
    const limit = vi.fn(async () => ({ data: [{ id: "x" }], error: null }));
    const eq = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    expect(await isUsernameInUse({ from } as unknown as DataClient, "reader")).toBe(true);
    expect(from).toHaveBeenCalledWith("app_users");
    expect(eq).toHaveBeenCalledWith("username", "reader");
    expect(limit).toHaveBeenCalledWith(1);
    limit.mockResolvedValueOnce({ data: [], error: null });
    expect(await isUsernameInUse({ from } as unknown as DataClient, "free")).toBe(false);
  });
});
