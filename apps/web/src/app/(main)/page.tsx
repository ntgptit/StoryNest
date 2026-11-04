import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createQueryClient, homeFilterFrom, prefetchDiscovery } from "@storynest/features";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { DiscoverHome } from "./discover-home";
import { HomeHero } from "./home-hero";

/**
 * Home: the latest stories. The first page is fetched here on the server and handed to the client through
 * hydration, so crawlers and the first paint already have the content; the client then continues the feed.
 * The category and tag filters are query-string links (`/?category=slug&tag=slug`), so every filtered view has its own URL.
 * This page renders a filtered URL on a first visit only: switching filters afterwards is a shallow link, and
 * DiscoverHome re-reads the URL on the client (see discover-home.tsx).
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; tag?: string | string[] }>;
}) {
  const { categorySlug, tagSlug } = homeFilterFrom(await searchParams);

  const queryClient = createQueryClient();
  if (isSupabaseConfigured()) {
    try {
      await prefetchDiscovery(queryClient, await createSupabaseServerClient(), { categorySlug, tagSlug });
    } catch (error) {
      // Prefetch is an optimisation: on failure the client fetches (and shows its own error state). Log it, though:
      // swallowing silently once hid a real bug (a client-only function called from the server).
      console.error("home: prefetch failed", error);
    }
  }

  return (
    <div className="flex flex-col gap-8 py-2 sm:py-6">
      <HomeHero />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DiscoverHome />
      </HydrationBoundary>
    </div>
  );
}
