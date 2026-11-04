import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import type { VoteState } from "../model/vote.ts";

/**
 * The chapter's vote count (public) and, for a signed-in reader, whether they voted (a reader sees only their own
 * vote rows, so this cannot leak anyone else's).
 */
export async function getChapterVote(client: DataClient, chapterId: string, userId: string | null): Promise<VoteState> {
  const [stats, mine] = await Promise.all([
    client.from("chapter_stats").select("votes").eq("chapter_id", chapterId).maybeSingle(),
    userId === null
      ? Promise.resolve(null)
      : client
          .from("chapter_votes")
          .select("chapter_id")
          .eq("chapter_id", chapterId)
          .eq("user_id", userId)
          .maybeSingle(),
  ]);
  return {
    votes: Number(unwrap(stats)?.votes ?? 0),
    voted: mine !== null && unwrap(mine) !== null,
  };
}

/** Sets my vote to exactly `voted` (asking twice is harmless) and returns the chapter's count afterwards. */
export async function setChapterVote(client: DataClient, chapterId: string, voted: boolean): Promise<number> {
  const votes = unwrap(await client.rpc("set_chapter_vote", { p_chapter_id: chapterId, p_voted: voted }));
  return Number(votes ?? 0);
}
