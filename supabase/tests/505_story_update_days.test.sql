-- Weekly update schedule stories.update_days (batch 4 authoring4, Lucian 109). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000511', 'days.owner@example.com'),
  ('00000000-0000-0000-0000-000000000512', 'days.editor@example.com'),
  ('00000000-0000-0000-0000-000000000513', 'days.coauthor@example.com'),
  ('00000000-0000-0000-0000-000000000514', 'days.stranger@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('50500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000511', 'days', 'Days', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('50500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000512', 'editor'),
  ('50500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000513', 'co_author');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000511';
  e constant uuid := '00000000-0000-0000-0000-000000000512';
  c constant uuid := '00000000-0000-0000-0000-000000000513';
  s constant uuid := '00000000-0000-0000-0000-000000000514';
  st constant uuid := '50500000-0000-0000-0000-000000000001';
BEGIN
  RESET ROLE;
  PERFORM tests.ok('no schedule by default', (SELECT update_days = 0 FROM stories WHERE id = st));

  PERFORM tests.act_as(o);
  PERFORM tests.rows('the owner sets Mon + Thu', format('UPDATE stories SET update_days = 9 WHERE id = %L', st), 1);
  PERFORM tests.fails_with('a value above 127 is refused', format('UPDATE stories SET update_days = 128 WHERE id = %L', st), '23514');
  PERFORM tests.fails_with('a negative value is refused', format('UPDATE stories SET update_days = -1 WHERE id = %L', st), '23514');
  PERFORM tests.rows('a new story can start with a schedule',
    format('INSERT INTO stories (owner_id, slug, title, update_days) VALUES (%L, ''days-new'', ''New'', 64)', o), 1);
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.rows('a co-author changes it', format('UPDATE stories SET update_days = 127 WHERE id = %L', st), 1);
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.rows('an editor cannot', format('UPDATE stories SET update_days = 1 WHERE id = %L', st), 0);
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.rows('a stranger cannot', format('UPDATE stories SET update_days = 1 WHERE id = %L', st), 0);
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot', format('UPDATE stories SET update_days = 1 WHERE id = %L', st));
  PERFORM tests.ok('a guest reads it on a public story', (SELECT update_days = 127 FROM stories WHERE id = st));
  RESET ROLE;
END $$;

ROLLBACK;
