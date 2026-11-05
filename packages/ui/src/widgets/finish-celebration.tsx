/* Lucian UX/UI Prompt #093 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#093 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** Confetti pieces and how long the longest one lives (the element's 90 pieces, 1.6–2.5s). */
const PIECES = 90;
export const CONFETTI_MAX_MS = 2500;
/** Theme colours the confetti is cut from (read at burst time, so the reader theme is respected). */
const CONFETTI_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--primary"];

function confetti(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext?.("2d");
  if (!context) return () => {};
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  // Tokens are light-dark() pairs: a probe resolves each to the colour in use, which the canvas understands.
  const probe = document.createElement("span");
  canvas.parentElement?.appendChild(probe);
  const colours = CONFETTI_VARS.map((name) => {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  }).filter(Boolean);
  probe.remove();
  const pieces = Array.from({ length: PIECES }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const speed = 380 + Math.random() * 420;
    return {
      x: width / 2 + (Math.random() - 0.5) * 40,
      y: height * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 14,
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      colour: colours[i % Math.max(1, colours.length)] ?? "currentColor",
      t: 0,
      life: 1.6 + Math.random() * 0.9,
    };
  });
  let last = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    let alive = 0;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    for (const p of pieces) {
      p.t += dt;
      if (p.t > p.life || p.y > height + 20) continue;
      alive += 1;
      p.vy += 900 * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      context.save();
      context.translate(p.x, p.y);
      context.rotate(p.r);
      context.globalAlpha = Math.min(1, (p.life - p.t) / 0.4);
      context.scale(1, Math.cos(p.t * 9 + p.w));
      context.fillStyle = p.colour;
      context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      context.restore();
    }
    if (alive > 0) frame = window.requestAnimationFrame(tick);
    else context.clearRect(0, 0, width, height);
  };
  frame = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(frame);
}

/**
 * "You finished it" card (adapted from Lucian 093): a check badge, a title, a line of text and actions. When `play`
 * goes up the badge pops in turning upright with one ring wave and confetti bursts upward and drifts down over the
 * card. At 0 (first render) everything is simply there. The confetti is decorative: it is skipped with reduced motion,
 * and the card never moves the page. When it plays, the title is also announced politely.
 */
export function FinishCelebration({
  title,
  description,
  play = 0,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  play?: number;
  /** Actions under the text. */
  children?: ReactNode;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (play === 0 || !canvas.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true) return;
    if (typeof window.requestAnimationFrame !== "function") return;
    return confetti(canvas.current);
  }, [play]);

  return (
    <section
      data-slot="finish-celebration"
      className={cn(
        "relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border bg-card px-5 py-7 text-center text-card-foreground",
        className,
      )}
    >
      <span
        key={play}
        aria-hidden
        className={cn(
          "relative mb-2 grid size-16 place-items-center rounded-3xl bg-chart-2 text-primary-foreground",
          play > 0 && "motion-safe:animate-badge-rise",
        )}
      >
        <Check className="size-8" strokeWidth={3} />
        {play > 0 ? <span className="absolute inset-0 rounded-[inherit] motion-safe:animate-badge-wave" /> : null}
      </span>
      <h2 className="text-lg font-semibold tracking-tight text-balance">{title}</h2>
      <span role="status" className="sr-only">
        {play > 0 ? title : ""}
      </span>
      {description ? <p className="max-w-prose text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
    </section>
  );
}
