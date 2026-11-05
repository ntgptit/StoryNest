"use client";

import { increased, useTriggerCount } from "@storynest/ui/lib/use-trigger-count";
import { RingingBellIcon } from "@storynest/ui/widgets/ringing-bell-icon";
import { cn } from "@storynest/ui/lib/utils";
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
  // The bell swings and the badge pops when a new notification arrives, not when the first count loads.
  const arrivals = useTriggerCount(unread.data, increased);
  return (
    <AppLink
      href="/notifications"
      aria-label={count > 0 ? notificationText.bell.withUnread(count) : notificationText.bell.label}
      className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <RingingBellIcon rings={arrivals} className="size-5" />
      {count > 0 ? (
        <span
          key={arrivals}
          aria-hidden
          className={cn(
            "absolute top-0 right-0 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-destructive-foreground",
            arrivals > 0 && "animate-badge-pop",
          )}
        >
          {badgeText(count)}
        </span>
      ) : null}
    </AppLink>
  );
}
