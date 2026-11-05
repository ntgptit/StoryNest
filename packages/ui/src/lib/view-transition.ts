// Card that expands into detail (adapted from Lucian UX/UI Prompt 328, MIT (c) 2026 Seokwoooo,
// lucianlabs.dev/uxui-prompt): the cover the reader tapped grows into the cover of the page it opens, through the
// View Transitions API. Where the API is missing, or the reader asked for reduced motion, navigation simply happens.

/** view-transition-name shared by the tapped card's cover and the story page's cover (styled in tokens.css). */
export const COVER_TRANSITION_NAME = "story-cover";
/** Marks the cover a page shows as the destination of the transition (StoryCover `morphTarget`). */
export const MORPH_TARGET_ATTRIBUTE = "data-morph-target";

/** Longest wait for the new page's cover; after it the transition runs with whatever is on screen. */
const WAIT_FOR_TARGET_MS = 900;

type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { finished: Promise<void> };
};

export function canMorphCover(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (typeof (document as TransitionDocument).startViewTransition !== "function") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches !== true;
}

/** Resolves once a cover marked as target appears that was not there before (or after the timeout). */
function waitForNewTarget(before: ReadonlySet<Element>): Promise<void> {
  return new Promise((resolve) => {
    const found = () =>
      Array.from(document.querySelectorAll(`[${MORPH_TARGET_ATTRIBUTE}]`)).some((el) => !before.has(el));
    if (found()) return resolve();
    const observer = new MutationObserver(() => {
      if (found()) finish();
    });
    const timer = window.setTimeout(() => finish(), WAIT_FOR_TARGET_MS);
    function finish() {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    }
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/**
 * Runs `navigate` inside a view transition in which `cover` becomes the new page's target cover. Returns false (and
 * does nothing) where it is not supported, so the caller navigates the normal way.
 */
export function morphCoverInto(cover: HTMLElement, navigate: () => void): boolean {
  if (!canMorphCover()) return false;
  const doc = document as TransitionDocument;
  // Names must be unique in a snapshot: a story page that is being left also carries the target name on its cover.
  const before = new Set(document.querySelectorAll(`[${MORPH_TARGET_ATTRIBUTE}]`));
  const hidden: HTMLElement[] = [];
  before.forEach((el) => {
    if (el instanceof HTMLElement && el !== cover) {
      el.style.viewTransitionName = "none";
      hidden.push(el);
    }
  });
  cover.style.viewTransitionName = COVER_TRANSITION_NAME;
  const transition = doc.startViewTransition!(async () => {
    cover.style.viewTransitionName = "";
    navigate();
    await waitForNewTarget(before);
  });
  void transition.finished.finally(() => {
    cover.style.viewTransitionName = "";
    hidden.forEach((el) => (el.style.viewTransitionName = ""));
  });
  return true;
}

/** Marks <html> while a theme reveal runs, so its own clip-path animation replaces the default cross-fade. */
export const THEME_REVEAL_ATTRIBUTE = "data-theme-reveal";

/** Radius from (x, y) that covers a width × height viewport: the distance to its farthest corner. */
export function revealRadius(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

/**
 * Circular reveal (adapted from Lucian UX/UI Prompt 219, MIT (c) 2026 Seokwoooo, lucianlabs.dev/uxui-prompt): runs
 * `update` (which must change the page's look synchronously, e.g. a data attribute on <html>) inside a view transition
 * in which the new look spreads out in a circle from the centre of `origin` (theme-reveal in tokens.css). Without the
 * API, or with reduced motion, `update` simply runs.
 */
export function revealFrom(origin: HTMLElement, update: () => void): void {
  if (!canMorphCover()) {
    update();
    return;
  }
  const root = document.documentElement;
  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  root.style.setProperty("--reveal-x", `${x}px`);
  root.style.setProperty("--reveal-y", `${y}px`);
  root.style.setProperty("--reveal-r", `${revealRadius(x, y, window.innerWidth, window.innerHeight)}px`);
  root.setAttribute(THEME_REVEAL_ATTRIBUTE, "");
  const transition = (document as TransitionDocument).startViewTransition!(update);
  void transition.finished.finally(() => {
    root.removeAttribute(THEME_REVEAL_ATTRIBUTE);
    for (const name of ["--reveal-x", "--reveal-y", "--reveal-r"]) root.style.removeProperty(name);
  });
}
