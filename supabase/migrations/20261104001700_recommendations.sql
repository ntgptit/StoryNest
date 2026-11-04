-- WP 5.5: simple recommendations that say why.
--
--   similar_stories(story, mature, limit)  -> (story_id, reason, detail, score)   anon + authenticated
--       For a story page. Candidates, with the strongest reason kept for each:
--         shared_tags      shares tags with the story            score 3 per shared tag      detail = the tag names
--         co_readers       readers of this story also read it    score 2 per co-reader       detail = NULL
--                          (only counted from 2 distinct readers up: one person's reading is never revealed)
--         same_category    same category as the story            score 1                     detail = the category name
--       The score of a story is the sum of its reasons; the reason shown is the one worth most (ties: tags, readers, category).
--   recommend_for_me(mature, limit)         -> (story_id, reason, detail, score)   authenticated
--       For the home page. Stories the reader has not met yet (not in their library, not started, not their own):
--         followed_author  by an author they follow             score 5                     detail = the author's name
--         library_similar  shares tags / the category with a story they saved or follow
--                                                               score 3 per shared tag, 1    detail = the title of one such story
-- Eligibility is the discovery rule everywhere: public, published, not deleted, owner's account active, mature only when asked;
-- a source story that is private, a draft, deleted or mature (when not asked) gets no recommendations at all.
-- similar_stories is SECURITY DEFINER because co-reading comes from chapter_read_events, which has no client access; it applies
-- the discovery rules itself and returns ids, reasons and counts, never who read what. recommend_for_me only reads the caller's
-- own rows and public data, so it is SECURITY INVOKER.
-- Limits (22023): limit 1..50. recommend_for_me needs a signed-in user (42501).
-- Rollback: DROP the two functions.
BEGIN;

CREATE FUNCTION public.similar_stories(p_story_id uuid, p_include_mature boolean DEFAULT false, p_limit integer DEFAULT 8)
RETURNS TABLE (story_id uuid, reason text, detail text, score integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'limit must be between 1 and 50' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    WITH eligible AS (
        SELECT st.id, st.category_id, st.updated_at
          FROM public.stories st
          JOIN public.app_users o ON o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL
         WHERE st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
           AND (coalesce(p_include_mature, false) OR NOT st.is_mature)),
    src AS (SELECT e.id, e.category_id FROM eligible e WHERE e.id = p_story_id),
    by_tags AS (
        SELECT e.id, 'shared_tags'::text AS reason, string_agg(t.display_name, ', ' ORDER BY t.display_name) AS detail,
               (count(*) * 3)::integer AS pts, 1 AS prio
          FROM src
          JOIN public.story_tags a ON a.story_id = src.id
          JOIN public.story_tags b ON b.tag_id = a.tag_id AND b.story_id <> src.id
          JOIN eligible e ON e.id = b.story_id
          JOIN public.tags t ON t.id = a.tag_id
         GROUP BY e.id),
    readers AS (SELECT DISTINCT ev.reader_id FROM public.chapter_read_events ev WHERE ev.story_id = p_story_id),
    by_readers AS (
        SELECT e.id, 'co_readers'::text AS reason, NULL::text AS detail,
               (count(DISTINCT ev.reader_id) * 2)::integer AS pts, 2 AS prio
          FROM src
          JOIN public.chapter_read_events ev ON ev.story_id <> src.id
          JOIN readers r ON r.reader_id = ev.reader_id
          JOIN eligible e ON e.id = ev.story_id
         GROUP BY e.id
        HAVING count(DISTINCT ev.reader_id) >= 2),
    by_category AS (
        SELECT e.id, 'same_category'::text AS reason, c.name::text AS detail, 1 AS pts, 3 AS prio
          FROM src
          JOIN eligible e ON e.category_id = src.category_id AND e.id <> src.id
          JOIN public.categories c ON c.id = src.category_id),
    reasons AS (
        SELECT * FROM by_tags UNION ALL SELECT * FROM by_readers UNION ALL SELECT * FROM by_category),
    best AS (
        SELECT DISTINCT ON (r.id) r.id, r.reason, r.detail,
               sum(r.pts) OVER (PARTITION BY r.id)::integer AS total
          FROM reasons r
         ORDER BY r.id, r.pts DESC, r.prio)
    SELECT b.id, b.reason, b.detail, b.total
      FROM best b JOIN eligible e ON e.id = b.id
     ORDER BY b.total DESC, e.updated_at DESC, b.id
     LIMIT p_limit;
END $$;

CREATE FUNCTION public.recommend_for_me(p_include_mature boolean DEFAULT false, p_limit integer DEFAULT 12)
RETURNS TABLE (story_id uuid, reason text, detail text, score integer)
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
    RETURN QUERY
    WITH library AS (
        SELECT s.story_id FROM public.story_saves s WHERE s.user_id = v_uid
        UNION SELECT f.story_id FROM public.story_follows f WHERE f.user_id = v_uid),
    met AS (
        SELECT l.story_id FROM library l
        UNION SELECT p.story_id FROM public.user_story_progress p WHERE p.user_id = v_uid
        UNION SELECT st.id FROM public.stories st WHERE st.owner_id = v_uid),
    eligible AS (
        SELECT st.id, st.category_id, st.owner_id, st.updated_at
          FROM public.stories st
          JOIN public.app_users o ON o.id = st.owner_id AND o.account_status = 'active' AND o.deleted_at IS NULL
         WHERE st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
           AND (coalesce(p_include_mature, false) OR NOT st.is_mature)
           AND NOT EXISTS (SELECT 1 FROM met m WHERE m.story_id = st.id)),
    by_author AS (
        SELECT e.id, 'followed_author'::text AS reason, o.display_name::text AS detail, 5 AS pts, 1 AS prio
          FROM eligible e
          JOIN public.user_follows uf ON uf.followed_id = e.owner_id AND uf.follower_id = v_uid
          JOIN public.app_users o ON o.id = e.owner_id),
    by_tags AS (
        SELECT e.id, 'library_similar'::text AS reason, min(ls.title)::text AS detail, (count(DISTINCT b.tag_id) * 3)::integer AS pts, 2 AS prio
          FROM eligible e
          JOIN public.story_tags b ON b.story_id = e.id
          JOIN public.story_tags a ON a.tag_id = b.tag_id
          JOIN library l ON l.story_id = a.story_id
          JOIN public.stories ls ON ls.id = l.story_id
         GROUP BY e.id),
    by_category AS (
        SELECT e.id, 'library_similar'::text AS reason, min(ls.title)::text AS detail, 1 AS pts, 3 AS prio
          FROM eligible e
          JOIN public.stories ls ON ls.category_id = e.category_id
          JOIN library l ON l.story_id = ls.id
         WHERE e.category_id IS NOT NULL
         GROUP BY e.id),
    reasons AS (
        SELECT * FROM by_author UNION ALL SELECT * FROM by_tags UNION ALL SELECT * FROM by_category),
    best AS (
        SELECT DISTINCT ON (r.id) r.id, r.reason, r.detail,
               sum(r.pts) OVER (PARTITION BY r.id)::integer AS total
          FROM reasons r
         ORDER BY r.id, r.pts DESC, r.prio)
    SELECT b.id, b.reason, b.detail, b.total
      FROM best b JOIN eligible e ON e.id = b.id
     ORDER BY b.total DESC, e.updated_at DESC, b.id
     LIMIT p_limit;
END $$;

REVOKE ALL ON FUNCTION public.similar_stories(uuid, boolean, integer), public.recommend_for_me(boolean, integer)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.similar_stories(uuid, boolean, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recommend_for_me(boolean, integer) TO authenticated, service_role;

COMMIT;
