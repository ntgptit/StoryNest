import { AppLink } from "../../_shared/platform.tsx";
import { shellText } from "../strings.ts";
import { UserMenu } from "./user-menu.tsx";

/** Content of the AppShell header: brand on the left, account control on the right. */
export function SiteHeader() {
  return (
    <>
      <AppLink href="/" className="text-lg font-semibold tracking-tight">
        {shellText.appName}
      </AppLink>
      <div className="ml-auto flex items-center gap-2">
        <UserMenu />
      </div>
    </>
  );
}
