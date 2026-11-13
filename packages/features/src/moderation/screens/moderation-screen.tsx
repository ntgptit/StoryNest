"use client";

import { ShieldOff } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { DetailPanel } from "@storynest/ui/widgets/detail-panel";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { AnnouncementManager } from "../../announcements/index.ts";
import { ReportCard } from "../components/report-card.tsx";
import { useIsModerator, useReportQueue } from "../hooks/use-moderation.ts";
import { QUEUE_FILTER, type QueueFilter } from "../model/report.ts";
import { moderationText } from "../strings.ts";

const t = moderationText.console;

/** The moderation console: the report queue (waiting / handled) with the actions on each item, then announcements. */
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
  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <Queue />
      <AnnouncementManager />
    </div>
  );
}

/** Which report the detail panel shows, where it was in the list, and how it was reached (for the step animation). */
type Selection = { id: string; index: number; direction: -1 | 0 | 1 };

function Queue() {
  const [filter, setFilter] = useState<QueueFilter>(QUEUE_FILTER.OPEN);
  const queue = useReportQueue(filter);
  const items = queue.data?.pages.flatMap((page) => page.items) ?? [];
  const [selection, setSelection] = useState<Selection | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  let index = selection ? items.findIndex((report) => report.id === selection.id) : -1;
  if (selection && index === -1 && !queue.isPending) {
    // The report left this queue (it was just handled): show the one that took its place, so triage goes on.
    if (items.length === 0) {
      setSelection(null);
      setPanelOpen(false);
    } else {
      index = Math.min(selection.index, items.length - 1);
      const next = items[index];
      if (next) setSelection({ id: next.id, index, direction: 1 });
    }
  }
  const current = index === -1 ? null : (items[index] ?? null);

  const show = (at: number, direction: -1 | 0 | 1) => {
    const report = items[at];
    if (!report) return;
    setSelection({ id: report.id, index: at, direction });
    setPanelOpen(true);
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <PageHeader title={t.title} description={t.description} />
      <Tabs
        value={filter}
        onValueChange={(value) => {
          setFilter(value === QUEUE_FILTER.CLOSED ? QUEUE_FILTER.CLOSED : QUEUE_FILTER.OPEN);
          setSelection(null);
          setPanelOpen(false);
        }}
      >
        <TabsList>
          <TabsTrigger value={QUEUE_FILTER.OPEN}>{t.tabs.open}</TabsTrigger>
          <TabsTrigger value={QUEUE_FILTER.CLOSED}>{t.tabs.closed}</TabsTrigger>
        </TabsList>
      </Tabs>

      {queue.isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" aria-busy />
      ) : queue.isError && items.length === 0 ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => queue.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{filter === QUEUE_FILTER.OPEN ? t.empty.open : t.empty.closed}</p>
      ) : (
        <InfiniteList
          items={items}
          getKey={(report) => report.id}
          renderItem={(report, at) => (
            <ReportCard report={report} selected={panelOpen && report.id === current?.id} onOpen={() => show(at, 0)} />
          )}
          hasMore={queue.hasNextPage}
          isLoadingMore={queue.isFetchingNextPage}
          onLoadMore={() => void queue.fetchNextPage()}
          loadMoreLabel={t.loadMore}
          loadError={queue.isError ? { title: t.error.title, retryLabel: t.error.retry } : undefined}
          listClassName="gap-3"
        />
      )}
      {items.length > 0 ? <p className="text-xs text-muted-foreground">{t.openDetails}</p> : null}

      {current ? (
        <DetailPanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          title={current.title}
          description={t.panel.keys}
          position={t.panel.position(index + 1, items.length)}
          hasPrevious={index > 0}
          hasNext={index < items.length - 1}
          onPrevious={() => show(index - 1, -1)}
          onNext={() => show(index + 1, 1)}
          previousLabel={t.panel.previous}
          nextLabel={t.panel.next}
          closeLabel={t.panel.close}
          contentKey={current.id}
          direction={selection?.direction ?? 0}
        >
          <ReportCard key={current.id} report={current} variant="panel" />
        </DetailPanel>
      ) : null}
    </div>
  );
}
