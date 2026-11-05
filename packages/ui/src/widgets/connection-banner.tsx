/* Lucian UX/UI Prompt #091 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#091 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { cn } from "../lib/utils.ts";

export type ConnectionState = "online" | "offline" | "back";

/** Wi-Fi arcs; while offline they blink in turn as if searching and a slash crosses them, which wipes away on reconnect. */
function WifiIcon({ state }: { state: ConnectionState }) {
  const arc = cn(
    "opacity-25",
    state === "offline" && "motion-safe:animate-wifi-scan",
    state === "back" && "opacity-100",
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current stroke-[2.2]" strokeLinecap="round">
      <path className={arc} style={{ animationDelay: "0.4s" }} d="M2.8 9.2a13.2 13.2 0 0 1 18.4 0" />
      <path className={arc} style={{ animationDelay: "0.2s" }} d="M5.7 12.4a9 9 0 0 1 12.6 0" />
      <path className={arc} d="M8.6 15.6a4.8 4.8 0 0 1 6.8 0" />
      <circle cx="12" cy="19" r="1.3" className="fill-current stroke-none" />
      <path
        d="M4.5 3.5l15 17"
        pathLength={1}
        className="transition-[stroke-dashoffset] duration-450 ease-soft [stroke-dasharray:1]"
        style={{ strokeDashoffset: state === "offline" ? 0 : 1 }}
      />
    </svg>
  );
}

/**
 * A strip that unfolds under the header when the connection drops ("You are offline") and turns into a short
 * "Back online" when it returns; hidden otherwise. It is a status region, so the change is announced politely.
 * `animate` should stay false until the connection actually changed while the page was open: a page that loads
 * offline shows the strip at once, without unfolding.
 */
export function ConnectionBanner({
  state,
  animate,
  labels,
  className,
}: {
  state: ConnectionState;
  animate: boolean;
  labels: { offlineTitle: string; offlineBody: string; backTitle: string; backBody: string };
  className?: string;
}) {
  const shown = state !== "online";
  // While folding away after "back online" the strip keeps its last look instead of going blank.
  const back = state !== "offline";
  return (
    <>
      {/* Announced text lives outside the folding part, which is inert (out of the accessibility tree) while hidden. */}
      <p role="status" className="sr-only">
        {state === "offline"
          ? `${labels.offlineTitle}. ${labels.offlineBody}`
          : state === "back"
            ? labels.backTitle
            : ""}
      </p>
      <div
        className={cn(
          "grid",
          shown ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          animate && "transition-[grid-template-rows] duration-450 ease-soft",
          className,
        )}
      >
        <div aria-hidden className="min-h-0 overflow-hidden" inert={!shown}>
          <div className="mx-auto w-full max-w-5xl px-4 pb-2 sm:px-6">
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                animate && "transition-colors duration-400",
                back ? "bg-accent text-accent-foreground" : "bg-foreground text-background",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  back ? "bg-chart-2 text-background" : "bg-background/15",
                )}
              >
                <WifiIcon state={back ? "back" : "offline"} />
              </span>
              <span className="min-w-0">
                <b className="block font-semibold">{back ? labels.backTitle : labels.offlineTitle}</b>
                <span className="block text-xs opacity-80">{back ? labels.backBody : labels.offlineBody}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
