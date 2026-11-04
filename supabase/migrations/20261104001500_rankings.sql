-- WP 5.3: rankings (top / trending by time window) from read events and votes.
--
--   story_rankings (materialized view)   one row per (period, story) with the reads and votes inside the period and a
--                                        score. Periods: day (today, UTC), week (last 7 days), month (last 30 days) from
--                                        the events and votes of that time; all from the running totals story_stats.
--                                        Score = reads + 5 x votes: a vote is a deliberate act, a read is cheap.
--   ranking_state                        one row: when the last refresh took its snapshot, how long it took, how many rows.
--   refresh_rankings()                   service_role / cron: REFRESH ... CONCURRENTLY (readers are never blocked) and
--                                        records the state. Returns the row count, NULL when another refresh is running.
--   top_stories(period, mature, limit, offset) -> (story_id, reads, votes, score, position)   anon + authenticated
--   ranking_freshness()                  -> (refreshed_at, lag_seconds, duration_ms, row_count)   anon + authenticated
--
-- The view is private (no grants: it holds ids and counts of stories that may be private). top_stories is SECURITY
-- DEFINER and applies the discovery rules itself, against the live stories table, so a story that was made private or
-- deleted after the last refresh is gone at once, not at the next refresh: public, not draft, not deleted, owner's account
-- active, mature only when asked. Only the numbers lag, by at most the refresh interval (every 5 minutes by cron).
-- Limits: limit 1..50, offset 0..200 (22023), period one of day/week/month/all (22023).
-- Read events are kept 90 days (purge_read_events), enough for the month window.
-- Rollback: cron.unschedule('storynest-refresh-rankings'); DROP the three functions, ranking_state and the view.
BEGIN;

CREATE MATERIALIZED VIEW public.story_rankings AS
WITH windows (period, days) AS (VALUES ('day', 1), ('week', 7), ('month', 30)),
reads AS (
    SELECT w.period, e.story_id, count(*) AS reads
      FROM windows w
      JOIN public.chapter_read_events e ON e.read_day > (now() AT TIME ZONE 'UTC')::date - w.days
     GROUP BY w.period, e.story_id),
votes AS (
    SELECT w.period, c.story_id, count(*) AS votes
      FROM windows w
      JOIN public.chapter_votes v ON v.created_at > now() - make_interval(days => w.days)
      JOIN public.chapters c ON c.id = v.chapter_id
     GROUP BY w.period, c.story_id),
windowed AS (
    SELECT coalesce(r.period, v.period) AS period, coalesce(r.story_id, v.story_id) AS story_id,
           coalesce(r.reads, 0) AS reads, coalesce(v.votes, 0) AS votes
      FROM reads r FULL JOIN votes v ON v.period = r.period AND v.story_id = r.story_id)
SELECT period::text AS period, story_id, reads::bigint AS reads, votes::bigint AS votes, (reads + 5 * votes)::bigint AS score
  FROM windowed
UNION ALL
SELECT 'all', s.story_id, s.reads, s.votes, s.reads + 5 * s.votes
  FROM public.story_stats s
 WHERE s.reads + s.votes > 0
WITH DATA;

-- A unique index is what allows REFRESH ... CONCURRENTLY; the second one serves the ordered reads.
CREATE UNIQUE INDEX story_rankings_key ON public.story_rankings (period, story_id);
CREATE INDEX story_rankings_order ON public.story_rankings (period, score DESC, reads DESC, story_id);
REVOKE ALL ON public.story_rankings FROM PUBLIC, anon, authenticated;

CREATE TABLE public.ranking_state (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    refreshed_at timestamptz NOT NULL DEFAULT now(),
    duration_ms integer NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
    row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0)
);
ALTER TABLE public.ranking_state ENABLE ROW LEVEL SECURITY;   -- no policies, no grants: reachable only through the functions
REVOKE ALL ON public.ranking_state FROM PUBLIC, anon, authenticated;
INSERT INTO public.ranking_state (row_count) SELECT count(*) FROM public.story_rankings;

CREATE FUNCTION public.refresh_rankings()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_started timestamptz := clock_timestamp();
    v_rows integer;
BEGIN
    -- Two overlapping refreshes would only queue behind each other: the second one is skipped.
    IF NOT pg_try_advisory_xact_lock(hashtextextended('refresh_rankings', 0)) THEN
        RETURN NULL;
    END IF;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.story_rankings;
    SELECT count(*) INTO v_rows FROM public.story_rankings;
    UPDATE public.ranking_state
       SET refreshed_at = v_started,
           duration_ms = floor(extract(epoch FROM clock_timestamp() - v_started) * 1000)::integer,
           row_count = v_rows;
    RETURN v_rows;
END $$;

CREATE FUNCTION public.top_stories(
    p_period text, p_include_mature boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (story_id uuid, reads bigint, votes bigint, score bigint, rank_position integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
    IF p_period IS NULL OR p_period NOT IN ('day', 'week', 'month', 'all') THEN
        RAISE EXCEPTION 'period must be day, week, month or all' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'limit must be between 1 and 50' USING ERRCODE = '22023';
    END IF;
    IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 200 THEN
        RAISE EXCEPTION 'offset must be between 0 and 200' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    SELECT ranked.story_id, ranked.reads, ranked.votes, ranked.score, ranked.pos::integer
      FROM (SELECT r.story_id, r.reads, r.votes, r.score,
                   row_number() OVER (ORDER BY r.score DESC, r.reads DESC, r.story_id) AS pos
              FROM public.story_rankings r
              JOIN public.stories st ON st.id = r.story_id
             WHERE r.period = p_period
               AND st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
               AND (coalesce(p_include_mature, false) OR NOT st.is_mature)
               AND EXISTS (SELECT 1 FROM public.app_users o
                            WHERE o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL)) ranked
     WHERE ranked.pos > p_offset
     ORDER BY ranked.pos
     LIMIT p_limit;
END $$;

CREATE FUNCTION public.ranking_freshness()
RETURNS TABLE (refreshed_at timestamptz, lag_seconds numeric, duration_ms integer, row_count integer)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    -- clock_timestamp, not now(): the lag is measured when asked, even inside a long transaction.
    SELECT s.refreshed_at, round(extract(epoch FROM clock_timestamp() - s.refreshed_at), 1), s.duration_ms, s.row_count
      FROM public.ranking_state s
$$;

REVOKE ALL ON FUNCTION public.refresh_rankings(), public.top_stories(text, boolean, integer, integer),
    public.ranking_freshness() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_rankings() TO service_role;
GRANT EXECUTE ON FUNCTION public.top_stories(text, boolean, integer, integer), public.ranking_freshness()
    TO anon, authenticated, service_role;

DO $$
BEGIN
    IF to_regnamespace('cron') IS NULL THEN
        RAISE NOTICE 'pg_cron is not available: run public.refresh_rankings() every 5 minutes from another runner.';
        RETURN;
    END IF;
    PERFORM cron.schedule('storynest-refresh-rankings', '*/5 * * * *', 'SELECT public.refresh_rankings()');
END $$;

COMMIT;
