"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { Button } from "@storynest/ui/components/button";
import { useAuth } from "../../_shared/auth.tsx";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useFollowAuthor } from "../hooks/use-author.ts";
import { followErrorMessage, type AuthorProfile } from "../model/author.ts";
import { authorText } from "../strings.ts";

const t = authorText;

/**
 * Follow / unfollow an author. Not shown on your own page; a guest who presses it is sent to sign in and brought back.
 * The button does not guess: it shows the state the database last confirmed.
 */
export function FollowAuthorButton({ profile }: { profile: AuthorProfile }) {
  const auth = useAuth();
  const navigation = useNavigation();
  const toast = useAppToast();
  const follow = useFollowAuthor(profile);
  const signedIn = auth.status === "authenticated";
  if (signedIn && auth.user.id === profile.userId) return null;

  return (
    <Button
      type="button"
      variant={profile.following ? "default" : "outline"}
      aria-pressed={signedIn ? profile.following : undefined}
      disabled={follow.isPending}
      onClick={() => {
        if (!signedIn) return navigation.push(`/login?next=${encodeURIComponent(navigation.pathname)}`);
        follow.mutate(!profile.following, {
          onSuccess: () => toast.success(profile.following ? t.unfollowedToast : t.followedToast),
          onError: (error) => toast.error(followErrorMessage(error)),
        });
      }}
    >
      {profile.following ? <UserCheck aria-hidden className="size-4" /> : <UserPlus aria-hidden className="size-4" />}
      {profile.following ? t.following : t.follow}
    </Button>
  );
}
