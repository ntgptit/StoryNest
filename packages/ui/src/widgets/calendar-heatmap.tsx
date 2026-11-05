/* Lucian UX/UI Prompt #151 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#151 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** Shade of a cell: 0 is nothing, 1 to 4 are quarters of the busiest day. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

const LEVEL: Record<HeatLevel, string> = {
  0: "bg-muted",
  1: "bg-chart-1/25",
  2: "bg-chart-1/50",
  3: "bg-chart-1/75",
  4: "bg-chart-1",
};

export interface HeatmapCell {
  key: string;
  level: HeatLevel;
  /** Everything about the day in a sentence: the cell's accessible name and the line shown when it is picked. */
  label: string;
  /** The value as written in the table ("12"). */
  valueText: string;
}

export interface HeatmapRow {
  /** Full name, for screen readers ("Monday"). */
  label: string;
  /** Short name, for the table header and, when `showLabel`, next to the row ("Mon"). */
  abbr: string;
  /** Whether the short name is drawn next to the row (e.g. only every other weekday, to keep the grid light). */
  showLabel: boolean;
}

export interface HeatmapLegendItem {
  level: HeatLevel;
  /** What the shade stands for ("1–3"). */
  label: string;
}

export interface CalendarHeatmapText {
  /** How to move through the cells from a keyboard (read after the grid's name). */
  hint: string;
  /** Name of the legend ("Reads per day"). */
  legend: string;
  showTable: string;
  hideTable: string;
  tableCaption: string;
  /** Header of the table's first column ("Week of"). */
  columnHeader: string;
}

/**
 * A weeks × weekdays heatmap of one daily value (Lucian 151): one column per week, one row per weekday, each day shaded by
 * level. The cells are a keyboard grid with one tab stop: ↑/↓ step a day, ←/→ a week, Home/End jump to the first and last
 * day, Esc clears; pressing a cell picks it too. The picked day's sentence replaces the summary under the grid, and a
 * picked cell lifts slightly. The same values are offered as a table (weeks as rows) behind a toggle. Nothing animates on
 * first render.
 */
export function CalendarHeatmap({
  columns,
  rows,
  columnLabels,
  legend,
  label,
  summary,
  text,
  className,
}: {
  /** One entry per week, oldest first; each holds one slot per row (null where the week has no day in range). */
  columns: readonly (readonly (HeatmapCell | null)[])[];
  rows: readonly HeatmapRow[];
  /** Per column: `short` drawn above it (usually the month that starts in it, "" for none), `long` heads its table row. */
  columnLabels: readonly { short: string; long: string }[];
  legend: readonly HeatmapLegendItem[];
  /** Accessible name of the grid. */
  label: string;
  /** Line under the grid when no day is picked. */
  summary: string;
  text: CalendarHeatmapText;
  className?: string;
}) {
  const hintId = useId();
  const tableId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const cells = columns.flatMap((column, col) => column.flatMap((cell, row) => (cell ? [{ cell, col, row }] : [])));
  const last = cells.at(-1);
  if (!last) return null;

  const position = new Map(cells.map((entry) => [entry.cell.key, entry]));
  const tabStop = (focusKey && position.has(focusKey) ? focusKey : null) ?? picked ?? last.cell.key;
  const pickedCell = picked ? position.get(picked)?.cell : undefined;
  const template = { gridTemplateColumns: `2rem repeat(${columns.length}, minmax(0, 1fr))` };

  const move = (key: string) => {
    setFocusKey(key);
    setPicked(key);
    const elements = gridRef.current?.querySelectorAll<HTMLElement>("[data-cell]") ?? [];
    [...elements].find((element) => element.dataset.cell === key)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, key: string) => {
    const from = position.get(key);
    if (!from) return;
    const flat = cells.indexOf(from);
    let target: string | undefined;
    switch (event.key) {
      case "ArrowDown":
        target = cells[flat + 1]?.cell.key;
        break;
      case "ArrowUp":
        target = cells[flat - 1]?.cell.key;
        break;
      case "ArrowRight":
        target = columns[from.col + 1]?.[from.row]?.key;
        break;
      case "ArrowLeft":
        target = columns[from.col - 1]?.[from.row]?.key;
        break;
      case "Home":
        target = cells[0]?.cell.key;
        break;
      case "End":
        target = last.cell.key;
        break;
      case "Escape":
        if (picked === null) return;
        event.preventDefault();
        setPicked(null);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        setPicked((current) => (current === key ? null : key));
        return;
      default:
        return;
    }
    event.preventDefault();
    if (target) move(target);
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <p id={hintId} className="sr-only">
        {text.hint}
      </p>
      <div className="flex max-w-md flex-col gap-[3px]">
        <div aria-hidden className="grid gap-[3px] text-[10px] leading-3 text-muted-foreground" style={template}>
          <span />
          {columnLabels.map((column, index) => (
            <span key={index} className="overflow-visible whitespace-nowrap">
              {column.short}
            </span>
          ))}
        </div>
        <div ref={gridRef} role="grid" aria-label={label} aria-describedby={hintId} className="flex flex-col gap-[3px]">
          {rows.map((row, rowIndex) => (
            <div key={row.label} role="row" className="grid gap-[3px]" style={template}>
              <span
                role="rowheader"
                aria-label={row.label}
                className="self-center text-[10px] leading-3 text-muted-foreground"
              >
                <span aria-hidden>{row.showLabel ? row.abbr : ""}</span>
              </span>
              {columns.map((column, col) => {
                const cell = column[rowIndex];
                if (!cell) return <span key={col} role="gridcell" />;
                const isPicked = cell.key === picked;
                return (
                  <span
                    key={cell.key}
                    role="gridcell"
                    data-cell={cell.key}
                    data-level={cell.level}
                    tabIndex={cell.key === tabStop ? 0 : -1}
                    aria-label={cell.label}
                    aria-selected={isPicked}
                    onKeyDown={(event) => onKeyDown(event, cell.key)}
                    onFocus={() => setFocusKey(cell.key)}
                    onClick={() => {
                      setFocusKey(cell.key);
                      setPicked((current) => (current === cell.key ? null : cell.key));
                    }}
                    className={cn(
                      "aspect-square cursor-pointer rounded-[3px] outline-none transition-[translate,box-shadow] duration-250 ease-soft",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      LEVEL[cell.level],
                      cell.level === 0 && "ring-1 ring-border ring-inset",
                      isPicked && "-translate-y-0.5 ring-2 ring-foreground ring-offset-1 ring-offset-background",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p data-slot="heatmap-status" className="min-h-4 text-xs text-muted-foreground tabular-nums">
        {pickedCell ? <span className="font-medium text-foreground">{pickedCell.label}</span> : summary}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>{text.legend}</span>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label={text.legend}>
          {legend.map((item) => (
            <li key={item.level} className="flex items-center gap-1 tabular-nums">
              <span
                aria-hidden
                className={cn(
                  "size-3 rounded-[3px]",
                  LEVEL[item.level],
                  item.level === 0 && "ring-1 ring-border ring-inset",
                )}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((open) => !open)}
        >
          {showTable ? text.hideTable : text.showTable}
        </Button>
        <div id={tableId} hidden={!showTable}>
          {showTable ? (
            <div
              className="max-h-72 overflow-auto rounded-lg border"
              tabIndex={0}
              role="region"
              aria-label={text.tableCaption}
            >
              <table className="w-full text-sm">
                <caption className="sr-only">{text.tableCaption}</caption>
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-2 py-2 font-medium">
                      {text.columnHeader}
                    </th>
                    {rows.map((row) => (
                      <th key={row.label} scope="col" className="px-2 py-2 text-right font-medium">
                        <abbr title={row.label} className="no-underline">
                          {row.abbr}
                        </abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {columns.map((column, col) => (
                    <tr key={col}>
                      <th scope="row" className="px-2 py-1.5 text-left font-normal whitespace-nowrap">
                        {columnLabels[col]?.long}
                      </th>
                      {rows.map((row, rowIndex) => (
                        <td key={row.label} className="px-2 py-1.5 text-right tabular-nums">
                          {column[rowIndex]?.valueText ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
