-- F-MOD-09 / FP-024: a moderator can re-read what was removed or hidden.
--
--   moderation_preview(p_kind, p_target_id) -> jsonb     moderators only
--     story    title, synopsis, status, visibility, deleted_at, owner username, chapters (position, slug, status, title)
--     chapter  title, story title, status, the first blocks of the published text
--     comment  body, status, author username
--     user     username, display name, bio, account status
--
-- The public pages cannot show these (they filter deleted and hidden rows, rightly), and the report card only has a
-- title, so a moderator reversing a removal or judging an appeal had nothing to read. Read only; the audit log is not
-- touched; anyone who is not a moderator gets 42501.
--
-- Rollback: DROP FUNCTION public.moderation_preview(text, uuid);
BEGIN;

CREATE FUNCTION public.moderation_preview(p_kind text, p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF (SELECT auth.uid()) IS NULL OR NOT (SELECT public.is_moderator()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;

    IF p_kind = 'story' THEN
        SELECT jsonb_build_object(
                   'kind', 'story', 'title', s.title, 'synopsis', s.synopsis, 'status', s.status,
                   'visibility', s.visibility, 'deleted_at', s.deleted_at, 'owner', u.username::text,
                   'chapters', coalesce((
                       SELECT jsonb_agg(jsonb_build_object(
                                  'position', c.sort_order, 'slug', c.slug, 'status', c.status,
                                  'deleted', c.deleted_at IS NOT NULL, 'title', v.title) ORDER BY c.sort_order)
                         FROM public.chapters c
                         LEFT JOIN public.chapter_versions v ON v.id = c.published_version_id
                        WHERE c.story_id = s.id), '[]'::jsonb))
          INTO v_result
          FROM public.stories s JOIN public.app_users u ON u.id = s.owner_id
         WHERE s.id = p_target_id;
    ELSIF p_kind = 'chapter' THEN
        SELECT jsonb_build_object(
                   'kind', 'chapter', 'title', v.title, 'story_title', s.title, 'status', c.status,
                   'deleted', c.deleted_at IS NOT NULL,
                   'blocks', coalesce((
                       SELECT jsonb_agg(b.text_content ORDER BY b.sort_order)
                         FROM (SELECT x.text_content, x.sort_order FROM public.chapter_version_blocks x
                                WHERE x.version_id = c.published_version_id AND x.text_content IS NOT NULL
                                ORDER BY x.sort_order LIMIT 20) b), '[]'::jsonb))
          INTO v_result
          FROM public.chapters c
          JOIN public.stories s ON s.id = c.story_id
          LEFT JOIN public.chapter_versions v ON v.id = c.published_version_id
         WHERE c.id = p_target_id;
    ELSIF p_kind = 'comment' THEN
        SELECT jsonb_build_object('kind', 'comment', 'body', c.body, 'status', c.status,
                                  'deleted', c.deleted_at IS NOT NULL, 'author', u.username::text)
          INTO v_result
          FROM public.comments c JOIN public.app_users u ON u.id = c.author_id
         WHERE c.id = p_target_id;
    ELSIF p_kind = 'user' THEN
        SELECT jsonb_build_object('kind', 'user', 'username', u.username::text, 'display_name', u.display_name,
                                  'bio', u.bio, 'account_status', u.account_status)
          INTO v_result
          FROM public.app_users u WHERE u.id = p_target_id;
    ELSE
        RAISE EXCEPTION 'invalid target' USING ERRCODE = '22023';
    END IF;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'target not found' USING ERRCODE = 'PT404';
    END IF;
    RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.moderation_preview(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderation_preview(text, uuid) TO authenticated;

COMMIT;
