-- Reading progress RPC (WBS WP 2.5).
--
--   save_reading_progress(chapter_id, percent, last_block_id DEFAULT NULL) -> void
--
-- One call = one transaction that writes BOTH user_chapter_progress (exact position) and user_story_progress
-- (which chapter to continue from). The server, not the client, decides what the position refers to:
--   * last_version_id is the chapter's CURRENTLY published version (a client cannot claim another one);
--   * last_block_id is kept only if that block belongs to the current published version, otherwise it is stored as
--     NULL (the reader fell behind a republish: the percent still restores roughly the right place);
--   * completed_at is set the first time percent reaches 95 and never cleared by later, lower positions.
--
-- Runs as the CALLER (SECURITY INVOKER): the existing RLS policies still apply, so only the caller's own rows can be
-- written and only for a chapter/story the caller may read (can_read_chapter / can_read_story).
--
-- Error contract (SQLSTATE): 42501 not authenticated, PT404 chapter not found or not readable (existence is not
-- revealed), 22023 percent missing or outside 0..100.
--
-- Rollback: DROP FUNCTION public.save_reading_progress(uuid, numeric, uuid);
BEGIN;

CREATE FUNCTION public.save_reading_progress(p_chapter_id uuid, p_percent numeric, p_last_block_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    -- Keep in sync with READING_COMPLETED_PERCENT in packages/features/src/progress/model/progress.ts.
    c_completed_percent constant numeric := 95;
    v_user uuid := auth.uid();
    v_story_id uuid;
    v_version_id uuid;
    v_block_id uuid;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_percent IS NULL OR p_percent < 0 OR p_percent > 100 THEN
        RAISE EXCEPTION 'percent must be between 0 and 100' USING ERRCODE = '22023';
    END IF;

    SELECT c.story_id, c.published_version_id INTO v_story_id, v_version_id
    FROM public.chapters c
    WHERE c.id = p_chapter_id AND c.status = 'published' AND c.deleted_at IS NULL;   -- RLS hides unreadable rows
    IF NOT FOUND OR v_version_id IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;

    IF p_last_block_id IS NOT NULL THEN
        SELECT b.block_id INTO v_block_id
        FROM public.chapter_version_blocks b
        WHERE b.version_id = v_version_id AND b.block_id = p_last_block_id;
    END IF;

    INSERT INTO public.user_chapter_progress AS p
        (user_id, chapter_id, last_block_id, last_version_id, percent_complete, completed_at, last_read_at)
    VALUES (v_user, p_chapter_id, v_block_id, v_version_id, p_percent,
            CASE WHEN p_percent >= c_completed_percent THEN now() END, now())
    ON CONFLICT (user_id, chapter_id) DO UPDATE
    SET last_block_id = EXCLUDED.last_block_id,
        last_version_id = EXCLUDED.last_version_id,
        percent_complete = EXCLUDED.percent_complete,
        completed_at = COALESCE(p.completed_at, EXCLUDED.completed_at),
        last_read_at = EXCLUDED.last_read_at;

    INSERT INTO public.user_story_progress AS s (user_id, story_id, current_chapter_id, last_read_at)
    VALUES (v_user, v_story_id, p_chapter_id, now())
    ON CONFLICT (user_id, story_id) DO UPDATE
    SET current_chapter_id = EXCLUDED.current_chapter_id, last_read_at = EXCLUDED.last_read_at;
END $$;

REVOKE ALL ON FUNCTION public.save_reading_progress(uuid, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_reading_progress(uuid, numeric, uuid) TO authenticated, service_role;

COMMIT;
