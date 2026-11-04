-- WP 5.1: search for stories, authors and tags that ignores case and Vietnamese diacritics ("doc truyen" finds "Đọc truyện").
--
--   search_normalize(text)                         IMMUTABLE wrapper around unaccent + lower so it can be indexed
--                                                  (unaccent itself is only STABLE, which an index expression cannot use).
--   search_stories(query, include_mature, limit, offset)  -> (story_id, score)
--   search_authors(query, include_mature, limit, offset)  -> (user_id, username, display_name, avatar_storage_key, stories_count, score)
--   search_tags(query, limit)                      -> (tag_id, slug, display_name, stories_count, score)
--
-- Matching: the query is normalised, then a row matches when its normalised text CONTAINS the whole query
-- (served by the trigram GIN index through LIKE) or is trigram-similar to it (the % operator, same index). Score is
-- similarity plus 1 for a containing match, so exact phrases come first. All three are SECURITY INVOKER: the caller's
-- RLS decides what exists, and the functions add the discovery rules on top (public, not draft, not deleted, owner's
-- account active, mature only when asked). Anyone, signed in or not, may search.
-- Limits: query 3..100 characters after normalisation (trigrams need three, and a shorter one would scan everything),
-- limit 1..50, offset 0..200. Relevance has no stable keyset, so paging is by offset with a hard cap.
-- Rollback: DROP the RPCs, search_prepare, search_normalize and the five idx_*_search indexes.
BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE FUNCTION public.search_normalize(p_text text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT SET search_path = '' AS $$
    SELECT lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_text))
$$;
GRANT EXECUTE ON FUNCTION public.search_normalize(text) TO anon, authenticated, service_role;

-- idx_stories_title_trgm (raw title) is now redundant with idx_stories_title_search; dropping it is a separate cleanup.
CREATE INDEX idx_stories_title_search ON public.stories
    USING gin (public.search_normalize(title) extensions.gin_trgm_ops);
CREATE INDEX idx_app_users_username_search ON public.app_users
    USING gin (public.search_normalize(username::text) extensions.gin_trgm_ops);
CREATE INDEX idx_app_users_display_name_search ON public.app_users
    USING gin (public.search_normalize(display_name) extensions.gin_trgm_ops);
CREATE INDEX idx_tags_display_name_search ON public.tags
    USING gin (public.search_normalize(display_name) extensions.gin_trgm_ops);
CREATE INDEX idx_tags_slug_search ON public.tags
    USING gin (public.search_normalize(slug::text) extensions.gin_trgm_ops);

-- Validates the query and the page; returns the normalised query and its LIKE pattern. Shared by the three RPCs; pure,
-- so it is public (the SECURITY INVOKER search functions run as the caller, who has no access to schema private).
CREATE FUNCTION public.search_prepare(p_query text, p_limit integer, p_offset integer)
RETURNS TABLE (q text, pattern text)
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
    v_q text := btrim(regexp_replace(coalesce(public.search_normalize(p_query), ''), '\s+', ' ', 'g'));
BEGIN
    IF length(v_q) < 3 THEN
        RAISE EXCEPTION 'search query is too short' USING ERRCODE = '22023';
    END IF;
    IF length(v_q) > 100 THEN
        RAISE EXCEPTION 'search query is too long' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'limit must be between 1 and 50' USING ERRCODE = '22023';
    END IF;
    IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 200 THEN
        RAISE EXCEPTION 'offset must be between 0 and 200' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY SELECT v_q, '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
END $$;
GRANT EXECUTE ON FUNCTION public.search_prepare(text, integer, integer) TO anon, authenticated, service_role;

CREATE FUNCTION public.search_stories(
    p_query text, p_include_mature boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (story_id uuid, score real)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
    v_q text;
    v_pattern text;
BEGIN
    SELECT s.q, s.pattern INTO v_q, v_pattern FROM public.search_prepare(p_query, p_limit, p_offset) s;
    RETURN QUERY
    SELECT st.id,
           (extensions.similarity(public.search_normalize(st.title), v_q)
            + CASE WHEN public.search_normalize(st.title) LIKE v_pattern THEN 1 ELSE 0 END)::real AS score
      FROM public.stories st
     WHERE st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
       AND (coalesce(p_include_mature, false) OR NOT st.is_mature)
       AND EXISTS (SELECT 1 FROM public.app_users o
                    WHERE o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL)
       AND (public.search_normalize(st.title) LIKE v_pattern
            OR public.search_normalize(st.title) OPERATOR(extensions.%) v_q)
     ORDER BY 2 DESC, st.updated_at DESC, st.id
     LIMIT p_limit OFFSET p_offset;
END $$;

CREATE FUNCTION public.search_authors(
    p_query text, p_include_mature boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (user_id uuid, username text, display_name text, avatar_storage_key text, stories_count bigint, score real)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
    v_q text;
    v_pattern text;
BEGIN
    SELECT s.q, s.pattern INTO v_q, v_pattern FROM public.search_prepare(p_query, p_limit, p_offset) s;
    RETURN QUERY
    SELECT u.id, u.username::text, u.display_name::text, u.avatar_storage_key, c.n,
           (greatest(extensions.similarity(public.search_normalize(u.username::text), v_q),
                     extensions.similarity(public.search_normalize(u.display_name), v_q))
            + CASE WHEN public.search_normalize(u.username::text) LIKE v_pattern
                     OR public.search_normalize(u.display_name) LIKE v_pattern THEN 1 ELSE 0 END)::real AS score
      FROM public.app_users u
      CROSS JOIN LATERAL (
          SELECT count(*) AS n FROM public.stories st
           WHERE st.owner_id = u.id AND st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
             AND (coalesce(p_include_mature, false) OR NOT st.is_mature)) c
     WHERE u.account_status = 'active' AND u.deleted_at IS NULL AND c.n > 0
       AND (public.search_normalize(u.username::text) LIKE v_pattern
            OR public.search_normalize(u.display_name) LIKE v_pattern
            OR public.search_normalize(u.username::text) OPERATOR(extensions.%) v_q
            OR public.search_normalize(u.display_name) OPERATOR(extensions.%) v_q)
     ORDER BY 6 DESC, c.n DESC, u.id
     LIMIT p_limit OFFSET p_offset;
END $$;

CREATE FUNCTION public.search_tags(p_query text, p_limit integer DEFAULT 10)
RETURNS TABLE (tag_id bigint, slug text, display_name text, stories_count bigint, score real)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
    v_q text;
    v_pattern text;
BEGIN
    SELECT s.q, s.pattern INTO v_q, v_pattern FROM public.search_prepare(p_query, p_limit, 0) s;
    RETURN QUERY
    SELECT t.id, t.slug::text, t.display_name::text, c.n,
           (greatest(extensions.similarity(public.search_normalize(t.display_name), v_q),
                     extensions.similarity(public.search_normalize(t.slug::text), v_q))
            + CASE WHEN public.search_normalize(t.display_name) LIKE v_pattern
                     OR public.search_normalize(t.slug::text) LIKE v_pattern THEN 1 ELSE 0 END)::real AS score
      FROM public.tags t
      CROSS JOIN LATERAL (
          SELECT count(*) AS n FROM public.story_tags stg JOIN public.stories st ON st.id = stg.story_id
           WHERE stg.tag_id = t.id AND st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
             AND NOT st.is_mature
             AND EXISTS (SELECT 1 FROM public.app_users o
                          WHERE o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL)) c
     WHERE c.n > 0
       AND (public.search_normalize(t.display_name) LIKE v_pattern
            OR public.search_normalize(t.slug::text) LIKE v_pattern
            OR public.search_normalize(t.display_name) OPERATOR(extensions.%) v_q
            OR public.search_normalize(t.slug::text) OPERATOR(extensions.%) v_q)
     ORDER BY 5 DESC, c.n DESC, t.id
     LIMIT p_limit;
END $$;

REVOKE ALL ON FUNCTION public.search_stories(text, boolean, integer, integer),
    public.search_authors(text, boolean, integer, integer), public.search_tags(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_stories(text, boolean, integer, integer),
    public.search_authors(text, boolean, integer, integer), public.search_tags(text, integer)
    TO anon, authenticated, service_role;

COMMIT;
