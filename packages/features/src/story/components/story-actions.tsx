"use client";

import { Bell, BellRing, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@storynest/ui/components/button";
import { useNavigation } from "../../_shared/platform.tsx";
import { AddToListButton } from "../../lists/index.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { useStoryLibrary } from "../hooks/use-story-library.ts";
import { libraryErrorMessage } from "../model/library.ts";
import { storyText } from "../strings.ts";

const t = storyText.library;

/** Follow (get told about new chapters) and Save (keep on my shelf): two buttons, two separate things. */
export function StoryActions({ storyId }: { storyId: string }) {
  const { state, follow, save, signedIn } = useStoryLibrary(storyId);
  const navigation = useNavigation();
  const toast = useAppToast();
  if (!state.data) return null;

  const { following, saved } = state.data;
  const goToLogin = () => navigation.push(`/login?next=${encodeURIComponent(navigation.pathname)}`);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.guestHint}>
      <Button
        type="button"
        variant={following ? "default" : "outline"}
        aria-pressed={signedIn ? following : undefined}
        disabled={follow.isPending}
        onClick={() => {
          if (!signedIn) return goToLogin();
          follow.mutate(!following, {
            onSuccess: () => toast.success(following ? t.unfollowed : t.followed),
            onError: (error) => toast.error(libraryErrorMessage(error)),
          });
        }}
      >
        {following ? <BellRing aria-hidden className="size-4" /> : <Bell aria-hidden className="size-4" />}
        {following ? t.following : t.follow}
      </Button>
      <Button
        type="button"
        variant={saved ? "default" : "outline"}
        aria-pressed={signedIn ? saved : undefined}
        disabled={save.isPending}
        onClick={() => {
          if (!signedIn) return goToLogin();
          save.mutate(!saved, {
            onSuccess: () => toast.success(saved ? t.removedToast : t.savedToast),
            onError: (error) => toast.error(libraryErrorMessage(error)),
          });
        }}
      >
        {saved ? <BookmarkCheck aria-hidden className="size-4" /> : <Bookmark aria-hidden className="size-4" />}
        {saved ? t.saved : t.save}
      </Button>
      <AddToListButton storyId={storyId} />
    </div>
  );
}
