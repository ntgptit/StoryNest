-- Cover and chapter-image buckets (WP 3.3): limits, and who may write into a story's folder. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a9', 'img.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b9', 'img.co@example.com'),
  ('00000000-0000-0000-0000-0000000000c9', 'img.editor@example.com'),
  ('00000000-0000-0000-0000-0000000000d9', 'img.reader@example.com'),
  ('00000000-0000-0000-0000-0000000000e9', 'img.frozen@example.com');
UPDATE app_users SET username = 'img_co' WHERE id = '00000000-0000-0000-0000-0000000000b9';
UPDATE app_users SET username = 'img_editor' WHERE id = '00000000-0000-0000-0000-0000000000c9';
UPDATE app_users SET username = 'img_reader' WHERE id = '00000000-0000-0000-0000-0000000000d9';
UPDATE app_users SET username = 'img_frozen' WHERE id = '00000000-0000-0000-0000-0000000000e9';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('19100000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-0000000000a9', 'img-one', 'One', 'public', 'ongoing'),
  ('19100000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-0000000000a9', 'img-two', 'Two', 'public', 'ongoing'),
  ('19100000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-0000000000e9', 'img-frozen', 'Frozen', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('19100000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-0000000000b9', 'co_author'),
  ('19100000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-0000000000c9', 'editor');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000e9';

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000a9';
  co constant uuid := '00000000-0000-0000-0000-0000000000b9';
  ed constant uuid := '00000000-0000-0000-0000-0000000000c9';
  rd constant uuid := '00000000-0000-0000-0000-0000000000d9';
  fz constant uuid := '00000000-0000-0000-0000-0000000000e9';
  s1 constant text := '19100000-0000-4000-8000-00000000000a';
  s2 constant text := '19100000-0000-4000-8000-00000000000b';
  s3 constant text := '19100000-0000-4000-8000-00000000000c';
  ghost constant text := '19100000-0000-4000-8000-0000000000ff';
  b storage.buckets%ROWTYPE;
  ins constant text := 'INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)';
BEGIN
  RESET ROLE;
  SELECT * INTO b FROM storage.buckets WHERE id = 'covers';
  PERFORM tests.ok('covers: public, 2 MiB, images only', b.public AND b.file_size_limit = 2097152
                   AND b.allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp'] AND cardinality(b.allowed_mime_types) = 3);
  SELECT * INTO b FROM storage.buckets WHERE id = 'chapter-images';
  PERFORM tests.ok('chapter-images: public, 5 MiB, images only', b.public AND b.file_size_limit = 5242880
                   AND b.allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp'] AND cardinality(b.allowed_mime_types) = 3);

  -- covers --------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM tests.rows('owner: cover in own story', format(ins, 'covers', s1 || '/c1.webp'), 1);
  PERFORM tests.rows('owner: cover in the other own story', format(ins, 'covers', s2 || '/c1.webp'), 1);
  PERFORM tests.denied('owner: a made-up story folder', format(ins, 'covers', ghost || '/c1.webp'));
  PERFORM tests.denied('owner: a folder that is not an id', format(ins, 'covers', 'not-a-uuid/c1.webp'));
  PERFORM tests.denied('owner: no folder', format(ins, 'covers', 'c1.webp'));
  PERFORM tests.denied('owner: nested path', format(ins, 'covers', s1 || '/a/c1.webp'));
  PERFORM tests.denied('owner: traversal', format(ins, 'covers', s1 || '/../' || s2 || '/c1.webp'));
  PERFORM tests.denied('owner: upper-case folder', format(ins, 'covers', upper(s1) || '/c1.webp'));
  PERFORM tests.denied('owner: a name the convention refuses', format(ins, 'covers', s1 || '/.hidden'));
  PERFORM tests.denied('owner: other buckets are not covered', format(ins, 'elsewhere', s1 || '/c1.webp'));
  RESET ROLE; PERFORM tests.act_as(co);
  PERFORM tests.rows('co-author: cover in the story', format(ins, 'covers', s1 || '/c2.webp'), 1);
  PERFORM tests.denied('co-author: not in a story they only have on paper elsewhere', format(ins, 'covers', s2 || '/c2.webp'));
  RESET ROLE; PERFORM tests.act_as(ed);
  PERFORM tests.denied('editor: no cover (settings are not theirs)', format(ins, 'covers', s1 || '/c3.webp'));
  RESET ROLE; PERFORM tests.act_as(rd);
  PERFORM tests.denied('reader: no cover', format(ins, 'covers', s1 || '/c4.webp'));
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('guest: no cover', format(ins, 'covers', s1 || '/c5.webp'));
  RESET ROLE; PERFORM tests.act_as(fz);
  PERFORM tests.denied('suspended owner: no cover', format(ins, 'covers', s3 || '/c6.webp'));

  -- chapter images ----------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('owner: chapter image', format(ins, 'chapter-images', s1 || '/i1.webp'), 1);
  RESET ROLE; PERFORM tests.act_as(co);
  PERFORM tests.rows('co-author: chapter image', format(ins, 'chapter-images', s1 || '/i2.webp'), 1);
  RESET ROLE; PERFORM tests.act_as(ed);
  PERFORM tests.rows('editor: chapter image', format(ins, 'chapter-images', s1 || '/i3.webp'), 1);
  PERFORM tests.denied('editor: not into another story', format(ins, 'chapter-images', s2 || '/i3.webp'));
  RESET ROLE; PERFORM tests.act_as(rd);
  PERFORM tests.denied('reader: no chapter image', format(ins, 'chapter-images', s1 || '/i4.webp'));
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('guest: no chapter image', format(ins, 'chapter-images', s1 || '/i5.webp'));

  -- seeing, replacing, removing ----------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.count_is('owner lists their stories'' images', 'SELECT 1 FROM storage.objects', 6);
  PERFORM tests.rows('owner replaces a cover', format('UPDATE storage.objects SET metadata = ''{}'' WHERE bucket_id = ''covers'' AND name = %L', s1 || '/c1.webp'), 1);
  PERFORM tests.denied('an object cannot be renamed into a story the caller does not manage', format('UPDATE storage.objects SET name = %L WHERE bucket_id = ''covers'' AND name = %L', s3 || '/c1.webp', s1 || '/c1.webp'));
  RESET ROLE; PERFORM tests.act_as(ed);
  PERFORM tests.rows('editor cannot touch a cover', format('UPDATE storage.objects SET metadata = ''{}'' WHERE bucket_id = ''covers'' AND name = %L', s1 || '/c1.webp'), 0);
  PERFORM tests.rows('editor cannot delete a cover', format('DELETE FROM storage.objects WHERE bucket_id = ''covers'' AND name = %L', s1 || '/c1.webp'), 0);
  PERFORM tests.rows('editor can delete a chapter image', format('DELETE FROM storage.objects WHERE bucket_id = ''chapter-images'' AND name = %L', s1 || '/i3.webp'), 1);
  RESET ROLE; PERFORM tests.act_as(rd);
  PERFORM tests.rows('reader cannot delete anything', 'DELETE FROM storage.objects', 0);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('owner deletes a cover', format('DELETE FROM storage.objects WHERE bucket_id = ''covers'' AND name = %L', s1 || '/c1.webp'), 1);

  -- the row that points at a cover ---------------------------------------------------------------------------------------
  PERFORM tests.rows('point the story at its own cover', format('UPDATE stories SET cover_storage_key = %L WHERE id = %L', s1 || '/c2.webp', s1), 1);
  PERFORM tests.fails_with('but not at another story''s', format('UPDATE stories SET cover_storage_key = %L WHERE id = %L', s2 || '/c1.webp', s1), '23514');
  RESET ROLE;
END $$;

ROLLBACK;
