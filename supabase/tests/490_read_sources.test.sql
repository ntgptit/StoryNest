-- Read sources (insights4): record_chapter_read takes an optional coarse source and counts exactly as before (same
-- dedupe, same errors, same return value, same counters); an unknown source never loses a read. Rolled back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000004f1', 'rs.author@example.com'),
  ('00000000-0000-0000-0000-0000000004f2', 'rs.reader@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('14900000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004f1', 'rs-story', 'Sources', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('24900000-0000-0000-0000-000000000001', '14900000-0000-0000-0000-000000000001', 'one', 1),
  ('24900000-0000-0000-0000-000000000002', '14900000-0000-0000-0000-000000000001', 'draft', 2);

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000004f1';
  r constant uuid := '00000000-0000-0000-0000-0000000004f2';
  c1 constant uuid := '24900000-0000-0000-0000-000000000001';
  c2 constant uuid := '24900000-0000-0000-0000-000000000002';
  g constant uuid := 'f4900000-0000-4000-8000-000000000001';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    (c1, 'One', '[{"block_id":"34900000-0000-0000-0000-000000000001","type":"paragraph","text":"x"}]'::jsonb, a);
  PERFORM public.publish_chapter(c1);
  RESET ROLE;

  PERFORM tests.ok('one function, three arguments, the old two-argument signature is gone',
    to_regprocedure('public.record_chapter_read(uuid, uuid, text)') IS NOT NULL
    AND to_regprocedure('public.record_chapter_read(uuid, uuid)') IS NULL);
  PERFORM tests.ok('same grants as before',
    has_function_privilege('anon', 'public.record_chapter_read(uuid, uuid, text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.record_chapter_read(uuid, uuid, text)', 'EXECUTE'));
  PERFORM tests.ok('the event table stays closed', NOT has_table_privilege('authenticated', 'public.chapter_read_events', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.chapter_read_events', 'SELECT'));

  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('old two-argument calls still work', public.record_chapter_read(c1, g));
  PERFORM tests.ok('a repeat with a source counts nothing', NOT public.record_chapter_read(c1, g, 'search'));
  PERFORM tests.fails_with('a draft chapter is still not found', format('SELECT public.record_chapter_read(%L, %L, %L)', c2, g, 'search'), 'PT404');
  PERFORM tests.fails_with('no reader is still 22023', format('SELECT public.record_chapter_read(%L, NULL, %L)', c1, 'search'), '22023');
  PERFORM tests.ok('an unknown source still counts the read', public.record_chapter_read(c1, 'f4900000-0000-4000-8000-000000000002', 'https://elsewhere.example'));
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('a signed-in read with a source', public.record_chapter_read(c1, NULL, 'ranking'));
  RESET ROLE;
  PERFORM tests.ok('the first read of the day keeps its source; unknown values are stored as NULL',
    (SELECT array_agg(coalesce(source, '-') ORDER BY id) = ARRAY['-', '-', 'ranking'] FROM chapter_read_events WHERE chapter_id = c1));
  PERFORM tests.ok('no other value can be stored', NOT EXISTS (SELECT 1 FROM chapter_read_events WHERE source LIKE 'http%'));
  PERFORM public.aggregate_reads();
  PERFORM tests.ok('the counters count the three reads, as without sources', (SELECT reads = 3 FROM chapter_stats WHERE chapter_id = c1));
  PERFORM tests.fails_with('the column refuses an unknown source',
    format('INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day, source) VALUES (%L, %L, %L, true, current_date, %L)',
           c1, '14900000-0000-0000-0000-000000000001', gen_random_uuid(), 'facebook'), '23514');
END $$;

ROLLBACK;
