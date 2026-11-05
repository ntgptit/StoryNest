-- Trending searches (insights4): the log keeps no searcher, counts one search per searcher, term and day, only for
-- terms that find something public, is rate limited, and the public list needs three searchers and shows rank changes.
-- Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000004d1', 'ts.author@example.com'),
  ('00000000-0000-0000-0000-0000000004d2', 'ts.reader@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('14700000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004d1', 'ts-dragon', 'Rồng Lửa', 'public', 'ongoing'),
  ('14700000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000004d1', 'ts-secret', 'Hidden Garden', 'private', 'ongoing');

DO $$
DECLARE
  u constant uuid := '00000000-0000-0000-0000-0000000004d2';
  today date := (timezone('UTC', clock_timestamp()))::date;
  t text;
  i integer;
BEGIN
  RESET ROLE;
  -- 1. privileges -------------------------------------------------------------------------------------------------------
  FOREACH t IN ARRAY ARRAY['public.search_term_daily', 'public.search_log_seen', 'public.search_log_quota', 'public.search_term_blocklist'] LOOP
    PERFORM tests.ok(t || ' is closed to API roles',
      NOT has_table_privilege('anon', t, 'SELECT') AND NOT has_table_privilege('authenticated', t, 'SELECT')
      AND NOT has_table_privilege('authenticated', t, 'INSERT') AND NOT has_table_privilege('anon', t, 'INSERT'));
  END LOOP;
  PERFORM tests.ok('anyone may log and read the trend; only the service role purges',
    has_function_privilege('anon', 'public.log_search(text, uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.trending_searches(integer)', 'EXECUTE')
    AND has_function_privilege('anon', 'public.trending_searches(integer)', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.purge_search_log()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.purge_search_log()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.purge_search_log()', 'EXECUTE'));
  PERFORM tests.ok('no table of the log has a uuid column (no user id, no anonymous id)',
    NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND data_type = 'uuid'
                   AND table_name IN ('search_term_daily', 'search_log_seen', 'search_log_quota', 'search_term_blocklist')));

  -- 2. what gets counted --------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.fails_with('a guest without an anonymous id', 'SELECT public.log_search(''rong lua'')', '22023');
  PERFORM tests.fails_with('too short', format('SELECT public.log_search(%L, %L)', 'ro', gen_random_uuid()), '22023');
  PERFORM tests.fails_with('trend limit 0', 'SELECT * FROM public.trending_searches(0)', '22023');
  PERFORM tests.fails_with('trend limit 21', 'SELECT * FROM public.trending_searches(21)', '22023');
  PERFORM tests.ok('a guest search of a public title is counted', public.log_search('  Rong   LUA ', 'e4700000-0000-4000-8000-000000000001'));
  PERFORM tests.ok('the same guest again today counts nothing', NOT public.log_search('rong lua', 'e4700000-0000-4000-8000-000000000001'));
  PERFORM tests.ok('a term that finds nothing public is not logged (private title)',
    NOT public.log_search('hidden garden', 'e4700000-0000-4000-8000-000000000001'));
  PERFORM tests.ok('nor random text', NOT public.log_search('0901234567', 'e4700000-0000-4000-8000-000000000001'));
  RESET ROLE; PERFORM tests.act_as(u);
  PERFORM tests.ok('a signed-in search is counted by account (the anonymous id is ignored)',
    public.log_search('rong', 'e4700000-0000-4000-8000-000000000001'));
  PERFORM tests.ok('and once per day per account', NOT public.log_search('rong', gen_random_uuid()));
  RESET ROLE;
  PERFORM tests.ok('the log holds normalised terms and counts only',
    (SELECT array_agg(term || ':' || searchers ORDER BY term) = ARRAY['rong:1', 'rong lua:1'] FROM search_term_daily));
  PERFORM tests.ok('no stored key equals the searcher id in any form',
    NOT EXISTS (SELECT 1 FROM search_log_seen WHERE encode(key, 'escape') LIKE '%e4700000%')
    AND NOT EXISTS (SELECT 1 FROM search_log_quota WHERE encode(key, 'escape') LIKE '%e4700000%'));

  -- 3. rate limit -----------------------------------------------------------------------------------------------------------
  UPDATE abuse_limits SET max_value = 3 WHERE code = 'search_log_rate_hour';
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM public.log_search('rong lua', 'e4700000-0000-4000-8000-000000000009');
  PERFORM public.log_search('rong lua', 'e4700000-0000-4000-8000-000000000009');
  PERFORM public.log_search('nothing here at all', 'e4700000-0000-4000-8000-000000000009');
  PERFORM tests.fails_with('the fourth call in an hour is refused, repeats and misses included',
    format('SELECT public.log_search(%L, %L)', 'rong lua', 'e4700000-0000-4000-8000-000000000009'), 'PT429');
  PERFORM tests.ok('another searcher is not affected', public.log_search('rong lua', 'e4700000-0000-4000-8000-000000000010'));
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 30 WHERE code = 'search_log_rate_hour';

  -- 4. the public list ------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('rong lua has 3 searchers now and is listed; rong (1) is not',
    (SELECT array_agg(term ORDER BY rank_position) = ARRAY['rong lua'] FROM public.trending_searches()));
  RESET ROLE;
  -- the week before: "lua" led, "rong lua" was second; this week "lua" has 4 searchers -> rong lua 2nd... set it up
  DELETE FROM search_term_daily;
  INSERT INTO search_term_daily (term, day, searchers) VALUES
    ('lua', today - 8, 9), ('rong lua', today - 9, 5), ('rong', today - 10, 2),
    ('rong lua', today, 6), ('rong lua', today - 2, 4), ('lua', today - 1, 4), ('rong', today, 3), ('kiem', today - 6, 3),
    ('old', today - 20, 50), ('rare', today, 2);
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('ranked by searchers over the last 7 days, ties by term',
    (SELECT array_agg(term ORDER BY rank_position) = ARRAY['rong lua', 'lua', 'kiem', 'rong'] FROM public.trending_searches()));
  PERFORM tests.ok('rank change against the 7 days before: rong lua climbed one, lua fell one',
    (SELECT previous_rank = 2 AND rank_change = 1 FROM public.trending_searches() WHERE term = 'rong lua')
    AND (SELECT previous_rank = 1 AND rank_change = -1 FROM public.trending_searches() WHERE term = 'lua'));
  PERFORM tests.ok('a term with too few searchers the week before counts as new',
    (SELECT previous_rank IS NULL AND rank_change IS NULL FROM public.trending_searches() WHERE term = 'rong')
    AND (SELECT previous_rank IS NULL FROM public.trending_searches() WHERE term = 'kiem'));
  PERFORM tests.ok('limit', (SELECT count(*) = 2 FROM public.trending_searches(2)));
  PERFORM tests.ok('the result has no searcher column',
    (SELECT array_agg(a ORDER BY a) FROM unnest((SELECT proargnames FROM pg_proc WHERE proname = 'trending_searches')) a)
      = ARRAY['p_limit', 'previous_rank', 'rank_change', 'rank_position', 'searchers', 'term']);
  RESET ROLE;
  INSERT INTO search_term_blocklist (term) VALUES ('lua');
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a blocklisted term is never listed', NOT EXISTS (SELECT 1 FROM public.trending_searches() WHERE term = 'lua'));

  -- 5. purge -------------------------------------------------------------------------------------------------------------------
  RESET ROLE;
  INSERT INTO search_log_seen (key, day) VALUES ('\x01', today - 3);
  INSERT INTO search_log_quota (key, window_start, used) VALUES ('\x02', now() - interval '5 hours', 3);
  INSERT INTO search_term_daily (term, day, searchers) VALUES ('ancient', today - 70, 9);
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('purge removes old keys, windows and counts', public.purge_search_log() >= 3);
  RESET ROLE;
  PERFORM tests.ok('and keeps the recent ones',
    NOT EXISTS (SELECT 1 FROM search_log_seen WHERE day < today - 1)
    AND NOT EXISTS (SELECT 1 FROM search_term_daily WHERE term = 'ancient')
    AND EXISTS (SELECT 1 FROM search_term_daily WHERE term = 'old')
    AND EXISTS (SELECT 1 FROM search_log_quota));
END $$;

ROLLBACK;
