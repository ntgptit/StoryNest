-- WP 5.2: controlled tags (D4) and browsing by tag.
--
--   tag_slug(name)                      IMMUTABLE: lower case, no diacritics, runs of anything else become one "-".
--                                       "Lãng mạn" and "lang  man!" are the same tag: lang-man.
--   set_story_tags(story, names[])      replaces the story's tag set (owner or co-author, active account). Names are
--                                       cleaned, merged by slug, unknown ones are created. Returns the resulting tags.
--   popular_tags(limit)                 tags used by public non-mature stories of active authors, most used first.
--
-- Limits (the point of D4): a tag name is at most 40 characters and must leave a slug of 2..40 (so at least two letters or digits); at most 10 tags per story;
-- one author may create at most 10 NEW tags per rolling 24 hours (existing tags are free to reuse). Bad input is 22023,
-- the creation quota is PT409, a caller who may not edit the story is 42501.
-- Writes to story_tags are closed to clients (they would bypass the limits): set_story_tags is the only way. Tags keep
-- who created them (created_by) for abuse handling; that column is not readable by clients.
-- Rollback: DROP the three functions; re-grant INSERT, DELETE ON story_tags TO authenticated; ALTER TABLE tags DROP COLUMN created_by; re-grant SELECT ON tags.
BEGIN;

ALTER TABLE public.tags ADD COLUMN created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL;
CREATE INDEX idx_tags_created_by ON public.tags (created_by, created_at) WHERE created_by IS NOT NULL;

REVOKE SELECT ON public.tags FROM anon, authenticated;
GRANT SELECT (id, slug, display_name, created_at) ON public.tags TO anon, authenticated;

REVOKE INSERT, DELETE ON public.story_tags FROM authenticated;
-- The story_tags insert/delete policies stay but are inert without the grant; dropping them is a separate cleanup.

CREATE FUNCTION public.tag_slug(p_name text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT SET search_path = '' AS $$
    SELECT btrim(regexp_replace(public.search_normalize(p_name), '[^a-z0-9]+', '-', 'g'), '-')
$$;
GRANT EXECUTE ON FUNCTION public.tag_slug(text) TO anon, authenticated, service_role;

CREATE FUNCTION public.set_story_tags(p_story_id uuid, p_names text[])
RETURNS TABLE (tag_id bigint, slug text, display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    c_max_per_story constant integer := 10;
    c_max_new_per_day constant integer := 10;
    v_uid uuid := (SELECT auth.uid());
    v_name text;
    v_slug text;
    v_slugs text[] := '{}';
    v_names text[] := '{}';
    v_new integer;
    v_recent integer;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account()
       OR public.story_role(p_story_id) IS NULL OR public.story_role(p_story_id) NOT IN ('owner', 'co_author') THEN
        RAISE EXCEPTION 'not allowed to change the tags of this story' USING ERRCODE = '42501';
    END IF;
    IF p_names IS NULL THEN
        RAISE EXCEPTION 'tag list is required' USING ERRCODE = '22023';
    END IF;

    FOREACH v_name IN ARRAY p_names LOOP
        v_name := btrim(regexp_replace(coalesce(v_name, ''), '\s+', ' ', 'g'));
        v_slug := public.tag_slug(v_name);
        IF length(v_name) > 40 OR length(v_slug) NOT BETWEEN 2 AND 40 THEN
            RAISE EXCEPTION 'a tag must be 2 to 40 characters and contain letters or digits' USING ERRCODE = '22023';
        END IF;
        IF NOT v_slug = ANY (v_slugs) THEN
            v_slugs := v_slugs || v_slug;
            v_names := v_names || v_name;
        END IF;
    END LOOP;
    IF cardinality(v_slugs) > c_max_per_story THEN
        RAISE EXCEPTION 'a story can have at most % tags', c_max_per_story USING ERRCODE = '22023';
    END IF;

    -- One writer at a time per author (the daily quota) and per story (the final set).
    PERFORM pg_advisory_xact_lock(hashtextextended('set_story_tags:' || v_uid::text, 0));
    PERFORM 1 FROM public.stories s WHERE s.id = p_story_id FOR UPDATE;

    SELECT count(*) INTO v_new FROM unnest(v_slugs) u(s) WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.slug = u.s);
    IF v_new > 0 THEN
        SELECT count(*) INTO v_recent FROM public.tags t
         WHERE t.created_by = v_uid AND t.created_at > now() - interval '24 hours';
        IF v_recent + v_new > c_max_new_per_day THEN
            RAISE EXCEPTION 'you can create at most % new tags per day', c_max_new_per_day USING ERRCODE = 'PT409';
        END IF;
        INSERT INTO public.tags (slug, display_name, created_by)
        SELECT u.s, u.n, v_uid FROM unnest(v_slugs, v_names) u(s, n)
         WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.slug = u.s)
        ON CONFLICT (slug) DO NOTHING;
    END IF;

    DELETE FROM public.story_tags st
     WHERE st.story_id = p_story_id
       AND st.tag_id NOT IN (SELECT t.id FROM public.tags t WHERE t.slug = ANY (v_slugs));
    INSERT INTO public.story_tags (story_id, tag_id)
    SELECT p_story_id, t.id FROM public.tags t WHERE t.slug = ANY (v_slugs)
    ON CONFLICT DO NOTHING;

    RETURN QUERY
    SELECT t.id, t.slug::text, t.display_name::text
      FROM unnest(v_slugs) WITH ORDINALITY u(s, ord) JOIN public.tags t ON t.slug = u.s
     ORDER BY u.ord;
END $$;

CREATE FUNCTION public.popular_tags(p_limit integer DEFAULT 20)
RETURNS TABLE (tag_id bigint, slug text, display_name text, stories_count bigint)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'limit must be between 1 and 50' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    SELECT t.id, t.slug::text, t.display_name::text, c.n
      FROM public.tags t
      CROSS JOIN LATERAL (
          SELECT count(*) AS n FROM public.story_tags stg JOIN public.stories st ON st.id = stg.story_id
           WHERE stg.tag_id = t.id AND st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
             AND NOT st.is_mature
             AND EXISTS (SELECT 1 FROM public.app_users o
                          WHERE o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL)) c
     WHERE c.n > 0
     ORDER BY c.n DESC, t.slug
     LIMIT p_limit;
END $$;

REVOKE ALL ON FUNCTION public.set_story_tags(uuid, text[]), public.popular_tags(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_story_tags(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.popular_tags(integer) TO anon, authenticated, service_role;

COMMIT;
