// Public API of the "announcements" feature: the rolling banner of the shell, the home event popup and the
// moderator's list. Only export what other features or the apps need.
export { announcementsKeys } from "./keys.ts";
export { announcementsText } from "./strings.ts";
export { AnnouncementBanner } from "./components/announcement-banner.tsx";
export { HomeEventPopup } from "./components/home-event-popup.tsx";
export { AnnouncementManager } from "./components/announcement-manager.tsx";
export {
  BANNER_DISMISSED_KEY,
  POPUP_SNOOZE_KEY,
  announcementState,
  isPopupSnoozed,
  localDay,
  snoozePopupToday,
  type Announcement,
} from "./model/announcement.ts";
