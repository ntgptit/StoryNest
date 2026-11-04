import { AppLink } from "../../_shared/platform.tsx";
import { NotificationBell } from "../../notifications/index.ts";
import { SearchBox } from "../../search/index.ts";
import { shellText } from "../strings.ts";
import { UserMenu } from "./user-menu.tsx";

/** Content of the AppShell header: brand on the left, account control on the right. */
export function SiteHeader() {
  return (
    <>
      <AppLink href="/" className="text-lg font-semibold tracking-tight">
        {shellText.appName}
      </AppLink>
      <div className="ml-auto flex w-full max-w-sm items-center justify-end gap-2 sm:max-w-md">
        <SearchBox />
        <NotificationBell />
        <UserMenu />
      </div>
    </>
  );
}
