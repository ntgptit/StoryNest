/* Lucian UX/UI Prompt #177 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#177 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef } from "react";

import { cn } from "../lib/utils.ts";

export interface BranchNode {
  id: string;
  /** null for a root (the first version, or one whose parent is unknown). */
  parentId: string | null;
  /** Text inside the dot, e.g. "3". */
  label: string;
  /** Accessible name, e.g. "Version 3, live". */
  name: string;
}

export interface PlacedNode extends BranchNode {
  depth: number;
  row: number;
}

const DX = 44;
const DY = 36;
const PAD = 22;

/**
 * Lays the versions out as a tree: x = distance from the root, rows = branches. The line that leads to `mainId` (the
 * live or latest version) stays on row 0; every other child starts a new row below, so a restore that was published
 * later reads as a branch off the version it came from. Nodes keep their input order among siblings.
 */
export function layoutBranches(nodes: readonly BranchNode[], mainId: string | null): PlacedNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string | null, BranchNode[]>();
  for (const node of nodes) {
    const parent = node.parentId !== null && byId.has(node.parentId) ? node.parentId : null;
    const list = children.get(parent) ?? [];
    list.push(node);
    children.set(parent, list);
  }
  const onMain = new Set<string>();
  for (let id = mainId; id !== null && byId.has(id); id = byId.get(id)?.parentId ?? null) {
    if (onMain.has(id)) break;
    onMain.add(id);
  }
  const placed: PlacedNode[] = [];
  let rows = 0;
  const visit = (node: BranchNode, depth: number, row: number) => {
    placed.push({ ...node, depth, row });
    const kids = [...(children.get(node.id) ?? [])].sort((a, b) => Number(onMain.has(b.id)) - Number(onMain.has(a.id)));
    kids.forEach((kid, index) => {
      if (index === 0) visit(kid, depth + 1, row);
      else {
        rows += 1;
        visit(kid, depth + 1, rows);
      }
    });
  };
  const roots = [...(children.get(null) ?? [])].sort((a, b) => Number(onMain.has(b.id)) - Number(onMain.has(a.id)));
  roots.forEach((root, index) => {
    if (index > 0) rows += 1;
    visit(root, 0, index === 0 ? 0 : rows);
  });
  return placed;
}

/**
 * Branching version history (Lucian 177): every published version is a dot, joined to the version it grew from.
 * The live version is filled, the selected one wears a ring (and, motion allowing, a slow pulse), versions off the
 * main line are drawn outlined on their own rows. Pressing a dot selects that version (the history screen then shows
 * it and offers to restore it). A dot that appears while the screen is open springs in; the first render does not
 * animate. Wide histories scroll sideways and keep the selected dot in view.
 */
export function BranchGraph({
  nodes,
  mainId,
  liveId,
  selectedId,
  onSelect,
  label,
  className,
}: {
  nodes: readonly BranchNode[];
  /** The version whose line is drawn first (live, else the latest). */
  mainId: string | null;
  liveId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Name of the graph, e.g. "Version history graph". */
  label: string;
  className?: string;
}) {
  const placed = layoutBranches(nodes, mainId);
  const byId = new Map(placed.map((node) => [node.id, node]));
  const width = PAD * 2 + Math.max(0, ...placed.map((n) => n.depth)) * DX;
  const height = PAD * 2 + Math.max(0, ...placed.map((n) => n.row)) * DY;
  const pos = (node: PlacedNode) => ({ x: PAD + node.depth * DX, y: PAD + node.row * DY });

  // Ids seen before: only dots added later spring in.
  const seen = useRef<Set<string> | null>(null);
  const fresh = new Set<string>();
  if (seen.current !== null) for (const node of placed) if (!seen.current.has(node.id)) fresh.add(node.id);
  useEffect(() => {
    seen.current = new Set(placed.map((node) => node.id));
  });

  const scroller = useRef<HTMLDivElement>(null);
  const selected = selectedId === null ? undefined : byId.get(selectedId);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !selected) return;
    const { x } = pos(selected);
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - PAD)
      el.scrollLeft = Math.max(0, x - el.clientWidth / 2);
  });

  return (
    <div
      ref={scroller}
      role="group"
      aria-label={label}
      className={cn("w-full overflow-x-auto rounded-xl border bg-muted/30", className)}
    >
      <div className="relative" style={{ width, height }}>
        <svg aria-hidden className="absolute inset-0 overflow-visible" width={width} height={height}>
          {placed.map((node) => {
            const parent = node.parentId === null ? undefined : byId.get(node.parentId);
            if (!parent) return null;
            const a = pos(parent);
            const b = pos(node);
            const d =
              a.y === b.y
                ? `M${a.x} ${a.y}H${b.x}`
                : `M${a.x} ${a.y}C${a.x + DX * 0.6} ${a.y} ${b.x - DX * 0.6} ${b.y} ${b.x} ${b.y}`;
            return (
              <path
                key={node.id}
                d={d}
                fill="none"
                strokeWidth={2}
                strokeDasharray={node.row === 0 ? undefined : "3 4"}
                className={node.row === 0 ? "stroke-primary" : "stroke-border"}
              />
            );
          })}
        </svg>
        {placed.map((node) => {
          const { x, y } = pos(node);
          const isSelected = node.id === selectedId;
          const isLive = node.id === liveId;
          return (
            <button
              key={node.id}
              type="button"
              aria-label={node.name}
              aria-pressed={isSelected}
              onClick={() => onSelect(node.id)}
              style={{ left: x, top: y }}
              className={cn(
                "absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-bold transition-[background-color,box-shadow] duration-300 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                fresh.has(node.id) && "animate-node-in",
                isLive
                  ? "bg-primary text-primary-foreground"
                  : node.row === 0
                    ? "bg-background text-primary ring-2 ring-primary ring-inset"
                    : "bg-background text-muted-foreground ring-1 ring-border ring-inset",
                isSelected && "outline-2 outline-offset-2 outline-primary outline-solid",
              )}
            >
              {node.label}
              {isSelected ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-2 rounded-full border-2 border-primary opacity-0 motion-safe:animate-node-ring"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
