/* Lucian UX/UI Prompt #032 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#032 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Upload } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** True when the drag carries files (not text or a link dragged from the page). */
export function dragHasFiles(event: Pick<DragEvent, "dataTransfer">): boolean {
  const types = event.dataTransfer?.types;
  return types !== undefined && Array.from(types).includes("Files");
}

/**
 * Lets files be dropped onto `children`, next to the file picker the children already offer (a drop is a pointer
 * shortcut; keyboard and touch keep using the picker). While a file is dragged over it the area grows a little, a
 * dashed frame marches around it and `label` ("Drop the picture here") shows on top. Dropped files go to `onFiles`,
 * which should run the same checks as a picked file. Text or links dragged from the page are ignored, and a drop
 * that something inside already handled (a rich-text editor calling preventDefault) is left alone.
 */
export function DropZone({
  onFiles,
  label,
  disabled = false,
  className,
  children,
}: {
  onFiles?: (files: File[]) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  // dragenter/dragleave fire for every child crossed: count them so leaving a child does not end the highlight.
  const depth = useRef(0);

  const reset = () => {
    depth.current = 0;
    setOver(false);
  };

  const onDragEnter = (event: DragEvent) => {
    if (disabled || !dragHasFiles(event)) return;
    event.preventDefault();
    depth.current += 1;
    setOver(true);
  };
  const onDragOver = (event: DragEvent) => {
    if (disabled || !dragHasFiles(event)) return;
    event.preventDefault(); // allows the drop
    event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = () => {
    if (depth.current === 0) return;
    depth.current -= 1;
    if (depth.current === 0) setOver(false);
  };
  const onDrop = (event: DragEvent) => {
    const handled = event.defaultPrevented;
    reset();
    if (disabled || handled || !dragHasFiles(event)) return;
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles?.(files);
  };

  return (
    <div
      data-over={over ? "" : undefined}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "relative rounded-xl transition-transform duration-500 ease-spring data-over:scale-[1.02]",
        className,
      )}
    >
      {children}
      {over ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-1.5 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/85 text-sm font-medium text-primary backdrop-blur-[1px]"
        >
          <svg className="absolute top-px left-px h-[calc(100%-2px)] w-[calc(100%-2px)] overflow-visible" aria-hidden>
            <rect
              width="100%"
              height="100%"
              rx="11"
              className="fill-primary/5 stroke-primary motion-safe:animate-dash-march"
              strokeWidth="2"
              strokeDasharray="8 7"
            />
          </svg>
          <span className="relative grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform duration-500 ease-spring motion-safe:-translate-y-1">
            <Upload className="size-5" aria-hidden />
          </span>
          <span className="relative">{label}</span>
        </div>
      ) : null}
    </div>
  );
}
