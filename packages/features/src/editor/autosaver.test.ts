import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver, type AutosaveStatus, type SaveOutcome } from "./model/autosaver.ts";
import { clearBackup, differsFromServer, readBackup, writeBackup, type DraftBackup } from "./model/local-backup.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function setup(outcomes: (SaveOutcome | Error)[] = []) {
  const statuses: AutosaveStatus[] = [];
  let calls = 0;
  const save = vi.fn(async () => {
    const next = outcomes[calls] ?? "saved";
    calls += 1;
    if (next instanceof Error) throw next;
    return next;
  });
  const saver = createAutosaver({ save, onStatus: (s) => statuses.push(s), now: () => Date.now() });
  return { saver, save, statuses };
}
const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

describe("createAutosaver", () => {
  it("saves once after a pause without changes, not on every change", async () => {
    const { saver, save, statuses } = setup();
    saver.markDirty();
    await tick(1500);
    saver.markDirty();
    await tick(1500);
    expect(save).not.toHaveBeenCalled(); // each change restarts the 2 s pause
    await tick(600);
    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["dirty", "saving", "saved"]);
  });

  it("does not let continuous typing postpone the save forever (10 s ceiling)", async () => {
    const { saver, save } = setup();
    for (let i = 0; i < 12; i += 1) {
      saver.markDirty();
      await tick(1000); // never a 2 s pause
    }
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("keeps one request at a time and saves again for edits made while it was running", async () => {
    let release: () => void = () => undefined;
    const statuses: AutosaveStatus[] = [];
    let calls = 0;
    const save = vi.fn(async (): Promise<SaveOutcome> => {
      calls += 1;
      if (calls === 1) await new Promise<void>((resolve) => (release = resolve));
      return "saved";
    });
    const saver = createAutosaver({ save, onStatus: (s) => statuses.push(s), now: () => Date.now() });
    saver.markDirty();
    await tick(2100);
    expect(save).toHaveBeenCalledTimes(1);
    saver.markDirty(); // typed during the request
    saver.markDirty();
    await tick(5000);
    expect(save).toHaveBeenCalledTimes(1); // still the first one
    release();
    await tick(2100);
    expect(save).toHaveBeenCalledTimes(2); // the edits are not lost
    expect(statuses.at(-1)).toBe("saved");
  });

  it("retries a failed save with a growing pause and recovers", async () => {
    const { saver, save, statuses } = setup([new Error("offline"), new Error("offline"), "saved"]);
    saver.markDirty();
    await tick(2100); // attempt 1 fails
    expect(statuses.at(-1)).toBe("error");
    await tick(1800); // 1.9 s after the failure
    expect(save).toHaveBeenCalledTimes(1); // the first retry is after 2 s, not before
    await tick(300);
    expect(save).toHaveBeenCalledTimes(2); // attempt 2 fails
    await tick(3700); // 3.9 s after the second failure
    expect(save).toHaveBeenCalledTimes(2); // the pause doubled to 4 s
    await tick(300);
    expect(save).toHaveBeenCalledTimes(3);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("caps the retry pause at 30 s", async () => {
    const outcomes = Array.from({ length: 12 }, () => new Error("down"));
    const { saver, save } = setup(outcomes);
    saver.markDirty();
    await tick(2100);
    await tick(2000 + 4000 + 8000 + 16000); // 4 retries
    const before = save.mock.calls.length;
    await tick(30_100);
    expect(save.mock.calls.length).toBe(before + 1);
    await tick(30_100);
    expect(save.mock.calls.length).toBe(before + 2); // not 60 s
  });

  it("retries at once when the network comes back", async () => {
    const { saver, save, statuses } = setup([new Error("offline"), "saved"]);
    saver.markDirty();
    await tick(2100);
    expect(statuses.at(-1)).toBe("error");
    saver.retryNow();
    await tick(10);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("an edit during an error waits for the scheduled retry instead of resetting it", async () => {
    const { saver, save } = setup([new Error("offline"), "saved"]);
    saver.markDirty();
    await tick(2100); // fails; the retry is due 2 s later
    await tick(1800);
    saver.markDirty(); // 1.8 s into the pause: the retry must still come at 2 s, not 2 s after this edit
    await tick(300);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("two saves requested at once run as one request", async () => {
    let release: () => void = () => undefined;
    const save = vi.fn(() => new Promise<SaveOutcome>((resolve) => (release = () => resolve("saved"))));
    const saver = createAutosaver({ save, onStatus: () => undefined, now: () => Date.now() });
    const first = saver.saveNow();
    const second = saver.saveNow();
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("stops for good after a conflict: no timers, no retries, no new saves (the editor is reloaded to go on)", async () => {
    const { saver, save, statuses } = setup(["conflict", "saved"]);
    saver.markDirty();
    await tick(2100);
    expect(statuses.at(-1)).toBe("conflict");
    saver.markDirty();
    saver.retryNow();
    await tick(60_000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("an invalid draft is not retried; the next edit tries again", async () => {
    const { saver, save, statuses } = setup(["invalid", "saved"]);
    saver.markDirty();
    await tick(2100);
    expect(statuses.at(-1)).toBe("invalid");
    await tick(60_000);
    expect(save).toHaveBeenCalledTimes(1);
    saver.markDirty();
    await tick(2100);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("saveNow saves immediately and cancels the pending timer; dispose stops everything", async () => {
    const { saver, save } = setup();
    saver.markDirty();
    await saver.saveNow();
    expect(save).toHaveBeenCalledTimes(1);
    await tick(5000);
    expect(save).toHaveBeenCalledTimes(1); // the pause that was pending is gone

    saver.markDirty();
    saver.dispose();
    await tick(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("local backup", () => {
  const body = [{ block_id: "b0000000-0000-4000-8000-000000000001", type: "paragraph" as const, text: "xin chào" }];
  const backup: DraftBackup = { baseRevision: 4, title: "Chương", body, savedAt: "2026-11-04T00:00:00Z" };

  it("round-trips, clears, and tolerates a missing entry", () => {
    expect(readBackup("c1")).toBeNull();
    writeBackup("c1", backup);
    expect(readBackup("c1")).toEqual(backup);
    expect(readBackup("c2")).toBeNull(); // per chapter
    clearBackup("c1");
    expect(readBackup("c1")).toBeNull();
  });

  it("ignores anything it cannot trust (corrupt JSON, wrong shape, an invalid body)", () => {
    for (const raw of [
      "{broken",
      "null",
      JSON.stringify({ ...backup, body: [{ type: "mystery" }] }),
      JSON.stringify({ ...backup, baseRevision: "x" }),
      JSON.stringify({ ...backup, title: 5 }),
    ]) {
      window.localStorage.setItem("storynest.draftBackup.c1", raw);
      expect(readBackup("c1"), raw).toBeNull();
    }
  });

  it("never throws when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeBackup("c1", backup)).not.toThrow();
    expect(readBackup("c1")).toBeNull();
    expect(() => clearBackup("c1")).not.toThrow();
  });

  it("tells a useful backup from one identical to the server copy", () => {
    expect(differsFromServer(backup, { title: "Chương", body })).toBe(false);
    expect(differsFromServer(backup, { title: "Khác", body })).toBe(true);
    expect(differsFromServer(backup, { title: "Chương", body: [] })).toBe(true);
  });
});
