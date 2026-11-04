-- WP 4.8: one counter policy for votes / comments / followers / saves.
--
-- Policy: every counter in chapter_stats / story_stats is moved by an AFTER row trigger in the same transaction as the
-- change that causes it (votes: 4.2, followers + saves: 4.4, comments: this migration), and a service_role-only
-- reconcile function recomputes it from the source table. This migration adds the missing piece (comments) and the
-- shared tooling:
--   apply_comment_delta (trigger)    chapter_stats.comments / story_stats.comments = comments with status 'visible',
--                                    replies included. Moves on INSERT, on a status change and on DELETE (cascade).
--   reconcile_comment_counts()       recomputes both comment counters (also creates a missing stats row when comments exist).
--   counter_drift()                  read-only report: one row per counter whose stored value differs from the source
--                                    table (counter, scope, scope_id, stored, actual). Empty = no drift.
--   reconcile_counters()             runs the vote, library and comment reconcilers; returns rows corrected.
--   pg_cron                          storynest-reconcile-counters daily 03:41 (when pg_cron exists).
-- Counters only count; they never gate access, so a short-lived drift is harmless and the job repairs it.
-- Rollback: cron.unschedule('storynest-reconcile-counters'); DROP TRIGGER comments_count ON comments; DROP the four
-- functions; counters keep their values.
BEGIN;

CREATE FUNCTION public.apply_comment_delta()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_chapter uuid;
    v_delta integer;
    v_story uuid;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_chapter := NEW.chapter_id;
        v_delta := (NEW.status = 'visible')::int;
    ELSIF TG_OP = 'DELETE' THEN
        v_chapter := OLD.chapter_id;
        v_delta := -(OLD.status = 'visible')::int;
    ELSE
        v_chapter := NEW.chapter_id;
        v_delta := (NEW.status = 'visible')::int - (OLD.status = 'visible')::int;
    END IF;

    IF v_delta = 0 THEN
        RETURN NULL;
    END IF;

    SELECT story_id INTO v_story FROM public.chapters WHERE id = v_chapter;
    IF v_story IS NULL THEN
        RETURN NULL; -- the chapter is being deleted with its comments; its counters go with it
    END IF;

    INSERT INTO public.chapter_stats AS s (chapter_id, comments) VALUES (v_chapter, greatest(v_delta, 0))
    ON CONFLICT (chapter_id) DO UPDATE SET comments = greatest(s.comments + v_delta, 0), updated_at = now();
    INSERT INTO public.story_stats AS s (story_id, comments) VALUES (v_story, greatest(v_delta, 0))
    ON CONFLICT (story_id) DO UPDATE SET comments = greatest(s.comments + v_delta, 0), updated_at = now();
    RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.apply_comment_delta() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_count AFTER INSERT OR DELETE OR UPDATE OF status ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.apply_comment_delta();

CREATE FUNCTION public.reconcile_comment_counts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_chapters integer;
    v_stories integer;
BEGIN
    WITH wanted AS (
        SELECT c.id AS chapter_id, c.story_id, count(m.id) AS n
          FROM public.chapters c LEFT JOIN public.comments m ON m.chapter_id = c.id AND m.status = 'visible'
         GROUP BY c.id, c.story_id),
    fixed AS (
        INSERT INTO public.chapter_stats AS s (chapter_id, comments)
        SELECT chapter_id, n FROM wanted
        ON CONFLICT (chapter_id) DO UPDATE SET comments = excluded.comments, updated_at = now()
         WHERE s.comments <> excluded.comments
        RETURNING s.chapter_id)
    SELECT count(*) INTO v_chapters FROM fixed;

    WITH wanted AS (
        SELECT st.id AS story_id, count(m.id) AS n
          FROM public.stories st
          LEFT JOIN public.chapters c ON c.story_id = st.id
          LEFT JOIN public.comments m ON m.chapter_id = c.id AND m.status = 'visible'
         GROUP BY st.id),
    fixed AS (
        INSERT INTO public.story_stats AS s (story_id, comments)
        SELECT story_id, n FROM wanted
        ON CONFLICT (story_id) DO UPDATE SET comments = excluded.comments, updated_at = now()
         WHERE s.comments <> excluded.comments
        RETURNING s.story_id)
    SELECT count(*) INTO v_stories FROM fixed;

    RETURN v_chapters + v_stories;
END $$;

-- Read-only: what a reconcile would change. A scope with no stats row counts as stored 0.
CREATE FUNCTION public.counter_drift()
RETURNS TABLE (counter text, scope text, scope_id uuid, stored bigint, actual bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    WITH chapter_actual AS (
        SELECT c.id,
               (SELECT count(*) FROM public.chapter_votes v WHERE v.chapter_id = c.id) AS votes,
               (SELECT count(*) FROM public.comments m WHERE m.chapter_id = c.id AND m.status = 'visible') AS comments
          FROM public.chapters c),
    story_actual AS (
        SELECT st.id,
               (SELECT count(*) FROM public.chapter_votes v JOIN public.chapters c ON c.id = v.chapter_id
                 WHERE c.story_id = st.id) AS votes,
               (SELECT count(*) FROM public.comments m JOIN public.chapters c ON c.id = m.chapter_id
                 WHERE c.story_id = st.id AND m.status = 'visible') AS comments,
               (SELECT count(*) FROM public.story_follows f WHERE f.story_id = st.id) AS followers,
               (SELECT count(*) FROM public.story_saves f WHERE f.story_id = st.id) AS saves
          FROM public.stories st),
    found AS (
        SELECT 'votes'::text AS counter, 'chapter'::text AS scope, a.id AS scope_id,
               coalesce(s.votes, 0) AS stored, a.votes AS actual
          FROM chapter_actual a LEFT JOIN public.chapter_stats s ON s.chapter_id = a.id
        UNION ALL
        SELECT 'comments', 'chapter', a.id, coalesce(s.comments, 0), a.comments
          FROM chapter_actual a LEFT JOIN public.chapter_stats s ON s.chapter_id = a.id
        UNION ALL
        SELECT 'votes', 'story', a.id, coalesce(s.votes, 0), a.votes
          FROM story_actual a LEFT JOIN public.story_stats s ON s.story_id = a.id
        UNION ALL
        SELECT 'comments', 'story', a.id, coalesce(s.comments, 0), a.comments
          FROM story_actual a LEFT JOIN public.story_stats s ON s.story_id = a.id
        UNION ALL
        SELECT 'followers', 'story', a.id, coalesce(s.followers, 0), a.followers
          FROM story_actual a LEFT JOIN public.story_stats s ON s.story_id = a.id
        UNION ALL
        SELECT 'saves', 'story', a.id, coalesce(s.saves, 0), a.saves
          FROM story_actual a LEFT JOIN public.story_stats s ON s.story_id = a.id)
    SELECT f.counter, f.scope, f.scope_id, f.stored, f.actual FROM found f WHERE f.stored <> f.actual
$$;

CREATE FUNCTION public.reconcile_counters()
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    SELECT public.reconcile_vote_counts() + public.reconcile_library_counts() + public.reconcile_comment_counts()
$$;

REVOKE ALL ON FUNCTION public.reconcile_comment_counts(), public.counter_drift(), public.reconcile_counters()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_comment_counts(), public.counter_drift(), public.reconcile_counters()
    TO service_role;

DO $$
BEGIN
    IF to_regnamespace('cron') IS NULL THEN
        RAISE NOTICE 'pg_cron is not available: run public.reconcile_counters() daily from another runner.';
        RETURN;
    END IF;
    PERFORM cron.schedule('storynest-reconcile-counters', '41 3 * * *', 'SELECT public.reconcile_counters()');
END $$;

-- Comments that existed before the trigger (dev data).
SELECT public.reconcile_comment_counts();

COMMIT;
