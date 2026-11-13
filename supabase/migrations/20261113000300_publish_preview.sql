-- FP-060 (publish review): what publishing a chapter will do, for the team, before the button is pressed.
--
--   publish_preview(p_chapter_id) -> one row
--     story_id, visibility, story_status, chapter_status
--     is_first_publish   the chapter was never published
--     notifies           followers are told when it is published (public or unlisted story)
--     follower_count     followers who would be told now: active accounts that follow the story, not the caller
--
-- Only people on the story's team may ask (story_role not null); anyone else gets "not found". Reads only; it does not
-- apply the notification switches of each follower, so the count is "about" that many.
--
-- Rollback: DROP FUNCTION public.publish_preview(uuid);
BEGIN;

CREATE FUNCTION public.publish_preview(p_chapter_id uuid)
RETURNS TABLE (
    story_id uuid,
    visibility text,
    story_status text,
    chapter_status text,
    is_first_publish boolean,
    notifies boolean,
    follower_count integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_story uuid;
BEGIN
    SELECT c.story_id INTO v_story FROM public.chapters c WHERE c.id = p_chapter_id;
    IF v_uid IS NULL OR v_story IS NULL OR public.story_role(v_story) IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;

    RETURN QUERY
    SELECT s.id, s.visibility::text, s.status::text, c.status::text,
           c.first_published_at IS NULL,
           s.visibility IN ('public', 'unlisted') AND s.deleted_at IS NULL,
           (SELECT count(*)::integer
              FROM public.story_follows f
              JOIN public.app_users u ON u.id = f.user_id AND u.account_status = 'active' AND u.deleted_at IS NULL
             WHERE f.story_id = s.id AND f.user_id IS DISTINCT FROM v_uid)
      FROM public.chapters c
      JOIN public.stories s ON s.id = c.story_id
     WHERE c.id = p_chapter_id;
END $$;

REVOKE ALL ON FUNCTION public.publish_preview(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_preview(uuid) TO authenticated;

COMMIT;
