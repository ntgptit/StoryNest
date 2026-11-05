"use client";

import { MapPinOff } from "lucide-react";
import { Button } from "@storynest/ui/components/button";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { closestPath, searchSuggestion } from "../model/not-found.ts";
import { shellText } from "../strings.ts";

/**
 * What a missing address shows (Lucian 089, the 404 that fixes the typo): the closest real page when the address
 * looks like a typo of one, or a search for the words of a story or author address; always a way home.
 */
export function NotFoundScreen() {
  const { pathname } = useNavigation();
  const t = shellText.notFound;
  const fix = closestPath(pathname);
  const search = fix === null ? searchSuggestion(pathname) : null;
  const authorSearch = pathname.toLowerCase().startsWith("/author/");

  return (
    <EmptyState
      icon={MapPinOff}
      title={t.title}
      description={t.description}
      action={
        <div className="flex flex-col items-center gap-3">
          {fix !== null ? (
            <p className="text-sm">
              {t.didYouMean}{" "}
              <AppLink href={fix} className="font-medium text-primary underline-offset-4 hover:underline">
                {fix}
              </AppLink>
              ?
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {search !== null ? (
              <Button asChild className="h-auto min-h-9 max-w-full py-2 break-words whitespace-normal">
                <AppLink href={search.href}>
                  {authorSearch ? t.searchAuthors(search.term) : t.searchFor(search.term)}
                </AppLink>
              </Button>
            ) : null}
            <Button asChild variant={search === null && fix === null ? "default" : "outline"}>
              <AppLink href="/">{t.home}</AppLink>
            </Button>
          </div>
        </div>
      }
    />
  );
}
