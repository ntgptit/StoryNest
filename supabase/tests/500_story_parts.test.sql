-- Story parts (volumes) and chapters.part_id (batch 4 authoring4, Lucian 102). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000501', 'parts.owner@example.com'),
  ('00000000-0000-0000-0000-000000000502', 'parts.editor@example.com'),
  ('00000000-0000-0000-0000-000000000503', 'parts.coauthor@example.com'),
  ('00000000-0000-0000-0000-000000000504', 'parts.stranger@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000501', 'parts-public', 'Public', 'public', 'ongoing'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000501', 'parts-private', 'Private', 'private', 'ongoing'),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000501', 'parts-other', 'Other', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000502', 'editor'),
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000503', 'co_author');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'one', 1),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'two', 2),
  ('51000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'other', 1);

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000501';
  e constant uuid := '00000000-0000-0000-0000-000000000502';
  c constant uuid := '00000000-0000-0000-0000-000000000503';
  s constant uuid := '00000000-0000-0000-0000-000000000504';
  st constant uuid := '50000000-0000-0000-0000-000000000001';
  priv constant uuid := '50000000-0000-0000-0000-000000000002';
  other constant uuid := '50000000-0000-0000-0000-000000000003';
  ch1 constant uuid := '51000000-0000-0000-0000-000000000001';
  ch2 constant uuid := '51000000-0000-0000-0000-000000000002';
  och constant uuid := '51000000-0000-0000-0000-000000000003';
  p1 constant uuid := '52000000-0000-0000-0000-000000000001';
  p2 constant uuid := '52000000-0000-0000-0000-000000000002';
  pp constant uuid := '52000000-0000-0000-0000-000000000003';
  po constant uuid := '52000000-0000-0000-0000-000000000004';
  i integer;
BEGIN
  RESET ROLE;

  -- 1. who may create parts ----------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot create a part', format('INSERT INTO story_parts (story_id, title) VALUES (%L, ''A'')', st));
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.denied('a stranger cannot create a part', format('INSERT INTO story_parts (story_id, title) VALUES (%L, ''A'')', st));
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.rows('an editor creates a part', format('INSERT INTO story_parts (id, story_id, title) VALUES (%L, %L, ''Part one'')', p1, st), 1);
  PERFORM tests.denied('created_at is server-owned', format('INSERT INTO story_parts (story_id, title, created_at) VALUES (%L, ''X'', now())', st));
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.rows('a co-author creates a part', format('INSERT INTO story_parts (id, story_id, title) VALUES (%L, %L, ''Part two'')', p2, st), 1);
  PERFORM tests.fails_with('blank title', format('INSERT INTO story_parts (story_id, title) VALUES (%L, ''  '')', st), '23514');
  PERFORM tests.fails_with('title too long', format('INSERT INTO story_parts (story_id, title) VALUES (%L, %L)', st, repeat('a', 121)), '22001');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('the owner creates a part in the private story', format('INSERT INTO story_parts (id, story_id, title) VALUES (%L, %L, ''Hidden'')', pp, priv), 1);
  PERFORM tests.rows('and one in another story', format('INSERT INTO story_parts (id, story_id, title) VALUES (%L, %L, ''Elsewhere'')', po, other), 1);

  -- 2. who may read them ------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('a guest reads the parts of a public story', format('SELECT 1 FROM story_parts WHERE story_id = %L', st), 2);
  PERFORM tests.count_is('a guest does not see the parts of a private story', format('SELECT 1 FROM story_parts WHERE story_id = %L', priv), 0);
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.count_is('neither does a stranger', format('SELECT 1 FROM story_parts WHERE story_id = %L', priv), 0);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.count_is('the owner does', format('SELECT 1 FROM story_parts WHERE story_id = %L', priv), 1);

  -- 3. rename: team only, title only -------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.rows('a stranger renames nothing', format('UPDATE story_parts SET title = ''X'' WHERE id = %L', p1), 0);
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.rows('an editor renames a part', format('UPDATE story_parts SET title = ''Book one'' WHERE id = %L', p1), 1);
  PERFORM tests.denied('story_id cannot move', format('UPDATE story_parts SET story_id = %L WHERE id = %L', other, p1));

  -- 4. chapters join parts of their own story only -------------------------------------------------------------------
  PERFORM tests.rows('an editor puts a chapter in a part', format('UPDATE chapters SET part_id = %L WHERE id = %L', p1, ch1), 1);
  PERFORM tests.rows('and another', format('UPDATE chapters SET part_id = %L WHERE id = %L', p2, ch2), 1);
  PERFORM tests.fails_with('a part of another story is refused', format('UPDATE chapters SET part_id = %L WHERE id = %L', po, ch1), '23503');
  PERFORM tests.fails_with('an unknown part is refused', format('UPDATE chapters SET part_id = %L WHERE id = %L', gen_random_uuid(), ch1), '23503');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.rows('a stranger cannot move chapters', format('UPDATE chapters SET part_id = NULL WHERE id = %L', ch1), 0);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('even the owner of both stories cannot mix them', format('UPDATE chapters SET part_id = %L WHERE id = %L', p1, och), '23503');
  RESET ROLE;
  PERFORM tests.ok('ch1 is in part one', (SELECT part_id = p1 FROM chapters WHERE id = ch1));
  PERFORM tests.ok('the publish columns are still not writable', NOT has_column_privilege('authenticated', 'chapters', 'status', 'UPDATE'));

  -- 5. delete: owner or co-author; chapters are ungrouped, not deleted ---------------------------------------------------
  PERFORM tests.act_as(e);
  PERFORM tests.rows('an editor cannot delete a part', format('DELETE FROM story_parts WHERE id = %L', p2), 0);
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.rows('a co-author deletes a part', format('DELETE FROM story_parts WHERE id = %L', p2), 1);
  RESET ROLE;
  PERFORM tests.ok('its chapter is ungrouped and still there', (SELECT part_id IS NULL AND story_id = st FROM chapters WHERE id = ch2));
  PERFORM tests.ok('the other chapter keeps its part', (SELECT part_id = p1 FROM chapters WHERE id = ch1));

  -- 6. at most 100 parts per story -----------------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  FOR i IN 1..98 LOOP
    INSERT INTO story_parts (story_id, title) VALUES (st, 'P' || i);
  END LOOP;
  PERFORM tests.ok('99 parts exist', (SELECT count(*) = 99 FROM story_parts WHERE story_id = st));
  INSERT INTO story_parts (story_id, title) VALUES (st, 'Last');
  PERFORM tests.fails_with('the 101st part is refused', format('INSERT INTO story_parts (story_id, title) VALUES (%L, ''Too many'')', st), 'PT409');
  RESET ROLE;
  PERFORM tests.ok('exactly 100 parts', (SELECT count(*) = 100 FROM story_parts WHERE story_id = st));
END $$;

ROLLBACK;
