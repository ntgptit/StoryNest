-- WP 5.4: author page data and following authors.
--
--   author_follower_count(user)          -> bigint   followers whose accounts are active (a suspended follower is not a follower)
--   author_profile(username)             -> (user_id, username, display_name, bio, avatar_storage_key, followers_count,
--                                            stories_count, is_following)   anon + authenticated; no row for an unknown,
--                                            suspended or deleted account. stories_count = public, published, non-mature stories.
--   set_user_follow(user, followed)      -> followers_count   authenticated; idempotent (following twice or unfollowing someone
--                                            you do not follow is not an error). 22023 yourself or NULL, PT404 the account does
--                                            not exist or is not active, PT409 more than 1000 authors followed, 42501 no
--                                            subject or an inactive follower.
--   list_followed_stories(mature, cursor_at, cursor_id, limit) -> (story_id, updated_at)   authenticated: "from the authors
--                                            you follow", newest update first, keyset (updated_at, id) with one extra row left to
--                                            the caller. Public, published, not deleted, owner active, mature only when asked.
--
-- All SECURITY INVOKER: the caller's RLS applies (the follow graph is public, users change only their own edges and only
-- from an active account), and the discovery rules are added explicitly. The counter is a count over user_follows (indexed by
-- followed_id): nothing denormalised, so nothing to drift.
-- Rollback: DROP the four functions and author_follower_count.
BEGIN;

CREATE FUNCTION public.author_follower_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT count(*) FROM public.user_follows f
      JOIN public.app_users u ON u.id = f.follower_id AND u.account_status = 'active' AND u.deleted_at IS NULL
     WHERE f.followed_id = p_user_id
$$;

CREATE FUNCTION public.author_profile(p_username text)
RETURNS TABLE (user_id uuid, username text, display_name text, bio text, avatar_storage_key text,
               followers_count bigint, stories_count bigint, is_following boolean)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_name text := lower(btrim(coalesce(p_username, '')));
BEGIN
    IF v_name = '' THEN
        RAISE EXCEPTION 'username is required' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    SELECT u.id, u.username::text, u.display_name::text, u.bio, u.avatar_storage_key,
           public.author_follower_count(u.id),
           (SELECT count(*) FROM public.stories st
             WHERE st.owner_id = u.id AND st.visibility = 'public' AND st.deleted_at IS NULL
               AND st.status <> 'draft' AND NOT st.is_mature),
           coalesce((SELECT auth.uid()) IS NOT NULL
                    AND EXISTS (SELECT 1 FROM public.user_follows f
                                 WHERE f.follower_id = (SELECT auth.uid()) AND f.followed_id = u.id), false)
      FROM public.app_users u
     WHERE lower(u.username::text) = v_name AND u.account_status = 'active' AND u.deleted_at IS NULL;
END $$;

CREATE FUNCTION public.set_user_follow(p_user_id uuid, p_followed boolean)
RETURNS bigint
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    c_max_follows constant integer := 1000;
    v_uid uuid := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_followed IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'user and followed are required' USING ERRCODE = '22023';
    END IF;
    IF p_user_id = v_uid THEN
        RAISE EXCEPTION 'you cannot follow yourself' USING ERRCODE = '22023';
    END IF;

    IF p_followed THEN
        IF NOT EXISTS (SELECT 1 FROM public.app_users u
                        WHERE u.id = p_user_id AND u.account_status = 'active' AND u.deleted_at IS NULL) THEN
            RAISE EXCEPTION 'author not found' USING ERRCODE = 'PT404';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.user_follows f WHERE f.follower_id = v_uid AND f.followed_id = p_user_id)
           AND (SELECT count(*) FROM public.user_follows f WHERE f.follower_id = v_uid) >= c_max_follows THEN
            RAISE EXCEPTION 'you can follow at most % authors', c_max_follows USING ERRCODE = 'PT409';
        END IF;
        INSERT INTO public.user_follows (follower_id, followed_id) VALUES (v_uid, p_user_id)
        ON CONFLICT (follower_id, followed_id) DO NOTHING;
    ELSE
        DELETE FROM public.user_follows WHERE follower_id = v_uid AND followed_id = p_user_id;
    END IF;
    RETURN public.author_follower_count(p_user_id);
END $$;

CREATE FUNCTION public.list_followed_stories(
    p_include_mature boolean DEFAULT false, p_cursor_at timestamptz DEFAULT NULL, p_cursor_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 12)
RETURNS TABLE (story_id uuid, updated_at timestamptz)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_uid uuid := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'limit must be between 1 and 50' USING ERRCODE = '22023';
    END IF;
    IF (p_cursor_at IS NULL) <> (p_cursor_id IS NULL) THEN
        RAISE EXCEPTION 'the cursor needs both its time and its id' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    SELECT st.id, st.updated_at
      FROM public.user_follows f
      JOIN public.stories st ON st.owner_id = f.followed_id
      JOIN public.app_users o ON o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL
     WHERE f.follower_id = v_uid
       AND st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
       AND (coalesce(p_include_mature, false) OR NOT st.is_mature)
       AND (p_cursor_at IS NULL OR (st.updated_at, st.id) < (p_cursor_at, p_cursor_id))
     ORDER BY st.updated_at DESC, st.id DESC
     LIMIT p_limit;
END $$;

REVOKE ALL ON FUNCTION public.author_follower_count(uuid), public.author_profile(text),
    public.set_user_follow(uuid, boolean), public.list_followed_stories(boolean, timestamptz, uuid, integer)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_follower_count(uuid), public.author_profile(text)
    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_user_follow(uuid, boolean), public.list_followed_stories(boolean, timestamptz, uuid, integer)
    TO authenticated, service_role;

COMMIT;
