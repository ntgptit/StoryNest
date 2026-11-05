-- Story star ratings, 1 to 5 (Lucian 016, batch 4 · community4).
--
-- Rollback (exact statements, in this order):
--   DROP FUNCTION public.get_story_rating(uuid);
--   DROP FUNCTION public.set_story_rating(uuid, integer);
--   DROP FUNCTION public.story_rating_summary(uuid);
--   DROP TRIGGER story_ratings_count ON public.story_ratings;
--   DROP FUNCTION public.apply_story_rating_delta();
--   ALTER TABLE public.story_stats DROP COLUMN rating_avg, DROP COLUMN rating_sum, DROP COLUMN rating_count;
--   DELETE FROM public.abuse_limits WHERE code = 'rating_min_chapters_read';
--   DROP TABLE public.story_ratings;
--
-- One rating per signed-in reader per story; rating again replaces it (upsert); NULL takes it back.
--
--   story_ratings                        the reader's own row is readable by that reader only (RLS); no client write grant
--   story_stats.rating_count / rating_sum / rating_avg   moved by an AFTER row trigger in the same transaction as the
--                                        rating, whatever path wrote it (counter policy of 20261104001200); rating_avg is a
--                                        stored generated column (2 decimals, NULL with no ratings), readable wherever
--                                        story_stats is
--   set_story_rating(story, stars|null) -> (rating_avg, rating_count, my_stars)   SECURITY DEFINER, idempotent
--   get_story_rating(story) -> (rating_avg, rating_count, my_stars, chapters_read, chapters_needed)   guests too
--
-- Who may rate: an active account that can read the story, that is not its owner or a collaborator (no rating your own
-- work), and that has read at least N chapters of it. Decision: N = 1, kept in abuse_limits row rating_min_chapters_read
-- (an administrator may raise it, or set 0 to drop the requirement). "Read" = a reading-progress row
-- (user_chapter_progress, written by save_reading_progress when the reader opens a chapter) for a published chapter of
-- the story. Why 1: it stops drive-by ratings from people who only saw the cover, while a reader who stopped after one
-- chapter can still say why. Taking a rating back is always allowed. Ratings stay counted if the reader is later
-- suspended (like votes); deleting the account removes them (cascade) and the trigger corrects the counters.
-- Error contract: 42501 not signed in / not active / own story (HINT own_story) / not read enough (HINT read_first),
-- PT404 story not found or not readable, 22023 stars outside 1..5.
BEGIN;

CREATE TABLE public.story_ratings (
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, user_id)
);
CREATE INDEX idx_story_ratings_user ON public.story_ratings (user_id);
CREATE TRIGGER story_ratings_touch BEFORE UPDATE ON public.story_ratings
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.story_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_ratings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.story_ratings TO authenticated;
CREATE POLICY story_ratings_own_read ON public.story_ratings FOR SELECT USING (user_id = (SELECT auth.uid()));

INSERT INTO public.abuse_limits (code, max_value, window_seconds, note) VALUES
    ('rating_min_chapters_read', 1, NULL, 'chapters of a story a reader must have opened before rating it');

ALTER TABLE public.story_stats
    ADD COLUMN rating_count bigint NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    ADD COLUMN rating_sum bigint NOT NULL DEFAULT 0 CHECK (rating_sum >= 0),
    ADD COLUMN rating_avg numeric(3, 2) GENERATED ALWAYS AS (
        CASE WHEN rating_count > 0 THEN round(rating_sum::numeric / rating_count, 2) END) STORED;

CREATE FUNCTION public.apply_story_rating_delta()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.story_stats AS s (story_id, rating_count, rating_sum) VALUES (NEW.story_id, 1, NEW.stars)
        ON CONFLICT (story_id) DO UPDATE
            SET rating_count = s.rating_count + 1, rating_sum = s.rating_sum + NEW.stars, updated_at = now();
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.story_stats
           SET rating_sum = greatest(rating_sum - OLD.stars + NEW.stars, 0), updated_at = now()
         WHERE story_id = NEW.story_id;
        RETURN NEW;
    END IF;
    -- Only existing rows: the story may be disappearing in a cascade.
    UPDATE public.story_stats
       SET rating_count = greatest(rating_count - 1, 0), rating_sum = greatest(rating_sum - OLD.stars, 0),
           updated_at = now()
     WHERE story_id = OLD.story_id;
    RETURN OLD;
END $$;

REVOKE ALL ON FUNCTION public.apply_story_rating_delta() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER story_ratings_count AFTER INSERT OR DELETE OR UPDATE OF stars ON public.story_ratings
    FOR EACH ROW EXECUTE FUNCTION public.apply_story_rating_delta();

-- Average and count from the counters, and the caller's own stars (NULL for a guest or no rating).
CREATE FUNCTION public.story_rating_summary(p_story_id uuid)
RETURNS TABLE (rating_avg numeric, rating_count bigint, my_stars smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT (SELECT s.rating_avg FROM public.story_stats s WHERE s.story_id = p_story_id),
           coalesce((SELECT s.rating_count FROM public.story_stats s WHERE s.story_id = p_story_id), 0),
           (SELECT r.stars FROM public.story_ratings r WHERE r.story_id = p_story_id AND r.user_id = (SELECT auth.uid()))
$$;

REVOKE ALL ON FUNCTION public.story_rating_summary(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.set_story_rating(p_story_id uuid, p_stars integer)
RETURNS TABLE (rating_avg numeric, rating_count bigint, my_stars smallint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_needed integer := coalesce((SELECT max_value FROM public.abuse_limits WHERE code = 'rating_min_chapters_read'), 1);
    v_read integer;
BEGIN
    IF v_uid IS NULL OR NOT (SELECT public.is_active_account()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF NOT public.can_read_story(p_story_id) THEN
        RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
    END IF;

    IF p_stars IS NULL THEN
        DELETE FROM public.story_ratings r WHERE r.story_id = p_story_id AND r.user_id = v_uid;
        RETURN QUERY SELECT * FROM public.story_rating_summary(p_story_id);
        RETURN;
    END IF;
    IF p_stars NOT BETWEEN 1 AND 5 THEN
        RAISE EXCEPTION 'stars must be 1 to 5' USING ERRCODE = '22023';
    END IF;
    IF public.story_role(p_story_id) IS NOT NULL THEN
        RAISE EXCEPTION 'you cannot rate your own story' USING ERRCODE = '42501', HINT = 'own_story';
    END IF;
    SELECT count(*) INTO v_read
      FROM public.user_chapter_progress p JOIN public.chapters c ON c.id = p.chapter_id
     WHERE p.user_id = v_uid AND c.story_id = p_story_id AND c.status = 'published' AND c.deleted_at IS NULL;
    IF v_read < v_needed THEN
        RAISE EXCEPTION 'read the story before rating it' USING ERRCODE = '42501', HINT = 'read_first';
    END IF;

    INSERT INTO public.story_ratings AS r (story_id, user_id, stars) VALUES (p_story_id, v_uid, p_stars)
    ON CONFLICT (story_id, user_id) DO UPDATE SET stars = EXCLUDED.stars
     WHERE r.stars IS DISTINCT FROM EXCLUDED.stars;
    RETURN QUERY SELECT * FROM public.story_rating_summary(p_story_id);
END $$;

-- For the story page: the summary plus whether the caller has read enough to rate (chapters_read is 0 for a guest).
CREATE FUNCTION public.get_story_rating(p_story_id uuid)
RETURNS TABLE (rating_avg numeric, rating_count bigint, my_stars smallint, chapters_read integer,
               chapters_needed integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT s.rating_avg, s.rating_count, s.my_stars,
           (SELECT count(*)::integer
              FROM public.user_chapter_progress p JOIN public.chapters c ON c.id = p.chapter_id
             WHERE p.user_id = (SELECT auth.uid()) AND c.story_id = p_story_id
               AND c.status = 'published' AND c.deleted_at IS NULL),
           coalesce((SELECT a.max_value FROM public.abuse_limits a WHERE a.code = 'rating_min_chapters_read'), 1)
      FROM public.story_rating_summary(p_story_id) s
     WHERE public.can_read_story(p_story_id)
$$;

REVOKE ALL ON FUNCTION public.set_story_rating(uuid, integer), public.get_story_rating(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_story_rating(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_story_rating(uuid, integer) TO authenticated, service_role;

COMMIT;
