-- Avatar uploads (WBS WP 1.5, decision D3): the `avatars` Storage bucket and who may write into it.
--
-- Bucket: public (an avatar is shown to everyone, so it is served by URL without a signed link), at most 2 MiB per
-- object, JPEG / PNG / WebP only. The client crops to a square and re-encodes before uploading; the limits here are
-- the server-side guard for a client that does not.
--
-- Policies on storage.objects (authenticated role only; guests only read, through the public URL):
--   insert / update / delete / select  only inside the caller's own folder  avatars/<uid>/<file_name>
-- "Own folder" is the full key convention from WP 3.3 (public.is_valid_storage_key: one folder named after the user's
-- id, one plain file name), not just a prefix test, so keys that the avatar_storage_key CHECK would refuse cannot be
-- uploaded either. A deactivated account cannot write. The row is owned by the policy, not by the client: a user
-- cannot upload into another user's folder with any request shape.
--
-- app_users.avatar_storage_key keeps pointing at the object; the CHECK from WP 3.3 already forces it into the row's own
-- folder. Replacing an avatar uploads a new object (new random file name, so caches never serve the old picture) and
-- the client removes the previous one afterwards.
--
-- Rollback: DROP the four policies; DELETE FROM storage.buckets WHERE id = 'avatars' (remove its objects first).
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = EXCLUDED.public,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;

-- True when `name` is a valid key inside the caller's own avatar folder and the account is active.
CREATE FUNCTION public.can_write_avatar(p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce(public.is_valid_storage_key(p_name, (SELECT auth.uid())) AND public.is_active_account(), false)
$$;

REVOKE ALL ON FUNCTION public.can_write_avatar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_avatar(text) TO authenticated;

CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND public.can_write_avatar(name));
CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND public.can_write_avatar(name))
    WITH CHECK (bucket_id = 'avatars' AND public.can_write_avatar(name));
CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND public.can_write_avatar(name));
CREATE POLICY avatars_select_own ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'avatars' AND public.can_write_avatar(name));

COMMIT;
