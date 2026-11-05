/* Lucian UX/UI Prompt #254 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#254 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { LucideIcon } from "lucide-react";
import { Share2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "../components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/select.tsx";
import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";
import { CopyLinkButton } from "./copy-link-button.tsx";

export interface ShareAccessOption<V extends string> {
  value: V;
  label: string;
  /** Who can open the link with this setting, in a sentence. */
  description: string;
  icon: LucideIcon;
  /** True when people other than the owner can open it: the icon is tinted like the element's "anyone" globe. */
  reachable: boolean;
}

export interface ShareAccess<V extends string> {
  /** Heading of the access row, e.g. "Who can open it". */
  label: string;
  value: V;
  options: readonly ShareAccessOption<V>[];
  /** Without it the access is only shown (for someone who may not change it). */
  onChange?: (value: V) => void;
  /** While a change is being saved. */
  pending?: boolean;
}

const changed = (previous: string | undefined, next: string | undefined) =>
  previous !== undefined && next !== undefined && previous !== next;

/**
 * Share dialog: an optional access row (who can open the link, with a picker for the owner), the link in a read-only
 * field with a Copy button that turns into a check, and an optional "share via…" button for the system share sheet.
 * When the access changes, its icon spins into the new one; when the link is copied, the field flashes once.
 * Neither plays on first render.
 */
export function ShareDialog<V extends string>({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  url,
  linkLabel,
  copyLabel,
  copiedLabel,
  onCopyFailed,
  access,
  nativeShare,
}: {
  /** The button that opens the dialog (rendered as the Radix trigger). */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  /** Absolute link to share. */
  url: string;
  /** Accessible name of the link field. */
  linkLabel: string;
  copyLabel: string;
  copiedLabel: string;
  onCopyFailed?: () => void;
  access?: ShareAccess<V> | undefined;
  /** Shown only where the platform has a share sheet (navigator.share or the native shell). */
  nativeShare?: { label: string; onShare: () => void } | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="leading-snug">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {access ? <AccessRow access={access} /> : null}
        <LinkField
          url={url}
          linkLabel={linkLabel}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          onCopyFailed={onCopyFailed}
        />
        {nativeShare ? (
          <Button type="button" variant="outline" className="w-full" onClick={nativeShare.onShare}>
            <Share2 aria-hidden />
            {nativeShare.label}
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AccessRow<V extends string>({ access }: { access: ShareAccess<V> }) {
  const headingId = useId();
  const current = access.options.find((option) => option.value === access.value) ?? access.options[0];
  // Each change of access replays the icon's spin-in (0 = never changed: the icon just sits there).
  const changes = useTriggerCount<string | undefined>(access.value, changed);
  if (!current) return null;
  const Icon = current.icon;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-xs font-semibold text-muted-foreground">
        {access.label}
      </h3>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          data-reachable={current.reachable}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-350",
            current.reachable ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon key={`icon-${changes}`} className={cn("size-4", changes > 0 && "animate-access-icon-in")} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {access.onChange ? (
            <Select
              value={access.value}
              disabled={access.pending}
              onValueChange={(value) => {
                const option = access.options.find((candidate) => candidate.value === value);
                if (option && option.value !== access.value) access.onChange?.(option.value);
              }}
            >
              <SelectTrigger
                aria-labelledby={headingId}
                size="sm"
                className="-ml-3 border-transparent font-semibold text-foreground shadow-none dark:bg-transparent"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {access.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-semibold">{current.label}</p>
          )}
          <p className="text-xs text-muted-foreground">{current.description}</p>
        </div>
      </div>
    </section>
  );
}

function LinkField({
  url,
  linkLabel,
  copyLabel,
  copiedLabel,
  onCopyFailed,
}: {
  url: string;
  linkLabel: string;
  copyLabel: string;
  copiedLabel: string;
  onCopyFailed?: (() => void) | undefined;
}) {
  const [copies, setCopies] = useState(0);
  return (
    <div className="relative flex items-center gap-2 rounded-lg border bg-muted/50 p-1 pl-3 focus-within:ring-[3px] focus-within:ring-ring/50">
      <input
        readOnly
        value={url}
        aria-label={linkLabel}
        // Selecting on focus lets the link be copied by hand where the clipboard is blocked.
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-muted-foreground outline-none"
      />
      <CopyLinkButton
        value={url}
        label={copyLabel}
        copiedLabel={copiedLabel}
        variant="default"
        size="sm"
        onCopied={() => setCopies((count) => count + 1)}
        onCopyFailed={onCopyFailed}
      />
      {copies > 0 ? (
        <span
          key={copies}
          aria-hidden
          data-part="flash"
          className="pointer-events-none absolute inset-0 rounded-lg animate-link-flash"
        />
      ) : null}
    </div>
  );
}
