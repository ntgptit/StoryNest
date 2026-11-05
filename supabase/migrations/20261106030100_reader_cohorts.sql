-- Weekly reader cohorts of a story (Lucian 161, retention cohort table).
--
-- Rollback:
--   DROP FUNCTION public.author_reader_cohorts(uuid, integer);
--
--   author_reader_cohorts(story_id, weeks)  one row per (cohort week, week offset) for the last `weeks` weeks (1 to 12,
--                                           default 8), oldest cohort first:
--     cohort_week     Monday (UTC) of the week in which these readers first read the story
--     cohort_size     readers whose first read falls in that week; NULL when suppressed
--     week_offset     0 = the cohort week itself, 1 = the week after, ... up to the current week
--     active_readers  readers of the cohort who read any chapter of the story in that week; NULL when suppressed
--     suppressed      true when the cohort has 1 to 4 readers (see below); a cohort of 0 is not suppressed
--
-- What a reader is: one reader_id of chapter_read_events, i.e. a signed-in account or one anonymous browser id; the
-- same person on two devices counts twice when not signed in. Weeks are ISO weeks (Monday first) in UTC, like read_day.
-- Privacy: the result is aggregate only, no reader id leaves the function. A cohort smaller than 5 readers is returned
-- with NULL counts (`suppressed`), so an author who knows that one friend started reading on a given week cannot follow
-- that friend's weekly reading. The threshold is the constant v_min below (5) and is mirrored in
-- packages/validation (AUDIENCE_LIMITS.minGroupSize).
-- Limits: read events are purged 90 days after they are counted (purge_read_events), so the window stops at 12 weeks;
-- "first read" means the first read still kept, and a reader whose real first read is older than 90 days is counted
-- as new. Cost: one indexed range of chapter_read_events by (story_id, read_day) per call.
-- Error contract: 42501 not allowed, PT404 story not found (or not manageable by the caller), 22023 weeks out of range.
BEGIN;

CREATE FUNCTION public.author_reader_cohorts(p_story_id uuid, p_weeks integer DEFAULT 8)
RETURNS TABLE (cohort_week date, cohort_size bigint, week_offset integer, active_readers bigint, suppressed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_min constant integer := 5;
    v_this_week date := date_trunc('week', timezone('UTC', clock_timestamp()))::date;
    v_first_week date;
BEGIN
    PERFORM private.story_audience_gate(p_story_id);
    IF p_weeks IS NULL OR p_weeks NOT BETWEEN 1 AND 12 THEN
        RAISE EXCEPTION 'weeks must be between 1 and 12' USING ERRCODE = '22023';
    END IF;
    v_first_week := v_this_week - 7 * (p_weeks - 1);

    RETURN QUERY
    WITH events AS (
        -- Everything still kept for the story: a reader who read before the window must not look new inside it.
        SELECT e.reader_id, date_trunc('week', e.read_day::timestamp)::date AS week
          FROM public.chapter_read_events e
         WHERE e.story_id = p_story_id),
    firsts AS (
        SELECT reader_id, min(week) AS cohort FROM events GROUP BY reader_id),
    weeks AS (
        SELECT w::date AS week FROM generate_series(v_first_week::timestamp, v_this_week::timestamp, interval '7 days') w),
    sizes AS (
        SELECT w.week AS cohort, count(f.reader_id) AS n
          FROM weeks w LEFT JOIN firsts f ON f.cohort = w.week
         GROUP BY w.week),
    activity AS (
        SELECT f.cohort, e.week, count(DISTINCT e.reader_id) AS n
          FROM firsts f JOIN events e ON e.reader_id = f.reader_id
         WHERE f.cohort >= v_first_week
         GROUP BY f.cohort, e.week),
    cells AS (
        SELECT s.cohort, s.n AS size, w.week, ((w.week - s.cohort) / 7)::integer AS week_offset
          FROM sizes s JOIN weeks w ON w.week >= s.cohort)
    SELECT c.cohort,
           CASE WHEN c.size BETWEEN 1 AND v_min - 1 THEN NULL ELSE c.size END,
           c.week_offset,
           CASE WHEN c.size BETWEEN 1 AND v_min - 1 THEN NULL ELSE coalesce(a.n, 0) END,
           c.size BETWEEN 1 AND v_min - 1
      FROM cells c
      LEFT JOIN activity a ON a.cohort = c.cohort AND a.week = c.week
     ORDER BY c.cohort, c.week_offset;
END $$;

REVOKE ALL ON FUNCTION public.author_reader_cohorts(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_reader_cohorts(uuid, integer) TO authenticated;

COMMIT;
