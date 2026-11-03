-- Outbox worker + background job schedule.
--
--   process_outbox(limit?)   drains outbox_events: retries with exponential backoff, dead-letters after
--                            5 attempts. Event handlers live in private.handle_outbox_event.
--   purge_outbox(retention?) deletes processed events older than the retention window (default 14 days).
--                            Dead-lettered events are kept for investigation.
--   pg_cron schedule         publish_due_chapters + process_outbox every minute, purge_outbox daily.
--
-- Supported events: 'chapter.published' -> 'chapter_published' notification for every active follower of
-- the story (the publisher is excluded). Anything else is dead-lettered so a typo never loops forever.
--
-- Re-queue a dead-lettered event after fixing the cause:
--   UPDATE outbox_events SET failed_at = NULL, attempts = 0, available_at = now() WHERE id = '...';
--
-- Delivery guarantees: at-least-once. Handlers must be idempotent (notifications use a per-recipient
-- dedupe_key, so a retry never duplicates).
-- Rollback: cron.unschedule the three jobs, DROP the four functions, drop the added outbox columns.
BEGIN;

ALTER TABLE outbox_events
    ADD COLUMN attempts     integer     NOT NULL DEFAULT 0,
    ADD COLUMN available_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN last_error   text,
    ADD COLUMN failed_at    timestamptz;
DROP INDEX idx_outbox_pending;
CREATE INDEX idx_outbox_ready ON outbox_events (available_at, created_at)
    WHERE processed_at IS NULL AND failed_at IS NULL;
CREATE INDEX idx_outbox_purge ON outbox_events (processed_at) WHERE processed_at IS NOT NULL;

-- 1. Handlers ---------------------------------------------------------------------------------------
-- Returns the number of notifications created. Skips (returns 0) when the chapter is no longer
-- publicly readable by the time the event is processed, e.g. it was unpublished in the meantime.
CREATE FUNCTION private.notify_chapter_published(p_chapter_id uuid, p_actor uuid) RETURNS integer
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_count integer;
BEGIN
    INSERT INTO public.notifications (recipient_id, actor_id, event_type, story_id, chapter_id, payload, dedupe_key)
    SELECT f.user_id, p_actor, 'chapter_published', s.id, c.id,
           jsonb_build_object('story_title', s.title, 'chapter_title', v.title,
                              'chapter_sort_order', c.sort_order, 'chapter_slug', c.slug, 'story_slug', s.slug),
           'chapter_published:' || c.id
      FROM public.chapters c
      JOIN public.stories s ON s.id = c.story_id
      JOIN public.chapter_versions v ON v.id = c.published_version_id
      JOIN public.story_follows f ON f.story_id = s.id
      JOIN public.app_users u ON u.id = f.user_id AND u.account_status = 'active' AND u.deleted_at IS NULL
     WHERE c.id = p_chapter_id
       AND c.status = 'published' AND c.deleted_at IS NULL
       AND s.deleted_at IS NULL AND s.visibility IN ('public','unlisted') AND s.status <> 'draft'
       AND f.user_id IS DISTINCT FROM p_actor
    ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

CREATE FUNCTION private.handle_outbox_event(p_event_type text, p_aggregate_id uuid, p_payload jsonb) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    CASE p_event_type
        WHEN 'chapter.published' THEN
            PERFORM private.notify_chapter_published(p_aggregate_id, (p_payload ->> 'published_by')::uuid);
        ELSE
            RAISE EXCEPTION 'unknown outbox event type "%"', p_event_type USING ERRCODE = '22023';
    END CASE;
END;
$$;

-- 2. Worker ------------------------------------------------------------------------------------------
CREATE FUNCTION public.process_outbox(p_limit integer DEFAULT 100) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    r record;
    v_done integer := 0;
    v_attempt integer;
BEGIN
    FOR r IN
        SELECT id, event_type, aggregate_id, payload, attempts
          FROM public.outbox_events
         WHERE processed_at IS NULL AND failed_at IS NULL AND available_at <= now()
         ORDER BY created_at
         LIMIT greatest(p_limit, 1)
         FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            PERFORM private.handle_outbox_event(r.event_type, r.aggregate_id, r.payload);
            UPDATE public.outbox_events SET processed_at = now(), last_error = NULL WHERE id = r.id;
            v_done := v_done + 1;
        EXCEPTION WHEN OTHERS THEN
            v_attempt := r.attempts + 1;
            UPDATE public.outbox_events
               SET attempts = v_attempt,
                   last_error = left(SQLERRM, 500) || ' [' || SQLSTATE || ']',
                   available_at = now() + make_interval(mins => power(2, least(v_attempt, 8))::int),
                   failed_at = CASE WHEN v_attempt >= 5 THEN now() END
             WHERE id = r.id;
            RAISE WARNING 'outbox event % (%) failed, attempt %: %', r.id, r.event_type, v_attempt, SQLERRM;
        END;
    END LOOP;
    RETURN v_done;
END;
$$;

CREATE FUNCTION public.purge_outbox(p_retention interval DEFAULT interval '14 days') RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_deleted integer;
BEGIN
    DELETE FROM public.outbox_events WHERE processed_at IS NOT NULL AND processed_at < now() - p_retention;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_chapter_published(uuid, uuid), private.handle_outbox_event(text, uuid, jsonb)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_outbox(integer), public.purge_outbox(interval)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_outbox(integer), public.purge_outbox(interval) TO service_role;

-- 3. Schedule ------------------------------------------------------------------------------------------
-- Uses pg_cron when the platform provides it (Supabase: enabled here if available). Otherwise only a
-- NOTICE is raised and the same three statements must be triggered externally (Edge Function cron, etc.).
-- cron.schedule(name, ...) is an upsert, so re-running this migration does not duplicate jobs.
DO $$
BEGIN
    IF to_regnamespace('cron') IS NULL
       AND EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
    END IF;

    IF to_regnamespace('cron') IS NULL THEN
        RAISE NOTICE 'pg_cron is not available: schedule public.publish_due_chapters(), public.process_outbox() every minute and public.purge_outbox() daily from another runner.';
        RETURN;
    END IF;

    PERFORM cron.schedule('storynest-publish-due-chapters', '* * * * *', 'SELECT public.publish_due_chapters()');
    PERFORM cron.schedule('storynest-process-outbox',       '* * * * *', 'SELECT public.process_outbox()');
    PERFORM cron.schedule('storynest-purge-outbox',         '17 3 * * *', 'SELECT public.purge_outbox()');
END $$;

COMMIT;
