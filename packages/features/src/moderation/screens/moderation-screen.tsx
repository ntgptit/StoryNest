"use client";

import { ShieldOff } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { ReportCard } from "../components/report-card.tsx";
import { useIsModerator, useReportQueue } from "../hooks/use-moderation.ts";
import { QUEUE_FILTER, type QueueFilter } from "../model/report.ts";
import { moderationText } from "../strings.ts";

const t = moderationText.console;

/** The moderation console: the report queue (waiting / handled) with the actions on each item. */
export function ModerationScreen() {
  const auth = useAuth();
  const moderator = useIsModerator();
  if (auth.status === "loading") return <Skeleton className="h-64 w-full max-w-3xl rounded-xl" aria-busy />;
  if (auth.status === "unauthenticated") {
    return (
      <p className="text-sm text-muted-foreground">
        {t.signIn}{" "}
        <AppLink
          href="/login?next=%2Fmoderation"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {moderationText.console.signInLink}
        </AppLink>
      </p>
    );
  }
  if (!moderator) {
    return <EmptyState icon={ShieldOff} title={t.noAccess.title} description={t.noAccess.description} />;
  }
  return <Queue />;
}

function Queue() {
  const [filter, setFilter] = useState<QueueFilter>(QUEUE_FILTER.OPEN);
  const queue = useReportQueue(filter);
  const items = queue.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <PageHeader title={t.title} description={t.description} />
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value === QUEUE_FILTER.CLOSED ? QUEUE_FILTER.CLOSED : QUEUE_FILTER.OPEN)}
      >
        <TabsList>
          <TabsTrigger value={QUEUE_FILTER.OPEN}>{t.tabs.open}</TabsTrigger>
          <TabsTrigger value={QUEUE_FILTER.CLOSED}>{t.tabs.closed}</TabsTrigger>
        </TabsList>
      </Tabs>

      {queue.isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" aria-busy />
      ) : queue.isError ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => void queue.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{filter === QUEUE_FILTER.OPEN ? t.empty.open : t.empty.closed}</p>
      ) : (
        <InfiniteList
          items={items}
          getKey={(report) => report.id}
          renderItem={(report) => <ReportCard report={report} />}
          hasMore={queue.hasNextPage}
          isLoadingMore={queue.isFetchingNextPage}
          onLoadMore={() => void queue.fetchNextPage()}
          loadMoreLabel={t.loadMore}
          listClassName="gap-3"
        />
      )}
    </div>
  );
}
