-- Author statistics (WP 6.5): who sees them, that the numbers are the counters of chapter_stats, the retention between
-- chapters, the daily series (window, zero fill, UTC days, hidden comments). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a5', 'as.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b5', 'as.coauthor@example.com'),
  ('00000000-0000-0000-0000-0000000000c5', 'as.editor@example.com'),
  ('00000000-0000-0000-0000-0000000000d5', 'as.stranger@example.com'),
  ('00000000-0000-0000-0000-0000000000e1', 'as.reader1@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'as.reader2@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'as.reader3@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('15000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'as-story', 'Audience', 'public', 'ongoing'),
  ('15000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d5', 'as-other', 'Someone else''s', 'public', 'ongoing'),
  ('15000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a5', 'as-private', 'Private', 'private', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('15000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b5', 'co_author'),
  ('15000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c5', 'editor');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('25000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'one', 1),
  ('25000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000001', 'two', 2),
  ('25000000-0000-0000-0000-000000000003', '15000000-0000-0000-0000-000000000001', 'three', 3),
  ('25000000-0000-0000-0000-000000000004', '15000000-0000-0000-0000-000000000001', 'draft', 4),
  ('25000000-0000-0000-0000-000000000005', '15000000-0000-0000-0000-000000000001', 'gone', 5),
  ('25000000-0000-0000-0000-000000000009', '15000000-0000-0000-0000-000000000002', 'other', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a5'; d constant uuid := '00000000-0000-0000-0000-0000000000d5';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by)
  SELECT ('25000000-0000-0000-0000-00000000000' || n)::uuid, 'Chương ' || n,
         format('[{"block_id":"35000000-0000-0000-0000-00000000000%s","type":"paragraph","text":"x"}]', n)::jsonb, a
    FROM generate_series(1, 3) n;
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('25000000-0000-0000-0000-000000000005', 'Gone', '[{"block_id":"35000000-0000-0000-0000-000000000005","type":"paragraph","text":"x"}]'::jsonb, a);
  PERFORM public.publish_chapter(('25000000-0000-0000-0000-00000000000' || n)::uuid) FROM generate_series(1, 3) n;
  PERFORM public.publish_chapter('25000000-0000-0000-0000-000000000005');
  UPDATE chapters SET deleted_at = now() WHERE id = '25000000-0000-0000-0000-000000000005';
  RESET ROLE; PERFORM tests.act_as(d);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('25000000-0000-0000-0000-000000000009', 'Other', '[{"block_id":"35000000-0000-0000-0000-000000000009","type":"paragraph","text":"x"}]'::jsonb, d);
  PERFORM public.publish_chapter('25000000-0000-0000-0000-000000000009');
END $$;

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000a5';
  co constant uuid := '00000000-0000-0000-0000-0000000000b5';
  ed constant uuid := '00000000-0000-0000-0000-0000000000c5';
  x constant uuid := '00000000-0000-0000-0000-0000000000d5';
  r1 constant uuid := '00000000-0000-0000-0000-0000000000e1';
  r2 constant uuid := '00000000-0000-0000-0000-0000000000e2';
  r3 constant uuid := '00000000-0000-0000-0000-0000000000e3';
  st constant uuid := '15000000-0000-0000-0000-000000000001';
  stx constant uuid := '15000000-0000-0000-0000-000000000002';
  stp constant uuid := '15000000-0000-0000-0000-000000000003';
  c1 constant uuid := '25000000-0000-0000-0000-000000000001';
  c2 constant uuid := '25000000-0000-0000-0000-000000000002';
  c3 constant uuid := '25000000-0000-0000-0000-000000000003';
  today date := (timezone('UTC', clock_timestamp()))::date;
  k1 constant uuid := 'f5000000-0000-4000-8000-000000000001';
  k2 constant uuid := 'f5000000-0000-4000-8000-000000000002';
  k3 constant uuid := 'f5000000-0000-4000-8000-000000000003';
BEGIN
  RESET ROLE;

  -- the audience: chapter one 4 readers (one of them 40 days ago), chapter two 3, chapter three 1 (so 75% then 33%: not symmetric)
  INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day) VALUES
    (c1, st, gen_random_uuid(), true, today), (c1, st, gen_random_uuid(), true, today),
    (c1, st, gen_random_uuid(), true, today - 5), (c1, st, gen_random_uuid(), true, today - 40),
    (c2, st, gen_random_uuid(), true, today), (c2, st, gen_random_uuid(), true, today - 5), (c2, st, gen_random_uuid(), true, today - 5),
    (c3, st, gen_random_uuid(), true, today - 5);
  PERFORM public.aggregate_reads();
  INSERT INTO chapter_votes (user_id, chapter_id, created_at) VALUES
    (r1, c1, now()), (r2, c1, now() - interval '2 days'), (r3, c1, now() - interval '45 days'), (r1, c2, now() - interval '2 days');
  PERFORM tests.act_as(r1);
  PERFORM public.post_comment(k1, c1, NULL, NULL, 'Hay quá');
  RESET ROLE; PERFORM tests.act_as(r2);
  PERFORM public.post_comment(k2, c1, NULL, NULL, 'Chờ chương sau');
  PERFORM public.post_comment(k3, c2, NULL, NULL, 'Cũ');
  RESET ROLE;
  UPDATE comments SET created_at = now() - interval '3 days' WHERE id = k2;
  UPDATE comments SET created_at = now() - interval '50 days' WHERE id = k3;

  -- 1. who sees what ----------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('anon has no privilege', NOT has_function_privilege('anon', 'public.author_chapter_stats(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.author_story_daily(uuid, integer)', 'EXECUTE'));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject', format('SELECT * FROM public.author_chapter_stats(%L)', st), '42501');
  PERFORM tests.fails_with('no subject (daily)', format('SELECT * FROM public.author_story_daily(%L)', st), '42501');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('a stranger gets not-found for a story they cannot manage', format('SELECT * FROM public.author_chapter_stats(%L)', st), 'PT404');
  PERFORM tests.fails_with('and for its daily series', format('SELECT * FROM public.author_story_daily(%L)', st), 'PT404');
  PERFORM tests.fails_with('and for a story that does not exist', format('SELECT * FROM public.author_chapter_stats(%L)', gen_random_uuid()), 'PT404');
  RESET ROLE; PERFORM tests.act_as(ed);
  PERFORM tests.fails_with('an editor does not see the audience', format('SELECT * FROM public.author_chapter_stats(%L)', st), '42501');
  PERFORM tests.fails_with('nor its daily series', format('SELECT * FROM public.author_story_daily(%L)', st), '42501');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('days below 1', format('SELECT * FROM public.author_story_daily(%L, 0)', st), '22023');
  PERFORM tests.fails_with('days above 90', format('SELECT * FROM public.author_story_daily(%L, 91)', st), '22023');
  PERFORM tests.fails_with('null days', format('SELECT * FROM public.author_story_daily(%L, NULL)', st), '22023');

  -- 2. per chapter: the counters, in reading order, with the retention -------------------------------------------------------
  PERFORM tests.ok('the owner sees three published chapters in order (no draft, no deleted one)',
    (SELECT array_agg(slug ORDER BY sort_order) = ARRAY['one', 'two', 'three'] FROM public.author_chapter_stats(st)));
  PERFORM tests.ok('titles come from the published version', (SELECT title = 'Chương 1' FROM public.author_chapter_stats(st) WHERE slug = 'one'));
  PERFORM tests.ok('reads, votes and comments are exactly the counters',
    (SELECT bool_and(a.reads = s.reads AND a.votes = s.votes AND a.comments = s.comments)
       FROM public.author_chapter_stats(st) a JOIN chapter_stats s ON s.chapter_id = a.chapter_id));
  PERFORM tests.ok('the figures themselves', (SELECT reads = 4 AND votes = 3 AND comments = 2 FROM public.author_chapter_stats(st) WHERE slug = 'one')
    AND (SELECT reads = 3 AND votes = 1 AND comments = 1 FROM public.author_chapter_stats(st) WHERE slug = 'two')
    AND (SELECT reads = 1 AND votes = 0 AND comments = 0 FROM public.author_chapter_stats(st) WHERE slug = 'three'));
  PERFORM tests.ok('retention: none for the first chapter, 3 of 4 carry on to two, 1 of 3 on to three',
    (SELECT retention IS NULL FROM public.author_chapter_stats(st) WHERE slug = 'one')
    AND (SELECT retention = 0.75 FROM public.author_chapter_stats(st) WHERE slug = 'two')
    AND (SELECT retention = 0.3333 FROM public.author_chapter_stats(st) WHERE slug = 'three'));
  RESET ROLE; PERFORM tests.act_as(co);
  PERFORM tests.ok('a co-author sees the same', (SELECT count(*) = 3 FROM public.author_chapter_stats(st)));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('a private story is fine for its owner', (SELECT count(*) = 0 FROM public.author_chapter_stats(stp)));
  PERFORM tests.ok('a story with no chapters has an empty table',
    (SELECT count(*) = 0 FROM public.author_chapter_stats(stp)));
  RESET ROLE;
  DELETE FROM chapter_stats WHERE chapter_id = c2;
  PERFORM tests.act_as(o);
  PERFORM tests.ok('a chapter without a counter row reads as zeros', (SELECT reads = 0 AND votes = 0 AND comments = 0 FROM public.author_chapter_stats(st) WHERE slug = 'two'));
  PERFORM tests.ok('and the chapter after a chapter with no reads has no retention', (SELECT retention IS NULL FROM public.author_chapter_stats(st) WHERE slug = 'three'));
  RESET ROLE;
  INSERT INTO chapter_stats (chapter_id, reads, votes, comments) VALUES (c2, 3, 1, 1);

  -- 3. over time --------------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM tests.ok('default: the last 30 days, today last, one row each',
    (SELECT count(*) = 30 AND min(day) = today - 29 AND max(day) = today FROM public.author_story_daily(st)));
  PERFORM tests.ok('days are consecutive', (SELECT count(DISTINCT day) = 30 FROM public.author_story_daily(st)));
  PERFORM tests.ok('reads per day: 3 today, 4 five days ago, nothing 40 days ago in a 30-day window',
    (SELECT reads = 3 FROM public.author_story_daily(st) WHERE day = today)
    AND (SELECT reads = 4 FROM public.author_story_daily(st) WHERE day = today - 5)
    AND (SELECT sum(reads) = 7 FROM public.author_story_daily(st)));
  PERFORM tests.ok('votes land on the day they were cast (UTC)',
    (SELECT votes = 1 FROM public.author_story_daily(st) WHERE day = today)
    AND (SELECT votes = 2 FROM public.author_story_daily(st) WHERE day = today - 2)
    AND (SELECT sum(votes) = 3 FROM public.author_story_daily(st)));
  PERFORM tests.ok('comments land on the day they were written',
    (SELECT comments = 1 FROM public.author_story_daily(st) WHERE day = today)
    AND (SELECT comments = 1 FROM public.author_story_daily(st) WHERE day = today - 3)
    AND (SELECT sum(comments) = 2 FROM public.author_story_daily(st)));
  PERFORM tests.ok('quiet days are zeros, not missing',
    (SELECT reads = 0 AND votes = 0 AND comments = 0 FROM public.author_story_daily(st) WHERE day = today - 10));
  PERFORM tests.ok('one day is today only', (SELECT count(*) = 1 AND min(day) = today AND min(reads) = 3 FROM public.author_story_daily(st, 1)));
  PERFORM tests.ok('90 days reach the old events too',
    (SELECT count(*) = 90 AND sum(reads) = 8 AND sum(votes) = 4 AND sum(comments) = 3 FROM public.author_story_daily(st, 90)));
  PERFORM tests.ok('over the whole window the series equals the counters of the story''s chapters (reads, votes, comments)',
    (SELECT sum(reads) = (SELECT sum(reads) FROM chapter_stats WHERE chapter_id IN (c1, c2, c3))
        AND sum(votes) = (SELECT sum(votes) FROM chapter_stats WHERE chapter_id IN (c1, c2, c3))
        AND sum(comments) = (SELECT sum(comments) FROM chapter_stats WHERE chapter_id IN (c1, c2, c3))
       FROM public.author_story_daily(st, 90)));
  PERFORM tests.ok('another story''s activity is never counted', (SELECT sum(reads) + sum(votes) + sum(comments) = 0 FROM public.author_story_daily(stp, 90)));

  -- 4. what stops counting stops showing --------------------------------------------------------------------------------------
  RESET ROLE;
  UPDATE comments SET status = 'hidden' WHERE id = k1;
  DELETE FROM chapter_votes WHERE user_id = r1 AND chapter_id = c1;
  PERFORM tests.act_as(o);
  PERFORM tests.ok('a hidden comment and a withdrawn vote leave the series, as they leave the counters',
    (SELECT sum(comments) = 2 AND sum(votes) = 3 FROM public.author_story_daily(st, 90))
    AND (SELECT comments = 1 FROM public.author_chapter_stats(st) WHERE slug = 'one')
    AND (SELECT votes = 2 FROM public.author_chapter_stats(st) WHERE slug = 'one'));
  RESET ROLE; PERFORM tests.act_as(co);
  PERFORM tests.ok('the co-author reads the same series', (SELECT sum(reads) = 8 FROM public.author_story_daily(st, 90)));
  RESET ROLE;

  -- 5. cost: the story's events are found through the index, not by scanning the table -------------------------------------------------
  PERFORM tests.ok('the day index exists on the event table',
    EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'chapter_read_events' AND indexname = 'idx_chapter_read_events_story_day'));
END $$;

ROLLBACK;
