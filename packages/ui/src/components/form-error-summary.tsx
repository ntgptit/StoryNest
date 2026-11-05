/* Lucian UX/UI Prompt #244 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#244 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { CircleAlert } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useFormContext, useFormState, type FieldErrors, type FieldValues } from "react-hook-form";

import { cn } from "../lib/utils.ts";

/** Names of the top-level fields with a message, in form order (react-hook-form keeps registration order). */
function invalidFields(errors: FieldErrors<FieldValues>): string[] {
  return Object.entries(errors).flatMap(([name, error]) =>
    name !== "root" && typeof error?.message === "string" && error.message !== "" ? [name] : [],
  );
}

const controlSelector = (name: string) => `[data-slot="form-control"][data-field="${CSS.escape(name)}"]`;

/** The visible label of each field: FormControl marks the control with data-field, FormLabel is its <label for>. */
function readLabels(scope: ParentNode, names: string[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const name of names) {
    const control = scope.querySelector<HTMLElement>(controlSelector(name));
    const label = (control as HTMLInputElement | null)?.labels?.[0]?.textContent?.trim();
    if (label) labels[name] = label;
  }
  return labels;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Error summary for a form inside shadcn `<Form>`: after a submit with invalid fields it drops in at the top with the
 * count and one entry per field; pressing an entry scrolls to that field and focuses it. The count goes down as fields
 * are fixed (react-hook-form revalidates on change after a submit) and it disappears when nothing is left. Before the
 * first submit it renders nothing, so the form looks exactly as before. react-hook-form already focuses the first
 * invalid field on submit; this adds the overview and the way back to the others.
 */
export function FormErrorSummary({ title, className }: { title: (count: number) => string; className?: string }) {
  const { setFocus } = useFormContext();
  const { errors, submitCount, isSubmitting } = useFormState();
  const names = invalidFields(errors);
  const key = names.join("|");
  const ref = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const visible = submitCount > 0 && !isSubmitting && names.length > 0;
  // Labels live in the DOM (the screen's own strings); read them before paint whenever the list or visibility changes.
  useLayoutEffect(() => {
    const form = visible ? ref.current?.closest("form") : null;
    if (form) setLabels(readLabels(form, key.split("|")));
  }, [key, visible]);
  if (!visible) return null;

  const goTo = (name: string) => {
    const control = ref.current?.closest("form")?.querySelector<HTMLElement>(controlSelector(name));
    if (!control) {
      setFocus(name);
      return;
    }
    control.focus({ preventScroll: true });
    control.scrollIntoView?.({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div
      ref={ref}
      role="alert"
      data-slot="form-error-summary"
      className={cn(
        "animate-in rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive duration-300 fade-in-0 slide-in-from-top-2",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-medium">
        <CircleAlert aria-hidden className="size-4 shrink-0" />
        {title(names.length)}
      </p>
      {/* Field names only, like the original: each message already sits under its field. */}
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-6">
        {names.map((name) => (
          <li key={name}>
            <button
              type="button"
              className="text-left font-medium underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => goTo(name)}
            >
              {labels[name] ?? name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
