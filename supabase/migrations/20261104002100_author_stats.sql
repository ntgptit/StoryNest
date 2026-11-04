-- Statistics for authors (WBS WP 6.5): per chapter and over time, and how many readers carry on to the next chapter.
--
--   author_chapter_stats(story_id)         one row per published chapter in reading order: reads, votes, comments (the
--                                          counters of chapter_stats, so the numbers are the same everywhere in the app)
--                                          and `retention`, reads of this chapter divided by reads of the previous one
--                                          (NULL for the first chapter or when the previous one has no reads yet)
--   author_story_daily(story_id, days)     one row per UTC day of the last `days` days (1 to 90, default 30), today
--                                          included, zero-filled: reads, new votes, new comments
--
-- Who: the owner and the co-authors of the story. An editor writes chapters but does not see the audience; a stranger
-- gets "not found" for any story they cannot manage, whether or not it exists (42501 only for someone who can see the story).
--
-- How it stays cheap: the per-chapter table reads chapter_stats (one row per chapter), never the event table. The daily
-- series reads three indexed ranges: chapter_read_events by (story_id, read_day) (index added here), chapter_votes by
-- (chapter_id, created_at) and comments by (chapter_id, created_at) for visible comments, each limited to the window.
-- Limits worth knowing: reads per day come from read events, which are purged after 90 days once counted, so the series
-- never reaches further back than that (hence the cap of 90 days); a read is counted in the series as soon as it is
-- recorded, in chapter_stats up to a minute later (the aggregation job). Days are UTC days, like read_day.
-- Error contract: 42501 not allowed, PT404 story not found (or not manageable by the caller), 22023 invalid number of days.
-- Rollback: DROP the two functions and the index.
BEGIN;

CREATE INDEX idx_chapter_read_events_story_day ON public.chapter_read_events (story_id, read_day);

CREATE FUNCTION public.author_chapter_stats(p_story_id uuid)
RETURNS TABLE (
    chapter_id uuid,
    slug text,
    sort_order integer,
    title text,
    reads bigint,
    votes bigint,
    comments bigint,
    retention numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_role text := public.story_role(p_story_id);
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_role NOT IN ('owner', 'co_author') THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH chapter_rows AS (
        SELECT c.id AS chapter_id, c.slug::text AS slug, c.sort_order::integer AS sort_order,
               coalesce(v.title, c.slug)::text AS title,
               coalesce(s.reads, 0) AS reads, coalesce(s.votes, 0) AS votes, coalesce(s.comments, 0) AS comments
          FROM public.chapters c
          LEFT JOIN public.chapter_versions v ON v.id = c.published_version_id
          LEFT JOIN public.chapter_stats s ON s.chapter_id = c.id
         WHERE c.story_id = p_story_id AND c.status = 'published' AND c.deleted_at IS NULL)
    SELECT r.chapter_id, r.slug, r.sort_order, r.title, r.reads, r.votes, r.comments,
           round(r.reads::numeric / nullif(lag(r.reads) OVER (ORDER BY r.sort_order, r.chapter_id), 0), 4)
      FROM chapter_rows r
     ORDER BY r.sort_order, r.chapter_id;
END $$;

REVOKE ALL ON FUNCTION public.author_chapter_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_chapter_stats(uuid) TO authenticated;

CREATE FUNCTION public.author_story_daily(p_story_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (day date, reads bigint, votes bigint, comments bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_role text := public.story_role(p_story_id);
    v_first date;
    v_from timestamptz;
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 90 THEN
        RAISE EXCEPTION 'days must be between 1 and 90' USING ERRCODE = '22023';
    END IF;
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_role NOT IN ('owner', 'co_author') THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;

    v_first := (timezone('UTC', clock_timestamp()))::date - (p_days - 1);
    v_from := v_first::timestamp AT TIME ZONE 'UTC';

    RETURN QUERY
    WITH days AS (
        SELECT d::date AS day
          FROM generate_series(v_first::timestamp, (timezone('UTC', clock_timestamp()))::date::timestamp, interval '1 day') d),
    read_counts AS (
        SELECT e.read_day AS day, count(*) AS n
          FROM public.chapter_read_events e
         WHERE e.story_id = p_story_id AND e.read_day >= v_first
         GROUP BY e.read_day),
    vote_counts AS (
        SELECT (timezone('UTC', v.created_at))::date AS day, count(*) AS n
          FROM public.chapters c
          JOIN public.chapter_votes v ON v.chapter_id = c.id AND v.created_at >= v_from
         WHERE c.story_id = p_story_id
         GROUP BY 1),
    comment_counts AS (
        SELECT (timezone('UTC', m.created_at))::date AS day, count(*) AS n
          FROM public.chapters c
          JOIN public.comments m ON m.chapter_id = c.id AND m.status = 'visible' AND m.created_at >= v_from
         WHERE c.story_id = p_story_id
         GROUP BY 1)
    SELECT d.day, coalesce(r.n, 0), coalesce(v.n, 0), coalesce(m.n, 0)
      FROM days d
      LEFT JOIN read_counts r ON r.day = d.day
      LEFT JOIN vote_counts v ON v.day = d.day
      LEFT JOIN comment_counts m ON m.day = d.day
     ORDER BY d.day;
END $$;

REVOKE ALL ON FUNCTION public.author_story_daily(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_story_daily(uuid, integer) TO authenticated;

COMMIT;
