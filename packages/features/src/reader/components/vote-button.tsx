"use client";

import { Heart } from "lucide-react";
import { formatCount } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useChapterVote } from "../hooks/use-chapter-vote.ts";
import { voteErrorMessage } from "../model/vote.ts";
import { readerText } from "../strings.ts";

const t = readerText.vote;

/** Vote for a chapter. A guest is sent to sign in and brought back here. Renders nothing until the count is known. */
export function VoteButton({ chapterId, locale = "vi" }: { chapterId: string; locale?: string }) {
  const { state, toggle, signedIn, loadingSession } = useChapterVote(chapterId);
  const navigation = useNavigation();
  const toast = useAppToast();
  if (!state.data || loadingSession) return null;

  const { voted, votes } = state.data;
  const onClick = () => {
    if (!signedIn) {
      navigation.push(`/login?next=${encodeURIComponent(navigation.pathname)}`);
      return;
    }
    toggle.mutate(!voted, { onError: (error) => toast.error(voteErrorMessage(error)) });
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        type="button"
        variant={voted ? "default" : "outline"}
        aria-pressed={signedIn ? voted : undefined}
        disabled={toggle.isPending}
        onClick={onClick}
      >
        <Heart aria-hidden className={voted ? "size-4 fill-current" : "size-4"} />
        {!signedIn ? t.guest : voted ? t.remove : t.add}
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {t.count(formatCount(votes, locale))}
      </span>
    </div>
  );
}
