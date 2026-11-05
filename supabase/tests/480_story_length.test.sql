-- Story length (insights4: Discover length range filter): story_stats.word_count / published_chapters follow publish,
-- re-publish, unpublish and delete; clients cannot write them; the histogram counts what Discover lists. Rolled back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000004e1', 'sl.author@example.com'),
  ('00000000-0000-0000-0000-0000000004e2', 'sl.stranger@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status, is_mature, language_code) VALUES
  ('14800000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000004e1', 'sl-long', 'Long', 'public', 'ongoing', false, 'vi'),
  ('14800000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000004e1', 'sl-mature', 'Mature', 'public', 'ongoing', true, 'vi'),
  ('14800000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000004e1', 'sl-private', 'Private', 'private', 'ongoing', false, 'vi');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('24800000-0000-0000-0000-000000000001', '14800000-0000-0000-0000-000000000001', 'one', 1),
  ('24800000-0000-0000-0000-000000000002', '14800000-0000-0000-0000-000000000001', 'two', 2),
  ('24800000-0000-0000-0000-000000000003', '14800000-0000-0000-0000-000000000002', 'one', 1),
  ('24800000-0000-0000-0000-000000000004', '14800000-0000-0000-0000-000000000003', 'one', 1);

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000004e1';
  x constant uuid := '00000000-0000-0000-0000-0000000004e2';
  sl constant uuid := '14800000-0000-0000-0000-000000000001';
  sm constant uuid := '14800000-0000-0000-0000-000000000002';
  sp constant uuid := '14800000-0000-0000-0000-000000000003';
  c1 constant uuid := '24800000-0000-0000-0000-000000000001';
  c2 constant uuid := '24800000-0000-0000-0000-000000000002';
  base integer;
BEGIN
  RESET ROLE;
  PERFORM tests.ok('clients cannot write the length',
    NOT has_column_privilege('authenticated', 'public.story_stats', 'word_count', 'UPDATE')
    AND NOT has_column_privilege('authenticated', 'public.story_stats', 'word_count', 'INSERT')
    AND NOT has_column_privilege('authenticated', 'public.story_stats', 'published_chapters', 'UPDATE')
    AND has_column_privilege('anon', 'public.story_stats', 'word_count', 'SELECT'));
  PERFORM tests.ok('the trigger helpers are not callable by API roles',
    NOT has_function_privilege('authenticated', 'private.refresh_story_length(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.sync_story_length()', 'EXECUTE'));

  PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    (c1, 'One', '[{"block_id":"34800000-0000-0000-0000-000000000001","type":"paragraph","text":"một hai ba bốn năm"}]'::jsonb, a),
    (c2, 'Two', '[{"block_id":"34800000-0000-0000-0000-000000000002","type":"heading","text":"Tiêu đề"},{"block_id":"34800000-0000-0000-0000-000000000003","type":"paragraph","text":"sáu bảy"}]'::jsonb, a),
    ('24800000-0000-0000-0000-000000000003', 'M', format('[{"block_id":"34800000-0000-0000-0000-000000000004","type":"paragraph","text":"%s"}]', repeat('w ', 2500))::jsonb, a),
    ('24800000-0000-0000-0000-000000000004', 'P', '[{"block_id":"34800000-0000-0000-0000-000000000005","type":"paragraph","text":"a b c"}]'::jsonb, a);
  PERFORM public.publish_chapter(c1);
  RESET ROLE;
  PERFORM tests.ok('first publish: the row is created with the chapter''s words',
    (SELECT word_count = 5 AND published_chapters = 1 FROM story_stats WHERE story_id = sl));
  PERFORM tests.act_as(a);
  PERFORM public.publish_chapter(c2);
  PERFORM public.publish_chapter('24800000-0000-0000-0000-000000000003');
  PERFORM public.publish_chapter('24800000-0000-0000-0000-000000000004');
  RESET ROLE;
  PERFORM tests.ok('second chapter adds its words (heading included)',
    (SELECT word_count = 9 AND published_chapters = 2 FROM story_stats WHERE story_id = sl));
  PERFORM tests.ok('equals the published versions', (SELECT word_count FROM story_stats WHERE story_id = sl)
    = (SELECT sum(v.word_count) FROM chapters c JOIN chapter_versions v ON v.id = c.published_version_id WHERE c.story_id = sl));

  PERFORM tests.act_as(a);
  UPDATE chapter_drafts SET title = 'One', body = '[{"block_id":"34800000-0000-0000-0000-000000000001","type":"paragraph","text":"một hai"}]'::jsonb WHERE chapter_id = c1;
  PERFORM public.publish_chapter(c1);
  RESET ROLE;
  PERFORM tests.ok('re-publishing an edit replaces the old count', (SELECT word_count = 6 FROM story_stats WHERE story_id = sl));
  PERFORM tests.act_as(a);
  PERFORM public.unpublish_chapter(c2);
  RESET ROLE;
  PERFORM tests.ok('unpublish removes the chapter', (SELECT word_count = 2 AND published_chapters = 1 FROM story_stats WHERE story_id = sl));
  UPDATE chapters SET deleted_at = now() WHERE id = c1;
  PERFORM tests.ok('a deleted chapter leaves the length', (SELECT word_count = 0 AND published_chapters = 0 FROM story_stats WHERE story_id = sl));
  UPDATE chapters SET deleted_at = NULL WHERE id = c1;
  PERFORM tests.ok('and comes back when restored', (SELECT word_count = 2 FROM story_stats WHERE story_id = sl));
  DELETE FROM story_stats WHERE story_id = sl;
  INSERT INTO story_stats (story_id, word_count) VALUES (sl, 999999);
  PERFORM tests.ok('a row created later starts with the computed length, whatever was passed',
    (SELECT word_count = 2 AND published_chapters = 1 FROM story_stats WHERE story_id = sl));

  -- histogram --------------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('eight fixed buckets, the last open', (SELECT count(*) = 8 AND bool_and((bucket = 8) = (max_words IS NULL))
    FROM public.story_length_histogram()));
  SELECT coalesce(sum(stories), 0) INTO base FROM public.story_length_histogram();
  PERFORM tests.ok('the 2-word story is in the first bucket', (SELECT stories >= 1 FROM public.story_length_histogram() WHERE bucket = 1));
  PERFORM tests.ok('mature on: the 2 500-word story lands in 2 000..10 000',
    (SELECT stories FROM public.story_length_histogram(true) WHERE bucket = 2)
      = (SELECT stories + 1 FROM public.story_length_histogram(false) WHERE bucket = 2));
  PERFORM tests.ok('the private story never counts',
    (SELECT sum(stories) FROM public.story_length_histogram(true)) = base + 1);
  PERFORM tests.ok('a language filter that matches nothing', (SELECT sum(stories) = 0 FROM public.story_length_histogram(true, 'xx')));
  PERFORM tests.ok('filtering stories by length through story_stats works for guests',
    EXISTS (SELECT 1 FROM stories st JOIN story_stats s ON s.story_id = st.id WHERE st.id = sl AND s.word_count < 2000)
    AND NOT EXISTS (SELECT 1 FROM story_stats WHERE story_id = sp));
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.denied('a stranger cannot write the length', format('UPDATE story_stats SET word_count = 1 WHERE story_id = %L', sl));
END $$;

ROLLBACK;
