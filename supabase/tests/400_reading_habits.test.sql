-- Reading habits (batch 4 habits4): day records fed by record_chapter_read, first completions, streaks, the daily goal,
-- achievements, and that all of it stays private to the reader. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000004a1', 'hab.author@example.com'),
  ('00000000-0000-0000-0000-0000000004b1', 'hab.reader@example.com'),
  ('00000000-0000-0000-0000-0000000004c1', 'hab.other@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004a1', 'hab-story', 'Habits', 'public', 'draft'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000004a1', 'hab-done', 'Done', 'public', 'draft');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000001', 'one', 1),
  ('40000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000001', 'two', 2),
  ('40000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000002', 'a', 1),
  ('40000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000002', 'b', 2);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000004a1';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('40000000-0000-0000-0000-000000000011', 'One', '[{"block_id":"40000000-0000-0000-0000-000000000111","type":"paragraph","text":"a"}]'::jsonb, a),
    ('40000000-0000-0000-0000-000000000012', 'Two', '[{"block_id":"40000000-0000-0000-0000-000000000112","type":"paragraph","text":"b"}]'::jsonb, a),
    ('40000000-0000-0000-0000-000000000021', 'A', '[{"block_id":"40000000-0000-0000-0000-000000000121","type":"paragraph","text":"c"}]'::jsonb, a),
    ('40000000-0000-0000-0000-000000000022', 'B', '[{"block_id":"40000000-0000-0000-0000-000000000122","type":"paragraph","text":"d"}]'::jsonb, a);
  PERFORM public.publish_chapter('40000000-0000-0000-0000-000000000011');
  PERFORM public.publish_chapter('40000000-0000-0000-0000-000000000012');
  PERFORM public.publish_chapter('40000000-0000-0000-0000-000000000021');
  PERFORM public.publish_chapter('40000000-0000-0000-0000-000000000022');
  RESET ROLE;
  UPDATE stories SET status = 'completed' WHERE id = '40000000-0000-0000-0000-000000000002';
END $$;

DO $$
DECLARE
  r constant uuid := '00000000-0000-0000-0000-0000000004b1';
  x constant uuid := '00000000-0000-0000-0000-0000000004c1';
  ch1 constant uuid := '40000000-0000-0000-0000-000000000011';
  ch2 constant uuid := '40000000-0000-0000-0000-000000000012';
  da constant uuid := '40000000-0000-0000-0000-000000000021';
  db constant uuid := '40000000-0000-0000-0000-000000000022';
  st constant uuid := '40000000-0000-0000-0000-000000000001';
  today constant date := (now() AT TIME ZONE 'UTC')::date;
  i integer;
BEGIN
  -- 1. reads feed today's record; repeats and guests do not ---------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.record_chapter_read(ch1);
  PERFORM public.record_chapter_read(ch1);   -- same chapter, same day: deduped upstream, counted once here
  PERFORM public.record_chapter_read(ch2);
  PERFORM tests.ok('today has two chapters read',
    (SELECT chapters_read = 2 AND chapters_finished = 0 FROM user_reading_days WHERE read_day = today));
  PERFORM tests.ok('one-day streak',
    (SELECT current_streak = 1 AND longest_streak = 1 AND last_read_day = today AND reading_days = 1 AND chapters_read = 2
       FROM user_reading_stats));
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM public.record_chapter_read(ch1, 'bbbbbbbb-0000-4000-8000-000000000001');
  RESET ROLE;
  PERFORM tests.ok('a guest read is attributed to nobody', (SELECT count(*) = 1 FROM user_reading_days));
  PERFORM tests.ok('no badge for reading alone', (SELECT count(*) = 0 FROM user_achievements));

  -- 2. privacy: owner-only reads, no client writes, internal tables and functions closed ---------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('guest cannot read days', 'SELECT 1 FROM user_reading_days');
  PERFORM tests.denied('guest cannot read stats', 'SELECT 1 FROM user_reading_stats');
  PERFORM tests.denied('guest cannot read badges', 'SELECT 1 FROM user_achievements');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.count_is('another reader sees no days', 'SELECT 1 FROM user_reading_days', 0);
  PERFORM tests.count_is('nor stats', 'SELECT 1 FROM user_reading_stats', 0);
  PERFORM tests.count_is('nor badges', 'SELECT 1 FROM user_achievements', 0);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.denied('no insert into days', format('INSERT INTO user_reading_days (user_id, read_day, chapters_read) VALUES (%L, %L, 9)', r, today - 1));
  PERFORM tests.denied('no update of days', 'UPDATE user_reading_days SET chapters_read = 99');
  PERFORM tests.denied('no delete of days', 'DELETE FROM user_reading_days');
  PERFORM tests.denied('no update of stats', 'UPDATE user_reading_stats SET current_streak = 99');
  PERFORM tests.denied('no self-awarded badge', format('INSERT INTO user_achievements (user_id, code) VALUES (%L, ''streak_30'')', r));
  PERFORM tests.denied('no delete of badges', 'DELETE FROM user_achievements');
  PERFORM tests.denied('updated_at is not exposed', 'SELECT updated_at FROM user_reading_stats');
  PERFORM tests.denied('finished chapters are internal', 'SELECT 1 FROM user_finished_chapters');
  PERFORM tests.denied('finished stories are internal', 'SELECT 1 FROM user_finished_stories');
  PERFORM tests.denied('refresh is not callable by clients', format('SELECT public.refresh_reading_habits(%L)', r));
  PERFORM tests.denied('nor the story check', format('SELECT public.habits_mark_story_finished(%L, %L)', r, st));
  RESET ROLE;
  PERFORM tests.ok('no API role can execute the internals',
    NOT has_function_privilege('anon', 'public.refresh_reading_habits(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.habits_count_read()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.habits_count_finished()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.habits_goal_changed()', 'EXECUTE'));

  -- 3. first completion: counted once, on the server's day, durable --------------------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM public.save_reading_progress(ch1, 100);
  PERFORM public.save_reading_progress(ch1, 100);   -- a repeated save of a finished chapter changes nothing
  PERFORM tests.ok('one chapter finished today', (SELECT chapters_finished = 1 FROM user_reading_days WHERE read_day = today));
  PERFORM tests.ok('first_chapter earned', (SELECT count(*) = 1 FROM user_achievements WHERE code = 'first_chapter'));
  PERFORM public.save_reading_progress(ch2, 50);
  PERFORM tests.ok('an unfinished chapter is not counted', (SELECT chapters_finished = 1 FROM user_reading_stats));
  -- a direct (allowed) progress write with a backdated completed_at still counts on today, not on the claimed day
  PERFORM tests.rows('progress row written directly', format(
    'UPDATE user_chapter_progress SET percent_complete = 100, completed_at = now() - interval ''40 days'' WHERE chapter_id = %L', ch2), 1);
  PERFORM tests.ok('finished on the server''s day', (SELECT chapters_finished = 2 FROM user_reading_days WHERE read_day = today));
  PERFORM tests.count_is('no backdated day appears', 'SELECT 1 FROM user_reading_days', 1);
  PERFORM tests.rows('clearing reading history', 'DELETE FROM user_chapter_progress', 2);
  PERFORM tests.ok('finished chapters survive a cleared history', (SELECT chapters_finished = 2 FROM user_reading_stats));
  PERFORM public.save_reading_progress(ch1, 100);
  PERFORM tests.ok('and finishing again does not count twice', (SELECT chapters_finished = 2 FROM user_reading_stats));

  -- 4. finished story: only a completed story, all published chapters --------------------------------------------------------
  PERFORM tests.ok('an ongoing story finished chapter by chapter is not a finished story',
    (SELECT stories_finished = 0 FROM user_reading_stats));
  PERFORM public.save_reading_progress(da, 100);
  PERFORM tests.ok('half a completed story is not finished', (SELECT stories_finished = 0 FROM user_reading_stats));
  PERFORM public.save_reading_progress(db, 100);
  PERFORM tests.ok('all of it is', (SELECT stories_finished = 1 AND chapters_finished = 4 FROM user_reading_stats));
  PERFORM tests.ok('first_story earned', (SELECT count(*) = 1 FROM user_achievements WHERE code = 'first_story'));

  -- 5. streaks: consecutive UTC days of reading ----------------------------------------------------------------------------------
  RESET ROLE;
  FOR i IN 1..6 LOOP
    INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day)
    VALUES (ch1, st, r, false, today - i);
  END LOOP;
  PERFORM tests.ok('seven days in a row', (SELECT current_streak = 7 AND longest_streak = 7 AND reading_days = 7 FROM user_reading_stats WHERE user_id = r));
  PERFORM tests.ok('streak_7 earned, streak_30 not',
    (SELECT count(*) FILTER (WHERE code = 'streak_7') = 1 AND count(*) FILTER (WHERE code = 'streak_30') = 0
       FROM user_achievements WHERE user_id = r));
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day)
  VALUES (ch1, st, r, false, today - 10), (ch1, st, r, false, today - 11);
  PERFORM tests.ok('an older, separate run does not join the current one',
    (SELECT current_streak = 7 AND longest_streak = 7 AND reading_days = 9 FROM user_reading_stats WHERE user_id = r));
  PERFORM public.refresh_reading_habits(r);
  PERFORM tests.ok('refresh is idempotent (repair tool)',
    (SELECT current_streak = 7 AND reading_days = 9 AND chapters_read = 10 AND chapters_finished = 4 FROM user_reading_stats WHERE user_id = r));
  -- a guest event never reaches anyone, even with a uuid that happens to be an account
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day) VALUES (ch1, st, x, true, today);
  PERFORM tests.ok('anonymous event ignored', NOT EXISTS (SELECT 1 FROM user_reading_days WHERE user_id = x));

  -- 6. daily goal: a setting of the reader's own; badge when reached --------------------------------------------------------------
  PERFORM tests.ok('two chapters today do not meet the default goal of 3',
    NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = r AND code = 'daily_goal'));
  PERFORM tests.act_as(r);
  PERFORM tests.fails_with('goal below 1', format('INSERT INTO user_settings (user_id, daily_chapter_goal) VALUES (%L, 0)', r), '23514');
  PERFORM tests.fails_with('goal above 20', format('INSERT INTO user_settings (user_id, daily_chapter_goal) VALUES (%L, 21)', r), '23514');
  PERFORM tests.denied('not on someone else''s settings', format('INSERT INTO user_settings (user_id, daily_chapter_goal) VALUES (%L, 2)', x));
  PERFORM tests.rows('lower my goal to 2', format(
    'INSERT INTO user_settings (user_id, daily_chapter_goal) VALUES (%L, 2) ON CONFLICT (user_id) DO UPDATE SET daily_chapter_goal = excluded.daily_chapter_goal', r), 1);
  PERFORM tests.ok('today already meets it: daily_goal earned at once',
    (SELECT count(*) = 1 FROM user_achievements WHERE code = 'daily_goal'));
  PERFORM tests.rows('raise it again', format('UPDATE user_settings SET daily_chapter_goal = 10 WHERE user_id = %L', r), 1);
  PERFORM tests.ok('a badge is never taken back', (SELECT count(*) = 1 FROM user_achievements WHERE code = 'daily_goal'));
  PERFORM tests.ok('the goal is readable by its owner', (SELECT daily_chapter_goal = 10 FROM user_settings));
  PERFORM tests.ok('the existing settings defaults are untouched', (SELECT language_code = 'vi' AND notify_chapter_published FROM user_settings));
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.rows('another reader cannot change my goal', format('UPDATE user_settings SET daily_chapter_goal = 1 WHERE user_id = %L', r), 0);

  -- 7. the reader's badges as the reader sees them --------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.count_is('four badges, all mine', 'SELECT 1 FROM user_achievements', 4);
  PERFORM tests.ok('earned_at is set', (SELECT bool_and(earned_at IS NOT NULL) FROM user_achievements));
  RESET ROLE;
  PERFORM tests.fails_with('only the fixed codes exist', format('INSERT INTO user_achievements (user_id, code) VALUES (%L, ''made_up'')', r), '23514');

  -- 8. an account removal takes the history with it -------------------------------------------------------------------------------
  DELETE FROM auth.users WHERE id = r;
  PERFORM tests.ok('nothing left behind for a removed account',
    NOT EXISTS (SELECT 1 FROM user_reading_stats WHERE user_id = r)
    AND NOT EXISTS (SELECT 1 FROM user_reading_days WHERE user_id = r)
    AND NOT EXISTS (SELECT 1 FROM user_finished_chapters WHERE user_id = r)
    AND NOT EXISTS (SELECT 1 FROM user_finished_stories WHERE user_id = r)
    AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = r));
END $$;

ROLLBACK;
