-- Auth integration + Row Level Security.
--
-- Model
--   * app_users.id == auth.users.id; the profile row is created by a trigger on sign-up.
--   * RLS is enabled on every public table. Privileges are revoked from anon/authenticated
--     and re-granted per table/column, so a missing policy or grant means "denied".
--   * service_role (BYPASSRLS) and SECURITY DEFINER RPCs own everything that clients must
--     not write directly: publishing (chapters.status/published_version_id, chapter_versions,
--     chapter_version_blocks), stats, notifications, categories/tags, moderation of accounts.
--   * Moderators are identified by the server-controlled JWT claim app_metadata.role = 'moderator'.
--   * 'unlisted' stories are readable by anyone who knows the id/slug (the API cannot tell a
--     direct link from a listing); discovery queries must filter visibility = 'public'.
--
-- Rollback (forward-only migrations; run manually if needed): drop the policies/functions/trigger
-- created here, DISABLE ROW LEVEL SECURITY on each table, drop FK fk_app_users_auth_user, and
-- restore the default grants for anon/authenticated.
BEGIN;

-- 1. Link profiles to Supabase Auth ---------------------------------------------------------
ALTER TABLE app_users
    ADD CONSTRAINT fk_app_users_auth_user
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- Note: stories.owner_id is ON DELETE RESTRICT, so an auth user with stories cannot be hard-deleted.
-- Account removal must go through deactivation (account_status / deleted_at), not auth.users DELETE.

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_base text;
    v_candidate text;
    v_display text;
BEGIN
    v_base := lower(coalesce(
        NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
        NULLIF(split_part(coalesce(NEW.email, ''), '@', 1), ''),
        'user'));
    v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
    IF length(v_base) < 3 THEN
        v_base := 'user' || v_base;
    END IF;
    v_base := left(v_base, 20);

    v_candidate := v_base;
    WHILE EXISTS (SELECT 1 FROM public.app_users u WHERE u.username::text = v_candidate) LOOP
        v_candidate := v_base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    END LOOP;

    v_display := left(coalesce(
        NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
        v_candidate), 100);

    INSERT INTO public.app_users (id, username, display_name)
    VALUES (NEW.id, v_candidate, v_display);
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Authorization helpers ------------------------------------------------------------------
-- SECURITY DEFINER helpers read tables without re-entering RLS (prevents policy recursion).
-- They only ever answer questions about auth.uid(), never accept a user id from the caller.

CREATE OR REPLACE FUNCTION public.is_moderator() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT coalesce((SELECT auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'moderator'
$$;

CREATE OR REPLACE FUNCTION public.is_active_account() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_users u
        WHERE u.id = (SELECT auth.uid())
          AND u.account_status = 'active' AND u.deleted_at IS NULL)
$$;

-- 'owner' | 'co_author' | 'editor' | NULL for the current user on a story.
CREATE OR REPLACE FUNCTION public.story_role(p_story_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT CASE
        WHEN s.owner_id = (SELECT auth.uid()) THEN 'owner'
        ELSE (SELECT c.collaborator_role FROM public.story_collaborators c
              WHERE c.story_id = s.id AND c.user_id = (SELECT auth.uid()))
    END
    FROM public.stories s WHERE s.id = p_story_id
$$;

CREATE OR REPLACE FUNCTION public.can_read_story(p_story_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.stories s
        WHERE s.id = p_story_id
          AND ((s.deleted_at IS NULL AND s.visibility IN ('public','unlisted') AND s.status <> 'draft')
               OR public.story_role(s.id) IS NOT NULL
               OR public.is_moderator()))
$$;

CREATE OR REPLACE FUNCTION public.can_read_chapter(p_chapter_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chapters c JOIN public.stories s ON s.id = c.story_id
        WHERE c.id = p_chapter_id
          AND ((c.status = 'published' AND c.deleted_at IS NULL
                AND s.deleted_at IS NULL AND s.visibility IN ('public','unlisted') AND s.status <> 'draft')
               OR public.story_role(s.id) IS NOT NULL
               OR public.is_moderator()))
$$;

-- owner, co_author and editor may edit chapter content.
CREATE OR REPLACE FUNCTION public.can_edit_chapter(p_chapter_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chapters c
        WHERE c.id = p_chapter_id AND public.story_role(c.story_id) IS NOT NULL)
$$;

-- True when the version is the currently published one of a chapter readers may see.
CREATE OR REPLACE FUNCTION public.is_live_version(p_version_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chapters c
        WHERE c.published_version_id = p_version_id AND public.can_read_chapter(c.id))
$$;

REVOKE ALL ON FUNCTION public.is_moderator(), public.is_active_account(), public.story_role(uuid),
    public.can_read_story(uuid), public.can_read_chapter(uuid), public.can_edit_chapter(uuid),
    public.is_live_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_moderator(), public.is_active_account(), public.story_role(uuid),
    public.can_read_story(uuid), public.can_read_chapter(uuid), public.can_edit_chapter(uuid),
    public.is_live_version(uuid) TO anon, authenticated, service_role;

-- touch_updated_at / immutability triggers are trigger functions; they must not be callable via RPC.
REVOKE ALL ON FUNCTION public.touch_updated_at(), public.deny_published_version_mutation(),
    public.deny_published_block_mutation() FROM PUBLIC, anon, authenticated;

-- 3. Deny by default, then grant explicitly
-- Tables whose UUID may be generated client-side (offline sync) include `id` in the INSERT grant. ---------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER TABLE app_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_collaborators     ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters                ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_drafts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_version_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_votes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_follows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_saves             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chapter_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_stats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_stats           ENABLE ROW LEVEL SECURITY;

-- 4. Public catalogue (anon + authenticated, read-only) ---------------------------------------
GRANT SELECT ON categories, tags, app_users, user_follows, stories, story_collaborators, story_tags,
    chapters, chapter_blocks, chapter_versions, chapter_version_blocks, comments,
    reading_lists, reading_list_items, story_stats, chapter_stats TO anon, authenticated;

CREATE POLICY categories_read ON categories FOR SELECT USING (true);
CREATE POLICY tags_read       ON tags       FOR SELECT USING (true);

-- app_users: public profile of active accounts; own row always; moderators see all.
CREATE POLICY app_users_read ON app_users FOR SELECT USING (
    (deleted_at IS NULL AND account_status = 'active')
    OR id = (SELECT auth.uid()) OR public.is_moderator());
GRANT UPDATE (username, display_name, bio, avatar_storage_key) ON app_users TO authenticated;
CREATE POLICY app_users_update_self ON app_users FOR UPDATE
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
-- account_status / deleted_at are changed only by service_role or a moderation RPC.

-- user_follows: the follow graph is public; users manage only their own edges.
CREATE POLICY user_follows_read   ON user_follows FOR SELECT USING (true);
GRANT INSERT, DELETE ON user_follows TO authenticated;
CREATE POLICY user_follows_insert ON user_follows FOR INSERT
    WITH CHECK (follower_id = (SELECT auth.uid()) AND public.is_active_account());
CREATE POLICY user_follows_delete ON user_follows FOR DELETE USING (follower_id = (SELECT auth.uid()));

-- 5. Stories ------------------------------------------------------------------------------------
CREATE POLICY stories_read ON stories FOR SELECT USING (
    (deleted_at IS NULL AND visibility IN ('public','unlisted') AND status <> 'draft')
    OR owner_id = (SELECT auth.uid())
    OR public.story_role(id) IS NOT NULL
    OR public.is_moderator());
GRANT INSERT (id, owner_id, category_id, slug, title, synopsis, cover_storage_key, language_code,
              status, visibility, is_mature) ON stories TO authenticated;
GRANT UPDATE (category_id, slug, title, synopsis, cover_storage_key, language_code,
              status, visibility, is_mature, deleted_at) ON stories TO authenticated;
CREATE POLICY stories_insert ON stories FOR INSERT
    WITH CHECK (owner_id = (SELECT auth.uid()) AND public.is_active_account());
CREATE POLICY stories_update ON stories FOR UPDATE
    USING (public.story_role(id) IN ('owner','co_author'))
    WITH CHECK (public.story_role(id) IN ('owner','co_author'));
-- No DELETE grant: stories are soft-deleted via deleted_at. first_published_at is set by the publish RPC.

CREATE POLICY story_collaborators_read ON story_collaborators FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR public.can_read_story(story_id));
GRANT INSERT, UPDATE (collaborator_role), DELETE ON story_collaborators TO authenticated;
CREATE POLICY story_collaborators_insert ON story_collaborators FOR INSERT
    WITH CHECK (public.story_role(story_id) = 'owner' AND user_id <> (SELECT auth.uid()));
CREATE POLICY story_collaborators_update ON story_collaborators FOR UPDATE
    USING (public.story_role(story_id) = 'owner') WITH CHECK (public.story_role(story_id) = 'owner');
CREATE POLICY story_collaborators_delete ON story_collaborators FOR DELETE
    USING (public.story_role(story_id) = 'owner' OR user_id = (SELECT auth.uid()));

CREATE POLICY story_tags_read ON story_tags FOR SELECT USING (public.can_read_story(story_id));
GRANT INSERT, DELETE ON story_tags TO authenticated;
CREATE POLICY story_tags_insert ON story_tags FOR INSERT
    WITH CHECK (public.story_role(story_id) IN ('owner','co_author'));
CREATE POLICY story_tags_delete ON story_tags FOR DELETE
    USING (public.story_role(story_id) IN ('owner','co_author'));

-- 6. Chapters and content ------------------------------------------------------------------------
CREATE POLICY chapters_read ON chapters FOR SELECT USING (public.can_read_chapter(id));
-- status, published_version_id, first_published_at are NOT client-writable: publishing, unpublishing,
-- archiving and scheduling go through the publish RPC / service_role.
GRANT INSERT (id, story_id, slug, sort_order) ON chapters TO authenticated;
GRANT UPDATE (slug, sort_order, deleted_at) ON chapters TO authenticated;
CREATE POLICY chapters_insert ON chapters FOR INSERT
    WITH CHECK (public.story_role(story_id) IS NOT NULL AND public.is_active_account());
CREATE POLICY chapters_update ON chapters FOR UPDATE
    USING (public.story_role(story_id) IS NOT NULL) WITH CHECK (public.story_role(story_id) IS NOT NULL);

CREATE POLICY chapter_blocks_read ON chapter_blocks FOR SELECT USING (public.can_read_chapter(chapter_id));
GRANT INSERT (id, chapter_id) ON chapter_blocks TO authenticated;
CREATE POLICY chapter_blocks_insert ON chapter_blocks FOR INSERT
    WITH CHECK (public.can_edit_chapter(chapter_id));

CREATE POLICY chapter_drafts_all ON chapter_drafts FOR ALL
    USING (public.can_edit_chapter(chapter_id))
    WITH CHECK (public.can_edit_chapter(chapter_id) AND updated_by = (SELECT auth.uid()));
GRANT SELECT, DELETE ON chapter_drafts TO authenticated;
GRANT INSERT (chapter_id, title, body, revision, updated_by) ON chapter_drafts TO authenticated;
GRANT UPDATE (title, body, revision, updated_by) ON chapter_drafts TO authenticated;

-- Versions are readable when live (current published version) or by editors; never writable by clients.
CREATE POLICY chapter_versions_read ON chapter_versions FOR SELECT USING (
    public.can_edit_chapter(chapter_id) OR public.is_moderator() OR public.is_live_version(id));
CREATE POLICY chapter_version_blocks_read ON chapter_version_blocks FOR SELECT USING (
    public.can_edit_chapter(chapter_id) OR public.is_moderator() OR public.is_live_version(version_id));

-- 7. Engagement ----------------------------------------------------------------------------------
GRANT SELECT, INSERT, DELETE ON chapter_votes, comment_likes, story_follows, story_saves TO authenticated;

CREATE POLICY chapter_votes_own_read   ON chapter_votes FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY chapter_votes_insert     ON chapter_votes FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_active_account() AND public.can_read_chapter(chapter_id));
CREATE POLICY chapter_votes_delete     ON chapter_votes FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Comments: visible ones are public; authors see their own; moderators see all.
CREATE POLICY comments_read ON comments FOR SELECT USING (
    (status = 'visible' AND deleted_at IS NULL AND public.can_read_chapter(chapter_id))
    OR author_id = (SELECT auth.uid()) OR public.is_moderator());
GRANT INSERT (id, chapter_id, block_id, parent_comment_id, author_id, body) ON comments TO authenticated;
GRANT UPDATE (body, status, deleted_at) ON comments TO authenticated;
CREATE POLICY comments_insert ON comments FOR INSERT
    WITH CHECK (author_id = (SELECT auth.uid()) AND public.is_active_account()
                AND public.can_read_chapter(chapter_id));
-- Authors may edit or delete their own VISIBLE comments (cannot un-hide moderated ones).
CREATE POLICY comments_update_author ON comments FOR UPDATE
    USING (author_id = (SELECT auth.uid()) AND status = 'visible')
    WITH CHECK (author_id = (SELECT auth.uid()) AND status IN ('visible','deleted'));
CREATE POLICY comments_update_moderator ON comments FOR UPDATE
    USING (public.is_moderator()) WITH CHECK (public.is_moderator());

CREATE POLICY comment_likes_own_read ON comment_likes FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY comment_likes_insert   ON comment_likes FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_active_account()
                AND EXISTS (SELECT 1 FROM comments c WHERE c.id = comment_id));  -- comments RLS applies
CREATE POLICY comment_likes_delete   ON comment_likes FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Private library state.
CREATE POLICY story_follows_own_read ON story_follows FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY story_follows_insert   ON story_follows FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_read_story(story_id));
CREATE POLICY story_follows_delete   ON story_follows FOR DELETE USING (user_id = (SELECT auth.uid()));
CREATE POLICY story_saves_own_read   ON story_saves FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY story_saves_insert     ON story_saves FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_read_story(story_id));
CREATE POLICY story_saves_delete     ON story_saves FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Reading lists: owner full control; others read public/unlisted lists.
CREATE POLICY reading_lists_read ON reading_lists FOR SELECT USING (
    owner_id = (SELECT auth.uid()) OR visibility IN ('public','unlisted'));
GRANT INSERT (id, owner_id, title, description, visibility), DELETE ON reading_lists TO authenticated;
GRANT UPDATE (title, description, visibility) ON reading_lists TO authenticated;
CREATE POLICY reading_lists_insert ON reading_lists FOR INSERT
    WITH CHECK (owner_id = (SELECT auth.uid()) AND public.is_active_account());
CREATE POLICY reading_lists_update ON reading_lists FOR UPDATE
    USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY reading_lists_delete ON reading_lists FOR DELETE USING (owner_id = (SELECT auth.uid()));

CREATE POLICY reading_list_items_read ON reading_list_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM reading_lists rl WHERE rl.id = reading_list_id)   -- list RLS applies
    AND public.can_read_story(story_id));
GRANT INSERT, DELETE ON reading_list_items TO authenticated;
GRANT UPDATE (sort_order) ON reading_list_items TO authenticated;
CREATE POLICY reading_list_items_insert ON reading_list_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM reading_lists rl
                        WHERE rl.id = reading_list_id AND rl.owner_id = (SELECT auth.uid()))
                AND public.can_read_story(story_id));
CREATE POLICY reading_list_items_update ON reading_list_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM reading_lists rl
                   WHERE rl.id = reading_list_id AND rl.owner_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM reading_lists rl
                        WHERE rl.id = reading_list_id AND rl.owner_id = (SELECT auth.uid())));
CREATE POLICY reading_list_items_delete ON reading_list_items FOR DELETE
    USING (EXISTS (SELECT 1 FROM reading_lists rl
                   WHERE rl.id = reading_list_id AND rl.owner_id = (SELECT auth.uid())));

-- Reading progress: strictly private; upserts allowed.
GRANT SELECT, DELETE ON user_story_progress, user_chapter_progress TO authenticated;
GRANT INSERT (user_id, story_id, current_chapter_id, last_read_at),
      UPDATE (current_chapter_id, last_read_at) ON user_story_progress TO authenticated;
GRANT INSERT (user_id, chapter_id, last_block_id, last_version_id, percent_complete, completed_at, last_read_at),
      UPDATE (last_block_id, last_version_id, percent_complete, completed_at, last_read_at)
      ON user_chapter_progress TO authenticated;
CREATE POLICY user_story_progress_all ON user_story_progress FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_read_story(story_id));
CREATE POLICY user_chapter_progress_all ON user_chapter_progress FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_read_chapter(chapter_id));

-- 8. Notifications (created server-side only) and moderation -------------------------------------
GRANT SELECT, DELETE ON notifications TO authenticated;
GRANT UPDATE (read_at) ON notifications TO authenticated;
CREATE POLICY notifications_own_read   ON notifications FOR SELECT USING (recipient_id = (SELECT auth.uid()));
CREATE POLICY notifications_own_update ON notifications FOR UPDATE
    USING (recipient_id = (SELECT auth.uid())) WITH CHECK (recipient_id = (SELECT auth.uid()));
CREATE POLICY notifications_own_delete ON notifications FOR DELETE USING (recipient_id = (SELECT auth.uid()));

GRANT SELECT ON content_reports TO authenticated;
GRANT INSERT (reporter_id, story_id, chapter_id, comment_id, reported_user_id, reason, description)
    ON content_reports TO authenticated;
GRANT UPDATE (status, reviewed_by, reviewed_at) ON content_reports TO authenticated;
CREATE POLICY content_reports_read ON content_reports FOR SELECT USING (
    reporter_id = (SELECT auth.uid()) OR public.is_moderator());
CREATE POLICY content_reports_insert ON content_reports FOR INSERT
    WITH CHECK (reporter_id = (SELECT auth.uid()) AND public.is_active_account());
CREATE POLICY content_reports_review ON content_reports FOR UPDATE
    USING (public.is_moderator())
    WITH CHECK (public.is_moderator() AND reviewed_by = (SELECT auth.uid()));

-- 9. Read models: readable wherever the underlying story/chapter is, never client-writable -----------
CREATE POLICY story_stats_read ON story_stats FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories s WHERE s.id = story_id));       -- stories RLS applies
CREATE POLICY chapter_stats_read ON chapter_stats FOR SELECT USING (
    EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id));    -- chapters RLS applies

-- 10. Anonymous (SEO / logged-out reader) can only read the public catalogue --------------------
-- The SELECT grants above include anon; the policies decide which rows are visible. Tables anon is
-- not granted on (votes, likes, follows/saves of stories, progress, notifications, reports, drafts)
-- are rejected at the privilege layer.

COMMIT;
