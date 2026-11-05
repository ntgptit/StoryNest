-- Signed-in versus anonymous share of a story's reads (Lucian 326, waffle chart).
--
-- Rollback:
--   DROP FUNCTION public.author_reader_split(uuid, integer);
--
--   author_reader_split(story_id, days)  one row for the last `days` UTC days (1 to 90, default 30, today included):
--     signed_in_reads / anonymous_reads      reads (one reader x one chapter x one UTC day) split by
--                                            chapter_read_events.is_anonymous; their sum is the reads of
--                                            author_story_daily over the same days
--     signed_in_readers / anonymous_readers  distinct reader ids in the window, split the same way
--
-- Aggregate only: four numbers, no reader id, no per-reader row. Who: the owner and the co-authors
-- (private.story_audience_gate). Window capped at 90 days because read events are purged after that.
-- Error contract: 42501 not allowed, PT404 story not found (or not manageable by the caller), 22023 days out of range.
BEGIN;

CREATE FUNCTION public.author_reader_split(p_story_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (signed_in_reads bigint, anonymous_reads bigint, signed_in_readers bigint, anonymous_readers bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_first date;
BEGIN
    PERFORM private.story_audience_gate(p_story_id);
    IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 90 THEN
        RAISE EXCEPTION 'days must be between 1 and 90' USING ERRCODE = '22023';
    END IF;
    v_first := (timezone('UTC', clock_timestamp()))::date - (p_days - 1);

    RETURN QUERY
    SELECT count(*) FILTER (WHERE NOT e.is_anonymous),
           count(*) FILTER (WHERE e.is_anonymous),
           count(DISTINCT e.reader_id) FILTER (WHERE NOT e.is_anonymous),
           count(DISTINCT e.reader_id) FILTER (WHERE e.is_anonymous)
      FROM public.chapter_read_events e
     WHERE e.story_id = p_story_id AND e.read_day >= v_first;
END $$;

REVOKE ALL ON FUNCTION public.author_reader_split(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_reader_split(uuid, integer) TO authenticated;

COMMIT;
