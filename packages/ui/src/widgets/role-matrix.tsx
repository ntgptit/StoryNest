/* Lucian UX/UI Prompt #184 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#184 */ // token-check-ignore: element number in the required license line, not a colour
import { Check, Minus } from "lucide-react";

import { cn } from "../lib/utils.ts";

export interface RoleMatrixColumn {
  key: string;
  label: string;
}

export interface RoleMatrixRow {
  key: string;
  label: string;
  /** Column key -> allowed. A missing key reads as not allowed. */
  allowed: Readonly<Record<string, boolean>>;
}

/**
 * A read-only table of what each role may do (the layout of Lucian 184 without its toggles): one row per right, one
 * column per role, a round tinted check where the role has it and a quiet dash where it does not. Each cell also says
 * "Allowed" / "Not allowed" to screen readers, so nothing depends on the icons. The host decides the rows; this widget
 * only draws them.
 */
export function RoleMatrix({
  caption,
  columns,
  rows,
  labels,
  className,
}: {
  caption: string;
  columns: readonly RoleMatrixColumn[];
  rows: readonly RoleMatrixRow[];
  labels: { right: string; allowed: string; notAllowed: string };
  className?: string;
}) {
  return (
    <table className={cn("w-full table-fixed border-separate border-spacing-y-1 text-sm tabular-nums", className)}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="w-[46%] pb-1.5 text-left text-xs font-medium text-muted-foreground">
            {labels.right}
          </th>
          {columns.map((column) => (
            <th key={column.key} scope="col" className="pb-1.5 text-center text-xs font-medium text-muted-foreground">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row" className="border-t py-1.5 pr-2 text-left text-[0.8125rem] leading-snug font-medium">
              {row.label}
            </th>
            {columns.map((column) => {
              const allowed = row.allowed[column.key] === true;
              return (
                <td key={column.key} className="border-t py-1.5 text-center">
                  <span
                    className={cn(
                      "inline-grid size-8 place-items-center rounded-full",
                      allowed ? "bg-granted text-granted-foreground" : "text-muted-foreground opacity-60",
                    )}
                  >
                    {allowed ? <Check className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
                    <span className="sr-only">{allowed ? labels.allowed : labels.notAllowed}</span>
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
