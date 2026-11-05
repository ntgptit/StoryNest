-- Reading habits (batch 4 "habits4"): the reader's own streak, daily goal, XP inputs and achievements. One model, all of
-- it private to the reader (nobody else, not even the author of the stories read, can see any of it).
--
-- Rollback (exact statements, in this order):
--   DROP TRIGGER chapter_read_events_habits ON public.chapter_read_events;
--   DROP TRIGGER user_chapter_progress_habits ON public.user_chapter_progress;
--   DROP TRIGGER user_settings_habits ON public.user_settings;
--   DROP FUNCTION public.habits_count_read(), public.habits_count_finished(), public.habits_goal_changed(),
--       public.habits_mark_story_finished(uuid, uuid), public.refresh_reading_habits(uuid);
--   DROP TABLE public.user_achievements, public.user_reading_stats, public.user_finished_stories,
--       public.user_finished_chapters, public.user_reading_days;
--   ALTER TABLE public.user_settings DROP COLUMN daily_chapter_goal;
--
-- Tables (client access in brackets; nothing here is ever written by a client):
--   user_reading_days        [owner SELECT]  one row per reader x UTC day: chapters_read (fed by record_chapter_read,
--                                            i.e. one per chapter per day, already deduped there) and chapters_finished
--                                            (first time a chapter reaches READING_COMPLETED_PERCENT). Kept forever: it is
--                                            the reader's history, at most one small row a day.
--   user_finished_chapters   [none]          first completion per chapter, durable: clearing reading history
--                                            (user_chapter_progress) does not take finished chapters away again.
--   user_finished_stories    [none]          a story counts as finished when its author marked it `completed` and the
--                                            reader has finished every published chapter of it.
--   user_reading_stats       [owner SELECT]  one summary row per reader, recomputed by refresh_reading_habits.
--   user_achievements        [owner SELECT]  earned badges with earned_at; never revoked once earned.
--   user_settings.daily_chapter_goal [owner INSERT/UPDATE, like the other settings columns] chapters a day, 1..20.
--
-- Who writes: only the SECURITY DEFINER trigger functions below (and service_role). The two entry points are the ones
-- that already exist: record_chapter_read inserts into chapter_read_events (AFTER INSERT trigger here), and
-- save_reading_progress / the progress upsert sets user_chapter_progress.completed_at (AFTER INSERT/UPDATE trigger here).
-- A guest read (is_anonymous) is never attributed to anybody. "Today" and every day here are UTC days, the same day
-- boundary chapter_read_events dedupes on (for Vietnam the day turns at 07:00 local time; documented in BR-HAB-001).
-- The finished day is the server's day at the time of the write, never the client-supplied completed_at.
--
-- Streak: consecutive UTC days with chapters_read >= 1. user_reading_stats.current_streak is the run that ends on
-- last_read_day; the app shows it as alive only while last_read_day is today or yesterday (BR-HAB-002).
--
-- Achievements (fixed set, thresholds mirrored in packages/validation/src/reading-habits.ts and checked by a test):
--   first_chapter  finished chapters >= 1          streak_7    longest streak >= 7 days
--   daily_goal     a day with chapters_read >= the current daily goal
--   streak_30      longest streak >= 30 days       first_story finished stories >= 1     stories_10  finished stories >= 10
-- Badges are private encouragement, not a currency: completed_at is client-writable for readable chapters, so a
-- determined user can award themselves badges. That harms nobody but themselves, which is why no rewards hang off them.
--
-- XP is NOT stored: the app derives it from user_reading_stats with documented rules (BR-HAB-004), so there is no XP
-- ledger to write to or to drift.
--
-- Backfill: existing signed-in read events (the last 90 days the purge keeps) and existing completions are folded in
-- once below; badges earned by that history get the migration time as earned_at.
--
-- Error contract: no client RPC is added. Direct writes to the new tables fail with 42501; a goal outside 1..20 fails
-- with 23514 (CHECK).
BEGIN;

-- 1. Tables --------------------------------------------------------------------------------------------------------------
ALTER TABLE public.user_settings
    ADD COLUMN daily_chapter_goal smallint NOT NULL DEFAULT 3 CHECK (daily_chapter_goal BETWEEN 1 AND 20);
GRANT INSERT (daily_chapter_goal), UPDATE (daily_chapter_goal) ON public.user_settings TO authenticated;

CREATE TABLE public.user_reading_days (
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    read_day date NOT NULL,
    chapters_read integer NOT NULL DEFAULT 0 CHECK (chapters_read >= 0),
    chapters_finished integer NOT NULL DEFAULT 0 CHECK (chapters_finished >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, read_day)
);

CREATE TABLE public.user_finished_chapters (
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    finished_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, chapter_id)
);
CREATE INDEX idx_user_finished_chapters_chapter ON public.user_finished_chapters (chapter_id);   -- cascade deletes
CREATE INDEX idx_user_finished_chapters_story ON public.user_finished_chapters (story_id, user_id);  -- story check

CREATE TABLE public.user_finished_stories (
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    finished_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, story_id)
);
CREATE INDEX idx_user_finished_stories_story ON public.user_finished_stories (story_id);         -- cascade deletes

CREATE TABLE public.user_reading_stats (
    user_id uuid PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
    current_streak integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak integer NOT NULL DEFAULT 0 CHECK (longest_streak >= current_streak),
    last_read_day date,
    reading_days integer NOT NULL DEFAULT 0 CHECK (reading_days >= 0),
    chapters_read integer NOT NULL DEFAULT 0 CHECK (chapters_read >= 0),
    chapters_finished integer NOT NULL DEFAULT 0 CHECK (chapters_finished >= 0),
    stories_finished integer NOT NULL DEFAULT 0 CHECK (stories_finished >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_achievements (
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    code text NOT NULL
        CHECK (code IN ('first_chapter', 'daily_goal', 'streak_7', 'streak_30', 'first_story', 'stories_10')),
    earned_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, code)
);

-- 2. Access: owner-only reads, no client writes ------------------------------------------------------------------------
ALTER TABLE public.user_reading_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_finished_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_finished_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_reading_days, public.user_finished_chapters, public.user_finished_stories,
    public.user_reading_stats, public.user_achievements FROM PUBLIC, anon, authenticated;

GRANT SELECT (user_id, read_day, chapters_read, chapters_finished) ON public.user_reading_days TO authenticated;
GRANT SELECT (user_id, current_streak, longest_streak, last_read_day, reading_days, chapters_read, chapters_finished,
              stories_finished) ON public.user_reading_stats TO authenticated;
GRANT SELECT (user_id, code, earned_at) ON public.user_achievements TO authenticated;
-- user_finished_chapters / user_finished_stories: no grants, no policies (internal, like chapter_read_events).

CREATE POLICY user_reading_days_own ON public.user_reading_days FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY user_reading_stats_own ON public.user_reading_stats FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY user_achievements_own ON public.user_achievements FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- 3. Functions -----------------------------------------------------------------------------------------------------------
-- Recomputes the summary row from the day rows and the finished tables, then awards any badge now due. Idempotent, so
-- it is also the repair tool (service_role): SELECT public.refresh_reading_habits(user_id) FROM public.user_reading_stats;
CREATE FUNCTION public.refresh_reading_habits(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    -- Keep in sync with DAILY_GOAL.default and ACHIEVEMENT_THRESHOLDS in packages/validation/src/reading-habits.ts.
    c_default_goal constant integer := 3;
    c_streak_7 constant integer := 7;
    c_streak_30 constant integer := 30;
    c_stories_10 constant integer := 10;
    v_days integer;
    v_read integer;
    v_last date;
    v_current integer;
    v_longest integer;
    v_finished integer;
    v_stories integer;
    v_goal integer;
    v_goal_met boolean;
BEGIN
    -- Gaps and islands: day minus its rank is constant along a run of consecutive days.
    WITH d AS (
        SELECT read_day, chapters_read,
               read_day - (row_number() OVER (ORDER BY read_day))::integer AS run
          FROM public.user_reading_days
         WHERE user_id = p_user_id AND chapters_read > 0
    ), runs AS (
        SELECT count(*)::integer AS len, max(read_day) AS last_day FROM d GROUP BY run
    )
    SELECT (SELECT count(*)::integer FROM d),
           (SELECT coalesce(sum(chapters_read), 0)::integer FROM d),
           (SELECT max(last_day) FROM runs),
           coalesce((SELECT len FROM runs ORDER BY last_day DESC LIMIT 1), 0),
           coalesce((SELECT max(len) FROM runs), 0)
      INTO v_days, v_read, v_last, v_current, v_longest;

    SELECT count(*)::integer INTO v_finished FROM public.user_finished_chapters WHERE user_id = p_user_id;
    SELECT count(*)::integer INTO v_stories FROM public.user_finished_stories WHERE user_id = p_user_id;
    v_goal := coalesce((SELECT daily_chapter_goal FROM public.user_settings WHERE user_id = p_user_id), c_default_goal);
    v_goal_met := EXISTS (SELECT 1 FROM public.user_reading_days
                           WHERE user_id = p_user_id AND chapters_read >= v_goal);

    INSERT INTO public.user_reading_stats AS s
        (user_id, current_streak, longest_streak, last_read_day, reading_days, chapters_read, chapters_finished,
         stories_finished, updated_at)
    VALUES (p_user_id, v_current, v_longest, v_last, v_days, v_read, v_finished, v_stories, now())
    ON CONFLICT (user_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak, longest_streak = EXCLUDED.longest_streak,
        last_read_day = EXCLUDED.last_read_day, reading_days = EXCLUDED.reading_days,
        chapters_read = EXCLUDED.chapters_read, chapters_finished = EXCLUDED.chapters_finished,
        stories_finished = EXCLUDED.stories_finished, updated_at = now();

    INSERT INTO public.user_achievements (user_id, code)
    SELECT p_user_id, a.code
      FROM (VALUES ('first_chapter', v_finished >= 1),
                   ('daily_goal', v_goal_met),
                   ('streak_7', v_longest >= c_streak_7),
                   ('streak_30', v_longest >= c_streak_30),
                   ('first_story', v_stories >= 1),
                   ('stories_10', v_stories >= c_stories_10)) AS a(code, due)
     WHERE a.due
    ON CONFLICT (user_id, code) DO NOTHING;
END $$;

-- A story is finished for a reader once it is marked completed and every published chapter is in their finished list.
CREATE FUNCTION public.habits_mark_story_finished(p_user_id uuid, p_story_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    INSERT INTO public.user_finished_stories (user_id, story_id)
    SELECT p_user_id, s.id
      FROM public.stories s
     WHERE s.id = p_story_id AND s.status = 'completed' AND s.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM public.chapters c
                    WHERE c.story_id = s.id AND c.status = 'published' AND c.deleted_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM public.chapters c
                        WHERE c.story_id = s.id AND c.status = 'published' AND c.deleted_at IS NULL
                          AND NOT EXISTS (SELECT 1 FROM public.user_finished_chapters f
                                           WHERE f.user_id = p_user_id AND f.chapter_id = c.id))
    ON CONFLICT (user_id, story_id) DO NOTHING
$$;

-- AFTER INSERT on chapter_read_events: a NEW signed-in read (the dedupe already happened there) counts for the day.
CREATE FUNCTION public.habits_count_read()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.is_anonymous OR NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = NEW.reader_id) THEN
        RETURN NULL;
    END IF;
    INSERT INTO public.user_reading_days AS d (user_id, read_day, chapters_read)
    VALUES (NEW.reader_id, NEW.read_day, 1)
    ON CONFLICT (user_id, read_day) DO UPDATE SET chapters_read = d.chapters_read + 1, updated_at = now();
    PERFORM public.refresh_reading_habits(NEW.reader_id);
    RETURN NULL;
END $$;

-- AFTER INSERT / UPDATE OF completed_at on user_chapter_progress: the first completion of a chapter counts once, on the
-- server's current UTC day. Repeated saves of a finished chapter hit the primary key and change nothing.
CREATE FUNCTION public.habits_count_finished()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_story uuid;
    v_inserted integer;
BEGIN
    SELECT story_id INTO v_story FROM public.chapters WHERE id = NEW.chapter_id;
    IF v_story IS NULL THEN
        RETURN NULL;
    END IF;
    INSERT INTO public.user_finished_chapters (user_id, chapter_id, story_id)
    VALUES (NEW.user_id, NEW.chapter_id, v_story)
    ON CONFLICT (user_id, chapter_id) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted = 0 THEN
        RETURN NULL;
    END IF;
    INSERT INTO public.user_reading_days AS d (user_id, read_day, chapters_finished)
    VALUES (NEW.user_id, (now() AT TIME ZONE 'UTC')::date, 1)
    ON CONFLICT (user_id, read_day) DO UPDATE SET chapters_finished = d.chapters_finished + 1, updated_at = now();
    PERFORM public.habits_mark_story_finished(NEW.user_id, v_story);
    PERFORM public.refresh_reading_habits(NEW.user_id);
    RETURN NULL;
END $$;

-- AFTER INSERT / UPDATE OF daily_chapter_goal on user_settings: a lower goal that today's reading already meets earns the
-- daily-goal badge right away instead of at the next read.
CREATE FUNCTION public.habits_goal_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.user_reading_stats WHERE user_id = NEW.user_id) THEN
        PERFORM public.refresh_reading_habits(NEW.user_id);
    END IF;
    RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.refresh_reading_habits(uuid), public.habits_mark_story_finished(uuid, uuid),
    public.habits_count_read(), public.habits_count_finished(), public.habits_goal_changed()
    FROM PUBLIC, anon, authenticated;

-- 4. Backfill (before the triggers exist, so nothing is counted twice) -------------------------------------------------
INSERT INTO public.user_reading_days (user_id, read_day, chapters_read)
SELECT e.reader_id, e.read_day, count(*)::integer
  FROM public.chapter_read_events e
  JOIN public.app_users u ON u.id = e.reader_id
 WHERE NOT e.is_anonymous
 GROUP BY e.reader_id, e.read_day;

INSERT INTO public.user_finished_chapters (user_id, chapter_id, story_id, finished_at)
SELECT p.user_id, p.chapter_id, c.story_id, p.completed_at
  FROM public.user_chapter_progress p
  JOIN public.chapters c ON c.id = p.chapter_id
 WHERE p.completed_at IS NOT NULL;

INSERT INTO public.user_reading_days AS d (user_id, read_day, chapters_finished)
SELECT user_id, (finished_at AT TIME ZONE 'UTC')::date, count(*)::integer
  FROM public.user_finished_chapters
 GROUP BY user_id, (finished_at AT TIME ZONE 'UTC')::date
ON CONFLICT (user_id, read_day) DO UPDATE SET chapters_finished = EXCLUDED.chapters_finished;

SELECT public.habits_mark_story_finished(f.user_id, f.story_id)
  FROM (SELECT DISTINCT user_id, story_id FROM public.user_finished_chapters) f;

SELECT public.refresh_reading_habits(u.user_id)
  FROM (SELECT user_id FROM public.user_reading_days UNION SELECT user_id FROM public.user_finished_chapters) u;

-- 5. Triggers -------------------------------------------------------------------------------------------------------------
CREATE TRIGGER chapter_read_events_habits AFTER INSERT ON public.chapter_read_events
    FOR EACH ROW WHEN (NOT NEW.is_anonymous) EXECUTE FUNCTION public.habits_count_read();
CREATE TRIGGER user_chapter_progress_habits AFTER INSERT OR UPDATE OF completed_at ON public.user_chapter_progress
    FOR EACH ROW WHEN (NEW.completed_at IS NOT NULL) EXECUTE FUNCTION public.habits_count_finished();
CREATE TRIGGER user_settings_habits AFTER INSERT OR UPDATE OF daily_chapter_goal ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.habits_goal_changed();

COMMIT;
