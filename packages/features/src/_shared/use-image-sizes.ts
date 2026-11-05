"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ImageRenderer } from "./image-prepare.ts";

/** Bytes of the picked file and of the picture that was prepared from it (cropped, shrunk, re-encoded). */
export interface ImageSizes {
  original: number;
  prepared: number;
}

/**
 * "84 kB", "3.2 MB" in the reader's language: kilobytes below one megabyte, megabytes with one decimal above
 * (decimal units, like the file managers of phones and the web).
 */
export function formatBytes(bytes: number, locale: string): string {
  if (bytes >= 1_000_000) {
    return new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }).format(
      bytes / 1_000_000,
    );
  }
  return new Intl.NumberFormat(locale, { style: "unit", unit: "kilobyte", maximumFractionDigits: 0 }).format(
    Math.max(1, Math.round(bytes / 1000)),
  );
}

/**
 * Remembers how big the last uploaded picture was before and after the existing prepare step. `render` wraps the
 * editor's renderer and notes both sizes; `commit()` (after the upload succeeded) makes them the shown `sizes`;
 * `clear()` hides them again (a new pick, a removal). Nothing is measured that the upload did not already do.
 */
export function useImageSizes(base: ImageRenderer) {
  const pending = useRef<ImageSizes | null>(null);
  const [sizes, setSizes] = useState<ImageSizes | null>(null);
  const render = useMemo<ImageRenderer>(
    () => async (file, crop) => {
      const prepared = await (crop === undefined ? base(file) : base(file, crop));
      pending.current = { original: file.size, prepared: prepared.blob.size };
      return prepared;
    },
    [base],
  );
  const commit = useCallback(() => {
    setSizes(pending.current);
    pending.current = null;
  }, []);
  const clear = useCallback(() => {
    pending.current = null;
    setSizes(null);
  }, []);
  return { render, sizes, commit, clear };
}
