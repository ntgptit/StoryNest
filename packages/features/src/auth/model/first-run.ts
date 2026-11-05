// First-run intro after sign-up (Lucian 383): sign-up marks it as due on this device, the app frame shows it once the
// person is signed in, and closing it (skip or finish) marks it seen. Device storage only: it collects nothing, and an
// account that confirms its email on another device simply never sees it.

export const FIRST_RUN_STORAGE_KEY = "storynest.firstRunIntro";
const DUE = "due";
const SEEN = "seen";

/** Called after a successful sign-up. Never brings the intro back once it was seen on this device. */
export function markFirstRunDue(): void {
  try {
    if (window.localStorage.getItem(FIRST_RUN_STORAGE_KEY) !== SEEN) {
      window.localStorage.setItem(FIRST_RUN_STORAGE_KEY, DUE);
    }
  } catch {
    // blocked storage: no intro, which is fine
  }
}

export function isFirstRunDue(): boolean {
  try {
    return window.localStorage.getItem(FIRST_RUN_STORAGE_KEY) === DUE;
  } catch {
    return false;
  }
}

export function markFirstRunSeen(): void {
  try {
    window.localStorage.setItem(FIRST_RUN_STORAGE_KEY, SEEN);
  } catch {
    // blocked storage: isFirstRunDue() cannot read it either, so the intro does not show
  }
}
