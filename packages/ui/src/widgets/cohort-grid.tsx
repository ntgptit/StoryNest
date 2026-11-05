/* Lucian UX/UI Prompt #161 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#161 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState } from "react";

import { cn } from "../lib/utils.ts";

export interface CohortRow {
  key: string;
  /** Short name of the cohort, drawn at the start of the row ("3/11"). */
  label: string;
  /** Text after the label for screen readers and the status line ("12 readers"), or why it is hidden. */
  sizeText: string;
  /**
   * One entry per week offset (0 = the cohort's own week): the share still reading, 0 to 1, or null for a cell that
   * has no value (a hidden cohort). Shorter rows end early, like the triangle of a cohort table.
   */
  cells: (number | null)[];
  /** The row's counts are withheld (too few readers): its cells are drawn hatched, not shaded. */
  suppressed?: boolean;
}

export interface CohortGridText {
  /** Name of the table. */
  label: string;
  /** Header of a week column ("W0", "W1"…). */
  week: (offset: number) => string;
  /** Status line when nothing is picked. */
  idle: string;
  /** Status line and cell name: e.g. "Started 3/11 · week 2: 40%". */
  cell: (row: CohortRow, offset: number, percent: string) => string;
  /** Name of a hidden cell. */
  hidden: (row: CohortRow) => string;
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

/**
 * A cohort table (Lucian 161): one row per starting week, one column per week after, each cell shaded by the share of
 * the cohort still reading. Press a cell to pick it (its figure shows in the status line), press it again to clear.
 * Hidden cohorts keep their place with empty, outlined cells so the table never hints at their size.
 */
export function CohortGrid({
  rows,
  weeks,
  text,
  className,
}: {
  rows: readonly CohortRow[];
  /** Number of week columns. */
  weeks: number;
  text: CohortGridText;
  className?: string;
}) {
  const [picked, setPicked] = useState<{ row: string; offset: number } | null>(null);
  const pickedRow = picked ? rows.find((row) => row.key === picked.row) : undefined;
  const pickedShare = pickedRow && picked ? pickedRow.cells[picked.offset] : undefined;

  return (
    <div data-slot="cohort-grid" className={cn("flex w-full flex-col gap-3", className)}>
      <div className="overflow-x-auto">
        <div
          role="group"
          aria-label={text.label}
          className="grid min-w-max gap-1.5"
          style={{ gridTemplateColumns: `3.5rem repeat(${weeks}, minmax(2.75rem, 1fr))` }}
        >
          <span />
          {Array.from({ length: weeks }, (_, offset) => (
            <span key={offset} className="text-center text-xs text-muted-foreground">
              {text.week(offset)}
            </span>
          ))}
          {rows.map((row) => (
            <div key={row.key} className="contents">
              <span className="self-center text-xs text-muted-foreground" title={row.sizeText}>
                {row.label}
              </span>
              {Array.from({ length: weeks }, (_, offset) => {
                if (offset >= row.cells.length) return <span key={offset} />;
                const share = row.cells[offset];
                if (row.suppressed || share === null || share === undefined) {
                  return (
                    <span
                      key={offset}
                      role="img"
                      aria-label={text.hidden(row)}
                      className="min-h-11 rounded border border-dashed border-border"
                    />
                  );
                }
                const pressed = picked?.row === row.key && picked.offset === offset;
                const shown = percent(share);
                return (
                  <button
                    key={offset}
                    type="button"
                    aria-pressed={pressed}
                    aria-label={text.cell(row, offset, shown)}
                    onClick={() => setPicked(pressed ? null : { row: row.key, offset })}
                    className={cn(
                      "min-h-11 rounded text-xs tabular-nums text-foreground transition-transform duration-350 focus-visible:outline-2 focus-visible:outline-ring",
                      pressed && "-translate-y-0.5 outline-2 outline-offset-1 outline-foreground",
                    )}
                    style={{
                      background: `color-mix(in oklab, var(--chart-2) ${Math.round(share * 45)}%, var(--card))`,
                    }}
                  >
                    {shown}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {pickedRow && picked && typeof pickedShare === "number"
          ? text.cell(pickedRow, picked.offset, percent(pickedShare))
          : text.idle}
      </p>
    </div>
  );
}
