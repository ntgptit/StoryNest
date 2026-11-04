-- Reading list tests (WP 4.5): permissions by visibility, ordered append, reorder, limits. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a5', 'rl.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b5', 'rl.other@example.com'),
  ('00000000-0000-0000-0000-0000000000c5', 'rl.author@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('1d000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c5', 'rl-one', 'One', 'public', 'ongoing'),
  ('1d000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c5', 'rl-two', 'Two', 'public', 'ongoing'),
  ('1d000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c5', 'rl-three', 'Three', 'public', 'ongoing'),
  ('1d000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000c5', 'rl-secret', 'Secret', 'private', 'ongoing');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000a5';
  x constant uuid := '00000000-0000-0000-0000-0000000000b5';
  s1 constant uuid := '1d000000-0000-0000-0000-000000000001';
  s2 constant uuid := '1d000000-0000-0000-0000-000000000002';
  s3 constant uuid := '1d000000-0000-0000-0000-000000000003';
  secret constant uuid := '1d000000-0000-0000-0000-000000000009';
  lp constant uuid := 'ad000000-0000-0000-0000-000000000001';   -- private
  lu constant uuid := 'ad000000-0000-0000-0000-000000000002';   -- unlisted
  lq constant uuid := 'ad000000-0000-0000-0000-000000000003';   -- public
  n integer;
BEGIN
  RESET ROLE;

  -- 1. who may create and change lists ------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot create a list', format('INSERT INTO reading_lists (id, owner_id, title) VALUES (%L, %L, ''x'')', lp, o));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('create private', format('INSERT INTO reading_lists (id, owner_id, title, visibility) VALUES (%L, %L, ''Riêng'', ''private'')', lp, o), 1);
  PERFORM tests.rows('create unlisted', format('INSERT INTO reading_lists (id, owner_id, title, visibility) VALUES (%L, %L, ''Liên kết'', ''unlisted'')', lu, o), 1);
  PERFORM tests.rows('create public', format('INSERT INTO reading_lists (id, owner_id, title, visibility, description) VALUES (%L, %L, ''Công khai'', ''public'', ''mô tả'')', lq, o), 1);
  PERFORM tests.denied('cannot create a list for someone else', format('INSERT INTO reading_lists (owner_id, title) VALUES (%L, ''x'')', x));
  PERFORM tests.rows('rename', format('UPDATE reading_lists SET title = ''Mới'' WHERE id = %L', lq), 1);

  -- 2. ordered append, idempotent, locked to the owner -------------------------------------------------------------------
  PERFORM tests.ok('first story gets position 1', public.add_story_to_list(lq, s1) = 1);
  PERFORM tests.ok('second gets 2', public.add_story_to_list(lq, s2) = 2);
  PERFORM tests.ok('adding again keeps its place', public.add_story_to_list(lq, s1) = 1);
  PERFORM tests.ok('third gets 3', public.add_story_to_list(lq, s3) = 3);
  PERFORM tests.fails_with('a story the caller cannot read', format('SELECT public.add_story_to_list(%L, %L)', lq, secret), '42501');
  PERFORM tests.fails_with('an unknown list', format('SELECT public.add_story_to_list(%L, %L)', gen_random_uuid(), s1), 'PT404');
  PERFORM public.add_story_to_list(lp, s1);
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('only the owner appends', format('SELECT public.add_story_to_list(%L, %L)', lq, s1), 'PT404');
  PERFORM tests.fails_with('and not to a private list', format('SELECT public.add_story_to_list(%L, %L)', lp, s2), 'PT404');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot append', format('SELECT public.add_story_to_list(%L, %L)', lq, s1));

  -- 3. visibility: private is private, unlisted and public are readable --------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.count_is('another reader cannot see the private list', format('SELECT 1 FROM reading_lists WHERE id = %L', lp), 0);
  PERFORM tests.count_is('nor its items', format('SELECT 1 FROM reading_list_items WHERE reading_list_id = %L', lp), 0);
  PERFORM tests.count_is('they can read the public list', format('SELECT 1 FROM reading_lists WHERE id = %L', lq), 1);
  PERFORM tests.count_is('and its three stories', format('SELECT 1 FROM reading_list_items WHERE reading_list_id = %L', lq), 3);
  PERFORM tests.count_is('and the unlisted list by id', format('SELECT 1 FROM reading_lists WHERE id = %L', lu), 1);
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('a guest reads the public list', format('SELECT 1 FROM reading_lists WHERE id = %L', lq), 1);
  PERFORM tests.count_is('a guest does not see the private one', format('SELECT 1 FROM reading_lists WHERE id = %L', lp), 0);
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.rows('others cannot rename', format('UPDATE reading_lists SET title = ''hack'' WHERE id = %L', lq), 0);
  PERFORM tests.rows('others cannot delete', format('DELETE FROM reading_lists WHERE id = %L', lq), 0);
  PERFORM tests.denied('others cannot add items directly', format('INSERT INTO reading_list_items (reading_list_id, story_id) VALUES (%L, %L)', lq, s1));
  PERFORM tests.rows('others cannot remove items', format('DELETE FROM reading_list_items WHERE reading_list_id = %L', lq), 0);

  -- 4. a story that becomes unreadable disappears from the list for others, not for the data ---------------------------------------------
  RESET ROLE;
  UPDATE stories SET visibility = 'private' WHERE id = s2;
  PERFORM tests.act_as(x);
  PERFORM tests.count_is('the hidden story is not shown to others', format('SELECT 1 FROM reading_list_items WHERE reading_list_id = %L', lq), 2);
  RESET ROLE;
  UPDATE stories SET visibility = 'public' WHERE id = s2;

  -- 5. reorder -------------------------------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM public.reorder_list_items(lq, ARRAY[s3, s1, s2]);
  PERFORM tests.ok('the new order is stored', (SELECT array_agg(story_id ORDER BY sort_order) = ARRAY[s3, s1, s2] FROM reading_list_items WHERE reading_list_id = lq));
  PERFORM tests.ok('positions are 1..n', (SELECT array_agg(sort_order ORDER BY sort_order) = ARRAY[1,2,3] FROM reading_list_items WHERE reading_list_id = lq));
  PERFORM tests.ok('the list shows it changed', (SELECT updated_at >= created_at FROM reading_lists WHERE id = lq));
  PERFORM tests.fails_with('a stale order (a story missing)', format('SELECT public.reorder_list_items(%L, ARRAY[%L, %L]::uuid[])', lq, s3, s1), 'PT409');
  PERFORM tests.fails_with('a foreign story in the order', format('SELECT public.reorder_list_items(%L, ARRAY[%L, %L, %L, %L]::uuid[])', lq, s3, s1, s2, secret), 'PT409');
  PERFORM tests.fails_with('a duplicate', format('SELECT public.reorder_list_items(%L, ARRAY[%L, %L, %L, %L]::uuid[])', lq, s3, s1, s2, s2), '22023');
  PERFORM tests.fails_with('a null', format('SELECT public.reorder_list_items(%L, ARRAY[%L, NULL, %L]::uuid[])', lq, s3, s1), '22023');
  PERFORM tests.ok('nothing moved after the refusals', (SELECT array_agg(story_id ORDER BY sort_order) = ARRAY[s3, s1, s2] FROM reading_list_items WHERE reading_list_id = lq));
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('only the owner reorders', format('SELECT public.reorder_list_items(%L, ARRAY[%L, %L, %L]::uuid[])', lq, s1, s2, s3), 'PT404');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('remove a story', format('DELETE FROM reading_list_items WHERE reading_list_id = %L AND story_id = %L', lq, s1), 1);
  PERFORM tests.ok('the next append continues after the highest position', public.add_story_to_list(lq, s1) = 4);

  -- 6. delete a list takes its items with it -------------------------------------------------------------------------------------------------
  PERFORM tests.rows('delete the list', format('DELETE FROM reading_lists WHERE id = %L', lp), 1);
  RESET ROLE;
  PERFORM tests.ok('its items are gone', NOT EXISTS (SELECT 1 FROM reading_list_items WHERE reading_list_id = lp));

  -- 7. limits ----------------------------------------------------------------------------------------------------------------------------------------
  INSERT INTO reading_lists (owner_id, title) SELECT x, 'bulk ' || g FROM generate_series(1, 100) g;
  PERFORM tests.act_as(x);
  PERFORM tests.fails_with('the 101st list', format('INSERT INTO reading_lists (owner_id, title) VALUES (%L, ''one more'')', x), 'PT409');
  RESET ROLE;
  INSERT INTO stories (owner_id, slug, title, visibility, status)
    SELECT '00000000-0000-0000-0000-0000000000c5', 'bulk-' || g, 'Bulk ' || g, 'public', 'ongoing' FROM generate_series(1, 500) g;
  INSERT INTO reading_list_items (reading_list_id, story_id, sort_order)
    SELECT lu, id, 100 + row_number() OVER () FROM stories WHERE slug LIKE 'bulk-%';
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('the 501st story in a list', format('SELECT public.add_story_to_list(%L, %L)', lu, s3), 'PT409');
END $$;

ROLLBACK;
