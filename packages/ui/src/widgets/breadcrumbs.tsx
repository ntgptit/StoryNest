/* Lucian UX/UI Prompt #103 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#103 */ // token-check-ignore: element number in the required license line, not a colour
/* Story switcher: Lucian UX/UI Prompt #037 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#037 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check, ChevronRight, ChevronsUpDown } from "lucide-react";
import type { CSSProperties } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/dropdown-menu.tsx";
import { cn } from "../lib/utils.ts";
import type { NavLinkComponent } from "./bottom-nav.tsx";

export interface BreadcrumbSwitchOption {
  id: string;
  label: string;
  /** Second line (e.g. the story's state). */
  description?: string | undefined;
}

export interface BreadcrumbItem {
  label: string;
  /** Where the crumb leads; the last crumb is the current page and is never a link. */
  href?: string | undefined;
  /**
   * Adds a small button after the crumb that opens a menu of its siblings to jump to (Lucian 037's switcher): `value`
   * is the current one, picking another calls `onSelect` (the host navigates). `label` names the button and the menu.
   */
  switcher?:
    | {
        label: string;
        value: string;
        options: readonly BreadcrumbSwitchOption[];
        onSelect: (id: string) => void;
      }
    | undefined;
}

const CRUMB =
  "inline-flex min-h-9 max-w-[14rem] items-center gap-1 rounded-md px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:max-w-[20rem]";

/**
 * One-line path through the studio (Lucian 103): every parent is a link back up, the last item is the current page
 * (`aria-current="page"`). Long names are cut with an ellipsis and the row wraps on narrow screens, so the page never
 * scrolls sideways. A crumb with `switcher` gets a button that opens a menu of its siblings (Lucian 037: radio items
 * with a check on the current one, arrow keys, Esc returns focus); its items rise in one after the other.
 */
export function Breadcrumbs({
  items,
  label,
  LinkComponent,
  className,
}: {
  items: readonly BreadcrumbItem[];
  /** Accessible name of the nav (e.g. "You are here"). */
  label: string;
  LinkComponent: NavLinkComponent;
  className?: string | undefined;
}) {
  return (
    <nav aria-label={label} className={cn("-mx-2 min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-y-0.5 text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            // Keyed by position: a crumb renamed by the switcher keeps its button, and with it the focus.
            <li key={index} className="flex min-w-0 items-center">
              {index > 0 ? <ChevronRight aria-hidden className="size-3.5 shrink-0 opacity-60" /> : null}
              {last || !item.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(CRUMB, last && "font-medium text-foreground")}
                >
                  <span className="truncate">{item.label}</span>
                </span>
              ) : (
                <LinkComponent href={item.href} className={cn(CRUMB, "hover:bg-accent hover:text-foreground")}>
                  <span className="truncate">{item.label}</span>
                </LinkComponent>
              )}
              {item.switcher ? <Switcher switcher={item.switcher} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Switcher({ switcher }: { switcher: NonNullable<BreadcrumbItem["switcher"]> }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={switcher.label}
        className="group -ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:bg-accent"
      >
        <ChevronsUpDown
          aria-hidden
          className="size-3.5 transition-transform duration-450 ease-spring group-data-[state=open]:scale-y-[-1]"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 max-w-[calc(100vw-2rem)] rounded-xl p-1.5">
        <DropdownMenuLabel className="text-xs font-semibold tracking-wide text-muted-foreground">
          {switcher.label}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={switcher.value}
          onValueChange={(id) => {
            if (id !== switcher.value) switcher.onSelect(id);
          }}
        >
          {switcher.options.map((option, index) => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.id}
              style={{ "--i": index } as CSSProperties}
              className="items-start rounded-lg py-2 pr-8 pl-2.5 motion-safe:animate-option-rise motion-safe:[animation-delay:calc(min(var(--i),8)*32ms)] [&>span:first-child]:hidden"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{option.label}</span>
                {option.description ? (
                  <span className="truncate text-xs text-muted-foreground">{option.description}</span>
                ) : null}
              </span>
              {option.id === switcher.value ? (
                <Check aria-hidden className="absolute top-2.5 right-2 size-4 text-primary" />
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
