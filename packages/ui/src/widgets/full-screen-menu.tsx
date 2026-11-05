/* Lucian UX/UI Prompt #045 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#045 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Classes for a big menu link; give it `style={fullScreenMenuItemStyle(i)}` so the lines rise one after the other. */
export function fullScreenMenuLinkClass(className?: string): string {
  return cn(
    "flex items-baseline gap-3 rounded-md py-1.5 text-3xl font-bold tracking-tight outline-none",
    "motion-safe:animate-menu-link-rise focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-[current=page]:text-primary",
    className,
  );
}

/** Stagger of the element: each line starts 60 ms after the previous one, the first 0.22 s after the menu opens. */
export function fullScreenMenuItemStyle(index: number): CSSProperties {
  return { animationDelay: `calc(0.22s + ${index} * 60ms)` };
}

/** Three lines; inside the open menu the outer two turn into an × (the middle one is gone). */
function BurgerLines({ open }: { open: boolean }) {
  const line = "absolute top-1/2 left-1/2 -mt-px -ml-2.25 h-0.5 w-4.5 rounded-full bg-current";
  return (
    <span aria-hidden className="relative block size-5">
      {open ? (
        <>
          <span className={cn(line, "rotate-45 motion-safe:animate-burger-top")} />
          <span className={cn(line, "-rotate-45 motion-safe:animate-burger-bottom")} />
        </>
      ) : (
        <>
          <span className={cn(line, "-translate-y-1.5")} />
          <span className={cn(line, "-ml-0.75 w-3")} />
          <span className={cn(line, "translate-y-1.5")} />
        </>
      )}
    </span>
  );
}

/**
 * Menu button that opens a full-screen navigation. The screen spreads out as a circle from the button and the menu
 * lines rise one after the other (`fullScreenMenuLinkClass` / `fullScreenMenuItemStyle`); closing shrinks it back into
 * the button. It is a modal dialog: focus moves in and stays there (Tab cycles), Escape or the × closes it and focus
 * returns to the button, the page behind does not scroll. Links inside should call `onOpenChange(false)` when used.
 * Reduced motion: it simply appears and disappears.
 */
export function FullScreenMenu({
  open,
  onOpenChange,
  title,
  openLabel,
  closeLabel,
  children,
  footer,
  className,
  triggerClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the dialog; shown as the small heading at the top. */
  title: string;
  openLabel: string;
  closeLabel: string;
  children: ReactNode;
  /** Bottom row (settings, account...); fades up after the links. */
  footer?: ReactNode;
  className?: string;
  triggerClassName?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const change = (next: boolean) => {
    if (next && trigger.current) {
      const box = trigger.current.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    }
    onOpenChange(next);
  };

  const origin = rect
    ? ({
        "--menu-x": `${rect.left + rect.width / 2}px`,
        "--menu-y": `${rect.top + rect.height / 2}px`,
      } as CSSProperties)
    : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={change}>
      <DialogPrimitive.Trigger
        ref={trigger}
        aria-label={openLabel}
        className={cn(
          "touch-target inline-flex items-center justify-center rounded-full text-foreground outline-none",
          "transition-[background-color,scale] duration-400 ease-spring hover:bg-accent active:scale-90",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50",
          triggerClassName,
        )}
      >
        <BurgerLines open={false} />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={origin}
          className={cn(
            "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background text-foreground outline-none",
            "bg-radial-[120%_70%_at_100%_0%] from-primary/12 to-transparent to-60%",
            "pt-safe pb-safe px-safe",
            "data-[state=open]:animate-menu-reveal data-[state=closed]:animate-menu-conceal",
            className,
          )}
        >
          <DialogPrimitive.Close
            aria-label={closeLabel}
            style={rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : undefined}
            className={cn(
              "touch-target z-10 inline-flex items-center justify-center rounded-full bg-accent text-foreground outline-none",
              "transition-[scale] duration-400 ease-spring active:scale-90 focus-visible:ring-[3px] focus-visible:ring-ring/50",
              rect ? "fixed" : "absolute top-3 right-4",
            )}
          >
            <BurgerLines open />
          </DialogPrimitive.Close>
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 pt-20 pb-8">
            <DialogPrimitive.Title className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {title}
            </DialogPrimitive.Title>
            <div className="flex flex-col gap-6">{children}</div>
            {footer ? (
              <div className="mt-auto flex flex-wrap items-center gap-3 border-t pt-4 motion-safe:animate-menu-fade-up">
                {footer}
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
