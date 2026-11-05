"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { FOCUS_LINE, READER_FOCUS_STORAGE_KEY, blockAtLine, stepFocus } from "../model/focus-mode.ts";

/** The on/off choice as a tiny external store (localStorage + in-page listeners), like the preferences store. */
const listeners = new Set<() => void>();
let memory = false;

function readFocus(): boolean {
  try {
    return window.localStorage.getItem(READER_FOCUS_STORAGE_KEY) === "1";
  } catch {
    return memory;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === READER_FOCUS_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setReaderFocus(on: boolean): void {
  memory = on;
  try {
    if (on) window.localStorage.setItem(READER_FOCUS_STORAGE_KEY, "1");
    else window.localStorage.removeItem(READER_FOCUS_STORAGE_KEY);
  } catch {
    // blocked storage: the in-memory copy keeps the choice for this page
  }
  listeners.forEach((listener) => listener());
}

/** Whether focus mode is on, on this device (off on the server), and a function to change it. */
export function useReaderFocusMode(): { on: boolean; setOn: (on: boolean) => void } {
  const on = useSyncExternalStore(subscribe, readFocus, () => false);
  return { on, setOn: useCallback((next: boolean) => setReaderFocus(next), []) };
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * While `enabled`, the index (into `anchors`) of the block at the reading line: it follows the page scroll (so touch
 * scrolling moves it too) and ↑/↓ move it one block and glide that block to the line. Arrow keys are left alone
 * while typing, with a modifier, or while a dialog or sheet has focus. -1 while disabled.
 */
export function useFocusedBlock(
  anchors: readonly string[],
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
): number {
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    if (!enabled) {
      setIndex(-1);
      return;
    }
    const elements = () => anchors.map((id) => document.getElementById(id));
    const line = () => window.innerHeight * FOCUS_LINE;
    let frame = 0;
    let current = -1;
    const measure = () => {
      frame = 0;
      const boxes = elements().map((el) => {
        const rect = el?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom } : { top: Infinity, bottom: Infinity };
      });
      current = blockAtLine(boxes, line());
      setIndex(current);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTyping(event.target)) return;
      const active = document.activeElement;
      if (active?.closest("[role=dialog]") || !containerRef.current) return;
      event.preventDefault();
      const next = stepFocus(current, event.key === "ArrowDown" ? 1 : -1, anchors.length);
      const target = elements()[next];
      current = next;
      setIndex(next);
      if (target) {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({
          top: window.scrollY + target.getBoundingClientRect().top - line() + 8,
          behavior: reduce ? "auto" : "smooth",
        });
      }
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [anchors, enabled, containerRef]);

  return index;
}
