-- Avatar bucket (WP 1.5): the bucket's limits, and that nobody writes outside their own folder. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a8', 'av.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b8', 'av.other@example.com'),
  ('00000000-0000-0000-0000-0000000000c8', 'av.frozen@example.com');
UPDATE app_users SET username = 'av_other' WHERE id = '00000000-0000-0000-0000-0000000000b8';
UPDATE app_users SET username = 'av_frozen', account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000c8';

DO $$
DECLARE
  a constant text := '00000000-0000-0000-0000-0000000000a8';
  b constant text := '00000000-0000-0000-0000-0000000000b8';
  c constant text := '00000000-0000-0000-0000-0000000000c8';
  bucket storage.buckets%ROWTYPE;
BEGIN
  RESET ROLE;
  SELECT * INTO bucket FROM storage.buckets WHERE id = 'avatars';
  PERFORM tests.ok('the bucket exists and is public', bucket.id = 'avatars' AND bucket.public);
  PERFORM tests.ok('2 MiB at most', bucket.file_size_limit = 2097152);
  PERFORM tests.ok('images only', bucket.allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp']
                              AND cardinality(bucket.allowed_mime_types) = 3);

  -- writing -----------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(a::uuid);
  PERFORM tests.rows('my own folder', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', a || '/one.webp'), 1);
  PERFORM tests.denied('another user''s folder', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', b || '/one.webp'));
  PERFORM tests.denied('no folder at all', 'INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', ''one.webp'')');
  PERFORM tests.denied('a nested path', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', a || '/x/one.webp'));
  PERFORM tests.denied('a traversal into someone else', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', a || '/../' || b || '/one.webp'));
  PERFORM tests.denied('an upper-case folder is not mine', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', upper(a) || '/one.webp'));
  PERFORM tests.denied('a name the key convention refuses', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', a || '/.hidden'));
  PERFORM tests.denied('another bucket is not covered by this policy', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''elsewhere'', %L)', a || '/one.webp'));
  PERFORM tests.count_is('I see my object', 'SELECT 1 FROM storage.objects', 1);

  RESET ROLE;
  INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', b || '/theirs.webp');

  PERFORM tests.act_as(a::uuid);
  PERFORM tests.count_is('and only mine, not the other folder', 'SELECT 1 FROM storage.objects', 1);
  PERFORM tests.rows('replace in place', format('UPDATE storage.objects SET metadata = ''{}'' WHERE name = %L', a || '/one.webp'), 1);
  PERFORM tests.rows('another user''s object cannot be updated', format('UPDATE storage.objects SET metadata = ''{}'' WHERE name = %L', b || '/theirs.webp'), 0);
  PERFORM tests.denied('an update cannot move my object into their folder', format('UPDATE storage.objects SET name = %L WHERE name = %L', b || '/moved.webp', a || '/one.webp'));
  PERFORM tests.rows('another user''s object cannot be deleted', format('DELETE FROM storage.objects WHERE name = %L', b || '/theirs.webp'), 0);
  PERFORM tests.rows('mine can', format('DELETE FROM storage.objects WHERE name = %L', a || '/one.webp'), 1);

  -- guests and frozen accounts --------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot upload', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', a || '/g.webp'));
  RESET ROLE; PERFORM tests.act_as(c::uuid);
  PERFORM tests.denied('a suspended account cannot upload', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''avatars'', %L)', c || '/f.webp'));

  -- the row that points at the object ----------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(a::uuid);
  PERFORM tests.rows('point my profile at my object', format('UPDATE app_users SET avatar_storage_key = %L WHERE id = %L', a || '/one.webp', a), 1);
  PERFORM tests.fails_with('but not at someone else''s', format('UPDATE app_users SET avatar_storage_key = %L WHERE id = %L', b || '/theirs.webp', a), '23514');
  RESET ROLE;
END $$;

ROLLBACK;
