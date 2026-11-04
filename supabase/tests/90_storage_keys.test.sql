-- Storage key convention tests (D3, database side). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a9', 'keys.author@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a9', 'keys-one', 'One', 'public', 'draft'),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a9', 'keys-two', 'Two', 'public', 'draft');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('29000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 'one', 1);

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000a9';
  s1 constant uuid := '19000000-0000-0000-0000-000000000001';
  s2 constant uuid := '19000000-0000-0000-0000-000000000002';
  ch constant uuid := '29000000-0000-0000-0000-000000000001';
BEGIN
  RESET ROLE;
  -- the validation function ---------------------------------------------------------------------------
  PERFORM tests.ok('valid key', public.is_valid_storage_key(s1 || '/cover-1.webp', s1));
  PERFORM tests.ok('mixed case file name', public.is_valid_storage_key(s1 || '/A_b.9.PNG', s1));
  PERFORM tests.ok('another scope is rejected', NOT public.is_valid_storage_key(s2 || '/x.png', s1));
  PERFORM tests.ok('no folder', NOT public.is_valid_storage_key('x.png', s1));
  PERFORM tests.ok('nested path', NOT public.is_valid_storage_key(s1 || '/a/b.png', s1));
  PERFORM tests.ok('traversal', NOT public.is_valid_storage_key(s1 || '/../' || s2 || '/x.png', s1));
  PERFORM tests.ok('leading dot file', NOT public.is_valid_storage_key(s1 || '/.hidden', s1));
  PERFORM tests.ok('space in name', NOT public.is_valid_storage_key(s1 || '/a b.png', s1));
  PERFORM tests.ok('empty file name', NOT public.is_valid_storage_key(s1 || '/', s1));
  PERFORM tests.ok('too long file name', NOT public.is_valid_storage_key(s1 || '/' || repeat('a', 201), s1));
  PERFORM tests.ok('200 characters is the limit', public.is_valid_storage_key(s1 || '/' || repeat('a', 200), s1));
  PERFORM tests.ok('uppercase scope is not accepted (ids are stored lowercase)', NOT public.is_valid_storage_key(upper('abcdef00-0000-4000-8000-000000000001') || '/x.png', 'abcdef00-0000-4000-8000-000000000001'));
  PERFORM tests.ok('the same scope in lowercase is', public.is_valid_storage_key('abcdef00-0000-4000-8000-000000000001/x.png', 'abcdef00-0000-4000-8000-000000000001'));
  PERFORM tests.ok('null key and null scope', NOT public.is_valid_storage_key(NULL, s1) AND NOT public.is_valid_storage_key(s1 || '/x.png', NULL));

  -- stories.cover_storage_key ------------------------------------------------------------------------------
  PERFORM tests.act_as(a);
  PERFORM tests.rows('own cover accepted', format('UPDATE stories SET cover_storage_key = %L WHERE id = %L', s1 || '/cover.webp', s1), 1);
  PERFORM tests.fails_with('cover pointing into another story', format('UPDATE stories SET cover_storage_key = %L WHERE id = %L', s2 || '/cover.webp', s1), '23514');
  PERFORM tests.fails_with('cover with a path', format('UPDATE stories SET cover_storage_key = %L WHERE id = %L', s1 || '/a/b.webp', s1), '23514');
  PERFORM tests.rows('cover can be cleared', format('UPDATE stories SET cover_storage_key = NULL WHERE id = %L', s1), 1);

  -- app_users.avatar_storage_key ----------------------------------------------------------------------------
  PERFORM tests.rows('own avatar accepted', format('UPDATE app_users SET avatar_storage_key = %L WHERE id = %L', a || '/me.png', a), 1);
  PERFORM tests.fails_with('avatar in another user folder', format('UPDATE app_users SET avatar_storage_key = %L WHERE id = %L', '00000000-0000-0000-0000-0000000000b9/me.png', a), '23514');

  -- publish: image blocks ---------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES (ch, 'With image', jsonb_build_array(
    jsonb_build_object('block_id', '39000000-0000-0000-0000-000000000001', 'type', 'paragraph', 'text', 'hello'),
    jsonb_build_object('block_id', '39000000-0000-0000-0000-000000000002', 'type', 'image', 'image_storage_key', s2 || '/other.png')), a);
  PERFORM tests.fails_with('publish rejects an image from another story', format('SELECT public.publish_chapter(%L)', ch), '22023');
  RESET ROLE;
  PERFORM tests.ok('nothing was published', (SELECT status = 'draft' AND published_version_id IS NULL FROM chapters WHERE id = ch));
  PERFORM tests.ok('and no half-written version remains', (SELECT count(*) = 0 FROM chapter_versions WHERE chapter_id = ch));

  PERFORM tests.act_as(a);
  UPDATE chapter_drafts SET body = jsonb_build_array(
    jsonb_build_object('block_id', '39000000-0000-0000-0000-000000000001', 'type', 'paragraph', 'text', 'hello'),
    jsonb_build_object('block_id', '39000000-0000-0000-0000-000000000002', 'type', 'image', 'image_storage_key', s1 || '/ok.png')),
    revision = revision + 1 WHERE chapter_id = ch;
  PERFORM public.publish_chapter(ch);
  RESET ROLE;
  PERFORM tests.ok('own story image publishes', (SELECT count(*) = 1 FROM chapter_version_blocks WHERE chapter_id = ch AND image_storage_key = s1 || '/ok.png'));

  -- scheduled publish goes through the same gate ------------------------------------------------------------------
  PERFORM tests.act_as(a);
  INSERT INTO chapters (id, story_id, slug, sort_order) VALUES ('29000000-0000-0000-0000-000000000002', s1, 'two', 2);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES ('29000000-0000-0000-0000-000000000002', 'Scheduled', jsonb_build_array(
    jsonb_build_object('block_id', '39000000-0000-0000-0000-000000000003', 'type', 'image', 'image_storage_key', s2 || '/other.png')), a);
  PERFORM public.schedule_chapter('29000000-0000-0000-0000-000000000002', now() + interval '1 hour');
  RESET ROLE;
  UPDATE chapters SET scheduled_for = now() - interval '1 minute' WHERE id = '29000000-0000-0000-0000-000000000002';
  PERFORM public.publish_due_chapters();
  PERFORM tests.ok('the due job does not publish a chapter whose image key is foreign',
    (SELECT status <> 'published' AND published_version_id IS NULL FROM chapters WHERE id = '29000000-0000-0000-0000-000000000002'));
END $$;

ROLLBACK;
