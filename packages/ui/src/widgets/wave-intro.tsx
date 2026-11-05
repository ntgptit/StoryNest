/* Lucian UX/UI Prompt #383 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#383 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../components/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/dialog.tsx";
import { cn } from "../lib/utils.ts";

export interface IntroPage {
  icon: LucideIcon;
  title: string;
  body: string;
}

/** One opaque tint per page, cycling (tokens in tokens.css, batch 3 · shell3). */
const TONES = [
  { bg: "bg-intro-1", fill: "fill-intro-1" },
  { bg: "bg-intro-2", fill: "fill-intro-2" },
  { bg: "bg-intro-3", fill: "fill-intro-3" },
] as const;
const tone = (index: number) => TONES[index % TONES.length]!;

/** Longest wait for the wave's animationend before the page changes anyway. */
const WAVE_FALLBACK_MS = 1500;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * A short skippable intro in a dialog. "Next" sends the next page's colour up the picture as a rolling wave whose
 * crest sways, then the next picture and text float up; the dots stretch to mark the page. Under reduced motion the
 * page simply changes. Skip, Escape and the last page's button all close it through `onOpenChange(false)`. The text
 * area is a polite live region, so a screen reader hears each new page.
 */
export function WaveIntro({
  open,
  onOpenChange,
  pages,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: readonly IntroPage[];
  labels: { next: string; done: string; skip: string; step: (page: number, total: number) => string };
}) {
  const [page, setPage] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  // Set after the first page change: the first page appears without the float-up.
  const [changed, setChanged] = useState(false);
  const fallback = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(fallback.current), []);

  const current = pages[page];
  if (!current) return null;
  const last = page === pages.length - 1;
  const Icon = current.icon;

  const land = (next: number) => {
    window.clearTimeout(fallback.current);
    setIncoming(null);
    setPage(next);
    setChanged(true);
  };

  const goNext = () => {
    if (last) return onOpenChange(false);
    if (incoming !== null) return;
    const next = page + 1;
    if (prefersReducedMotion()) return land(next);
    setIncoming(next);
    fallback.current = window.setTimeout(() => land(next), WAVE_FALLBACK_MS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        <div className={cn("relative h-44 overflow-hidden", tone(page).bg)}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 z-10"
            onClick={() => onOpenChange(false)}
          >
            {labels.skip}
          </Button>
          <span
            key={page}
            aria-hidden
            className={cn(
              "absolute inset-0 grid place-items-center text-foreground",
              changed && "motion-safe:animate-intro-float",
            )}
          >
            <span className="grid size-20 place-items-center rounded-full bg-background/70 shadow-sm">
              <Icon className="size-9" />
            </span>
          </span>
          {incoming !== null ? (
            <span
              aria-hidden
              data-wave=""
              className="absolute inset-x-0 top-0 h-[140%] animate-wave-rise"
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget) land(incoming);
              }}
            >
              <svg
                viewBox="0 0 600 40"
                preserveAspectRatio="none"
                className={cn("block h-6 w-[200%] animate-wave-sway", tone(incoming).fill)}
              >
                <path d="M0 20 Q 37.5 0 75 20 T 150 20 T 225 20 T 300 20 T 375 20 T 450 20 T 525 20 T 600 20 V 40 H 0 Z" />
              </svg>
              <span className={cn("block h-full", tone(incoming).bg)} />
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-5 p-6">
          <div
            key={page}
            aria-live="polite"
            className={cn("flex flex-col gap-2", changed && "motion-safe:animate-intro-float")}
          >
            <span className="sr-only">{labels.step(page + 1, pages.length)}</span>
            <DialogTitle className="text-xl leading-tight">{current.title}</DialogTitle>
            <DialogDescription className="leading-relaxed">{current.body}</DialogDescription>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span aria-hidden className="flex gap-1.5">
              {pages.map((p, index) => (
                <span
                  key={p.title}
                  data-on={index === page ? "" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-[width,background-color] duration-450 ease-spring",
                    index === page ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40",
                  )}
                />
              ))}
            </span>
            <Button type="button" onClick={goNext} aria-disabled={incoming !== null}>
              {last ? labels.done : labels.next}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
