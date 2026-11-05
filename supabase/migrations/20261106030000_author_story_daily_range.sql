-- Story statistics over a chosen date range (Lucian 030, date range calendar), and the shared audience gate.
--
-- Rollback:
--   DROP FUNCTION public.author_story_daily_range(uuid, date, date);
--   DROP FUNCTION private.story_audience_gate(uuid);
--
--   private.story_audience_gate(story_id)          raises unless the caller may see the story's audience: 42501 when
--                                                  nobody is signed in or the caller is an editor of the story,
--                                                  PT404 when the caller has no role on it (a reader, a stranger, or
--                                                  a story that does not exist). The same rule as author_chapter_stats / author_story_daily:
--                                                  only the owner and the co-authors. Used by every audience RPC of
--                                                  this batch, so the rule lives in one place.
--   author_story_daily_range(story_id, from, to)   the rows of author_story_daily (UTC day, reads, new votes, new
--                                                  comments; zero-filled, oldest first) for from..to inclusive.
--
-- Limits: from <= to, at most 90 days in the range, `to` no later than today (UTC) and `from` no earlier than 89 days
-- before today. Reads come from chapter_read_events, which are purged 90 days after they are counted, so an older
-- range would show zero reads that were really there; the calendar therefore only offers the last 90 days (the same
-- window as author_story_daily's longest range). 22023 for any of these, checked after the access rule.
-- Error contract: 42501 not allowed, PT404 story not found (or not manageable by the caller), 22023 invalid range.
BEGIN;

CREATE FUNCTION private.story_audience_gate(p_story_id uuid)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_role text;
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    v_role := public.story_role(p_story_id);
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_role NOT IN ('owner', 'co_author') THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
END $$;
REVOKE ALL ON FUNCTION private.story_audience_gate(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.author_story_daily_range(p_story_id uuid, p_from date, p_to date)
RETURNS TABLE (day date, reads bigint, votes bigint, comments bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_today date := (timezone('UTC', clock_timestamp()))::date;
    v_from timestamptz;
    v_until timestamptz;
BEGIN
    PERFORM private.story_audience_gate(p_story_id);
    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
        RAISE EXCEPTION 'from and to are required and from must not be after to' USING ERRCODE = '22023';
    END IF;
    IF p_to > v_today OR p_from < v_today - 89 THEN
        RAISE EXCEPTION 'the range must lie within the last 90 days' USING ERRCODE = '22023';
    END IF;

    v_from := p_from::timestamp AT TIME ZONE 'UTC';
    v_until := (p_to + 1)::timestamp AT TIME ZONE 'UTC';

    RETURN QUERY
    WITH days AS (
        SELECT d::date AS day FROM generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d),
    read_counts AS (
        SELECT e.read_day AS day, count(*) AS n
          FROM public.chapter_read_events e
         WHERE e.story_id = p_story_id AND e.read_day BETWEEN p_from AND p_to
         GROUP BY e.read_day),
    vote_counts AS (
        SELECT (timezone('UTC', v.created_at))::date AS day, count(*) AS n
          FROM public.chapters c
          JOIN public.chapter_votes v ON v.chapter_id = c.id AND v.created_at >= v_from AND v.created_at < v_until
         WHERE c.story_id = p_story_id
         GROUP BY 1),
    comment_counts AS (
        SELECT (timezone('UTC', m.created_at))::date AS day, count(*) AS n
          FROM public.chapters c
          JOIN public.comments m ON m.chapter_id = c.id AND m.status = 'visible'
                                AND m.created_at >= v_from AND m.created_at < v_until
         WHERE c.story_id = p_story_id
         GROUP BY 1)
    SELECT d.day, coalesce(r.n, 0), coalesce(v.n, 0), coalesce(m.n, 0)
      FROM days d
      LEFT JOIN read_counts r ON r.day = d.day
      LEFT JOIN vote_counts v ON v.day = d.day
      LEFT JOIN comment_counts m ON m.day = d.day
     ORDER BY d.day;
END $$;

REVOKE ALL ON FUNCTION public.author_story_daily_range(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_story_daily_range(uuid, date, date) TO authenticated;

COMMIT;
