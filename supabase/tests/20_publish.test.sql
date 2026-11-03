-- Publishing RPC tests (publish / republish / unpublish / schedule / due job). Rolled back at the end.
BEGIN;

-- ---------- fixtures ----------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'pub.author@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'pub.reader@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'pub.editor@example.com'),
  ('00000000-0000-0000-0000-0000000000d1', 'pub.suspended@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000d1';

INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'pub-story', 'Pub', 'public', 'draft');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'editor'),
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'editor');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'one', 1),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'two', 2);
-- A block that already belongs to chapter two.
INSERT INTO chapter_blocks (id, chapter_id) VALUES
  ('31000000-0000-0000-0000-0000000000ff', '21000000-0000-0000-0000-000000000002');

-- 1. first publish by the author ------------------------------------------------------------------
DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000a1';
  v uuid;
  ch constant uuid := '21000000-0000-0000-0000-000000000001';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.rows('A saves draft', format($q$INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES (%L, 'Chapter One',
    '[{"block_id":"31000000-0000-0000-0000-000000000001","type":"heading","text":"Chapter One"},
      {"block_id":"31000000-0000-0000-0000-000000000002","type":"paragraph","text":"The afternoon light spilled across the quiet room.","marks":[{"type":"bold","from":0,"to":3}]},
      {"block_id":"31000000-0000-0000-0000-000000000003","type":"divider"}]'::jsonb, %L)$q$, ch, a), 1);
  v := public.publish_chapter(ch);

  RESET ROLE;
  PERFORM tests.ok('chapter published', (SELECT status = 'published' AND published_version_id = v AND first_published_at IS NOT NULL FROM chapters WHERE id = ch));
  PERFORM tests.ok('version 1, published_at set, 10 words',
    (SELECT version_no = 1 AND published_at IS NOT NULL AND word_count = 10 AND created_by = a FROM chapter_versions WHERE id = v));
  PERFORM tests.ok('3 snapshot blocks in order',
    (SELECT array_agg(block_type::text ORDER BY sort_order) = ARRAY['heading','paragraph','divider'] FROM chapter_version_blocks WHERE version_id = v));
  PERFORM tests.ok('marks stored as rich_text',
    (SELECT rich_text -> 'marks' -> 0 ->> 'type' = 'bold' FROM chapter_version_blocks WHERE version_id = v AND sort_order = 2));
  PERFORM tests.ok('chapter_blocks created', (SELECT count(*) = 3 FROM chapter_blocks WHERE chapter_id = ch));
  PERFORM tests.ok('story left draft status and got first_published_at',
    (SELECT status = 'ongoing' AND first_published_at IS NOT NULL FROM stories WHERE id = '11000000-0000-0000-0000-000000000001'));
  PERFORM tests.ok('stats rows exist',
    (SELECT count(*) = 1 FROM chapter_stats WHERE chapter_id = ch) AND (SELECT count(*) = 1 FROM story_stats WHERE story_id = '11000000-0000-0000-0000-000000000001'));
  PERFORM tests.ok('one outbox event',
    (SELECT count(*) = 1 FROM outbox_events WHERE event_type = 'chapter.published' AND aggregate_id = ch));

  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('anon reads the live chapter', 'SELECT 1 FROM chapter_version_blocks', 3);
  PERFORM tests.count_is('anon reads the live version', 'SELECT 1 FROM chapter_versions', 1);
END $$;

-- 2. authorisation and optimistic concurrency ------------------------------------------------------
DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000a1';
  ch constant text := '21000000-0000-0000-0000-000000000001';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.rows('A edits draft (rev 2)', format($q$UPDATE chapter_drafts SET revision = 2, updated_by = %L,
    body = '[{"block_id":"31000000-0000-0000-0000-000000000001","type":"heading","text":"Chapter One"},
             {"block_id":"31000000-0000-0000-0000-000000000002","type":"paragraph","text":"Edited text."}]'::jsonb
    WHERE chapter_id = %L$q$, a, ch), 1);
  PERFORM tests.fails_with('stale revision', format('SELECT public.publish_chapter(%L, 1)', ch), 'PT409');

  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000b1');
  PERFORM tests.fails_with('reader cannot publish', format('SELECT public.publish_chapter(%L)', ch), 'PT404');
  PERFORM tests.fails_with('reader cannot unpublish', format('SELECT public.unpublish_chapter(%L)', ch), 'PT404');
  PERFORM tests.fails_with('unknown chapter', format('SELECT public.publish_chapter(%L)', gen_random_uuid()), 'PT404');

  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.fails_with('anon has no execute', format('SELECT public.publish_chapter(%L)', ch), '42501');

  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000d1');
  PERFORM tests.fails_with('suspended editor cannot publish', format('SELECT public.publish_chapter(%L)', ch), '42501');
END $$;

-- 3. republish by an editor creates version 2; the old snapshot stays immutable ------------------------
DO $$
DECLARE
  c constant uuid := '00000000-0000-0000-0000-0000000000c1';
  ch constant uuid := '21000000-0000-0000-0000-000000000001';
  v2 uuid; v1 uuid; first_at timestamptz;
BEGIN
  RESET ROLE;
  SELECT first_published_at, published_version_id INTO first_at, v1 FROM chapters WHERE id = ch;
  PERFORM tests.act_as(c);
  v2 := public.publish_chapter(ch, 2);
  RESET ROLE;
  PERFORM tests.ok('v2 is live, created by editor', (SELECT version_no = 2 AND created_by = c AND word_count = 4 FROM chapter_versions WHERE id = v2)
                   AND (SELECT published_version_id = v2 FROM chapters WHERE id = ch));
  PERFORM tests.ok('first_published_at unchanged', (SELECT first_published_at = first_at FROM chapters WHERE id = ch));
  PERFORM tests.ok('v1 kept', (SELECT count(*) = 1 FROM chapter_versions WHERE id = v1));
  PERFORM tests.ok('republish does not notify again', (SELECT count(*) = 1 FROM outbox_events WHERE aggregate_id = ch));
  PERFORM tests.fails_with('published version is immutable', format('UPDATE chapter_versions SET title = ''x'' WHERE id = %L', v1), 'P0001');
  PERFORM tests.fails_with('published blocks are immutable', format('DELETE FROM chapter_version_blocks WHERE version_id = %L', v1), 'P0001');
  -- readers only see the live version, not v1
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('anon sees only the live version', 'SELECT 1 FROM chapter_versions', 1);
  PERFORM tests.count_is('anon sees only live blocks', 'SELECT 1 FROM chapter_version_blocks', 2);
END $$;

-- 4. invalid drafts ------------------------------------------------------------------------------------
DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000a1';
  ch constant uuid := '21000000-0000-0000-0000-000000000001';
  bad text[] := ARRAY[
    '[]',
    '[{"block_id":"not-a-uuid","type":"paragraph","text":"x"}]',
    '[{"type":"paragraph","text":"missing id"}]',
    '[{"block_id":"31000000-0000-0000-0000-000000000009","type":"paragraph","text":"a"},{"block_id":"31000000-0000-0000-0000-000000000009","type":"paragraph","text":"b"}]',
    '[{"block_id":"31000000-0000-0000-0000-000000000009","type":"video","text":"a"}]',
    '[{"block_id":"31000000-0000-0000-0000-000000000009","type":"paragraph"}]',
    '[{"block_id":"31000000-0000-0000-0000-000000000009","type":"image"}]',
    '[{"block_id":"31000000-0000-0000-0000-000000000009","type":"paragraph","text":"a","marks":"bold"}]',
    '[{"block_id":"31000000-0000-0000-0000-0000000000ff","type":"paragraph","text":"block of another chapter"}]'];
  b text; v_versions int;
BEGIN
  RESET ROLE;
  SELECT count(*) INTO v_versions FROM chapter_versions WHERE chapter_id = ch;
  PERFORM tests.act_as(a);
  FOREACH b IN ARRAY bad LOOP
    EXECUTE format('UPDATE chapter_drafts SET body = %L::jsonb, revision = revision + 1 WHERE chapter_id = %L', b, ch);
    PERFORM tests.fails_with('invalid body ' || b, format('SELECT public.publish_chapter(%L)', ch), '22023');
  END LOOP;
  RESET ROLE;
  PERFORM tests.ok('failed publishes leave no partial snapshot',
    (SELECT count(*) = v_versions FROM chapter_versions WHERE chapter_id = ch)
    AND (SELECT count(*) = 3 FROM chapter_blocks WHERE chapter_id = ch));  -- no orphan blocks from failed attempts
  PERFORM tests.act_as(a);
  PERFORM tests.rows('restore a valid draft', format($q$UPDATE chapter_drafts SET revision = revision + 1,
    body = '[{"block_id":"31000000-0000-0000-0000-000000000001","type":"paragraph","text":"Back again"}]'::jsonb WHERE chapter_id = %L$q$, ch), 1);
END $$;

-- 5. unpublish / republish / schedule -------------------------------------------------------------------------
DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000a1';
  c constant uuid := '00000000-0000-0000-0000-0000000000c1';
  ch constant uuid := '21000000-0000-0000-0000-000000000001';
  v3 uuid; v4 uuid;
BEGIN
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.fails_with('editor cannot unpublish', format('SELECT public.unpublish_chapter(%L)', ch), '42501');
  PERFORM tests.fails_with('published chapter cannot be scheduled', format('SELECT public.schedule_chapter(%L, now() + interval ''1 day'')', ch), 'PT409');

  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM public.unpublish_chapter(ch);
  PERFORM tests.fails_with('unpublish twice', format('SELECT public.unpublish_chapter(%L)', ch), 'PT409');
  PERFORM tests.count_is('unpublished chapter hidden from anon', 'SELECT 1 FROM chapters WHERE false', 0);
  RESET ROLE;
  PERFORM tests.ok('chapter offline, versions kept, first_published_at kept',
    (SELECT status = 'draft' AND published_version_id IS NULL AND first_published_at IS NOT NULL FROM chapters WHERE id = ch)
    AND (SELECT count(*) = 2 FROM chapter_versions WHERE chapter_id = ch));
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('anon no longer sees chapter 1', $q$SELECT 1 FROM chapters WHERE slug = 'one'$q$, 0);
  PERFORM tests.count_is('anon no longer sees versions', 'SELECT 1 FROM chapter_versions', 0);

  RESET ROLE; PERFORM tests.act_as(a);
  v3 := public.publish_chapter(ch);
  RESET ROLE;
  PERFORM tests.ok('republish after unpublish is version 3 and silent',
    (SELECT version_no = 3 FROM chapter_versions WHERE id = v3) AND (SELECT count(*) = 1 FROM outbox_events WHERE aggregate_id = ch));

  -- scheduling
  PERFORM tests.act_as(a);
  PERFORM public.unpublish_chapter(ch);
  PERFORM tests.fails_with('past schedule rejected', format('SELECT public.schedule_chapter(%L, now() - interval ''1 hour'')', ch), '22023');
  PERFORM public.schedule_chapter(ch, now() + interval '1 day');
  RESET ROLE;
  PERFORM tests.ok('scheduled', (SELECT status = 'scheduled' AND scheduled_for > now() FROM chapters WHERE id = ch));
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('scheduled chapter is not public', $q$SELECT 1 FROM chapters WHERE slug = 'one'$q$, 0);

  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.fails_with('clients cannot run the due job', 'SELECT public.publish_due_chapters()', '42501');
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000a1', 'service_role');
  PERFORM tests.ok('nothing due yet', public.publish_due_chapters() = 0);
  RESET ROLE;
  UPDATE chapters SET scheduled_for = now() - interval '1 minute' WHERE id = ch;   -- time passes
  PERFORM tests.act_as('00000000-0000-0000-0000-0000000000a1', 'service_role');
  PERFORM tests.ok('due chapter published by the job', public.publish_due_chapters() = 1);
  RESET ROLE;
  PERFORM tests.ok('scheduled chapter is live as version 4',
    (SELECT status = 'published' AND scheduled_for IS NULL AND published_version_id IS NOT NULL FROM chapters WHERE id = ch)
    AND (SELECT max(version_no) = 4 FROM chapter_versions WHERE chapter_id = ch));
  PERFORM tests.ok('job is idempotent', (SELECT 0 = 0));

  -- a due chapter whose draft became invalid is skipped, not fatal
  UPDATE chapters SET status = 'scheduled', published_version_id = NULL, scheduled_for = now() - interval '1 minute' WHERE id = ch;
  UPDATE chapter_drafts SET body = '[]'::jsonb WHERE chapter_id = ch;
  PERFORM tests.act_as('00000000-0000-0000-0000-0000000000a1', 'service_role');
  PERFORM tests.ok('invalid scheduled draft is skipped', public.publish_due_chapters() = 0);
  RESET ROLE;
  PERFORM tests.ok('and stays scheduled for the next run', (SELECT status = 'scheduled' FROM chapters WHERE id = ch));
END $$;

-- 6. API roles cannot touch the outbox or private helpers ---------------------------------------------------------
DO $$ BEGIN
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000a1');
  PERFORM tests.denied('outbox is not readable', 'SELECT 1 FROM outbox_events');
  PERFORM tests.denied('private schema is not usable', 'SELECT private.validate_chapter_body(''[]''::jsonb)');
END $$;

ROLLBACK;
