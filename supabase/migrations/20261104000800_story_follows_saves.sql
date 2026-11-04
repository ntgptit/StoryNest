-- Follow a story and save it to the library: two separate things (WBS WP 4.3).
--
--   follow  = "tell me when a chapter is published" (the outbox worker already notifies followers);
--   save    = "keep it on my private shelf" (no notifications).
-- Neither implies the other. Both are private rows of the user (own read) on stories the user can read.
--
--   set_story_follow(story_id, followed) -> followers   SECURITY INVOKER: RLS of the caller applies, so only a story the
--   set_story_save(story_id, saved)      -> saves       caller can read can be followed or saved. Repeating a call
--                                                       changes nothing (ON CONFLICT DO NOTHING / DELETE of zero rows) and
--                                                       returns the current public count, so a retry is harmless.
--   reconcile_library_counts() -> rows corrected        service_role only: recomputes story_stats.followers and .saves.
--
-- Counters: an AFTER INSERT/DELETE row trigger on each table moves story_stats.followers / .saves in the same transaction,
-- whatever path wrote the row. A skipped insert fires no trigger, so a repeat counts once. The decrement never goes below
-- zero and only updates existing rows, because the row may be disappearing in a cascade.
--
-- Error contract: 42501 not signed in / story not readable by the caller, 22023 the flag is null.
-- Rollback: DROP both triggers and the four functions; counters keep their values.
BEGIN;

CREATE FUNCTION public.apply_story_library_delta()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'story_follows' THEN
            INSERT INTO public.story_stats AS s (story_id, followers) VALUES (NEW.story_id, 1)
            ON CONFLICT (story_id) DO UPDATE SET followers = s.followers + 1, updated_at = now();
        ELSE
            INSERT INTO public.story_stats AS s (story_id, saves) VALUES (NEW.story_id, 1)
            ON CONFLICT (story_id) DO UPDATE SET saves = s.saves + 1, updated_at = now();
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'story_follows' THEN
        UPDATE public.story_stats SET followers = greatest(followers - 1, 0), updated_at = now()
         WHERE story_id = OLD.story_id;
    ELSE
        UPDATE public.story_stats SET saves = greatest(saves - 1, 0), updated_at = now()
         WHERE story_id = OLD.story_id;
    END IF;
    RETURN OLD;
END $$;

REVOKE ALL ON FUNCTION public.apply_story_library_delta() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER story_follows_count AFTER INSERT OR DELETE ON story_follows
    FOR EACH ROW EXECUTE FUNCTION public.apply_story_library_delta();
CREATE TRIGGER story_saves_count AFTER INSERT OR DELETE ON story_saves
    FOR EACH ROW EXECUTE FUNCTION public.apply_story_library_delta();

CREATE FUNCTION public.set_story_follow(p_story_id uuid, p_followed boolean)
RETURNS bigint
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_followed IS NULL THEN
        RAISE EXCEPTION 'followed must be true or false' USING ERRCODE = '22023';
    END IF;
    IF p_followed THEN
        INSERT INTO public.story_follows (user_id, story_id) VALUES (v_uid, p_story_id)
        ON CONFLICT (user_id, story_id) DO NOTHING;
    ELSE
        DELETE FROM public.story_follows WHERE user_id = v_uid AND story_id = p_story_id;
    END IF;
    RETURN coalesce((SELECT followers FROM public.story_stats WHERE story_id = p_story_id), 0);
END $$;

CREATE FUNCTION public.set_story_save(p_story_id uuid, p_saved boolean)
RETURNS bigint
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_saved IS NULL THEN
        RAISE EXCEPTION 'saved must be true or false' USING ERRCODE = '22023';
    END IF;
    IF p_saved THEN
        INSERT INTO public.story_saves (user_id, story_id) VALUES (v_uid, p_story_id)
        ON CONFLICT (user_id, story_id) DO NOTHING;
    ELSE
        DELETE FROM public.story_saves WHERE user_id = v_uid AND story_id = p_story_id;
    END IF;
    RETURN coalesce((SELECT saves FROM public.story_stats WHERE story_id = p_story_id), 0);
END $$;

CREATE FUNCTION public.reconcile_library_counts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_followers integer;
    v_saves integer;
BEGIN
    WITH wanted AS (
        SELECT st.id AS story_id, count(f.story_id) AS n
          FROM public.stories st LEFT JOIN public.story_follows f ON f.story_id = st.id GROUP BY st.id),
    fixed AS (
        UPDATE public.story_stats s SET followers = w.n, updated_at = now()
          FROM wanted w WHERE w.story_id = s.story_id AND s.followers <> w.n RETURNING s.story_id)
    SELECT count(*) INTO v_followers FROM fixed;

    WITH wanted AS (
        SELECT st.id AS story_id, count(v.story_id) AS n
          FROM public.stories st LEFT JOIN public.story_saves v ON v.story_id = st.id GROUP BY st.id),
    fixed AS (
        UPDATE public.story_stats s SET saves = w.n, updated_at = now()
          FROM wanted w WHERE w.story_id = s.story_id AND s.saves <> w.n RETURNING s.story_id)
    SELECT count(*) INTO v_saves FROM fixed;

    RETURN v_followers + v_saves;
END $$;

REVOKE ALL ON FUNCTION public.set_story_follow(uuid, boolean), public.set_story_save(uuid, boolean),
    public.reconcile_library_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_story_follow(uuid, boolean), public.set_story_save(uuid, boolean)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_library_counts() TO service_role;

-- Rows that existed before the triggers (dev data).
SELECT public.reconcile_library_counts();

COMMIT;
