"use client";

import { Avatar, AvatarFallback } from "@storynest/ui/components/avatar";
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
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { initials } from "../model/initials.ts";
import { shellText } from "../strings.ts";

/** Header account control: sign-in button for guests, avatar menu (profile, sign out) for members. */
export function UserMenu() {
  const auth = useAuth();
  const navigation = useNavigation();
  const toast = useAppToast();

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
          <Avatar>
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <AppLink href="/studio">{shellText.studio}</AppLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <AppLink href="/me">{shellText.profile}</AppLink>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>{shellText.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
