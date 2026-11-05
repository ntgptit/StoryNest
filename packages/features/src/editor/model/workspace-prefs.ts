/**
 * Per-device conveniences of the chapter editor, kept in localStorage (never needed for correctness: blocked or
 * cleared storage just means the defaults): whether the side-by-side live preview is on and how wide the editor pane
 * is, and whether the first-run tour was already finished or skipped.
 */

export const SPLIT_PREFS_KEY = "storynest.editor.split";
export const TOUR_DONE_KEY = "storynest.editor.tour-done";

/** Editor pane share of the width, in percent, and its limits (the preview never gets narrower than a phone). */
export const SPLIT_DEFAULT = 55;
export const SPLIT_MIN = 35;
export const SPLIT_MAX = 70;

export interface SplitPrefs {
  on: boolean;
  split: number;
}

const DEFAULT_PREFS: SplitPrefs = { on: false, split: SPLIT_DEFAULT };

function clamp(value: number): number {
  return Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, Math.round(value)));
}

/** The remembered preview setting; off at the default width when nothing (valid) is stored. */
export function readSplitPrefs(): SplitPrefs {
  try {
    const raw = window.localStorage.getItem(SPLIT_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFS;
    const { on, split } = parsed as Record<string, unknown>;
    return {
      on: on === true,
      split: typeof split === "number" && Number.isFinite(split) ? clamp(split) : SPLIT_DEFAULT,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeSplitPrefs(prefs: SplitPrefs): void {
  try {
    window.localStorage.setItem(SPLIT_PREFS_KEY, JSON.stringify({ on: prefs.on, split: clamp(prefs.split) }));
  } catch {
    // storage blocked: the setting lasts for this visit only
  }
}

/** True once the tour was finished or skipped on this device. Unreadable storage counts as seen (never nag). */
export function isTourDone(): boolean {
  try {
    return window.localStorage.getItem(TOUR_DONE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourDone(): void {
  try {
    window.localStorage.setItem(TOUR_DONE_KEY, "1");
  } catch {
    // storage blocked: nothing to remember it in
  }
}
