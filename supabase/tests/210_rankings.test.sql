-- Rankings (WP 5.3): windows, score, eligibility, staleness, access, freshness. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000ac', 'rank.author@example.com'),
  ('00000000-0000-0000-0000-0000000000bc', 'rank.suspended@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'rank.voter1@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'rank.voter2@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'rank.voter3@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000bc';
INSERT INTO stories (id, owner_id, slug, title, visibility, status, is_mature, deleted_at) VALUES
  ('1c000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000ac', 'rank-a', 'Rank A', 'public', 'ongoing', false, NULL),
  ('1c000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000ac', 'rank-b', 'Rank B', 'public', 'ongoing', false, NULL),
  ('1c000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000ac', 'rank-c', 'Rank C', 'public', 'ongoing', false, NULL),
  ('1c000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000ac', 'rank-mature', 'Rank mature', 'public', 'ongoing', true, NULL),
  ('1c000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000ac', 'rank-private', 'Rank private', 'private', 'ongoing', false, NULL),
  ('1c000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000ac', 'rank-draft', 'Rank draft', 'public', 'draft', false, NULL),
  ('1c000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000ac', 'rank-deleted', 'Rank deleted', 'public', 'ongoing', false, now()),
  ('1c000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000bc', 'rank-suspended', 'Rank suspended', 'public', 'ongoing', false, NULL),
  ('1c000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000ac', 'rank-edge', 'Rank edge', 'public', 'ongoing', false, NULL),
  ('1c000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000ac', 'rank-zero', 'Rank zero', 'public', 'ongoing', false, NULL);
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('2c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'one', 1),
  ('2c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', 'one', 1),
  ('2c000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000003', 'one', 1),
  ('2c000000-0000-0000-0000-000000000004', '1c000000-0000-0000-0000-000000000004', 'one', 1),
  ('2c000000-0000-0000-0000-000000000005', '1c000000-0000-0000-0000-000000000005', 'one', 1),
  ('2c000000-0000-0000-0000-000000000006', '1c000000-0000-0000-0000-000000000006', 'one', 1),
  ('2c000000-0000-0000-0000-000000000007', '1c000000-0000-0000-0000-000000000007', 'one', 1),
  ('2c000000-0000-0000-0000-000000000008', '1c000000-0000-0000-0000-000000000008', 'one', 1),
  ('2c000000-0000-0000-0000-000000000009', '1c000000-0000-0000-0000-000000000009', 'one', 1);

-- read events: a story gets n events today, m three days ago, k twenty days ago, j sixty days ago (one reader each)
CREATE FUNCTION pg_temp.reads(p_story int, p_today int, p_3d int, p_20d int, p_60d int) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  s uuid := ('1c000000-0000-0000-0000-00000000000' || p_story)::uuid;
  c uuid := ('2c000000-0000-0000-0000-00000000000' || p_story)::uuid;
BEGIN
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day)
  SELECT c, s, gen_random_uuid(), true, d.day
    FROM (VALUES (p_today, (now() AT TIME ZONE 'UTC')::date), (p_3d, (now() AT TIME ZONE 'UTC')::date - 3),
                 (p_20d, (now() AT TIME ZONE 'UTC')::date - 20), (p_60d, (now() AT TIME ZONE 'UTC')::date - 60)) d(n, day),
         generate_series(1, d.n);
END $$;

DO $$
DECLARE
  a constant uuid := '1c000000-0000-0000-0000-000000000001';
  b constant uuid := '1c000000-0000-0000-0000-000000000002';
  e constant uuid := '1c000000-0000-0000-0000-000000000009';
  c constant uuid := '1c000000-0000-0000-0000-000000000003';
  mature constant uuid := '1c000000-0000-0000-0000-000000000004';
  priv constant uuid := '1c000000-0000-0000-0000-000000000005';
  draft constant uuid := '1c000000-0000-0000-0000-000000000006';
  gone constant uuid := '1c000000-0000-0000-0000-000000000007';
  susp constant uuid := '1c000000-0000-0000-0000-000000000008';
  v1 constant uuid := '00000000-0000-0000-0000-0000000000c1';
  v2 constant uuid := '00000000-0000-0000-0000-0000000000c2';
  v3 constant uuid := '00000000-0000-0000-0000-0000000000c3';
  n integer;
  rec record;
BEGIN
  RESET ROLE;

  -- story A: 2 today, 3 three days ago, 4 twenty days ago, 5 sixty days ago (14 reads in all)
  PERFORM pg_temp.reads(1, 2, 3, 4, 5);
  -- story B: 1 today
  PERFORM pg_temp.reads(2, 1, 0, 0, 0);
  -- story C: 20 twenty days ago (month only)
  PERFORM pg_temp.reads(3, 0, 0, 20, 0);
  -- stories that must never appear
  PERFORM pg_temp.reads(4, 50, 0, 0, 0);
  PERFORM pg_temp.reads(5, 50, 0, 0, 0);
  PERFORM pg_temp.reads(6, 50, 0, 0, 0);
  PERFORM pg_temp.reads(7, 50, 0, 0, 0);
  PERFORM pg_temp.reads(8, 50, 0, 0, 0);
  -- a story with a stats row of zeros is not ranked in any period
  INSERT INTO story_stats (story_id) VALUES ('1c000000-0000-0000-0000-000000000010');
  -- story E sits on the edges of the windows: reads yesterday, 6, 7, 29 and 30 days ago (one each), votes 6 days 23 hours and 7 days 1 hour ago
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day)
  SELECT '2c000000-0000-0000-0000-000000000009', '1c000000-0000-0000-0000-000000000009', gen_random_uuid(), true,
         (now() AT TIME ZONE 'UTC')::date - d
    FROM unnest(ARRAY[1, 6, 7, 29, 30]) d;
  INSERT INTO chapter_votes (user_id, chapter_id, created_at) VALUES
    (v2, '2c000000-0000-0000-0000-000000000009', now() - interval '6 days 23 hours'),
    (v3, '2c000000-0000-0000-0000-000000000009', now() - interval '7 days 1 hour');
  -- votes: B gets one today, one 3 days ago and one 20 days ago; A gets one today
  INSERT INTO chapter_votes (user_id, chapter_id, created_at) VALUES
    (v1, '2c000000-0000-0000-0000-000000000002', now()),
    (v2, '2c000000-0000-0000-0000-000000000002', now() - interval '3 days'),
    (v3, '2c000000-0000-0000-0000-000000000002', now() - interval '20 days'),
    (v1, '2c000000-0000-0000-0000-000000000001', now());
  -- all-time totals come from story_stats (fed by the aggregate job and the vote trigger)
  UPDATE story_stats SET reads = 14 WHERE story_id = a;
  INSERT INTO story_stats (story_id, reads, votes) VALUES (c, 20, 0) ON CONFLICT (story_id) DO UPDATE SET reads = 20;
  -- B and C tie on the all-time score (5 reads + 3 votes x 5 = 20 = 20 reads): the one with more reads comes first
  UPDATE story_stats SET reads = 5 WHERE story_id = b;

  PERFORM public.refresh_rankings();

  -- 1. what each window counts -----------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('day: today only, A (2 reads + 1 vote = 7) ahead of B (1 read + 1 vote = 6)',
    (SELECT array_agg(story_id ORDER BY rank_position) FROM public.top_stories('day')) = ARRAY[a, b]);
  PERFORM tests.ok('day numbers: A 2 reads 1 vote score 7, B 1 read 1 vote score 6',
    (SELECT reads || '/' || votes || '/' || score FROM public.top_stories('day') WHERE story_id = a) = '2/1/7'
    AND (SELECT reads || '/' || votes || '/' || score FROM public.top_stories('day') WHERE story_id = b) = '1/1/6');
  PERFORM tests.ok('week adds the events and votes of three days ago',
    (SELECT reads || '/' || votes || '/' || score FROM public.top_stories('week') WHERE story_id = a) = '5/1/10'
    AND (SELECT reads || '/' || votes || '/' || score FROM public.top_stories('week') WHERE story_id = b) = '1/2/11');
  PERFORM tests.ok('day: yesterday is not in "today" (E has nothing today)',
    NOT EXISTS (SELECT 1 FROM public.top_stories('day', false, 50) WHERE story_id = e));
  PERFORM tests.ok('week: B (11) outranks A (10), then E (7); C has nothing this week',
    (SELECT array_agg(story_id ORDER BY rank_position) FROM public.top_stories('week')) = ARRAY[b, a, e]);
  PERFORM tests.ok('window edges: 6 days ago is in the week, 7 is not; a vote 6 days 23 hours old counts, one 7 days 1 hour old does not',
    (SELECT reads || '/' || votes || '/' || score FROM public.top_stories('week') WHERE story_id = e) = '2/1/7');
  PERFORM tests.ok('month adds twenty days ago: C (20), B (16), A (14) and E (14, behind A on reads)',
    (SELECT array_agg(story_id ORDER BY rank_position) FROM public.top_stories('month')) = ARRAY[c, b, a, e]
    AND (SELECT score FROM public.top_stories('month') WHERE story_id = c) = 20
    AND (SELECT reads || '/' || votes FROM public.top_stories('month') WHERE story_id = a) = '9/1'
    AND (SELECT reads || '/' || votes FROM public.top_stories('month') WHERE story_id = b) = '1/3');
  PERFORM tests.ok('window edges: 29 days ago is in the month, 30 is not; both votes are',
    (SELECT reads || '/' || votes || '/' || score FROM public.top_stories('month') WHERE story_id = e) = '4/2/14');
  PERFORM tests.ok('all: a story whose totals are all zero is not listed',
    NOT EXISTS (SELECT 1 FROM public.top_stories('all', false, 50) WHERE story_id = '1c000000-0000-0000-0000-000000000010'));
  PERFORM tests.ok('all: a tie in score goes to the story with more reads (C before B), not to the smaller id',
    (SELECT array_agg(story_id ORDER BY rank_position) FROM public.top_stories('all')) = ARRAY[c, b, a, e]);
  PERFORM tests.ok('all: the running totals, 60-day-old reads included',
    (SELECT score FROM public.top_stories('all') WHERE story_id = a) = 14 + 5 * (SELECT votes FROM story_stats WHERE story_id = a));

  -- 2. what is never listed ------------------------------------------------------------------------------------------
  PERFORM tests.ok('mature, private, draft, deleted and suspended-owner stories are not ranked',
    NOT EXISTS (SELECT 1 FROM public.top_stories('day', false, 50) WHERE story_id IN (mature, priv, draft, gone, susp)));
  PERFORM tests.ok('mature stories appear when asked for, and only those',
    (SELECT array_agg(story_id) FROM public.top_stories('day', true, 50) WHERE story_id IN (mature, priv, draft, gone, susp)) = ARRAY[mature]);
  PERFORM tests.ok('NULL include_mature means hidden', NOT EXISTS (SELECT 1 FROM public.top_stories('day', NULL, 50) WHERE story_id = mature));

  -- 3. the numbers lag, the rules do not --------------------------------------------------------------------------------
  RESET ROLE;
  UPDATE stories SET visibility = 'private' WHERE id = b;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a story made private disappears at once, without a refresh',
    NOT EXISTS (SELECT 1 FROM public.top_stories('week', false, 50) WHERE story_id = b));
  RESET ROLE;
  UPDATE stories SET visibility = 'public' WHERE id = b;
  UPDATE stories SET deleted_at = now() WHERE id = a;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a deleted story disappears at once', NOT EXISTS (SELECT 1 FROM public.top_stories('week', false, 50) WHERE story_id = a));
  RESET ROLE;
  UPDATE stories SET deleted_at = NULL WHERE id = a;

  PERFORM pg_temp.reads(2, 100, 0, 0, 0);
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('new reads do not show before the next refresh',
    (SELECT reads FROM public.top_stories('day') WHERE story_id = b) = 1);
  RESET ROLE;
  PERFORM public.refresh_rankings();
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('and show after it', (SELECT reads FROM public.top_stories('day') WHERE story_id = b) = 101);
  RESET ROLE;

  -- 4. paging -----------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('positions are 1, 2, ... over the eligible stories',
    (SELECT array_agg(rank_position ORDER BY rank_position) FROM public.top_stories('month')) = ARRAY[1, 2, 3, 4]);
  PERFORM tests.ok('limit 1 offset 1 is the second story, at position 2',
    (SELECT story_id || ':' || rank_position FROM public.top_stories('month', false, 1, 1)) = (SELECT story_id || ':2' FROM public.top_stories('month') WHERE rank_position = 2));
  PERFORM tests.ok('an offset past the end is empty', NOT EXISTS (SELECT 1 FROM public.top_stories('month', false, 10, 4)));
  PERFORM tests.ok('limit is honoured', (SELECT count(*) FROM public.top_stories('month', false, 2, 0)) = 2);

  -- 5. input limits -------------------------------------------------------------------------------------------------------
  PERFORM tests.fails_with('NULL period', 'SELECT * FROM public.top_stories(NULL)', '22023');
  PERFORM tests.fails_with('unknown period', $q$SELECT * FROM public.top_stories('year')$q$, '22023');
  PERFORM tests.fails_with('limit 0', $q$SELECT * FROM public.top_stories('day', false, 0, 0)$q$, '22023');
  PERFORM tests.fails_with('limit 51', $q$SELECT * FROM public.top_stories('day', false, 51, 0)$q$, '22023');
  PERFORM tests.fails_with('NULL limit', $q$SELECT * FROM public.top_stories('day', false, NULL, 0)$q$, '22023');
  PERFORM tests.fails_with('negative offset', $q$SELECT * FROM public.top_stories('day', false, 10, -1)$q$, '22023');
  PERFORM tests.fails_with('offset 201', $q$SELECT * FROM public.top_stories('day', false, 10, 201)$q$, '22023');
  PERFORM tests.ok('limit 50 and offset 200 are accepted', (SELECT count(*) FROM public.top_stories('day', false, 50, 200)) >= 0);
  RESET ROLE;

  -- 6. access -----------------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(v1);
  PERFORM tests.ok('a signed-in user may read the ranking', (SELECT count(*) FROM public.top_stories('day')) = 2);
  RESET ROLE; PERFORM tests.act_as(v1);
  PERFORM tests.denied('the view itself is private', 'SELECT * FROM public.story_rankings');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('the view is private to anon too', 'SELECT * FROM public.story_rankings');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('the refresh state is private', 'SELECT * FROM public.ranking_state');
  RESET ROLE; PERFORM tests.act_as(v1);
  PERFORM tests.denied('users cannot refresh', 'SELECT public.refresh_rankings()');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot refresh', 'SELECT public.refresh_rankings()');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('service_role can refresh', public.refresh_rankings() >= 0);
  RESET ROLE;

  -- 7. freshness ----------------------------------------------------------------------------------------------------------------
  PERFORM public.refresh_rankings();
  PERFORM tests.act_as(NULL, 'anon');
  SELECT * INTO rec FROM public.ranking_freshness();
  PERFORM tests.ok('freshness: just refreshed, so the lag is a few seconds at most', rec.lag_seconds >= 0 AND rec.lag_seconds < 5);
  PERFORM tests.ok('freshness: the duration is recorded', rec.duration_ms >= 0);
  PERFORM tests.ok('freshness: the snapshot time is when the refresh began (it plus its duration is already over)',
    rec.refreshed_at + rec.duration_ms * interval '1 millisecond' <= clock_timestamp());
  RESET ROLE;
  PERFORM tests.ok('freshness: the row count is the view''s', rec.row_count = (SELECT count(*) FROM public.story_rankings));
  UPDATE ranking_state SET refreshed_at = now() - interval '2 minutes';
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('freshness: the lag grows with the age of the snapshot', (SELECT lag_seconds FROM public.ranking_freshness()) BETWEEN 119 AND 125);
  RESET ROLE;
END $$;

ROLLBACK;
