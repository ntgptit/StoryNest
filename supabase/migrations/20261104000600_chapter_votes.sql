-- Chapter votes: an idempotent RPC and the counters they feed (WBS WP 4.1; the other counters follow in WP 4.8).
--
--   set_chapter_vote(chapter_id, voted) -> votes   SECURITY INVOKER: the caller's own RLS applies, so only an active
--                                                  account that can read the chapter can vote; unvoting needs nothing
--                                                  more than owning the row. Voting twice or unvoting twice changes
--                                                  nothing (ON CONFLICT DO NOTHING / DELETE of zero rows) and returns
--                                                  the current count, so a retry after a lost response is harmless.
--   reconcile_vote_counts() -> rows corrected      service_role only: recomputes chapter_stats.votes and
--                                                  story_stats.votes from chapter_votes (drift repair, used by WP 4.8).
--
-- Counters: an AFTER INSERT/DELETE row trigger on chapter_votes moves chapter_stats.votes and story_stats.votes in the
-- same transaction as the vote itself, so any path (the RPC, a direct insert, a cascade) keeps them in step. A skipped
-- insert (ON CONFLICT DO NOTHING) fires no trigger, which is what makes a repeated vote count once. The decrement never
-- goes below zero (a CHECK would otherwise turn a drifted counter into a failed unvote) and only updates existing rows,
-- never inserts one, because the row may be disappearing in a cascade.
--
-- Error contract: 42501 not signed in / cannot vote on this chapter (also a chapter the caller cannot see),
-- 22023 voted is null.
--
-- Rollback: DROP TRIGGER chapter_votes_count ON chapter_votes; DROP the three functions; counters keep their values.
BEGIN;

CREATE FUNCTION public.apply_chapter_vote_delta()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_story uuid;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT story_id INTO v_story FROM public.chapters WHERE id = NEW.chapter_id;
        INSERT INTO public.chapter_stats AS s (chapter_id, votes) VALUES (NEW.chapter_id, 1)
        ON CONFLICT (chapter_id) DO UPDATE SET votes = s.votes + 1, updated_at = now();
        INSERT INTO public.story_stats AS s (story_id, votes) VALUES (v_story, 1)
        ON CONFLICT (story_id) DO UPDATE SET votes = s.votes + 1, updated_at = now();
        RETURN NEW;
    END IF;

    UPDATE public.chapter_stats SET votes = greatest(votes - 1, 0), updated_at = now()
     WHERE chapter_id = OLD.chapter_id;
    UPDATE public.story_stats SET votes = greatest(votes - 1, 0), updated_at = now()
     WHERE story_id = (SELECT story_id FROM public.chapters WHERE id = OLD.chapter_id);
    RETURN OLD;
END $$;

REVOKE ALL ON FUNCTION public.apply_chapter_vote_delta() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER chapter_votes_count AFTER INSERT OR DELETE ON chapter_votes
    FOR EACH ROW EXECUTE FUNCTION public.apply_chapter_vote_delta();

CREATE FUNCTION public.set_chapter_vote(p_chapter_id uuid, p_voted boolean)
RETURNS bigint
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_voted IS NULL THEN
        RAISE EXCEPTION 'voted must be true or false' USING ERRCODE = '22023';
    END IF;

    IF p_voted THEN
        INSERT INTO public.chapter_votes (user_id, chapter_id) VALUES (v_uid, p_chapter_id)
        ON CONFLICT (user_id, chapter_id) DO NOTHING;
    ELSE
        DELETE FROM public.chapter_votes WHERE user_id = v_uid AND chapter_id = p_chapter_id;
    END IF;

    RETURN coalesce((SELECT votes FROM public.chapter_stats WHERE chapter_id = p_chapter_id), 0);
END $$;

CREATE FUNCTION public.reconcile_vote_counts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_chapters integer;
    v_stories integer;
BEGIN
    WITH wanted AS (
        SELECT c.id AS chapter_id, count(v.chapter_id) AS votes
          FROM public.chapters c LEFT JOIN public.chapter_votes v ON v.chapter_id = c.id
         GROUP BY c.id),
    fixed AS (
        UPDATE public.chapter_stats s SET votes = w.votes, updated_at = now()
          FROM wanted w WHERE w.chapter_id = s.chapter_id AND s.votes <> w.votes
        RETURNING s.chapter_id)
    SELECT count(*) INTO v_chapters FROM fixed;

    WITH wanted AS (
        SELECT c.story_id, count(v.chapter_id) AS votes
          FROM public.chapters c LEFT JOIN public.chapter_votes v ON v.chapter_id = c.id
         GROUP BY c.story_id),
    fixed AS (
        UPDATE public.story_stats s SET votes = w.votes, updated_at = now()
          FROM wanted w WHERE w.story_id = s.story_id AND s.votes <> w.votes
        RETURNING s.story_id)
    SELECT count(*) INTO v_stories FROM fixed;

    RETURN v_chapters + v_stories;
END $$;

REVOKE ALL ON FUNCTION public.set_chapter_vote(uuid, boolean), public.reconcile_vote_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_chapter_vote(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_vote_counts() TO service_role;

-- Votes that existed before the trigger (none in production yet, but dev data may have some).
SELECT public.reconcile_vote_counts();

COMMIT;
