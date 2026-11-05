"use client";

import { formatCount } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { HeartBurstIcon } from "@storynest/ui/widgets/heart-burst-icon";
import { RollingNumber } from "@storynest/ui/widgets/rolling-number";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useChapterVote } from "../hooks/use-chapter-vote.ts";
import { voteErrorMessage } from "../model/vote.ts";
import { readerText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = readerText.vote;

/** Vote for a chapter. A guest is sent to sign in and brought back here. Renders nothing until the count is known. */
export function VoteButton({ chapterId, locale = currentLocale() }: { chapterId: string; locale?: string }) {
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
        // Same padding the Button gives a direct <svg> child; HeartBurstIcon wraps its svg in a span.
        className="px-3"
        aria-pressed={signedIn ? voted : undefined}
        disabled={toggle.isPending}
        onClick={onClick}
      >
        <HeartBurstIcon active={voted} />
        {!signedIn ? t.guest : voted ? t.remove : t.add}
      </Button>
      {/* The digits roll to the new count after a vote (never on load); one polite announcement of the phrase. */}
      <RollingNumber
        value={votes}
        format={(n) => t.count(formatCount(n, locale))}
        live
        className="text-sm text-muted-foreground"
      />
    </div>
  );
}
