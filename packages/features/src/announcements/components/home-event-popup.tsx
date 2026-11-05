"use client";

import { useEffect, useState } from "react";
import { EventPopup, type EventPopupSlide } from "@storynest/ui/widgets/event-popup";
import { useLanguage } from "../../_shared/language.tsx";
import { useActiveAnnouncements } from "../hooks/use-announcements.ts";
import { isPopupSnoozed, snoozePopupToday } from "../model/announcement.ts";
import { announcementsText } from "../strings.ts";
import { renderAnnouncementLink } from "./announcement-banner.tsx";

const t = announcementsText.popup;

/**
 * The event popup of the home page (BR-HOME-013): the active popup announcements for the interface language
 * open once per visit of the page, unless the reader chose "Don't show today" on this device today for these same
 * announcements. Closing either way leaves a gift button in the corner that opens it again.
 */
export function HomeEventPopup() {
  const popups = useActiveAnnouncements("popup");
  const language = useLanguage();
  /** null until the device choice was read (after hydration): nothing opens before that. */
  const [open, setOpen] = useState<boolean | null>(null);
  const all = popups.data ?? [];
  const ids = all.map((popup) => popup.id).join(",");

  useEffect(() => {
    if (ids === "") return;
    setOpen(!isPopupSnoozed(ids.split(","), new Date()));
  }, [ids]);

  if (all.length === 0 || open === null) return null;
  const format = new Intl.DateTimeFormat(language, { day: "numeric", month: "short" });
  const slides: EventPopupSlide[] = all.map((popup) => ({
    id: popup.id,
    title: popup.title,
    body: popup.body,
    href: popup.href,
    eyebrow: t.until(format.format(new Date(popup.endsAt))),
  }));

  return (
    <EventPopup
      slides={slides}
      open={open}
      giftVisible
      labels={t}
      onHide={(today) => {
        if (today)
          snoozePopupToday(
            all.map((popup) => popup.id),
            new Date(),
          );
        setOpen(false);
      }}
      onReopen={() => setOpen(true)}
      renderLink={(slide, children, className) =>
        slide.href ? renderAnnouncementLink(slide.href, children, className) : null
      }
    />
  );
}
