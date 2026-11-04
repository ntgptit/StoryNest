"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { countUnread, listNotifications, markAllRead, markRead } from "../api/notifications.api.ts";
import { notificationKeys } from "../keys.ts";
import { cursorAfter, type NotificationCursor, type NotificationPage } from "../model/notification.ts";

type Pages = InfiniteData<NotificationPage, NotificationCursor | undefined>;

function useUserId(): string | null {
  const auth = useAuth();
  return auth.status === "authenticated" ? auth.user.id : null;
}

export function useNotificationList() {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useInfiniteQuery<NotificationPage, AppError, Pages, readonly unknown[], NotificationCursor | undefined>({
    queryKey: notificationKeys.list(userId ?? "none"),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      listNotifications(getClient(), userId ?? "", pageParam).catch((e: unknown) => Promise.reject(toAppError(e))),
    getNextPageParam: cursorAfter,
    enabled: userId !== null,
    staleTime: 0,
  });
}

export function useUnreadCount() {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useQuery<number, AppError>({
    queryKey: notificationKeys.unread(userId ?? "none"),
    queryFn: () => countUnread(getClient(), userId ?? "").catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
    staleTime: 0,
  });
}

/**
 * Keeps the notifications live: a new row for this reader refreshes the list and the unread badge at once. Realtime
 * sends a change only to someone who may read the row (the reader's own JWT and RLS), and the channel is also filtered
 * on the reader's id. The client library reconnects a dropped socket by itself; what happened while it was down is
 * fetched when the channel is subscribed again, so nothing is missed. Leaving or signing out removes the channel.
 */
export function useNotificationsRealtime(): void {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const lastUser = useRef<string | null>(null);

  useEffect(() => {
    if (userId === null) return;
    const client = getClient();
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
    };
    let dropped = false;
    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (dropped) refresh(); // events sent while the connection was down never arrived
          dropped = false;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          dropped = true;
        }
      });
    lastUser.current = userId;
    return () => {
      void client.removeChannel(channel);
    };
  }, [getClient, queryClient, userId]);
}

/**
 * Marks notifications read. They show as read at once and the badge drops by as many as were unread; a refusal puts
 * both back.
 */
export function useMarkRead() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const list = notificationKeys.list(userId ?? "none");
  const unread = notificationKeys.unread(userId ?? "none");
  return useMutation<void, AppError, string[], { pages: Pages | undefined; count: number | undefined }>({
    mutationFn: async (ids) => {
      try {
        if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
        await markRead(getClient(), userId, ids);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (ids) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: list }),
        queryClient.cancelQueries({ queryKey: unread }),
      ]);
      const pages = queryClient.getQueryData<Pages>(list);
      const count = queryClient.getQueryData<number>(unread);
      const wanted = new Set(ids);
      let newlyRead = 0;
      if (pages) {
        const next: Pages = {
          ...pages,
          pages: pages.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (!wanted.has(item.id) || item.read) return item;
              newlyRead += 1;
              return { ...item, read: true };
            }),
          })),
        };
        queryClient.setQueryData<Pages>(list, next);
      }
      if (count !== undefined) queryClient.setQueryData<number>(unread, Math.max(0, count - newlyRead));
      return { pages, count };
    },
    onError: (_error, _ids, context) => {
      if (context?.pages) queryClient.setQueryData(list, context.pages);
      if (context?.count !== undefined) queryClient.setQueryData(unread, context.count);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const list = notificationKeys.list(userId ?? "none");
  const unread = notificationKeys.unread(userId ?? "none");
  return useMutation<void, AppError, void, { pages: Pages | undefined; count: number | undefined }>({
    mutationFn: async () => {
      try {
        if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
        await markAllRead(getClient(), userId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: list }),
        queryClient.cancelQueries({ queryKey: unread }),
      ]);
      const pages = queryClient.getQueryData<Pages>(list);
      const count = queryClient.getQueryData<number>(unread);
      if (pages) {
        const next: Pages = {
          ...pages,
          pages: pages.pages.map((page) => ({ ...page, items: page.items.map((item) => ({ ...item, read: true })) })),
        };
        queryClient.setQueryData<Pages>(list, next);
      }
      queryClient.setQueryData<number>(unread, 0);
      return { pages, count };
    },
    onError: (_error, _vars, context) => {
      if (context?.pages) queryClient.setQueryData(list, context.pages);
      if (context?.count !== undefined) queryClient.setQueryData(unread, context.count);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
