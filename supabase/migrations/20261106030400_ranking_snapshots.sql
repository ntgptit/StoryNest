-- Daily ranking history (Lucian 246 rank-swapping bar race, Lucian 359 rank slope chart).
--
-- Rollback:
--   SELECT cron.unschedule('storynest-snapshot-rankings');   -- only if someone scheduled it (see below)
--   DROP FUNCTION public.ranking_history(text, integer, boolean, integer);
--   DROP FUNCTION public.snapshot_rankings(date, integer);
--   DROP TABLE public.ranking_snapshots;
--
--   ranking_snapshots                one row per (UTC day, period, story): the story's place among the eligible
--                                    stories of story_rankings when the snapshot was taken, with its score, reads and
--                                    votes. RLS on, no policy, no grant (it holds ids of stories that may later turn
--                                    private): read only through ranking_history.
--   snapshot_rankings(day, keep)     service_role: replaces the snapshot of `day` (default today, UTC) with the top
--                                    `keep` (1 to 200, default 100) stories of each period, taken from the
--                                    materialized view story_rankings as it stands (so run it right after
--                                    refresh_rankings), and deletes snapshots older than 90 days. Idempotent: a second
--                                    run on the same day replaces the first. Returns the number of rows written.
--   ranking_history(period, days, include_mature, limit)
--                                    anon + authenticated: for each of the last `days` snapshot days (1 to 30, default
--                                    7), the top `limit` (1 to 20, default 10) stories: day, story_id, rank_position,
--                                    score, reads, votes. Oldest day first.
--
-- Eligibility: a snapshot keeps every story that was public, not draft, not deleted and whose owner was active at the
-- time, mature or not. ranking_history applies the discovery rules again against the live stories table (exactly as
-- top_stories does), so a story made private or deleted since is gone from the whole history at once, and positions
-- are recomputed within what the caller may see (mature stories only when asked). The order inside a day is the
-- snapshot's own order (score, then reads, then id), so the history agrees with what top_stories showed that day.
--
-- Scheduling (deliberately NOT done here; run once by whoever operates the project, where pg_cron exists):
--   SELECT cron.schedule('storynest-snapshot-rankings', '57 23 * * *',
--                        'SELECT public.refresh_rankings(); SELECT public.snapshot_rankings();');
-- 23:57 UTC catches the "day" period nearly complete. Without pg_cron, call the same two functions once a day from an
-- Edge Function or any runner with the service role. Missing days are simply absent from the history (no zero rows).
-- Error contract: 22023 period / days / limit / keep out of range; 42501 for any role other than service_role on
-- snapshot_rankings (no EXECUTE grant).
BEGIN;

CREATE TABLE public.ranking_snapshots (
    day date NOT NULL,
    period text NOT NULL CHECK (period IN ('day', 'week', 'month', 'all')),
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    rank_position integer NOT NULL CHECK (rank_position > 0),
    score bigint NOT NULL CHECK (score >= 0),
    reads bigint NOT NULL CHECK (reads >= 0),
    votes bigint NOT NULL CHECK (votes >= 0),
    PRIMARY KEY (period, day, story_id)
);
-- The FK's own index: story deletion cascades here.
CREATE INDEX idx_ranking_snapshots_story ON public.ranking_snapshots (story_id);
CREATE INDEX idx_ranking_snapshots_purge ON public.ranking_snapshots (day);
ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;   -- no policies, no grants
REVOKE ALL ON public.ranking_snapshots FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.snapshot_rankings(p_day date DEFAULT NULL, p_keep integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_day date := coalesce(p_day, (timezone('UTC', clock_timestamp()))::date);
    v_rows integer;
BEGIN
    IF p_keep IS NULL OR p_keep NOT BETWEEN 1 AND 200 THEN
        RAISE EXCEPTION 'keep must be between 1 and 200' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.ranking_snapshots WHERE day = v_day;
    INSERT INTO public.ranking_snapshots (day, period, story_id, rank_position, score, reads, votes)
    SELECT v_day, ranked.period, ranked.story_id, ranked.pos, ranked.score, ranked.reads, ranked.votes
      FROM (SELECT r.period, r.story_id, r.score, r.reads, r.votes,
                   row_number() OVER (PARTITION BY r.period ORDER BY r.score DESC, r.reads DESC, r.story_id)::integer AS pos
              FROM public.story_rankings r
              JOIN public.stories st ON st.id = r.story_id
             WHERE st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
               AND EXISTS (SELECT 1 FROM public.app_users o
                            WHERE o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL)) ranked
     WHERE ranked.pos <= p_keep;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    DELETE FROM public.ranking_snapshots WHERE day < v_day - 90;
    RETURN v_rows;
END $$;

CREATE FUNCTION public.ranking_history(
    p_period text, p_days integer DEFAULT 7, p_include_mature boolean DEFAULT false, p_limit integer DEFAULT 10)
RETURNS TABLE (day date, story_id uuid, rank_position integer, score bigint, reads bigint, votes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_today date := (timezone('UTC', clock_timestamp()))::date;
BEGIN
    IF p_period IS NULL OR p_period NOT IN ('day', 'week', 'month', 'all') THEN
        RAISE EXCEPTION 'period must be day, week, month or all' USING ERRCODE = '22023';
    END IF;
    IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 30 THEN
        RAISE EXCEPTION 'days must be between 1 and 30' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20 THEN
        RAISE EXCEPTION 'limit must be between 1 and 20' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    SELECT ranked.day, ranked.story_id, ranked.pos::integer, ranked.score, ranked.reads, ranked.votes
      FROM (SELECT s.day, s.story_id, s.score, s.reads, s.votes,
                   row_number() OVER (PARTITION BY s.day ORDER BY s.rank_position) AS pos
              FROM public.ranking_snapshots s
              JOIN public.stories st ON st.id = s.story_id
             WHERE s.period = p_period AND s.day > v_today - p_days AND s.day <= v_today
               AND st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
               AND (coalesce(p_include_mature, false) OR NOT st.is_mature)
               AND EXISTS (SELECT 1 FROM public.app_users o
                            WHERE o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL)) ranked
     WHERE ranked.pos <= p_limit
     ORDER BY ranked.day, ranked.pos;
END $$;

REVOKE ALL ON FUNCTION public.snapshot_rankings(date, integer),
    public.ranking_history(text, integer, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_rankings(date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ranking_history(text, integer, boolean, integer) TO anon, authenticated, service_role;

COMMIT;
