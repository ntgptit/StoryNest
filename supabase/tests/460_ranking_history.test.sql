-- Ranking history (insights4: bar race and slope chart): daily snapshots of the rankings, who may write and read them,
-- the live discovery rules on the way out, ranks recomputed within what the caller may see. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000004c1', 'rh.author@example.com'),
  ('00000000-0000-0000-0000-0000000004c2', 'rh.suspended@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status, is_mature) VALUES
  ('14600000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004c1', 'rh-a', 'RH A', 'public', 'ongoing', false),
  ('14600000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000004c1', 'rh-b', 'RH B', 'public', 'ongoing', false),
  ('14600000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000004c1', 'rh-c', 'RH C', 'public', 'ongoing', true),
  ('14600000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000004c1', 'rh-private', 'RH private', 'private', 'ongoing', false),
  ('14600000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000004c2', 'rh-suspended', 'RH suspended', 'public', 'ongoing', false);
INSERT INTO chapters (id, story_id, slug, sort_order)
SELECT ('24600000-0000-0000-0000-00000000000' || n)::uuid, ('14600000-0000-0000-0000-00000000000' || n)::uuid, 'one', 1
  FROM generate_series(1, 5) n;
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000004c2';

CREATE FUNCTION pg_temp.reads(p_story int, p_n int) RETURNS void LANGUAGE sql AS $$
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day)
  SELECT ('24600000-0000-0000-0000-00000000000' || p_story)::uuid, ('14600000-0000-0000-0000-00000000000' || p_story)::uuid,
         gen_random_uuid(), true, (timezone('UTC', clock_timestamp()))::date
    FROM generate_series(1, p_n)
$$;

DO $$
DECLARE
  today date := (timezone('UTC', clock_timestamp()))::date;
  sa constant uuid := '14600000-0000-0000-0000-000000000001';
  sb constant uuid := '14600000-0000-0000-0000-000000000002';
  sc constant uuid := '14600000-0000-0000-0000-000000000003';
  sp constant uuid := '14600000-0000-0000-0000-000000000004';
  ss constant uuid := '14600000-0000-0000-0000-000000000005';
  n integer;
BEGIN
  RESET ROLE;
  -- 1. privileges -------------------------------------------------------------------------------------------------------
  PERFORM tests.ok('the snapshot table is closed to API roles',
    NOT has_table_privilege('anon', 'public.ranking_snapshots', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.ranking_snapshots', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.ranking_snapshots', 'INSERT'));
  PERFORM tests.ok('only the service role may take a snapshot',
    has_function_privilege('service_role', 'public.snapshot_rankings(date, integer)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.snapshot_rankings(date, integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.snapshot_rankings(date, integer)', 'EXECUTE'));
  PERFORM tests.ok('anyone may read the history',
    has_function_privilege('anon', 'public.ranking_history(text, integer, boolean, integer)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.ranking_history(text, integer, boolean, integer)', 'EXECUTE'));
  PERFORM tests.act_as('00000000-0000-0000-0000-0000000004c1');
  PERFORM tests.fails_with('a signed-in user cannot snapshot', 'SELECT public.snapshot_rankings()', '42501');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.fails_with('nor can a guest', 'SELECT public.snapshot_rankings()', '42501');
  PERFORM tests.fails_with('history: unknown period', 'SELECT * FROM public.ranking_history(''year'')', '22023');
  PERFORM tests.fails_with('history: 0 days', 'SELECT * FROM public.ranking_history(''day'', 0)', '22023');
  PERFORM tests.fails_with('history: 31 days', 'SELECT * FROM public.ranking_history(''day'', 31)', '22023');
  PERFORM tests.fails_with('history: limit 21', 'SELECT * FROM public.ranking_history(''day'', 7, false, 21)', '22023');
  PERFORM tests.ok('history: nothing before the first snapshot', (SELECT count(*) = 0 FROM public.ranking_history('day')));

  -- 2. yesterday: C (mature) 9, A 5, B 3; private and suspended ones are never kept -----------------------------------
  RESET ROLE;
  PERFORM pg_temp.reads(3, 9); PERFORM pg_temp.reads(1, 5); PERFORM pg_temp.reads(2, 3);
  PERFORM pg_temp.reads(4, 20); PERFORM pg_temp.reads(5, 20);
  PERFORM public.aggregate_reads();
  PERFORM public.refresh_rankings();
  PERFORM tests.fails_with('keep out of range', format('SELECT public.snapshot_rankings(%L, 0)', today - 1), '22023');
  n := public.snapshot_rankings(today - 1);
  PERFORM tests.ok('the snapshot keeps only eligible stories (3 per window period with reads, plus all)',
    NOT EXISTS (SELECT 1 FROM ranking_snapshots WHERE story_id IN (sp, ss))
    AND (SELECT count(*) = 3 FROM ranking_snapshots WHERE day = today - 1 AND period = 'day')
    AND n = (SELECT count(*) FROM ranking_snapshots WHERE day = today - 1));
  PERFORM tests.ok('a second run the same day replaces, not duplicates',
    public.snapshot_rankings(today - 1) = n AND (SELECT count(*) = n FROM ranking_snapshots WHERE day = today - 1));
  PERFORM tests.ok('keep limits the rows per period',
    public.snapshot_rankings(today - 1, 1) = (SELECT count(DISTINCT period) FROM ranking_snapshots WHERE day = today - 1)
    AND public.snapshot_rankings(today - 1) = n);

  -- today: B overtakes A
  PERFORM pg_temp.reads(2, 4);
  PERFORM public.aggregate_reads();
  PERFORM public.refresh_rankings();
  PERFORM public.snapshot_rankings();

  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('history: two days, oldest first, without mature stories ranks recomputed (A 1st, B 2nd yesterday)',
    (SELECT array_agg(story_id ORDER BY day, rank_position) = ARRAY[sa, sb, sb, sa]
       FROM public.ranking_history('day', 7)));
  PERFORM tests.ok('history: positions are 1..n each day',
    (SELECT bool_and(rank_position IN (1, 2)) FROM public.ranking_history('day', 7)));
  PERFORM tests.ok('history: with mature stories C leads both days',
    (SELECT array_agg(story_id ORDER BY day, rank_position) = ARRAY[sc, sa, sb, sc, sb, sa]
       FROM public.ranking_history('day', 7, true)));
  PERFORM tests.ok('history: the scores are the snapshot''s',
    (SELECT score = 7 FROM public.ranking_history('day', 7) WHERE day = today AND story_id = sb));
  PERFORM tests.ok('history: limit per day', (SELECT count(*) = 2 FROM public.ranking_history('day', 7, false, 1)));
  PERFORM tests.ok('history: days = 1 is today only', (SELECT bool_and(day = today) FROM public.ranking_history('day', 1)));

  -- 3. a story that turns private leaves the whole history at once ---------------------------------------------------
  RESET ROLE;
  UPDATE stories SET visibility = 'private' WHERE id = sa;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('history: a story made private is gone from every day, the others move up',
    (SELECT array_agg(story_id ORDER BY day, rank_position) = ARRAY[sb, sb] FROM public.ranking_history('day', 7)));
  RESET ROLE;
  UPDATE stories SET visibility = 'public' WHERE id = sa;

  -- 4. retention: snapshots older than 90 days are dropped by the next snapshot --------------------------------------
  INSERT INTO ranking_snapshots (day, period, story_id, rank_position, score, reads, votes)
  VALUES (today - 120, 'day', sa, 1, 1, 1, 0);
  PERFORM public.snapshot_rankings();
  PERFORM tests.ok('old snapshots are purged', NOT EXISTS (SELECT 1 FROM ranking_snapshots WHERE day = today - 120));
  DELETE FROM stories WHERE id = sb;
  PERFORM tests.ok('a deleted story takes its snapshots with it', NOT EXISTS (SELECT 1 FROM ranking_snapshots WHERE story_id = sb));
END $$;

ROLLBACK;
