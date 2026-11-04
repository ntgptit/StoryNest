-- save_reading_progress tests. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a6', 'prog.author@example.com'),
  ('00000000-0000-0000-0000-0000000000b6', 'prog.reader@example.com'),
  ('00000000-0000-0000-0000-0000000000c6', 'prog.other@example.com');

INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a6', 'prog-story', 'Prog', 'public', 'draft'),
  ('16000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a6', 'prog-private', 'Private', 'private', 'draft');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'one', 1),
  ('26000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000001', 'two', 2),
  ('26000000-0000-0000-0000-000000000003', '16000000-0000-0000-0000-000000000001', 'draft-only', 3),
  ('26000000-0000-0000-0000-000000000009', '16000000-0000-0000-0000-000000000002', 'secret', 1);

-- Publish chapters one, two and the private one as the author.
DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a6';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('26000000-0000-0000-0000-000000000001', 'One',
     '[{"block_id":"36000000-0000-0000-0000-000000000001","type":"paragraph","text":"alpha beta"},
       {"block_id":"36000000-0000-0000-0000-000000000002","type":"paragraph","text":"gamma delta"}]'::jsonb, a),
    ('26000000-0000-0000-0000-000000000002', 'Two',
     '[{"block_id":"36000000-0000-0000-0000-000000000003","type":"paragraph","text":"epsilon"}]'::jsonb, a),
    ('26000000-0000-0000-0000-000000000009', 'Secret',
     '[{"block_id":"36000000-0000-0000-0000-000000000009","type":"paragraph","text":"hidden"}]'::jsonb, a);
  PERFORM public.publish_chapter('26000000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('26000000-0000-0000-0000-000000000002');
  PERFORM public.publish_chapter('26000000-0000-0000-0000-000000000009');
END $$;

DO $$
DECLARE
  r constant uuid := '00000000-0000-0000-0000-0000000000b6';
  o constant uuid := '00000000-0000-0000-0000-0000000000c6';
  ch1 constant uuid := '26000000-0000-0000-0000-000000000001';
  ch2 constant uuid := '26000000-0000-0000-0000-000000000002';
  b1 constant uuid := '36000000-0000-0000-0000-000000000001';
  b2 constant uuid := '36000000-0000-0000-0000-000000000002';
  b3 constant uuid := '36000000-0000-0000-0000-000000000003';
  v1 uuid;
BEGIN
  RESET ROLE;
  SELECT published_version_id INTO v1 FROM chapters WHERE id = ch1;

  -- guests and bad input -------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot call it', format('SELECT public.save_reading_progress(%L, 10, NULL)', ch1));
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('percent above 100', format('SELECT public.save_reading_progress(%L, 100.5, NULL)', ch1), '22023');
  PERFORM tests.fails_with('negative percent', format('SELECT public.save_reading_progress(%L, -1, NULL)', ch1), '22023');
  PERFORM tests.fails_with('null percent', format('SELECT public.save_reading_progress(%L, NULL, NULL)', ch1), '22023');
  PERFORM tests.fails_with('unknown chapter', format('SELECT public.save_reading_progress(%L, 5, NULL)', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('unpublished chapter', format('SELECT public.save_reading_progress(%L, 5, NULL)', '26000000-0000-0000-0000-000000000003'), 'PT404');
  PERFORM tests.fails_with('chapter of a private story', format('SELECT public.save_reading_progress(%L, 5, NULL)', '26000000-0000-0000-0000-000000000009'), 'PT404');

  -- first save writes both tables, version comes from the server ---------------------------------
  PERFORM public.save_reading_progress(ch1, 40, b1);
  RESET ROLE;
  PERFORM tests.ok('chapter progress written', (SELECT last_block_id = b1 AND last_version_id = v1 AND percent_complete = 40 AND completed_at IS NULL
    FROM user_chapter_progress WHERE user_id = r AND chapter_id = ch1));
  PERFORM tests.ok('story progress points at the chapter', (SELECT current_chapter_id = ch1 FROM user_story_progress
    WHERE user_id = r AND story_id = '16000000-0000-0000-0000-000000000001'));

  -- a second save updates in place (no duplicate rows) --------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM public.save_reading_progress(ch1, 70, b2);
  RESET ROLE;
  PERFORM tests.ok('one row per chapter after two saves', (SELECT count(*) = 1 AND max(percent_complete) = 70 AND max(last_block_id::text) = b2::text
    FROM user_chapter_progress WHERE user_id = r AND chapter_id = ch1));

  -- completion is sticky ---------------------------------------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM public.save_reading_progress(ch1, 97, b2);
  PERFORM public.save_reading_progress(ch1, 10, b1);
  RESET ROLE;
  PERFORM tests.ok('completed_at set at 97% and kept after going back to 10%',
    (SELECT completed_at IS NOT NULL AND percent_complete = 10 FROM user_chapter_progress WHERE user_id = r AND chapter_id = ch1));

  -- a block of another chapter is not stored (position falls back to percent) ---------------------
  PERFORM tests.act_as(r);
  PERFORM public.save_reading_progress(ch1, 33, b3);
  RESET ROLE;
  PERFORM tests.ok('foreign block ignored, percent kept',
    (SELECT last_block_id IS NULL AND percent_complete = 33 FROM user_chapter_progress WHERE user_id = r AND chapter_id = ch1));

  -- moving to another chapter moves the story pointer ----------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM public.save_reading_progress(ch2, 5, b3);
  RESET ROLE;
  PERFORM tests.ok('story progress follows the latest chapter', (SELECT current_chapter_id = ch2 FROM user_story_progress
    WHERE user_id = r AND story_id = '16000000-0000-0000-0000-000000000001'));

  -- republish: the stored version is the one live at save time -------------------------------------
  PERFORM tests.act_as('00000000-0000-0000-0000-0000000000a6');
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES (ch2, 'Two v2',
    '[{"block_id":"36000000-0000-0000-0000-000000000003","type":"paragraph","text":"epsilon revised"}]'::jsonb,
    '00000000-0000-0000-0000-0000000000a6')
    ON CONFLICT (chapter_id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, revision = chapter_drafts.revision + 1;
  PERFORM public.publish_chapter(ch2);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.save_reading_progress(ch2, 50, b3);
  RESET ROLE;
  PERFORM tests.ok('last_version_id is the new published version',
    (SELECT p.last_version_id = c.published_version_id AND (SELECT version_no FROM chapter_versions WHERE id = c.published_version_id) = 2
     FROM user_chapter_progress p JOIN chapters c ON c.id = p.chapter_id WHERE p.user_id = r AND p.chapter_id = ch2));

  -- privacy: other users see nothing, and cannot write rows for someone else -----------------------
  PERFORM tests.act_as(o);
  PERFORM tests.count_is('other user sees no progress rows', 'SELECT 1 FROM user_chapter_progress', 0);
  PERFORM tests.count_is('other user sees no story progress rows', 'SELECT 1 FROM user_story_progress', 0);
  PERFORM public.save_reading_progress(ch1, 20);  -- the block argument is optional
  RESET ROLE;
  PERFORM tests.ok('other user got their own row only',
    (SELECT count(*) = 1 FROM user_chapter_progress WHERE user_id = o) AND (SELECT percent_complete = 33 FROM user_chapter_progress WHERE user_id = r AND chapter_id = ch1));
END $$;

ROLLBACK;
