-- Storage key convention (WBS WP 3.3 / decision D3), database side.
--
-- Every object key stored in the database has the shape  <scope_id>/<file_name>  where
--   covers          scope_id = the story id        (stories.cover_storage_key)
--   chapter-images  scope_id = the story id        (chapter_version_blocks.image_storage_key)
--   avatars         scope_id = the user id         (app_users.avatar_storage_key)
-- and file_name is one path segment of letters, digits, dot, underscore and hyphen (starting with a letter or digit),
-- at most 200 characters. The scope folder is what the Storage policies (created with the buckets) use to decide who
-- may write, so a key that points into another story's or user's folder can never be stored.
--
-- Enforced here, independent of any client:
--   * stories.cover_storage_key and app_users.avatar_storage_key: CHECK constraints (the scope is the row's own id);
--   * published image blocks: a trigger on chapter_version_blocks, the single place every publish path (publish now,
--     scheduled publish, the due-chapter job) writes snapshot blocks, rejects an image key outside the chapter's story
--     with SQLSTATE 22023, the same code the rest of the publish contract uses for invalid input.
-- Drafts stay permissive (autosave must never fail); the key is checked when the chapter is published.
--
-- Rollback: DROP TRIGGER chapter_version_blocks_image_key ON chapter_version_blocks; DROP FUNCTION
-- private.check_snapshot_image_key(); ALTER TABLE stories DROP CONSTRAINT chk_story_cover_key; ALTER TABLE app_users DROP
-- CONSTRAINT chk_avatar_key; DROP FUNCTION public.is_valid_storage_key(text, uuid).
BEGIN;

-- Pure function, safe to expose: it only compares strings. Public because CHECK constraints run it as the caller.
CREATE FUNCTION public.is_valid_storage_key(p_key text, p_scope uuid) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
    SELECT p_key IS NOT NULL AND p_scope IS NOT NULL
       AND p_key ~ ('^' || p_scope::text || '/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$')
$$;

ALTER TABLE stories
    ADD CONSTRAINT chk_story_cover_key
    CHECK (cover_storage_key IS NULL OR public.is_valid_storage_key(cover_storage_key, id));
ALTER TABLE app_users
    ADD CONSTRAINT chk_avatar_key
    CHECK (avatar_storage_key IS NULL OR public.is_valid_storage_key(avatar_storage_key, id));

CREATE FUNCTION private.check_snapshot_image_key() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_story_id uuid;
BEGIN
    IF NEW.block_type = 'image' THEN
        SELECT c.story_id INTO v_story_id FROM public.chapters c WHERE c.id = NEW.chapter_id;
        IF NOT public.is_valid_storage_key(NEW.image_storage_key, v_story_id) THEN
            RAISE EXCEPTION 'image_storage_key must be "<story_id>/<file_name>" of the chapter''s own story'
                USING ERRCODE = '22023';
        END IF;
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.check_snapshot_image_key() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER chapter_version_blocks_image_key
    BEFORE INSERT ON chapter_version_blocks
    FOR EACH ROW EXECUTE FUNCTION private.check_snapshot_image_key();

COMMIT;
