"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.ts";
import { Tabs as TabsPrimitive } from "radix-ui";

function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type IndicatorBox = { x: number; y: number; width: number; height: number };

const boxOf = (tab: HTMLElement): IndicatorBox => ({
  x: tab.offsetLeft,
  y: tab.offsetTop,
  width: tab.offsetWidth,
  height: tab.offsetHeight,
});

/**
 * Position of the active trigger inside its list, or null when there is none or it is not laid out (e.g. jsdom).
 * `swipe` (-1…1) moves it part of the way towards the previous (negative) or next (positive) trigger: the indicator
 * follows a finger swiping between panels (Lucian 048), stretching a little half-way like the element's line.
 */
function measureActiveTab(list: HTMLElement, swipe = 0): IndicatorBox | null {
  const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));
  const index = tabs.findIndex((tab) => tab.dataset.state === "active");
  const active = tabs[index];
  if (!active || active.offsetWidth === 0) return null;
  const from = boxOf(active);
  const neighbour = swipe === 0 ? undefined : tabs[index + Math.sign(swipe)];
  if (!neighbour) return from;
  const to = boxOf(neighbour);
  const t = Math.min(1, Math.abs(swipe));
  const stretch = Math.sin(t * Math.PI);
  return {
    x: from.x + (to.x - from.x) * t - stretch * 6,
    y: from.y + (to.y - from.y) * t,
    width: from.width + (to.width - from.width) * t + stretch * 12,
    height: from.height,
  };
}

function sameBox(a: IndicatorBox | null, b: IndicatorBox | null) {
  return a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);
}

/**
 * Tracks the active trigger so one pill can glide between tabs (adapted from Lucian UX/UI Prompt 039, MIT (c) 2026
 * Seokwoooo). `settled` turns on one frame after the first measurement, so the pill appears in place on load and only
 * slides on later changes. Until it is measured the active trigger keeps its own background (SSR, no-JS, jsdom).
 */
function useActiveTabIndicator(listRef: React.RefObject<HTMLDivElement | null>, swipe: number) {
  const [box, setBox] = React.useState<IndicatorBox | null>(null);
  const [settled, setSettled] = React.useState(false);
  const swipeRef = React.useRef(swipe);

  React.useLayoutEffect(() => {
    swipeRef.current = swipe;
    const list = listRef.current;
    if (!list) return;
    const next = measureActiveTab(list, swipe);
    setBox((current) => (sameBox(current, next) ? current : next));
  }, [listRef, swipe]);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const next = measureActiveTab(list, swipeRef.current);
      setBox((current) => (sameBox(current, next) ? current : next));
    };
    update();
    const frame = window.requestAnimationFrame(() => setSettled(true));
    const mutations = new MutationObserver(update);
    mutations.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state"] });
    const resizes = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    resizes?.observe(list);
    list.querySelectorAll('[role="tab"]').forEach((tab) => resizes?.observe(tab));
    return () => {
      window.cancelAnimationFrame(frame);
      mutations.disconnect();
      resizes?.disconnect();
    };
  }, [listRef]);

  return { box, settled };
}

function TabsList({
  className,
  variant = "default",
  swipe = 0,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    /** Progress of a swipe between the panels (-1…1, see useSwipeTabs); the indicator follows it without a transition. */
    swipe?: number;
  }) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const { box, settled } = useActiveTabIndicator(listRef, swipe);
  // The sliding pill replaces the active background of the default (segmented) look; in the line variant one sliding
  // underline replaces each trigger's own.
  const indicator = box;
  const line = variant === "line";
  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      data-indicator={indicator ? "ready" : undefined}
      className={cn(tabsListVariants({ variant }), "relative", className)}
      {...props}
    >
      {indicator ? (
        <span
          aria-hidden
          data-slot="tabs-indicator"
          className={cn(
            "pointer-events-none absolute top-0 left-0",
            line
              ? "h-0.5 rounded-full bg-foreground"
              : "rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-input/30",
            settled && swipe === 0 && "transition-[translate,width,height] duration-450 ease-spring",
          )}
          style={{
            width: indicator.width,
            height: line ? undefined : indicator.height,
            // The underline sits where each trigger drew its own (2px high, its bottom 5px below the trigger).
            translate: `${indicator.x}px ${line ? indicator.y + indicator.height + 3 : indicator.y}px`,
          }}
        />
      ) : null}
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        "group-data-[indicator=ready]/tabs-list:data-[state=active]:border-transparent group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent group-data-[indicator=ready]/tabs-list:data-[state=active]:shadow-none! dark:group-data-[indicator=ready]/tabs-list:data-[state=active]:border-transparent dark:group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent",
        "group-data-[indicator=ready]/tabs-list:after:hidden",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
