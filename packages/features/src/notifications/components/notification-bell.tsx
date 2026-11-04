"use client";

import { Bell } from "lucide-react";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { useNotificationsRealtime, useUnreadCount } from "../hooks/use-notifications.ts";
import { badgeText } from "../model/notification.ts";
import { notificationText } from "../strings.ts";

/** Header bell for a signed-in reader: a link to the notifications with a badge of how many are unread, kept live. */
export function NotificationBell() {
  const auth = useAuth();
  if (auth.status !== "authenticated") return null;
  return <BellWithCount />;
}

function BellWithCount() {
  useNotificationsRealtime();
  const unread = useUnreadCount();
  const count = unread.data ?? 0;
  return (
    <AppLink
      href="/notifications"
      aria-label={count > 0 ? notificationText.bell.withUnread(count) : notificationText.bell.label}
      className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Bell aria-hidden className="size-5" />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute top-0 right-0 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-destructive-foreground"
        >
          {badgeText(count)}
        </span>
      ) : null}
    </AppLink>
  );
}
