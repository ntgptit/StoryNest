"use client";

import { useAdultContentSync } from "../hooks/use-adult-content-sync.ts";

/** Renders nothing; mounted once in the app frame so the choice follows the signed-in reader on every page. */
export function AdultContentSync() {
  useAdultContentSync();
  return null;
}
