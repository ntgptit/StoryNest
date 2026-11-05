-- Audience insights of batch 4 (insights4): the date-range series, weekly reader cohorts, the signed-in / anonymous
-- split, the comment terms and the read sources. Who may call them, the error codes, the figures, and that nothing
-- identifying leaves the functions (no reader id, no comment text, small groups suppressed). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000004a1', 'ai.owner@example.com'),
  ('00000000-0000-0000-0000-0000000004a2', 'ai.coauthor@example.com'),
  ('00000000-0000-0000-0000-0000000004a3', 'ai.editor@example.com'),
  ('00000000-0000-0000-0000-0000000004a4', 'ai.stranger@example.com'),
  ('00000000-0000-0000-0000-0000000004b1', 'ai.reader1@example.com'),
  ('00000000-0000-0000-0000-0000000004b2', 'ai.reader2@example.com'),
  ('00000000-0000-0000-0000-0000000004b3', 'ai.reader3@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('14500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004a1', 'ai-story', 'Insights', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('14500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004a2', 'co_author'),
  ('14500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004a3', 'editor');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('24500000-0000-0000-0000-000000000001', '14500000-0000-0000-0000-000000000001', 'one', 1),
  ('24500000-0000-0000-0000-000000000002', '14500000-0000-0000-0000-000000000001', 'two', 2);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000004a1';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by)
  SELECT ('24500000-0000-0000-0000-00000000000' || n)::uuid, 'Chương ' || n,
         format('[{"block_id":"34500000-0000-0000-0000-00000000000%s","type":"paragraph","text":"x"}]', n)::jsonb, a
    FROM generate_series(1, 2) n;
  PERFORM public.publish_chapter(('24500000-0000-0000-0000-00000000000' || n)::uuid) FROM generate_series(1, 2) n;
END $$;

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000004a1';
  co constant uuid := '00000000-0000-0000-0000-0000000004a2';
  ed constant uuid := '00000000-0000-0000-0000-0000000004a3';
  x constant uuid := '00000000-0000-0000-0000-0000000004a4';
  r1 constant uuid := '00000000-0000-0000-0000-0000000004b1';
  r2 constant uuid := '00000000-0000-0000-0000-0000000004b2';
  r3 constant uuid := '00000000-0000-0000-0000-0000000004b3';
  st constant uuid := '14500000-0000-0000-0000-000000000001';
  c1 constant uuid := '24500000-0000-0000-0000-000000000001';
  c2 constant uuid := '24500000-0000-0000-0000-000000000002';
  today date := (timezone('UTC', clock_timestamp()))::date;
  this_week date := date_trunc('week', timezone('UTC', clock_timestamp()))::date;
  fn text;
  r record;
BEGIN
  RESET ROLE;
  -- 1. who may call what -------------------------------------------------------------------------------------------------
  FOREACH fn IN ARRAY ARRAY['public.author_story_daily_range(uuid, date, date)', 'public.author_reader_cohorts(uuid, integer)',
                            'public.author_reader_split(uuid, integer)', 'public.author_comment_terms(uuid, integer, integer)',
                            'public.author_read_sources(uuid, integer)'] LOOP
    PERFORM tests.ok('anon has no privilege on ' || fn, NOT has_function_privilege('anon', fn, 'EXECUTE'));
    PERFORM tests.ok('authenticated may call ' || fn, has_function_privilege('authenticated', fn, 'EXECUTE'));
  END LOOP;
  PERFORM tests.ok('the gate and the tokeniser are not callable by API roles',
    NOT has_function_privilege('authenticated', 'private.story_audience_gate(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.comment_tokens(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.comment_tokens(text)', 'EXECUTE'));
  PERFORM tests.ok('stopwords are not readable by API roles',
    NOT has_table_privilege('anon', 'public.term_stopwords', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.term_stopwords', 'SELECT'));

  PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject: range', format('SELECT * FROM public.author_story_daily_range(%L, %L, %L)', st, today - 1, today), '42501');
  PERFORM tests.fails_with('no subject: cohorts', format('SELECT * FROM public.author_reader_cohorts(%L)', st), '42501');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('stranger: range is not found', format('SELECT * FROM public.author_story_daily_range(%L, %L, %L)', st, today - 1, today), 'PT404');
  PERFORM tests.fails_with('stranger: cohorts', format('SELECT * FROM public.author_reader_cohorts(%L)', st), 'PT404');
  PERFORM tests.fails_with('stranger: split', format('SELECT * FROM public.author_reader_split(%L)', st), 'PT404');
  PERFORM tests.fails_with('stranger: terms', format('SELECT * FROM public.author_comment_terms(%L)', st), 'PT404');
  PERFORM tests.fails_with('stranger: sources', format('SELECT * FROM public.author_read_sources(%L)', st), 'PT404');
  PERFORM tests.fails_with('a story that does not exist', format('SELECT * FROM public.author_reader_split(%L)', gen_random_uuid()), 'PT404');
  RESET ROLE; PERFORM tests.act_as(ed);
  PERFORM tests.fails_with('an editor: range', format('SELECT * FROM public.author_story_daily_range(%L, %L, %L)', st, today - 1, today), '42501');
  PERFORM tests.fails_with('an editor: cohorts', format('SELECT * FROM public.author_reader_cohorts(%L)', st), '42501');
  PERFORM tests.fails_with('an editor: split', format('SELECT * FROM public.author_reader_split(%L)', st), '42501');
  PERFORM tests.fails_with('an editor: terms', format('SELECT * FROM public.author_comment_terms(%L)', st), '42501');
  PERFORM tests.fails_with('an editor: sources', format('SELECT * FROM public.author_read_sources(%L)', st), '42501');
  RESET ROLE; PERFORM tests.act_as(r1);
  PERFORM tests.fails_with('a reader of the public story has no role on it: not found, like a stranger', format('SELECT * FROM public.author_reader_split(%L)', st), 'PT404');

  -- 2. invalid arguments --------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('range: from after to', format('SELECT * FROM public.author_story_daily_range(%L, %L, %L)', st, today, today - 1), '22023');
  PERFORM tests.fails_with('range: null from', format('SELECT * FROM public.author_story_daily_range(%L, NULL, %L)', st, today), '22023');
  PERFORM tests.fails_with('range: in the future', format('SELECT * FROM public.author_story_daily_range(%L, %L, %L)', st, today, today + 1), '22023');
  PERFORM tests.fails_with('range: older than 90 days', format('SELECT * FROM public.author_story_daily_range(%L, %L, %L)', st, today - 90, today), '22023');
  PERFORM tests.fails_with('cohorts: 0 weeks', format('SELECT * FROM public.author_reader_cohorts(%L, 0)', st), '22023');
  PERFORM tests.fails_with('cohorts: 13 weeks', format('SELECT * FROM public.author_reader_cohorts(%L, 13)', st), '22023');
  PERFORM tests.fails_with('split: 91 days', format('SELECT * FROM public.author_reader_split(%L, 91)', st), '22023');
  PERFORM tests.fails_with('terms: 13 months', format('SELECT * FROM public.author_comment_terms(%L, 13)', st), '22023');
  PERFORM tests.fails_with('terms: limit 51', format('SELECT * FROM public.author_comment_terms(%L, 3, 51)', st), '22023');
  PERFORM tests.fails_with('sources: 0 days', format('SELECT * FROM public.author_read_sources(%L, 0)', st), '22023');

  -- 3. the audience: six readers started two weeks ago (2 signed in), three last week, two this week -------------------
  RESET ROLE;
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source)
  SELECT c1, st, ('a4500000-0000-4000-8000-00000000000' || n)::uuid, n > 2, this_week - 14, 'search'
    FROM generate_series(1, 6) n;
  -- four of the six come back last week (chapter two), two of them again this week
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source)
  SELECT c2, st, ('a4500000-0000-4000-8000-00000000000' || n)::uuid, n > 2, this_week - 7, 'next_chapter'
    FROM generate_series(1, 4) n;
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source)
  SELECT c1, st, ('a4500000-0000-4000-8000-00000000000' || n)::uuid, n > 2, this_week, NULL
    FROM generate_series(1, 2) n;
  -- three new readers last week, two new this week (too few to show)
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source)
  SELECT c1, st, ('b4500000-0000-4000-8000-00000000000' || n)::uuid, true, this_week - 7, 'discover'
    FROM generate_series(1, 3) n;
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source)
  SELECT c1, st, ('c4500000-0000-4000-8000-00000000000' || n)::uuid, true, this_week, 'discover'
    FROM generate_series(1, 2) n;

  PERFORM tests.act_as(o);
  -- 3a. range
  PERFORM tests.ok('range: one zero-filled row per day, oldest first',
    (SELECT count(*) = 8 AND min(day) = today - 7 AND max(day) = today FROM public.author_story_daily_range(st, today - 7, today)));
  PERFORM tests.ok('range: a single day', (SELECT count(*) = 1 FROM public.author_story_daily_range(st, today, today)));
  PERFORM tests.ok('range: the whole 90 days is allowed', (SELECT count(*) = 90 FROM public.author_story_daily_range(st, today - 89, today)));
  PERFORM tests.ok('range: agrees with author_story_daily over the same days',
    (SELECT array_agg(reads ORDER BY day) FROM public.author_story_daily_range(st, today - 29, today))
      = (SELECT array_agg(reads ORDER BY day) FROM public.author_story_daily(st, 30)));
  PERFORM tests.ok('range: reads outside the range are not counted',
    (SELECT coalesce(sum(reads), 0) = 0 FROM public.author_story_daily_range(st, this_week - 13, this_week - 8)));

  -- 3b. cohorts
  PERFORM tests.ok('cohorts: three weeks, cells only from the cohort week on',
    (SELECT count(*) = 6 FROM public.author_reader_cohorts(st, 3)));
  PERFORM tests.ok('cohorts: the first cohort has 6 readers, 4 back a week later, 2 this week',
    (SELECT array_agg(active_readers ORDER BY week_offset) = ARRAY[6, 4, 2]::bigint[] AND bool_and(cohort_size = 6)
       FROM public.author_reader_cohorts(st, 3) WHERE cohort_week = this_week - 14));
  PERFORM tests.ok('cohorts: a cohort of 3 is suppressed (no counts)',
    (SELECT bool_and(suppressed AND cohort_size IS NULL AND active_readers IS NULL)
       FROM public.author_reader_cohorts(st, 3) WHERE cohort_week = this_week - 7));
  PERFORM tests.ok('cohorts: so is a cohort of 2',
    (SELECT suppressed FROM public.author_reader_cohorts(st, 3) WHERE cohort_week = this_week));
  PERFORM tests.ok('cohorts: a reader who read before the window is not new inside it (else last week would be 7)',
    (SELECT suppressed FROM public.author_reader_cohorts(st, 2) WHERE cohort_week = this_week - 7 AND week_offset = 0));
  PERFORM tests.ok('cohorts: a week nobody started in is a cohort of 0, not suppressed',
    (SELECT bool_and(cohort_size = 0 AND active_readers = 0 AND NOT suppressed) AND count(*) = 4
       FROM public.author_reader_cohorts(st, 4) WHERE cohort_week = this_week - 21));
  PERFORM tests.ok('cohorts: weeks start on Monday', (SELECT bool_and(extract(isodow FROM cohort_week) = 1) FROM public.author_reader_cohorts(st, 12)));

  -- 3c. split
  PERFORM tests.ok('split: signed-in and anonymous reads and readers',
    (SELECT signed_in_reads = 6 AND anonymous_reads = 11 AND signed_in_readers = 2 AND anonymous_readers = 9
       FROM public.author_reader_split(st, 30)));
  PERFORM tests.ok('split: the two parts add up to the daily reads',
    (SELECT signed_in_reads + anonymous_reads FROM public.author_reader_split(st, 30))
      = (SELECT sum(reads) FROM public.author_story_daily(st, 30)));

  -- 3d. sources: first read of each reader in the window decides
  PERFORM tests.ok('sources: search 6 readers, 4 of them read two chapters',
    (SELECT readers = 6 AND continued = 4 AND NOT suppressed FROM public.author_read_sources(st, 30) WHERE source = 'search'));
  PERFORM tests.ok('sources: discover has 5 readers, none continued',
    (SELECT readers = 5 AND continued = 0 FROM public.author_read_sources(st, 30) WHERE source = 'discover'));
  RESET ROLE;
  INSERT INTO story_follows (user_id, story_id) VALUES (r1, st);
  PERFORM tests.act_as(o);
  PERFORM tests.ok('sources: followed counts only signed-in readers who follow (none here: reader ids are not accounts)',
    (SELECT followed = 0 FROM public.author_read_sources(st, 30) WHERE source = 'search'));
  RESET ROLE;
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source)
  VALUES (c1, st, r1, false, today, 'notification');
  PERFORM tests.act_as(o);
  PERFORM tests.ok('sources: a source with 1 reader is suppressed, counts hidden',
    (SELECT suppressed AND readers IS NULL AND continued IS NULL AND followed IS NULL
       FROM public.author_read_sources(st, 30) WHERE source = 'notification'));
  PERFORM tests.ok('sources: suppressed rows come last', (SELECT bool_and(NOT suppressed) FROM (
      SELECT suppressed FROM public.author_read_sources(st, 30) LIMIT 2) q));
  RESET ROLE; PERFORM tests.act_as(co);
  PERFORM tests.ok('a co-author sees the sources and the split',
    (SELECT count(*) >= 2 FROM public.author_read_sources(st, 30)) AND (SELECT count(*) = 1 FROM public.author_reader_split(st)));

  -- 3e. no reader id in any result
  RESET ROLE;
  PERFORM tests.ok('no function of the batch returns a uuid column other than nothing',
    NOT EXISTS (SELECT 1 FROM pg_proc p, unnest(p.proallargtypes, p.proargmodes) AS a(t, m)
                 WHERE p.proname IN ('author_reader_cohorts', 'author_reader_split', 'author_comment_terms', 'author_read_sources')
                   AND a.m = 't' AND a.t = 'uuid'::regtype));

  -- 4. comment terms ------------------------------------------------------------------------------------------------------
  PERFORM tests.ok('tokens: lower-cased, split on punctuation and digits, stopwords and 1-letter pieces dropped',
    (SELECT array_agg(t ORDER BY t) FROM public.comment_tokens('The PLOT twist, and 2 twists!! Truyện hay quá... a') t)
      = ARRAY['hay', 'plot', 'truyện', 'twist', 'twists']);
  PERFORM tests.ok('tokens: links fall apart into stopwords', NOT EXISTS (
    SELECT 1 FROM public.comment_tokens('https://www.example.com') t WHERE t IN ('https', 'www', 'com')));

  PERFORM tests.act_as(r1);
  PERFORM public.post_comment('d4500000-0000-4000-8000-000000000001', c1, NULL, NULL, 'Plot twist hay quá, plot!');
  PERFORM public.post_comment('d4500000-0000-4000-8000-000000000002', c2, NULL, NULL, 'Secretword only mine');
  RESET ROLE; PERFORM tests.act_as(r2);
  PERFORM public.post_comment('d4500000-0000-4000-8000-000000000003', c1, NULL, NULL, 'What a plot. Hay!');
  PERFORM public.post_comment('d4500000-0000-4000-8000-000000000004', c2, NULL, NULL, 'Plot plot plot');
  RESET ROLE; PERFORM tests.act_as(r3);
  PERFORM public.post_comment('d4500000-0000-4000-8000-000000000005', c1, NULL, NULL, 'Plot again, secretword');
  PERFORM public.post_comment('d4500000-0000-4000-8000-000000000006', c1, NULL, NULL, 'Amazing plot');
  RESET ROLE;
  UPDATE comments SET status = 'hidden' WHERE id = 'd4500000-0000-4000-8000-000000000005';
  -- one comment of r2 two months ago
  UPDATE comments SET created_at = date_trunc('month', now()) - interval '40 days'
   WHERE id = 'd4500000-0000-4000-8000-000000000004';

  PERFORM tests.act_as(o);
  PERFORM tests.ok('terms: plot is in 3 comments by 3 people this month (repeats in one comment, hidden and old ones left out)',
    (SELECT mentions = 3 AND commenters = 3 AND rank_position = 1 FROM public.author_comment_terms(st, 1)
      WHERE term = 'plot'));
  PERFORM tests.ok('terms: hay comes second, twist is one person''s word', (SELECT array_agg(term ORDER BY rank_position) = ARRAY['plot', 'hay']
       FROM public.author_comment_terms(st, 1)));
  PERFORM tests.ok('terms: a word only one person wrote never shows (and a hidden comment does not lend a second author)',
    NOT EXISTS (SELECT 1 FROM public.author_comment_terms(st, 12) WHERE term IN ('secretword', 'twist', 'mine')));
  PERFORM tests.ok('terms: the old comment is in its own month, alone, so it shows nothing there',
    NOT EXISTS (SELECT 1 FROM public.author_comment_terms(st, 3) WHERE month < date_trunc('month', today)::date));
  PERFORM tests.ok('terms: limit', (SELECT count(*) = 1 FROM public.author_comment_terms(st, 1, 1)));
  PERFORM tests.ok('terms: no column carries comment text or ids',
    (SELECT array_agg(a ORDER BY a) FROM unnest((SELECT proargnames FROM pg_proc WHERE proname = 'author_comment_terms')) a)
      = ARRAY['commenters', 'mentions', 'month', 'p_limit', 'p_months', 'p_story_id', 'rank_position', 'term']);
END $$;

ROLLBACK;
