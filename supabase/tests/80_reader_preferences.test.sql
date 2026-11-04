-- user_reader_preferences tests. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a8', 'prefs.one@example.com'),
  ('00000000-0000-0000-0000-0000000000b8', 'prefs.two@example.com');

DO $$
DECLARE
  one constant uuid := '00000000-0000-0000-0000-0000000000a8';
  two constant uuid := '00000000-0000-0000-0000-0000000000b8';
BEGIN
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot read', 'SELECT 1 FROM user_reader_preferences');
  PERFORM tests.denied('anon cannot write', format('INSERT INTO user_reader_preferences (user_id, preferences) VALUES (%L, ''{}'')', one));

  RESET ROLE; PERFORM tests.act_as(one);
  PERFORM tests.rows('own insert', format($q$INSERT INTO user_reader_preferences (user_id, preferences) VALUES (%L, '{"theme":"sepia","fontSize":"l"}')$q$, one), 1);
  PERFORM tests.rows('own update', 'UPDATE user_reader_preferences SET preferences = ''{"theme":"dark"}''', 1);
  -- the client saves with an upsert: it must work for both the first save and later ones
  PERFORM tests.rows('upsert updates the existing row', format($q$INSERT INTO user_reader_preferences (user_id, preferences) VALUES (%L, '{"theme":"light"}')
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id, preferences = EXCLUDED.preferences$q$, one), 1);
  PERFORM tests.denied('an upsert cannot take over another user''s row', format($q$INSERT INTO user_reader_preferences (user_id, preferences) VALUES (%L, '{}')
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id, preferences = EXCLUDED.preferences$q$, two));
  PERFORM tests.rows('back to dark', 'UPDATE user_reader_preferences SET preferences = ''{"theme":"dark"}''', 1);
  PERFORM tests.count_is('reads own row', 'SELECT 1 FROM user_reader_preferences', 1);
  PERFORM tests.denied('cannot write a row for someone else', format($q$INSERT INTO user_reader_preferences (user_id, preferences) VALUES (%L, '{}')$q$, two));
  PERFORM tests.denied('cannot move the row to another user', format('UPDATE user_reader_preferences SET user_id = %L', two));
  PERFORM tests.fails_with('must be a JSON object', 'UPDATE user_reader_preferences SET preferences = ''[1]''', '23514');
  PERFORM tests.fails_with('must stay small', format('UPDATE user_reader_preferences SET preferences = jsonb_build_object(''x'', %L)', repeat('a', 600)), '23514');

  RESET ROLE; PERFORM tests.act_as(two);
  PERFORM tests.count_is('another user sees nothing', 'SELECT 1 FROM user_reader_preferences', 0);
  PERFORM tests.rows('another user cannot update it', 'UPDATE user_reader_preferences SET preferences = ''{}''', 0);
  PERFORM tests.rows('another user cannot delete it', 'DELETE FROM user_reader_preferences', 0);

  RESET ROLE;
  PERFORM tests.ok('the owner row is intact', (SELECT preferences = '{"theme":"dark"}'::jsonb FROM user_reader_preferences WHERE user_id = one));
  PERFORM tests.ok('updated_at is maintained', (SELECT updated_at >= created FROM (SELECT updated_at, now() - interval '1 minute' AS created FROM user_reader_preferences WHERE user_id = one) q));
END $$;

ROLLBACK;
