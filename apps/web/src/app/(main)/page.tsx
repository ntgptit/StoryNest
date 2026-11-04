import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createQueryClient, prefetchDiscovery } from "@storynest/features";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { DiscoverHome } from "./discover-home";

/**
 * Home: the latest stories. The first page is fetched here on the server and handed to the client through
 * hydration, so crawlers and the first paint already have the content; the client then continues the feed.
 * The category filter is a query-string link (`/?category=slug`), so every filtered view has its own URL.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const { category } = await searchParams;
  const categorySlug = typeof category === "string" && category !== "" ? category : undefined;

  const queryClient = createQueryClient();
  if (isSupabaseConfigured()) {
    try {
      await prefetchDiscovery(queryClient, await createSupabaseServerClient(), { categorySlug });
    } catch (error) {
      // Prefetch is an optimisation: on failure the client fetches (and shows its own error state). Log it, though:
      // swallowing silently once hid a real bug (a client-only function called from the server).
      console.error("home: prefetch failed", error);
    }
  }

  return (
    <div className="flex flex-col gap-8 py-2 sm:py-6">
      <header className="flex flex-col gap-2">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Nơi những câu chuyện được viết và được đọc.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Khám phá truyện mới cập nhật và theo dõi tác giả yêu thích của bạn.
        </p>
      </header>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DiscoverHome categorySlug={categorySlug} />
      </HydrationBoundary>
    </div>
  );
}
