-- The documented source of truth for what each story role may do (Lucian 184 role permission matrix, read-only).
--
-- Rollback:
--   DROP FUNCTION public.story_role_rights();
--
-- Roles are fixed (story_role(): owner | co_author | editor) and their rights are enforced by RLS policies and the
-- SECURITY DEFINER functions of earlier migrations. Until now the only description of those rights was scattered over
-- migration comments and a hint text in the app (which was wrong about editors and publishing). This function lists
-- them in one place, so the team screen can show a matrix generated from it. It changes no right: it describes them.
-- supabase/tests/552_story_role_rights.test.sql runs every capability below as an owner, a co-author and an editor
-- against the real policies and functions, and fails if a row here and the enforced behaviour disagree (or if a row
-- is added without a matching check).
--
--   capability          owner co_author editor   enforced by
--   view_drafts           x       x       x      chapters_read / can_read_chapter (story_role IS NOT NULL)
--   edit_story            x       x              stories_update (owner, co_author)
--   set_tags              x       x              set_story_tags
--   change_cover          x       x              can_write_story_image('covers')
--   create_chapters       x       x       x      create_chapter
--   edit_drafts           x       x       x      chapter_drafts_all / can_edit_chapter
--   reorder_chapters      x       x       x      reorder_chapters
--   publish_chapters      x       x       x      publish_chapter, schedule_chapter
--   unpublish_chapters    x       x              unpublish_chapter
--   archive_chapters      x       x              archive_chapter, unarchive_chapter
--   moderate_comments     x       x              set_comment_hidden / can_moderate_comments
--   view_stats            x       x              author_chapter_stats, author_story_daily
--   manage_team           x                      invite_collaborator, cancel_invitation, story_collaborators policies
--
-- Not listed on purpose: moving a chapter to the trash (chapters.deleted_at). The chapters_update policy lets every
-- role write it, while the app offers it to owners and co-authors only; that difference is reported, not decided here.
BEGIN;

CREATE FUNCTION public.story_role_rights()
RETURNS TABLE (capability text, owner boolean, co_author boolean, editor boolean)
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
    SELECT r.capability, r.owner, r.co_author, r.editor
      FROM (VALUES
          (1,  'view_drafts',        true, true,  true),
          (2,  'edit_story',         true, true,  false),
          (3,  'set_tags',           true, true,  false),
          (4,  'change_cover',       true, true,  false),
          (5,  'create_chapters',    true, true,  true),
          (6,  'edit_drafts',        true, true,  true),
          (7,  'reorder_chapters',   true, true,  true),
          (8,  'publish_chapters',   true, true,  true),
          (9,  'unpublish_chapters', true, true,  false),
          (10, 'archive_chapters',   true, true,  false),
          (11, 'moderate_comments',  true, true,  false),
          (12, 'view_stats',         true, true,  false),
          (13, 'manage_team',        true, false, false)
      ) AS r(ord, capability, owner, co_author, editor)
     ORDER BY r.ord
$$;

REVOKE ALL ON FUNCTION public.story_role_rights() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.story_role_rights() TO anon, authenticated, service_role;

COMMIT;
