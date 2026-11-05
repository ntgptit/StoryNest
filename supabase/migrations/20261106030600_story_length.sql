-- Story length for Discover (Lucian 024, histogram range filter).
--
-- Rollback:
--   DROP FUNCTION public.story_length_histogram(boolean, text, bigint[], text);
--   DROP TRIGGER chapters_story_length ON public.chapters;
--   DROP FUNCTION public.sync_story_length();
--   DROP TRIGGER story_stats_init_length ON public.story_stats;
--   DROP FUNCTION public.story_stats_init_length();
--   DROP FUNCTION private.refresh_story_length(uuid);
--   DROP FUNCTION private.story_length(uuid);
--   DROP INDEX public.idx_story_stats_word_count;
--   ALTER TABLE public.story_stats DROP COLUMN word_count, DROP COLUMN published_chapters;
--
--   story_stats.word_count          sum of chapter_versions.word_count of the published version of every published,
--                                   not deleted chapter of the story (the words publish_chapter counted: paragraph and
--                                   heading text split on whitespace, so a Vietnamese syllable is one word)
--   story_stats.published_chapters  how many such chapters
--   trigger chapters_story_length   AFTER UPDATE OF status, published_version_id, deleted_at / DELETE on chapters:
--                                   recomputes both for the chapter's story (publish, re-publish of an edited
--                                   version, unpublish, archive, soft or hard delete) on its story_stats row. A
--                                   recompute, not a delta, so it cannot drift.
--   trigger story_stats_init_length BEFORE INSERT on story_stats: a row created later (publish_chapter creates it
--                                   after the chapter is updated; the read / vote / follow counters create it too)
--                                   starts with the computed length, whatever the inserting statement passed.
--   story_length_histogram(include_mature, language, category_ids, tag_slug)
--                                   anon + authenticated, SECURITY INVOKER: how many stories Discover would list fall
--                                   in each length bucket (bucket, min_words, max_words (NULL = no upper bound),
--                                   stories). Same filters as the Discover feed (public, not draft, not deleted,
--                                   mature only when asked, language, categories, tag). Buckets are fixed:
--                                   0, 2 000, 10 000, 30 000, 60 000, 100 000, 200 000, 400 000+ words, mirrored in
--                                   packages/validation (STORY_LENGTH_EDGES).
--
-- Who writes: only the two triggers (SECURITY DEFINER) and the backfill below; story_stats has no client write grant, so
-- the new columns are server-owned like the other counters. Who reads: whoever may read the story_stats row (its RLS
-- follows the stories RLS), through the existing table-wide SELECT grant.
-- Discover filters by length with `story_stats!inner(word_count)` (gte / lt), so stories without a stats row (never
-- published a chapter) are left out while a length filter is on.
BEGIN;

ALTER TABLE public.story_stats
    ADD COLUMN word_count bigint NOT NULL DEFAULT 0 CHECK (word_count >= 0),
    ADD COLUMN published_chapters integer NOT NULL DEFAULT 0 CHECK (published_chapters >= 0);
CREATE INDEX idx_story_stats_word_count ON public.story_stats (word_count);

CREATE FUNCTION private.story_length(p_story_id uuid, OUT word_count bigint, OUT published_chapters integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce(sum(v.word_count), 0)::bigint, count(v.id)::integer
      FROM public.chapters c
      JOIN public.chapter_versions v ON v.id = c.published_version_id
     WHERE c.story_id = p_story_id AND c.status = 'published' AND c.deleted_at IS NULL
$$;
REVOKE ALL ON FUNCTION private.story_length(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.refresh_story_length(p_story_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    UPDATE public.story_stats s
       SET word_count = l.word_count, published_chapters = l.published_chapters
      FROM private.story_length(p_story_id) l
     WHERE s.story_id = p_story_id
       AND (s.word_count, s.published_chapters) IS DISTINCT FROM (l.word_count, l.published_chapters)
$$;
REVOKE ALL ON FUNCTION private.refresh_story_length(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.sync_story_length()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- A cascade from a deleted story finds no story row any more and writes nothing.
        PERFORM private.refresh_story_length(OLD.story_id);
        RETURN OLD;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.published_version_id IS DISTINCT FROM OLD.published_version_id
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
        PERFORM private.refresh_story_length(NEW.story_id);
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_story_length() FROM PUBLIC, anon, authenticated;

-- A story_stats row is created lazily (first publish, first read, first follow...), possibly after the chapter
-- changed: the row starts with the right length whoever inserts it.
CREATE FUNCTION public.story_stats_init_length()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    SELECT l.word_count, l.published_chapters INTO NEW.word_count, NEW.published_chapters
      FROM private.story_length(NEW.story_id) l;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.story_stats_init_length() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER story_stats_init_length BEFORE INSERT ON public.story_stats
    FOR EACH ROW EXECUTE FUNCTION public.story_stats_init_length();

CREATE TRIGGER chapters_story_length
    AFTER UPDATE OF status, published_version_id, deleted_at OR DELETE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION public.sync_story_length();

-- Backfill: every existing row.
UPDATE public.story_stats s
   SET (word_count, published_chapters) = (SELECT l.word_count, l.published_chapters FROM private.story_length(s.story_id) l);

CREATE FUNCTION public.story_length_histogram(
    p_include_mature boolean DEFAULT false, p_language text DEFAULT NULL,
    p_category_ids bigint[] DEFAULT NULL, p_tag_slug text DEFAULT NULL)
RETURNS TABLE (bucket integer, min_words bigint, max_words bigint, stories bigint)
LANGUAGE sql STABLE SET search_path = '' AS $$
    WITH edges (bucket, min_words, max_words) AS (
        VALUES (1, 0::bigint, 2000::bigint), (2, 2000, 10000), (3, 10000, 30000), (4, 30000, 60000),
               (5, 60000, 100000), (6, 100000, 200000), (7, 200000, 400000), (8, 400000, NULL)),
    listed AS (
        SELECT s.word_count
          FROM public.stories st
          JOIN public.story_stats s ON s.story_id = st.id
         WHERE st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft'
           AND (coalesce(p_include_mature, false) OR NOT st.is_mature)
           AND (p_language IS NULL OR st.language_code = p_language)
           AND (p_category_ids IS NULL OR st.category_id = ANY (p_category_ids))
           AND (p_tag_slug IS NULL OR EXISTS (
                SELECT 1 FROM public.story_tags stg JOIN public.tags t ON t.id = stg.tag_id
                 WHERE stg.story_id = st.id AND t.slug = p_tag_slug)))
    SELECT e.bucket, e.min_words, e.max_words, count(l.word_count)
      FROM edges e
      LEFT JOIN listed l ON l.word_count >= e.min_words AND (e.max_words IS NULL OR l.word_count < e.max_words)
     GROUP BY e.bucket, e.min_words, e.max_words
     ORDER BY e.bucket
$$;
REVOKE ALL ON FUNCTION public.story_length_histogram(boolean, text, bigint[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.story_length_histogram(boolean, text, bigint[], text)
    TO anon, authenticated, service_role;

COMMIT;
