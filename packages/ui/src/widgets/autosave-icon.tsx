/* Lucian UX/UI Prompt #355 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#355 */ // token-check-ignore: element number in the required license line, not a colour
import { cn } from "../lib/utils.ts";

/**
 * What the autosave is doing, in presentation terms. Features map their own status onto it
 * (e.g. dirty → pending, conflict/invalid → failed).
 */
export type AutosaveIconState = "idle" | "pending" | "saving" | "saved" | "failed";

const CLOUD_PATH = "M7 16.5h10.5a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.4 7.6 4.5 4.5 0 0 0 7 16.5z";
const CHECK_PATH = "M9.3 12l2.2 2.1 4-4.2";
const SLASH_PATH = "M4 2l17 17";
const DOT_X = [9, 12.5, 16] as const;
/** Each dot bobs a little after the previous one. */
const DOT_DELAY = ["[animation-delay:0s]", "[animation-delay:0.15s]", "[animation-delay:0.3s]"] as const;

/**
 * Cloud status icon for autosave: dots bob inside the cloud while saving, a check draws itself when saved, and a slash
 * crosses it out when saving failed. Pending shows the plain cloud; idle renders nothing. Decorative: the status text
 * next to it (in an aria-live region) is what assistive tech reads.
 */
export function AutosaveIcon({ state, className }: { state: AutosaveIconState; className?: string }) {
  if (state === "idle") return null;
  return (
    <svg
      data-slot="autosave-icon"
      data-state={state}
      viewBox="0 0 24 20"
      fill="none"
      aria-hidden
      className={cn("h-4 w-5 shrink-0 overflow-visible", state === "failed" && "text-destructive", className)}
    >
      <path d={CLOUD_PATH} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" />
      {state === "saving"
        ? DOT_X.map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy={12}
              r={1.2}
              fill="currentColor"
              className={cn("animate-autosave-bob", DOT_DELAY[index])}
            />
          ))
        : null}
      {state === "saved" ? (
        <path
          d={CHECK_PATH}
          pathLength={1}
          strokeDasharray={1}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-in"
        />
      ) : null}
      {state === "failed" ? (
        <path
          d={SLASH_PATH}
          pathLength={1}
          strokeDasharray={1}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="animate-draw-in"
        />
      ) : null}
    </svg>
  );
}
