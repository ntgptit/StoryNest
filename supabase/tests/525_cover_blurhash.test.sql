-- stories.cover_blurhash: format check, who writes it, stale hashes cleared (batch 4 authoring4, Lucian 258).
-- Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000551', 'blur.owner@example.com'),
  ('00000000-0000-0000-0000-000000000552', 'blur.editor@example.com'),
  ('00000000-0000-0000-0000-000000000553', 'blur.stranger@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status, cover_storage_key) VALUES
  ('52500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000551', 'blur', 'Blur', 'public', 'ongoing',
   '52500000-0000-0000-0000-000000000001/old.webp');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('52500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000552', 'editor');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000551';
  e constant uuid := '00000000-0000-0000-0000-000000000552';
  s constant uuid := '00000000-0000-0000-0000-000000000553';
  st constant uuid := '52500000-0000-0000-0000-000000000001';
  -- 4 x 3 components: flag (4-1) + (3-1)*9 = 21 = 'L', length 4 + 2*12 = 28
  good constant text := 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
  good_1x1 constant text := '00TI:j';   -- 1 x 1: length 6
BEGIN
  RESET ROLE;
  PERFORM tests.ok('fixture hash has the announced length', char_length(good) = 28);

  PERFORM tests.act_as(o);
  PERFORM tests.rows('the owner writes key and hash together',
    format('UPDATE stories SET cover_storage_key = %L, cover_blurhash = %L WHERE id = %L', st || '/new.webp', good, st), 1);
  PERFORM tests.rows('a 1x1 hash is valid', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', good_1x1, st), 1);
  PERFORM tests.fails_with('a hash shorter than announced', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', left(good, 27), st), '23514');
  PERFORM tests.fails_with('a hash longer than announced', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', good || 'aa', st), '23514');
  PERFORM tests.fails_with('a character outside base 83', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', 'LEHV6nWB2yk8pyo0adR*.7kCMd"j', st), '23514');
  PERFORM tests.fails_with('a size flag beyond 9x9', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', '~' || repeat('0', 43), st), '23514');
  PERFORM tests.fails_with('too long', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', repeat('0', 101), st), '23514');
  PERFORM tests.fails_with('too short', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', '00000', st), '23514');
  PERFORM tests.rows('back to the 4x3 hash', format('UPDATE stories SET cover_blurhash = %L WHERE id = %L', good, st), 1);

  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.rows('an editor cannot change it', format('UPDATE stories SET cover_blurhash = NULL WHERE id = %L', st), 0);
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.rows('a stranger cannot either', format('UPDATE stories SET cover_blurhash = NULL WHERE id = %L', st), 0);
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a guest reads it', (SELECT cover_blurhash = good FROM stories WHERE id = st));
  PERFORM tests.denied('a guest cannot write it', format('UPDATE stories SET cover_blurhash = NULL WHERE id = %L', st));

  -- a new cover without a new hash drops the old one; removing the cover drops it too ----------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  UPDATE stories SET cover_storage_key = st || '/other.webp' WHERE id = st;
  RESET ROLE;
  PERFORM tests.ok('stale hash cleared on a new cover', (SELECT cover_blurhash IS NULL FROM stories WHERE id = st));
  PERFORM tests.act_as(o);
  UPDATE stories SET cover_blurhash = good WHERE id = st;
  UPDATE stories SET title = 'Blur, renamed' WHERE id = st;
  RESET ROLE;
  PERFORM tests.ok('other edits keep it', (SELECT cover_blurhash = good FROM stories WHERE id = st));
  PERFORM tests.act_as(o);
  UPDATE stories SET cover_storage_key = NULL, cover_blurhash = good WHERE id = st;
  RESET ROLE;
  PERFORM tests.ok('no cover, no hash', (SELECT cover_blurhash IS NULL FROM stories WHERE id = st));
END $$;

ROLLBACK;
