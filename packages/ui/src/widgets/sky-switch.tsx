/* Lucian UX/UI Prompt #021 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#021 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { cn } from "../lib/utils.ts";

/** Star positions (percent of the switch) and their twinkle offsets, as in the element. */
const STARS = [
  { left: "14%", top: "22%", delay: "0s", size: "size-1" },
  { left: "26%", top: "60%", delay: "-0.6s", size: "size-0.5" },
  { left: "38%", top: "28%", delay: "-1.2s", size: "size-1" },
  { left: "20%", top: "76%", delay: "-1.8s", size: "size-0.5" },
  { left: "48%", top: "62%", delay: "-0.9s", size: "size-0.5" },
] as const;

/**
 * The day/night picture on its own: a small sky whose sun knob rolls across and turns into a cratered moon, the sky
 * deepens, the clouds sink away and stars come out. Decorative (aria-hidden); use SkySwitch for the control, or put
 * this inside a control that already says what it does (a menu item with aria-checked).
 *
 * Everything moves with transitions, so it only animates when `night` changes, never on first render.
 */
export function SkyArt({ night, className }: { night: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      data-night={night ? "" : undefined}
      className={cn(
        "relative isolate inline-block h-8 w-14 shrink-0 overflow-hidden rounded-full",
        "bg-linear-to-b from-sky-day to-sky-day-2 shadow-[inset_0_2px_5px_color-mix(in_oklab,var(--sky-night)_35%,transparent)]",
        className,
      )}
    >
      {/* Night sky fades in over the day sky. */}
      <span
        className={cn(
          "absolute inset-0 bg-linear-to-b from-sky-night to-sky-night-2 transition-opacity duration-800 ease-soft",
          night ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Halo rings travel with the knob. */}
      <span
        className={cn(
          "absolute top-1/2 left-4 size-0 transition-transform duration-900 ease-spring",
          night && "translate-x-6",
        )}
      >
        <span className="absolute -inset-5 rounded-full bg-sky-cloud/12" />
        <span className="absolute -inset-7 rounded-full bg-sky-cloud/10" />
      </span>
      {/* Stars drop in from above and twinkle (the twinkle is decorative: motion-safe only). */}
      <span
        className={cn(
          "absolute inset-0 transition-[opacity,translate] duration-800 ease-soft",
          night ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
        )}
      >
        {STARS.map((star) => (
          <span
            key={`${star.left}-${star.top}`}
            className={cn("absolute rounded-full bg-sky-cloud motion-safe:animate-twinkle", star.size)}
            style={{ left: star.left, top: star.top, animationDelay: star.delay }}
          />
        ))}
      </span>
      {/* Clouds sink away at night. */}
      <span
        className={cn(
          "absolute inset-0 transition-[opacity,translate] duration-800 ease-soft",
          night ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <span className="absolute right-1 -bottom-2 h-4 w-8 rounded-full bg-sky-cloud-2" />
        <span className="absolute -right-1 -bottom-1.5 h-4 w-6 rounded-full bg-sky-cloud" />
        <span className="absolute right-5 -bottom-2.5 h-4 w-5 rounded-full bg-sky-cloud" />
      </span>
      {/* The knob: a sun that rolls over and becomes the moon. */}
      <span
        className={cn(
          "absolute top-1 left-1 size-6 overflow-hidden rounded-full transition-transform duration-900 ease-spring",
          "bg-radial-[at_35%_30%] from-sky-sun-glow via-sky-sun to-sky-sun-edge shadow-sm",
          night && "translate-x-6 rotate-200",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-radial-[at_35%_30%] from-sky-moon-glow via-sky-moon to-sky-crater",
            "transition-[opacity,translate] duration-800 ease-soft",
            night ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          )}
        >
          <span className="absolute top-[20%] left-[24%] size-1.5 rounded-full bg-sky-crater" />
          <span className="absolute top-[52%] left-[58%] size-1 rounded-full bg-sky-crater" />
          <span className="absolute top-[62%] left-[28%] size-0.5 rounded-full bg-sky-crater" />
        </span>
      </span>
    </span>
  );
}

/**
 * Day/night switch (role="switch"): on = night. `label` is its accessible name ("Dark theme"). The press target is
 * at least the touch size even though the picture is small.
 */
export function SkySwitch({
  night,
  onNightChange,
  label,
  disabled,
  className,
}: {
  night: boolean;
  onNightChange: (night: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={night}
      aria-label={label}
      disabled={disabled}
      onClick={() => onNightChange(!night)}
      className={cn(
        "touch-target inline-flex items-center justify-center rounded-full outline-none disabled:opacity-50",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <SkyArt night={night} />
    </button>
  );
}
