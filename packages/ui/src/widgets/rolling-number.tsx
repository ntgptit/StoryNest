/* Lucian UX/UI Prompt #098 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#098 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useState } from "react";

import { cn } from "../lib/utils.ts";

const isDigit = (char: string) => char >= "0" && char <= "9";

/**
 * A number whose digits roll like an odometer when it changes (also the counter of Lucian 054): each digit is a column
 * of 0–9 that slides to its new value, columns a little apart. `format` turns the value into the text to show (e.g.
 * `(n) => formatCount(n, locale)` or a whole phrase such as "1,2K followers"); only its digits roll, everything else
 * is plain text. The first render shows the value in place: only a later change rolls. Screen readers read the whole
 * text once; pass `live` to announce a change (one polite live region, not one per digit).
 */
export function RollingNumber({
  value,
  format = String,
  live = false,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  live?: boolean;
  className?: string;
}) {
  const text = format(value);
  const chars = Array.from(text);
  // Transitions switch on after the first paint, so the value never rolls in when the page loads.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <span data-slot="rolling-number" className={cn("inline-flex tabular-nums", className)}>
      {/* Drawn with generated content only (see `digit-strip` in tokens.css): the visual copy adds no text. */}
      <span aria-hidden className="inline-flex">
        {chars.map((char, index) => {
          // Keyed from the right, so units stay units when the number gains a digit (999 → 1.000).
          const key = `${chars.length - index}`;
          if (!isDigit(char)) {
            return <span key={key} data-char={char} className="whitespace-pre before:content-[attr(data-char)]" />;
          }
          return (
            // The invisible "0" sizes the column like one digit of the surrounding text.
            <span key={key} className="relative inline-block overflow-hidden before:invisible before:content-['0']">
              <span
                data-digit={char}
                className={cn(
                  "absolute inset-x-0 top-0 block digit-strip",
                  settled && "transition-transform duration-900 ease-roll",
                )}
                style={{
                  transform: `translateY(-${Number(char) * 10}%)`,
                  transitionDelay: settled ? `${index * 45}ms` : undefined,
                }}
              />
            </span>
          );
        })}
      </span>
      <span className="sr-only" aria-live={live ? "polite" : undefined}>
        {text}
      </span>
    </span>
  );
}
