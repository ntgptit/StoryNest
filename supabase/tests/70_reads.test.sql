-- Chapter read dedupe and aggregation tests. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a7', 'reads.author@example.com'),
  ('00000000-0000-0000-0000-0000000000b7', 'reads.reader@example.com'),
  ('00000000-0000-0000-0000-0000000000c7', 'reads.other@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('17000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a7', 'reads-story', 'Reads', 'public', 'draft'),
  ('17000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a7', 'reads-private', 'Private', 'private', 'draft');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('27000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', 'one', 1),
  ('27000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000001', 'two', 2),
  ('27000000-0000-0000-0000-000000000003', '17000000-0000-0000-0000-000000000001', 'unpublished', 3),
  ('27000000-0000-0000-0000-000000000009', '17000000-0000-0000-0000-000000000002', 'secret', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a7';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('27000000-0000-0000-0000-000000000001', 'One', '[{"block_id":"37000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a),
    ('27000000-0000-0000-0000-000000000002', 'Two', '[{"block_id":"37000000-0000-0000-0000-000000000002","type":"paragraph","text":"b"}]'::jsonb, a),
    ('27000000-0000-0000-0000-000000000009', 'Secret', '[{"block_id":"37000000-0000-0000-0000-000000000009","type":"paragraph","text":"c"}]'::jsonb, a);
  PERFORM public.publish_chapter('27000000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('27000000-0000-0000-0000-000000000002');
  PERFORM public.publish_chapter('27000000-0000-0000-0000-000000000009');
END $$;

DO $$
DECLARE
  r constant uuid := '00000000-0000-0000-0000-0000000000b7';
  o constant uuid := '00000000-0000-0000-0000-0000000000c7';
  g1 constant uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  g2 constant uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  ch1 constant uuid := '27000000-0000-0000-0000-000000000001';
  ch2 constant uuid := '27000000-0000-0000-0000-000000000002';
  st constant uuid := '17000000-0000-0000-0000-000000000001';
  n integer;
BEGIN
  RESET ROLE;
  -- the events table is not reachable by API roles at all -------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM tests.denied('authenticated cannot read events', 'SELECT 1 FROM chapter_read_events');
  PERFORM tests.denied('authenticated cannot insert events', format('INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day) VALUES (%L, %L, %L, false, current_date)', ch1, st, r));
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot read events', 'SELECT 1 FROM chapter_read_events');
  PERFORM tests.denied('anon cannot aggregate', 'SELECT public.aggregate_reads()');
  PERFORM tests.denied('anon cannot purge', 'SELECT public.purge_read_events()');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.denied('authenticated cannot aggregate', 'SELECT public.aggregate_reads()');

  -- argument validation ------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.fails_with('guest without anon id', format('SELECT public.record_chapter_read(%L)', ch1), '22023');
  PERFORM tests.fails_with('unknown chapter', format('SELECT public.record_chapter_read(%L, %L)', gen_random_uuid(), g1), 'PT404');
  PERFORM tests.fails_with('unpublished chapter', format('SELECT public.record_chapter_read(%L, %L)', '27000000-0000-0000-0000-000000000003', g1), 'PT404');
  PERFORM tests.fails_with('private story chapter', format('SELECT public.record_chapter_read(%L, %L)', '27000000-0000-0000-0000-000000000009', g1), 'PT404');

  -- dedupe: same reader, chapter and day counts once ----------------------------------------------------
  PERFORM tests.ok('guest first read counts', public.record_chapter_read(ch1, g1));
  PERFORM tests.ok('guest refresh does not count', NOT public.record_chapter_read(ch1, g1));
  PERFORM tests.ok('guest other chapter counts', public.record_chapter_read(ch2, g1));
  PERFORM tests.ok('other guest counts', public.record_chapter_read(ch1, g2));
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('signed-in first read counts', public.record_chapter_read(ch1));
  PERFORM tests.ok('signed-in refresh does not count', NOT public.record_chapter_read(ch1));
  PERFORM tests.ok('the anonymous id is ignored when signed in (same user, same day)', NOT public.record_chapter_read(ch1, 'aaaaaaaa-0000-4000-8000-0000000000ff'));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('another user counts', public.record_chapter_read(ch1));

  RESET ROLE;
  PERFORM tests.ok('5 events stored: 3 guests/readers on ch1 + others', (SELECT count(*) = 5 FROM chapter_read_events));
  PERFORM tests.ok('anonymous flag follows the caller', (SELECT count(*) = 3 FROM chapter_read_events WHERE is_anonymous));

  -- nothing touches the counters before the job runs -----------------------------------------------------
  PERFORM tests.ok('counters untouched by recording', (SELECT reads = 0 FROM chapter_stats WHERE chapter_id = ch1));

  -- a new UTC day is a new read ---------------------------------------------------------------------------
  UPDATE chapter_read_events SET read_day = read_day - 1 WHERE reader_id = g2;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('same guest the next day counts again', public.record_chapter_read(ch1, g2));
  RESET ROLE;

  -- aggregation ----------------------------------------------------------------------------------------------
  n := public.aggregate_reads();
  PERFORM tests.ok('first run folds all 6 events', n = 6);
  PERFORM tests.ok('chapter counters', (SELECT reads = 5 FROM chapter_stats WHERE chapter_id = ch1) AND (SELECT reads = 1 FROM chapter_stats WHERE chapter_id = ch2));
  PERFORM tests.ok('story counter is the sum', (SELECT reads = 6 FROM story_stats WHERE story_id = st));
  PERFORM tests.ok('a second run adds nothing', public.aggregate_reads() = 0);
  PERFORM tests.ok('and the counter is unchanged', (SELECT reads = 6 FROM story_stats WHERE story_id = st));

  -- batches ----------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM public.record_chapter_read(ch1, 'aaaaaaaa-0000-4000-8000-000000000003');
  PERFORM public.record_chapter_read(ch1, 'aaaaaaaa-0000-4000-8000-000000000004');
  PERFORM public.record_chapter_read(ch1, 'aaaaaaaa-0000-4000-8000-000000000005');
  RESET ROLE;
  PERFORM tests.ok('limit 2 takes 2', public.aggregate_reads(2) = 2);
  PERFORM tests.ok('the rest follows', public.aggregate_reads(2) = 1);
  -- (a separate statement: a subquery in the same statement as the call would not see the call's writes)
  PERFORM tests.ok('all three folded in', (SELECT reads = 9 FROM story_stats WHERE story_id = st));

  -- purge keeps pending events and recent ones -------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM public.record_chapter_read(ch2, 'aaaaaaaa-0000-4000-8000-000000000006');   -- stays pending
  RESET ROLE;
  PERFORM tests.ok('nothing old enough yet', public.purge_read_events() = 0);
  UPDATE chapter_read_events SET aggregated_at = now() - interval '100 days' WHERE aggregated_at IS NOT NULL AND reader_id = g1;
  PERFORM tests.ok('old aggregated events are purged (2 of g1)', public.purge_read_events() = 2);
  PERFORM tests.ok('pending event survived', (SELECT count(*) = 1 FROM chapter_read_events WHERE aggregated_at IS NULL));
  PERFORM tests.ok('counters unaffected by the purge', (SELECT reads = 9 FROM story_stats WHERE story_id = st));
  UPDATE chapter_read_events SET created_at = now() - interval '200 days' WHERE aggregated_at IS NULL;
  PERFORM tests.ok('a pending event is never purged, however old', public.purge_read_events() = 0);
END $$;

ROLLBACK;
