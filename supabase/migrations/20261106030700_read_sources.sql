-- Where reads come from, inside the app (Lucian 153, visit-to-outcome flow).
--
-- Rollback:
--   DROP FUNCTION public.author_read_sources(uuid, integer);
--   DROP FUNCTION public.record_chapter_read(uuid, uuid, text);
--   ALTER TABLE public.chapter_read_events DROP COLUMN source;
--   then re-create record_chapter_read(uuid, uuid) from 20261104000100_chapter_reads.sql with its grants.
--
--   chapter_read_events.source   optional, coarse: the in-app surface the reader came from, one of
--                                story_page, next_chapter, library, search, discover, ranking, notification,
--                                profile, other. NULL when unknown (old clients, direct links).
--   record_chapter_read(chapter_id, anon_id?, source?)
--                                replaces the two-argument version (same name, so existing callers keep working: the
--                                new argument has a default). The counting rules do not change at all: the same
--                                checks (PT404 / 22023), the same dedupe (one reader x chapter x UTC day; the source
--                                of the first read of the day is kept, a repeat with another source changes nothing),
--                                the same return value, the same aggregation into the counters. An unknown source
--                                value is stored as NULL rather than refusing the read, so a source can never make a
--                                read be lost or counted differently.
--   author_read_sources(story_id, days)
--                                owner and co-authors: per source of the readers' first read of the story in the
--                                last `days` UTC days (1 to 90, default 30): readers, continued (of those, readers who
--                                read at least two different chapters in the window), followed (of those, signed-in
--                                readers who follow the story now). Sources with fewer than 5 readers come back with
--                                NULL counts and `suppressed`, like the reader cohorts. 'unknown' groups NULL sources.
--
-- Not tracking across sites: the source is chosen by the app from its own navigation (which StoryNest screen the
-- reader opened the story from). No referrer, no URL of another site, no campaign id, no third-party identifier is
-- read or stored; the value is one of nine fixed words. Aggregate only; no reader id leaves the function.
-- Error contract: 42501 not allowed, PT404 story not found (or not manageable by the caller), 22023 days out of range.
BEGIN;

ALTER TABLE public.chapter_read_events
    ADD COLUMN source text CHECK (source IN ('story_page', 'next_chapter', 'library', 'search', 'discover', 'ranking',
                                             'notification', 'profile', 'other'));

DROP FUNCTION public.record_chapter_read(uuid, uuid);

CREATE FUNCTION public.record_chapter_read(p_chapter_id uuid, p_anon_id uuid DEFAULT NULL, p_source text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_user uuid := auth.uid();
    v_reader uuid;
    v_story_id uuid;
    v_inserted integer;
    v_source text;
BEGIN
    v_reader := COALESCE(v_user, p_anon_id);
    IF v_reader IS NULL THEN
        RAISE EXCEPTION 'a signed-in user or an anonymous id is required' USING ERRCODE = '22023';
    END IF;

    -- Only chapters the caller could read count; can_read_chapter also covers private/draft stories.
    SELECT c.story_id INTO v_story_id
    FROM public.chapters c
    WHERE c.id = p_chapter_id AND c.status = 'published' AND c.deleted_at IS NULL
      AND public.can_read_chapter(c.id);
    IF NOT FOUND THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;

    v_source := CASE WHEN p_source IN ('story_page', 'next_chapter', 'library', 'search', 'discover', 'ranking',
                                       'notification', 'profile', 'other') THEN p_source END;

    INSERT INTO public.chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source)
    VALUES (p_chapter_id, v_story_id, v_reader, v_user IS NULL, (now() AT TIME ZONE 'UTC')::date, v_source)
    ON CONFLICT (chapter_id, reader_id, read_day) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted = 1;
END $$;

REVOKE ALL ON FUNCTION public.record_chapter_read(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_chapter_read(uuid, uuid, text) TO anon, authenticated, service_role;

CREATE FUNCTION public.author_read_sources(p_story_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (source text, readers bigint, continued bigint, followed bigint, suppressed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_min constant integer := 5;
    v_first date;
BEGIN
    PERFORM private.story_audience_gate(p_story_id);
    IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 90 THEN
        RAISE EXCEPTION 'days must be between 1 and 90' USING ERRCODE = '22023';
    END IF;
    v_first := (timezone('UTC', clock_timestamp()))::date - (p_days - 1);

    RETURN QUERY
    WITH events AS (
        SELECT e.id, e.reader_id, e.is_anonymous, e.chapter_id, coalesce(e.source, 'unknown') AS source
          FROM public.chapter_read_events e
         WHERE e.story_id = p_story_id AND e.read_day >= v_first),
    readers AS (
        SELECT DISTINCT ON (ev.reader_id) ev.reader_id, ev.is_anonymous, ev.source
          FROM events ev ORDER BY ev.reader_id, ev.id),
    per_reader AS (
        SELECT r.source,
               (SELECT count(DISTINCT ev.chapter_id) FROM events ev WHERE ev.reader_id = r.reader_id) >= 2 AS continued,
               (NOT r.is_anonymous AND EXISTS (SELECT 1 FROM public.story_follows f
                                                WHERE f.story_id = p_story_id AND f.user_id = r.reader_id)) AS followed
          FROM readers r),
    grouped AS (
        SELECT p.source, count(*) AS readers, count(*) FILTER (WHERE p.continued) AS continued,
               count(*) FILTER (WHERE p.followed) AS followed
          FROM per_reader p GROUP BY p.source)
    SELECT g.source,
           CASE WHEN g.readers < v_min THEN NULL ELSE g.readers END,
           CASE WHEN g.readers < v_min THEN NULL ELSE g.continued END,
           CASE WHEN g.readers < v_min THEN NULL ELSE g.followed END,
           g.readers < v_min
      FROM grouped g
     ORDER BY g.readers < v_min, CASE WHEN g.readers >= v_min THEN g.readers END DESC, g.source;
END $$;

REVOKE ALL ON FUNCTION public.author_read_sources(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_read_sources(uuid, integer) TO authenticated;

COMMIT;
