-- Chapter management RPC tests (create / reorder / archive). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000aa', 'cm.author@example.com'),
  ('00000000-0000-0000-0000-0000000000ab', 'cm.editor@example.com'),
  ('00000000-0000-0000-0000-0000000000ac', 'cm.stranger@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'cm.coauthor@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('1a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', 'cm-story', 'CM', 'public', 'draft'),
  ('1a000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000aa', 'cm-other', 'Other', 'public', 'draft');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('1a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000ab', 'editor'),
  ('1a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000ad', 'co_author');

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000aa';
  e constant uuid := '00000000-0000-0000-0000-0000000000ab';
  s constant uuid := '00000000-0000-0000-0000-0000000000ac';
  c constant uuid := '00000000-0000-0000-0000-0000000000ad';
  st constant uuid := '1a000000-0000-0000-0000-000000000001';
  st2 constant uuid := '1a000000-0000-0000-0000-000000000002';
  c1 uuid; c2 uuid; c3 uuid; foreign_ch uuid;
BEGIN
  RESET ROLE;

  -- create_chapter ---------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot create', format('SELECT public.create_chapter(%L, ''T'', ''t'')', st));
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('stranger gets not-found', format('SELECT public.create_chapter(%L, ''T'', ''t'')', st), 'PT404');
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.fails_with('blank title', format('SELECT public.create_chapter(%L, ''  '', ''t'')', st), '22023');
  PERFORM tests.fails_with('title too long', format('SELECT public.create_chapter(%L, %L, ''t'')', st, repeat('a', 201)), '22023');
  PERFORM tests.fails_with('slug with capitals', format('SELECT public.create_chapter(%L, ''T'', ''Bad'')', st), '22023');
  PERFORM tests.fails_with('slug with spaces', format('SELECT public.create_chapter(%L, ''T'', ''a b'')', st), '22023');
  PERFORM tests.fails_with('unknown story', format('SELECT public.create_chapter(%L, ''T'', ''t'')', gen_random_uuid()), 'PT404');

  c1 := public.create_chapter(st, 'Chương một', 'chuong-1');
  RESET ROLE; PERFORM tests.act_as(e);
  c2 := public.create_chapter(st, 'Chương hai', 'chuong-2', '2a000000-0000-0000-0000-0000000000c2');
  RESET ROLE; PERFORM tests.act_as(a);
  c3 := public.create_chapter(st, 'Chương ba', 'chuong-3');
  PERFORM tests.fails_with('duplicate slug is a unique violation', format('SELECT public.create_chapter(%L, ''Again'', ''chuong-2'')', st), '23505');
  RESET ROLE;
  PERFORM tests.ok('appended in order 1,2,3 as drafts', (SELECT array_agg(sort_order ORDER BY sort_order) = ARRAY[1,2,3] AND bool_and(status = 'draft') FROM chapters WHERE story_id = st));
  PERFORM tests.ok('the editor supplied id is used', c2 = '2a000000-0000-0000-0000-0000000000c2');
  PERFORM tests.ok('each chapter has its draft with the title', (SELECT count(*) = 3 AND bool_or(title = 'Chương một') FROM chapter_drafts WHERE chapter_id IN (c1, c2, c3)));
  PERFORM tests.ok('draft is attributed to the creator', (SELECT updated_by = e FROM chapter_drafts WHERE chapter_id = c2));

  -- a failed create leaves nothing behind --------------------------------------------------------------------
  PERFORM tests.ok('the failed duplicate left no chapter and no draft', (SELECT count(*) = 3 FROM chapters WHERE story_id = st) AND (SELECT count(*) = 3 FROM chapter_drafts d JOIN chapters ch ON ch.id = d.chapter_id WHERE ch.story_id = st));

  -- reorder_chapters --------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot reorder', format('SELECT public.reorder_chapters(%L, ARRAY[%L]::uuid[])', st, c1));
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('stranger cannot reorder', format('SELECT public.reorder_chapters(%L, ARRAY[%L,%L,%L]::uuid[])', st, c1, c2, c3), 'PT404');

  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM public.reorder_chapters(st, ARRAY[c3, c1, c2]);
  RESET ROLE;
  PERFORM tests.ok('editor reordered: c3, c1, c2', (SELECT array_agg(id ORDER BY sort_order) = ARRAY[c3, c1, c2] FROM chapters WHERE story_id = st));

  INSERT INTO chapters (id, story_id, slug, sort_order) VALUES ('2a000000-0000-0000-0000-0000000000f1', st2, 'foreign', 1);
  foreign_ch := '2a000000-0000-0000-0000-0000000000f1';
  PERFORM tests.act_as(a);
  PERFORM tests.fails_with('missing a chapter', format('SELECT public.reorder_chapters(%L, ARRAY[%L,%L]::uuid[])', st, c1, c2), '22023');
  PERFORM tests.fails_with('extra chapter', format('SELECT public.reorder_chapters(%L, ARRAY[%L,%L,%L,%L]::uuid[])', st, c1, c2, c3, foreign_ch), '22023');
  PERFORM tests.fails_with('foreign chapter instead of one', format('SELECT public.reorder_chapters(%L, ARRAY[%L,%L,%L]::uuid[])', st, c1, c2, foreign_ch), '22023');
  PERFORM tests.fails_with('duplicate id', format('SELECT public.reorder_chapters(%L, ARRAY[%L,%L,%L]::uuid[])', st, c1, c1, c2), '22023');
  PERFORM tests.fails_with('every chapter listed plus one repeated', format('SELECT public.reorder_chapters(%L, ARRAY[%L,%L,%L,%L]::uuid[])', st, c1, c2, c3, c3), '22023');
  PERFORM tests.fails_with('empty list', format('SELECT public.reorder_chapters(%L, ARRAY[]::uuid[])', st), '22023');
  PERFORM tests.fails_with('null list', format('SELECT public.reorder_chapters(%L, NULL)', st), '22023');
  RESET ROLE;
  PERFORM tests.ok('rejected reorders changed nothing', (SELECT array_agg(id ORDER BY sort_order) = ARRAY[c3, c1, c2] FROM chapters WHERE story_id = st));
  PERFORM tests.ok('the foreign story is untouched', (SELECT sort_order = 1 FROM chapters WHERE id = foreign_ch));

  -- soft-deleted chapters keep their place after the live ones -------------------------------------------------------
  PERFORM tests.act_as(a);
  UPDATE chapters SET deleted_at = now() WHERE id = c1;
  PERFORM tests.fails_with('a deleted chapter may not be listed', format('SELECT public.reorder_chapters(%L, ARRAY[%L,%L,%L]::uuid[])', st, c3, c1, c2), '22023');
  PERFORM public.reorder_chapters(st, ARRAY[c2, c3]);
  RESET ROLE;
  PERFORM tests.ok('live chapters are 1..2, the deleted one is after them',
    (SELECT array_agg(id ORDER BY sort_order) = ARRAY[c2, c3, c1] AND array_agg(sort_order ORDER BY sort_order) = ARRAY[1,2,3] FROM chapters WHERE story_id = st));
  PERFORM tests.act_as(a);
  UPDATE chapters SET deleted_at = NULL WHERE id = c1;
  PERFORM public.reorder_chapters(st, ARRAY[c1, c2, c3]);
  RESET ROLE;
  PERFORM tests.ok('a restored chapter can be ordered again', (SELECT array_agg(id ORDER BY sort_order) = ARRAY[c1, c2, c3] FROM chapters WHERE story_id = st));

  -- archive / unarchive ---------------------------------------------------------------------------------------------
  PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES (c1, 'x', '[]', a) ON CONFLICT (chapter_id) DO NOTHING;
  UPDATE chapter_drafts SET body = '[{"block_id":"3a000000-0000-0000-0000-000000000001","type":"paragraph","text":"hello"}]'::jsonb, revision = revision + 1 WHERE chapter_id = c1;
  PERFORM public.publish_chapter(c1);
  RESET ROLE;
  PERFORM tests.ok('published', (SELECT status = 'published' AND published_version_id IS NOT NULL FROM chapters WHERE id = c1));

  PERFORM tests.act_as(e);
  PERFORM tests.fails_with('an editor cannot archive', format('SELECT public.archive_chapter(%L)', c1), '42501');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('a stranger gets not-found', format('SELECT public.archive_chapter(%L)', c1), 'PT404');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot archive', format('SELECT public.archive_chapter(%L)', c1));
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM public.archive_chapter(c1);
  PERFORM tests.fails_with('already archived', format('SELECT public.archive_chapter(%L)', c1), 'PT409');
  RESET ROLE;
  PERFORM tests.ok('archived: hidden pointer cleared', (SELECT status = 'archived' AND published_version_id IS NULL AND scheduled_for IS NULL FROM chapters WHERE id = c1));
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('readers cannot see an archived chapter', format('SELECT 1 FROM chapters WHERE id = %L', c1), 0);

  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.fails_with('publishing an archived chapter is refused', format('SELECT public.publish_chapter(%L)', c1), 'PT409');
  PERFORM tests.fails_with('scheduling an archived chapter is refused', format('SELECT public.schedule_chapter(%L, now() + interval ''1 day'')', c1), 'PT409');
  PERFORM tests.fails_with('unarchive a chapter that is not archived', format('SELECT public.unarchive_chapter(%L)', c2), 'PT409');
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.fails_with('an editor cannot unarchive', format('SELECT public.unarchive_chapter(%L)', c1), '42501');
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM public.unarchive_chapter(c1);
  RESET ROLE;
  PERFORM tests.ok('unarchived chapter is a draft again', (SELECT status = 'draft' FROM chapters WHERE id = c1));
  PERFORM tests.act_as(a);
  PERFORM public.publish_chapter(c1);
  RESET ROLE;
  PERFORM tests.ok('and can be published again (a new version)', (SELECT status = 'published' FROM chapters WHERE id = c1) AND (SELECT count(*) = 2 FROM chapter_versions WHERE chapter_id = c1));
END $$;

ROLLBACK;
