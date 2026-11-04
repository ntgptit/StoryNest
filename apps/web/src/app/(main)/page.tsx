import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createQueryClient, prefetchDiscovery } from "@storynest/features";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { DiscoverHome } from "./discover-home";
import { HomeHero } from "./home-hero";

/**
 * Home: the latest stories. The first page is fetched here on the server and handed to the client through
 * hydration, so crawlers and the first paint already have the content; the client then continues the feed.
 * The category and tag filters are query-string links (`/?category=slug&tag=slug`), so every filtered view has its own URL.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; tag?: string | string[] }>;
}) {
  const { category, tag } = await searchParams;
  const categorySlug = typeof category === "string" && category !== "" ? category : undefined;
  const tagSlug = typeof tag === "string" && tag !== "" ? tag : undefined;

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
        <DiscoverHome categorySlug={categorySlug} tagSlug={tagSlug} />
      </HydrationBoundary>
    </div>
  );
}
