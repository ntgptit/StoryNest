-- Story images (WBS WP 3.3, decision D3): the `covers` and `chapter-images` Storage buckets and who may write into them.
--
-- Both buckets are public (the pictures are shown to readers by URL). Both take JPEG / PNG / WebP only; a cover is at
-- most 2 MiB, a picture inside a chapter at most 5 MiB. The client crops and re-encodes first; these limits are the
-- guard for a client that does not.
--
-- Who writes: the key must follow the convention from WP 3.3  <story_id>/<file_name>  (public.is_valid_storage_key:
-- one folder named after a story, one plain file name), the caller must have an active account, and a role on THAT
-- story:
--   covers          owner and co-authors (the cover is part of the story's settings, which editors cannot change)
--   chapter-images  owner, co-authors and editors (editors write chapters)
-- A story that does not exist has no roles, so nothing can be uploaded into a made-up folder. Guests never write.
--
-- Policies (insert / update / delete / select) all go through public.can_write_story_image. Public reads need no
-- policy (public buckets are served by URL). The select policy only lets managers list their own folder.
--
-- The rows that point at the objects (stories.cover_storage_key, published image blocks) were already tied to the same
-- folder by WP 3.3's CHECK and trigger, so a key can neither be stored nor published for another story.
--
-- Rollback: DROP the four policies and the function; DELETE FROM storage.buckets for both ids (remove their objects first).
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
    ('covers', 'covers', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('chapter-images', 'chapter-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = EXCLUDED.public,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE FUNCTION public.can_write_story_image(p_bucket text, p_name text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_story uuid;
    v_role text;
BEGIN
    IF (SELECT auth.uid()) IS NULL OR NOT (SELECT public.is_active_account()) THEN
        RETURN false;
    END IF;
    -- Check the shape before casting: a folder that is not a uuid must be a "no", never an error.
    IF p_name IS NULL OR p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' THEN
        RETURN false;
    END IF;
    v_story := split_part(p_name, '/', 1)::uuid;
    IF NOT public.is_valid_storage_key(p_name, v_story) THEN
        RETURN false;
    END IF;
    v_role := public.story_role(v_story);
    RETURN coalesce(CASE p_bucket
                        WHEN 'covers' THEN v_role IN ('owner', 'co_author')
                        WHEN 'chapter-images' THEN v_role IN ('owner', 'co_author', 'editor')
                    END, false);
END $$;

REVOKE ALL ON FUNCTION public.can_write_story_image(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_story_image(text, text) TO authenticated;

CREATE POLICY story_images_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('covers', 'chapter-images') AND public.can_write_story_image(bucket_id, name));
CREATE POLICY story_images_update ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id IN ('covers', 'chapter-images') AND public.can_write_story_image(bucket_id, name))
    WITH CHECK (bucket_id IN ('covers', 'chapter-images') AND public.can_write_story_image(bucket_id, name));
CREATE POLICY story_images_delete ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id IN ('covers', 'chapter-images') AND public.can_write_story_image(bucket_id, name));
CREATE POLICY story_images_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id IN ('covers', 'chapter-images') AND public.can_write_story_image(bucket_id, name));

COMMIT;
