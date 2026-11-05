"use client";

import { BellOff } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { useArrivals } from "@storynest/ui/lib/use-arrivals";
import { cn } from "@storynest/ui/lib/utils";
import { ChoicePills } from "@storynest/ui/widgets/choice-pills";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from "../hooks/use-notifications.ts";
import {
  countByFilter,
  describeNotification,
  filterNotifications,
  NOTIFICATION_FILTER,
  NOTIFICATION_FILTERS,
  notificationErrorMessage,
  type AppNotification,
  type NotificationFilter,
} from "../model/notification.ts";
import { notificationText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = notificationText;

const itemId = (item: AppNotification) => item.id;

/**
 * The reader's notifications, newest first: unread ones marked, a click marks one read and opens what it is about.
 * One filter bar narrows the loaded pages to a kind (Lucian 271's chips) and to the unread ones (Lucian 166's toggle);
 * a notification that arrives while the page is open slides in at the top (Lucian 227).
 */
export function NotificationsScreen({ locale = currentLocale() }: { locale?: string }) {
  const list = useNotificationList();
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  const toast = useAppToast();
  const [filter, setFilter] = useState<NotificationFilter>(NOTIFICATION_FILTER.ALL);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const arrivals = useArrivals(items, itemId);
  const filtered = filter !== NOTIFICATION_FILTER.ALL || unreadOnly;
  const shown = filtered ? filterNotifications(items, filter, unreadOnly) : items;
  const counts = countByFilter(items, unreadOnly);

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
        <>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ChoicePills
                aria-label={t.filter.label}
                value={filter}
                onValueChange={setFilter}
                options={NOTIFICATION_FILTERS.map((value) => ({
                  value,
                  label: t.filter[value],
                  count: counts[value],
                }))}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-pressed={unreadOnly}
                className="aria-pressed:border-primary aria-pressed:bg-primary/10"
                onClick={() => setUnreadOnly((on) => !on)}
              >
                {t.filter.unreadOnly}
              </Button>
            </div>
            <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
              {filtered ? t.filter.showing(shown.length, items.length) : ""}
            </p>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              {list.hasNextPage ? t.filter.noMatchMore : t.filter.noMatch}
            </p>
          ) : (
            <ul aria-label={t.listLabel} className="flex flex-col gap-2">
              {shown.map((item) => (
                <li key={item.id}>
                  <NotificationItem item={item} locale={locale} arriving={arrivals.has(item.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
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

function NotificationItem({ item, locale, arriving }: { item: AppNotification; locale: string; arriving: boolean }) {
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
  const className = cn(
    "flex items-start gap-3 rounded-xl border bg-card p-3 text-card-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    arriving && "animate-row-arrive",
  );
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
