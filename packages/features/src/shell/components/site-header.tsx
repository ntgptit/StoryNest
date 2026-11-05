"use client";

import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { AdultContentButton } from "../../adult-content/index.ts";
import { NotificationBell } from "../../notifications/index.ts";
import { SearchBox } from "../../search/index.ts";
import { shellText } from "../strings.ts";
import { LanguageSwitcher } from "./language-switcher.tsx";
import { MobileMenu } from "./mobile-menu.tsx";
import { UserMenu } from "./user-menu.tsx";

/** Content of the AppShell header: brand on the left, account control on the right, the menu button on phones. */
export function SiteHeader() {
  const { pathname } = useNavigation();
  return (
    <>
      <AppLink href="/" className="text-lg font-semibold tracking-tight">
        {shellText.appName}
      </AppLink>
      <div className="ml-auto flex w-full max-w-sm items-center justify-end gap-2 sm:max-w-md">
        <SearchBox />
        <AdultContentButton />
        {/* Phones: in the full-screen menu instead, so the 375 px header row still fits. */}
        <LanguageSwitcher className="hidden md:inline-flex" />
        <NotificationBell />
        <UserMenu />
        <MobileMenu pathname={pathname} className="-mr-2 md:hidden" />
      </div>
    </>
  );
}
