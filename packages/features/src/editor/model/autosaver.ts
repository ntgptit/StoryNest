export type SaveOutcome = "saved" | "conflict" | "invalid";
export type AutosaveStatus =
  | "idle" //     nothing to save yet
  | "dirty" //    changes waiting for the pause
  | "saving"
  | "saved"
  | "error" //    the last attempt failed (offline, server error): retrying with a growing pause
  | "conflict" // saved elsewhere meanwhile: stopped until the author reloads (resume())
  | "invalid"; // the content cannot be saved as it is (blank title, unsupported content): waits for the next edit

export interface Autosaver {
  /** Something changed. Saves after `delayMs` without further changes, and at the latest after `maxWaitMs`. */
  markDirty(): void;
  /** Saves now (the Save button, leaving the page). Resolves when that attempt is over. */
  saveNow(): Promise<void>;
  /** The network came back: retry a failed save at once instead of waiting out the pause. */
  retryNow(): void;
  dispose(): void;
}

export interface AutosaverOptions {
  /** One save attempt with the current content. Throwing (or rejecting) means "failed, try again later". */
  save: () => Promise<SaveOutcome>;
  onStatus: (status: AutosaveStatus) => void;
  delayMs?: number;
  maxWaitMs?: number;
  /** First retry pause; doubles on every failure up to `maxRetryMs`. */
  retryMs?: number;
  maxRetryMs?: number;
  now?: () => number;
}

/**
 * Saves a draft in the background: one request at a time, a pause after the last change, a ceiling on how long
 * continuous typing can postpone a save, retries with a growing pause when a save fails, and a hard stop on a conflict
 * (retrying a conflict would only repeat it; the author reloads the editor, which starts a fresh autosaver). Edits made while a save is running are not
 * lost: they trigger the next save as soon as the running one ends.
 */
export function createAutosaver({
  save,
  onStatus,
  delayMs = 2000,
  maxWaitMs = 10_000,
  retryMs = 2000,
  maxRetryMs = 30_000,
  now = Date.now,
}: AutosaverOptions): Autosaver {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let status: AutosaveStatus = "idle";
  let running: Promise<void> | null = null;
  let changedWhileSaving = false;
  let firstDirtyAt: number | null = null;
  let failures = 0;
  let stopped = false; // conflict: no more automatic saves; the editor is reloaded (a new autosaver) to go on
  let disposed = false;

  const setStatus = (next: AutosaveStatus) => {
    if (status === next) return;
    status = next;
    onStatus(next);
  };
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const schedule = (wait: number) => {
    clear();
    timer = setTimeout(() => void attempt(), Math.max(0, wait));
  };

  async function attempt(): Promise<void> {
    if (disposed) return;
    clear();
    if (running) {
      changedWhileSaving = true;
      return running;
    }
    setStatus("saving");
    changedWhileSaving = false;
    firstDirtyAt = null;
    running = (async () => {
      let outcome: SaveOutcome | "failed";
      try {
        outcome = await save();
      } catch {
        outcome = "failed";
      }
      if (disposed) return;
      if (outcome === "failed") {
        failures += 1;
        setStatus("error");
        schedule(Math.min(maxRetryMs, retryMs * 2 ** (failures - 1)));
      } else if (outcome === "conflict") {
        stopped = true;
        failures = 0;
        setStatus("conflict");
      } else if (outcome === "invalid") {
        failures = 0;
        setStatus("invalid");
      } else {
        failures = 0;
        if (changedWhileSaving) {
          setStatus("dirty");
          firstDirtyAt = now();
          schedule(delayMs);
        } else {
          setStatus("saved");
        }
      }
    })().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    markDirty() {
      if (disposed) return;
      if (running) {
        changedWhileSaving = true;
        return;
      }
      if (stopped) return;
      firstDirtyAt ??= now();
      if (status !== "error") setStatus("dirty");
      // A failed save keeps its own retry timer; a new edit just waits for it instead of hammering a dead network.
      if (status === "error") return;
      schedule(Math.min(delayMs, maxWaitMs - (now() - firstDirtyAt)));
    },
    saveNow() {
      if (disposed) return Promise.resolve();
      return attempt();
    },
    retryNow() {
      if (disposed || stopped || status !== "error") return;
      void attempt();
    },
    dispose() {
      disposed = true;
      clear();
    },
  };
}
