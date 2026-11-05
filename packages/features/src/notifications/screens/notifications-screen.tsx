"use client";

import { BellOff } from "lucide-react";
import { formatRelativeTime } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from "../hooks/use-notifications.ts";
import { describeNotification, notificationErrorMessage, type AppNotification } from "../model/notification.ts";
import { notificationText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = notificationText;

/** The reader's notifications, newest first: unread ones marked, a click marks one read and opens what it is about. */
export function NotificationsScreen({ locale = currentLocale() }: { locale?: string }) {
  const list = useNotificationList();
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  const toast = useAppToast();
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-label={t.title} className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={markAll.isPending || (unread.data ?? 0) === 0}
            onClick={() =>
              markAll.mutate(undefined, {
                onSuccess: () => toast.success(t.markedAll),
                onError: (error) => toast.error(notificationErrorMessage(error)),
              })
            }
          >
            {t.markAll}
          </Button>
        }
      />

      {list.isError ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => list.refetch()}
        />
      ) : list.isPending ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={BellOff} title={t.empty.title} description={t.empty.description} />
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationItem item={item} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      {list.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? t.loadingMore : t.loadMore}
        </Button>
      ) : null}
    </section>
  );
}

function NotificationItem({ item, locale }: { item: AppNotification; locale: string }) {
  const markRead = useMarkRead();
  const view = describeNotification(item);
  const open = () => {
    if (!item.read) markRead.mutate([item.id]);
  };
  const body = (
    <>
      <span
        aria-hidden
        className={item.read ? "mt-1.5 size-2 shrink-0" : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"}
      />
      <span className="min-w-0 flex-1">
        <span className={item.read ? "block text-sm" : "block text-sm font-medium"}>
          {item.read ? null : <span className="sr-only">{t.unread}: </span>}
          {view.text}
        </span>
        <span className="block text-xs text-muted-foreground">{formatRelativeTime(item.createdAt, locale)}</span>
      </span>
    </>
  );
  const className =
    "flex items-start gap-3 rounded-xl border bg-card p-3 text-card-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
  return view.href ? (
    <AppLink href={view.href} onClick={open} className={`${className} hover:bg-accent/40`}>
      {body}
    </AppLink>
  ) : (
    <button type="button" onClick={open} className={`${className} w-full text-left`}>
      {body}
    </button>
  );
}
