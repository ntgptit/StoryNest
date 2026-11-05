"use client";

import { Button } from "@storynest/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@storynest/ui/components/dropdown-menu";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { SkyArt } from "@storynest/ui/widgets/sky-switch";
import { useAuth } from "../../_shared/auth.tsx";
import { UserAvatar } from "../../_shared/avatar.tsx";
import { useIsModerator } from "../../moderation/index.ts";
import { settingsText, toggledTheme, useSiteTheme } from "../../settings/index.ts";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { initials } from "../model/initials.ts";
import { shellText } from "../strings.ts";

/** Header account control: sign-in button for guests, avatar menu (profile, sign out) for members. */
export function UserMenu() {
  const auth = useAuth();
  const navigation = useNavigation();
  const toast = useAppToast();
  const moderator = useIsModerator();

  if (auth.status === "loading") return <Skeleton className="size-9 rounded-full" aria-hidden />;

  if (auth.status === "unauthenticated") {
    return (
      <Button asChild size="sm">
        <AppLink href="/login">{shellText.signIn}</AppLink>
      </Button>
    );
  }

  const name = auth.profile?.display_name ?? auth.user.email ?? "";

  const signOut = () => {
    auth
      .signOut()
      .then(() => {
        navigation.replace("/");
        navigation.refresh(); // server components must stop rendering the member's data
      })
      .catch(() => toast.error(shellText.signOutFailed));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={shellText.accountMenu} className="rounded-full">
          <UserAvatar storageKey={auth.profile?.avatar_storage_key} fallback={initials(name)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <AppLink href="/library">{shellText.library}</AppLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <AppLink href="/studio">{shellText.studio}</AppLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <AppLink href="/me">{shellText.profile}</AppLink>
        </DropdownMenuItem>
        {moderator ? (
          <DropdownMenuItem asChild>
            <AppLink href="/moderation">{shellText.moderation}</AppLink>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <AppLink href="/settings">{shellText.settings}</AppLink>
        </DropdownMenuItem>
        <ThemeMenuItem />
        <DropdownMenuItem onSelect={signOut}>{shellText.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Day/night switch as a menu row (role menuitemcheckbox, checked = dark). Choosing it flips the theme and keeps the
 * menu open so the sky can be seen turning; the full three-way choice (with "follow device") is in Settings.
 */
function ThemeMenuItem() {
  const { scheme, setTheme } = useSiteTheme();
  const dark = scheme === "dark";
  return (
    <DropdownMenuItem
      role="menuitemcheckbox"
      aria-checked={dark}
      className="justify-between gap-3"
      onSelect={(event) => {
        event.preventDefault();
        setTheme(toggledTheme(scheme));
      }}
    >
      {settingsText.theme.darkSwitch}
      <SkyArt night={dark} />
    </DropdownMenuItem>
  );
}
