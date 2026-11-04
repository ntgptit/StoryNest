-- Chapter read events with dedupe (WBS WP 2.6, decision D2).
--
--   record_chapter_read(chapter_id, anon_id?) -> boolean   anon + authenticated; true = a NEW read was counted
--   aggregate_reads(limit?)                    -> integer   service_role / cron; folds new events into the stats
--   purge_read_events(retention?)              -> integer   service_role / cron; drops old aggregated events
--
-- A "read" = one reader x one chapter x one UTC day. The reader is auth.uid() when signed in, otherwise the random
-- anonymous id the client keeps (p_anon_id). A repeat (page refresh, reopening the chapter) hits the unique index and
-- is ignored, so it never reaches the counters. The counters (chapter_stats.reads / story_stats.reads) are NEVER
-- written per request: record_chapter_read only appends an event, and aggregate_reads (pg_cron, every minute) adds the
-- new events to the counters in one transaction, marking them aggregated so a re-run adds nothing.
--
-- Limits worth knowing: an anonymous id is client-chosen, so a determined script can inflate a chapter's reads by
-- inventing ids. Reads are a popularity signal, not money; if that changes, move guests behind a server-issued id.
--
-- Error contract (SQLSTATE): PT404 chapter not found / not published / not readable by the caller, 22023 neither a
-- signed-in user nor an anonymous id.
--
-- Rollback: cron.unschedule the two jobs, DROP the three functions, DROP TABLE chapter_read_events.
BEGIN;

CREATE TABLE chapter_read_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    -- auth.uid() or the anonymous id. Random uuids never collide across the two, and there is deliberately no FK to
    -- app_users: events must survive account anonymisation without pointing at a person.
    reader_id uuid NOT NULL,
    is_anonymous boolean NOT NULL,
    read_day date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    aggregated_at timestamptz,
    UNIQUE (chapter_id, reader_id, read_day)
);
CREATE INDEX idx_chapter_read_events_pending ON chapter_read_events (id) WHERE aggregated_at IS NULL;
CREATE INDEX idx_chapter_read_events_purge ON chapter_read_events (aggregated_at) WHERE aggregated_at IS NOT NULL;
CREATE INDEX idx_chapter_read_events_story ON chapter_read_events (story_id);
ALTER TABLE chapter_read_events ENABLE ROW LEVEL SECURITY;   -- no policies, no grants: reachable only through the functions
REVOKE ALL ON chapter_read_events FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_chapter_read(p_chapter_id uuid, p_anon_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_user uuid := auth.uid();
    v_reader uuid;
    v_story_id uuid;
    v_inserted integer;
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

    INSERT INTO public.chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day)
    VALUES (p_chapter_id, v_story_id, v_reader, v_user IS NULL, (now() AT TIME ZONE 'UTC')::date)
    ON CONFLICT (chapter_id, reader_id, read_day) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted = 1;
END $$;

CREATE FUNCTION public.aggregate_reads(p_limit integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_done integer;
BEGIN
    -- One statement = one snapshot: the events are marked and counted together, so no event is counted twice or lost.
    -- SKIP LOCKED lets two overlapping runs take different batches instead of waiting on each other.
    WITH batch AS (
        SELECT id FROM public.chapter_read_events
        WHERE aggregated_at IS NULL ORDER BY id LIMIT GREATEST(p_limit, 1) FOR UPDATE SKIP LOCKED
    ), done AS (
        UPDATE public.chapter_read_events e SET aggregated_at = now()
        FROM batch WHERE e.id = batch.id
        RETURNING e.chapter_id, e.story_id
    ), per_chapter AS (
        SELECT chapter_id, count(*) AS n FROM done GROUP BY chapter_id
    ), per_story AS (
        SELECT story_id, count(*) AS n FROM done GROUP BY story_id
    ), up_chapter AS (
        INSERT INTO public.chapter_stats AS s (chapter_id, reads)
        SELECT chapter_id, n FROM per_chapter
        ON CONFLICT (chapter_id) DO UPDATE SET reads = s.reads + EXCLUDED.reads, updated_at = now()
        RETURNING 1
    ), up_story AS (
        INSERT INTO public.story_stats AS s (story_id, reads)
        SELECT story_id, n FROM per_story
        ON CONFLICT (story_id) DO UPDATE SET reads = s.reads + EXCLUDED.reads, updated_at = now()
        RETURNING 1
    )
    SELECT count(*) INTO v_done FROM done;
    RETURN v_done;
END $$;

CREATE FUNCTION public.purge_read_events(p_retention interval DEFAULT interval '90 days')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_deleted integer;
BEGIN
    -- Only events already folded into the counters; anything pending is kept regardless of age.
    DELETE FROM public.chapter_read_events WHERE aggregated_at IS NOT NULL AND aggregated_at < now() - p_retention;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END $$;

REVOKE ALL ON FUNCTION public.record_chapter_read(uuid, uuid), public.aggregate_reads(integer),
    public.purge_read_events(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_chapter_read(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aggregate_reads(integer), public.purge_read_events(interval) TO service_role;

-- Schedule (same convention as the outbox jobs: upsert by name; NOTICE when pg_cron is unavailable).
DO $$
BEGIN
    IF to_regnamespace('cron') IS NULL THEN
        RAISE NOTICE 'pg_cron is not available: run public.aggregate_reads() every minute and public.purge_read_events() daily from another runner.';
        RETURN;
    END IF;
    PERFORM cron.schedule('storynest-aggregate-reads',  '* * * * *',  'SELECT public.aggregate_reads()');
    PERFORM cron.schedule('storynest-purge-read-events', '41 3 * * *', 'SELECT public.purge_read_events()');
END $$;

COMMIT;
