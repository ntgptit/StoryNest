"use client";

import { PageSkeleton } from "@storynest/ui/widgets/page-skeleton";
import { shellText } from "../strings.ts";

/**
 * Shown by the web app's route `loading.tsx` the moment a link is clicked, while the next page renders on the
 * server. A client component so the announced label follows the chosen language.
 */
export function RouteLoading() {
  return <PageSkeleton label={shellText.loading} />;
}
