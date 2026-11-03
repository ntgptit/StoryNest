-- Hardening from the first Supabase advisor run (project storynest-dev).
--
--  1. Pin search_path on the two trigger functions that lacked it (advisor 0011).
--  2. Add the foreign-key / lookup indexes that real access paths need (advisor 0001, filtered).
--  3. Merge the two permissive UPDATE policies on comments into one (advisor 0006).
--
-- Indexes added, and why (everything else the advisor lists is intentionally NOT indexed, see below):
--   chapters(published_version_id)            is_live_version(), evaluated by RLS on every version/block read
--   chapter_blocks(chapter_id)                block lookups per chapter, cascade deletes
--   user_chapter_progress(chapter_id)         per-chapter progress/analytics, cascade deletes
--   user_story_progress(story_id)             cascade deletes, "who reads this story"
--   user_story_progress(current_chapter_id, story_id)   composite FK to chapters
--   story_collaborators(user_id)              Studio: "stories I was invited to"
--   story_saves(story_id), reading_list_items(story_id)  reverse lookups, cascade deletes
--   content_reports(reporter_id, created_at)  "my reports" (RLS filters on reporter_id)
--   categories(parent_id)                     sub-category browsing
-- Not indexed on purpose: created_by/updated_by/actor/reviewed_by audit columns and notification/report
-- target columns. Their parents are soft-deleted (never hard-deleted) so the FK checks do not run, and each
-- extra index slows writes on hot tables (notifications, comments). Revisit with real query plans.
-- Rollback: DROP the indexes, restore the two policies, ALTER FUNCTION ... RESET search_path.
BEGIN;

ALTER FUNCTION public.touch_updated_at() SET search_path = '';
ALTER FUNCTION public.deny_published_version_mutation() SET search_path = '';

CREATE INDEX idx_chapters_published_version ON chapters (published_version_id)
    WHERE published_version_id IS NOT NULL;
CREATE INDEX idx_chapter_blocks_chapter ON chapter_blocks (chapter_id);
CREATE INDEX idx_user_chapter_progress_chapter ON user_chapter_progress (chapter_id);
CREATE INDEX idx_user_story_progress_story ON user_story_progress (story_id);
CREATE INDEX idx_user_story_progress_chapter ON user_story_progress (current_chapter_id, story_id);
CREATE INDEX idx_story_collaborators_user ON story_collaborators (user_id);
CREATE INDEX idx_story_saves_story ON story_saves (story_id);
CREATE INDEX idx_reading_list_items_story ON reading_list_items (story_id);
CREATE INDEX idx_content_reports_reporter ON content_reports (reporter_id, created_at DESC);
CREATE INDEX idx_categories_parent ON categories (parent_id) WHERE parent_id IS NOT NULL;

-- One policy instead of two: PostgreSQL ORs permissive policies anyway (USING and WITH CHECK separately),
-- so behaviour is identical, but only one policy expression is evaluated per row.
--   authors: edit or delete their own VISIBLE comments (cannot un-hide moderated ones)
--   moderators: any change
CREATE POLICY comments_update ON comments FOR UPDATE
    USING (
        (SELECT public.is_moderator())
        OR (author_id = (SELECT auth.uid()) AND status = 'visible'))
    WITH CHECK (
        (SELECT public.is_moderator())
        OR (author_id = (SELECT auth.uid()) AND status IN ('visible','deleted')));
DROP POLICY comments_update_author ON comments;
DROP POLICY comments_update_moderator ON comments;

COMMIT;
