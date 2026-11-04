-- Follow / save RPC and counter tests (WP 4.3). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000aa', 'fs.author@example.com'),
  ('00000000-0000-0000-0000-0000000000ba', 'fs.follower@example.com'),
  ('00000000-0000-0000-0000-0000000000ca', 'fs.saver@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('1c000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', 'fs-story', 'Library', 'public', 'ongoing'),
  ('1c000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000aa', 'fs-private', 'Private', 'private', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('2c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'one', 1);

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000aa';
  f constant uuid := '00000000-0000-0000-0000-0000000000ba';
  v constant uuid := '00000000-0000-0000-0000-0000000000ca';
  st constant uuid := '1c000000-0000-0000-0000-000000000001';
  priv constant uuid := '1c000000-0000-0000-0000-000000000002';
  ch constant uuid := '2c000000-0000-0000-0000-000000000001';
BEGIN
  RESET ROLE;

  -- 1. who may follow or save ------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot follow', format('SELECT public.set_story_follow(%L, true)', st));
  PERFORM tests.denied('anon cannot save', format('SELECT public.set_story_save(%L, true)', st));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject, no follow', format('SELECT public.set_story_follow(%L, true)', st), '42501');
  PERFORM tests.fails_with('no subject, no save', format('SELECT public.set_story_save(%L, true)', st), '42501');
  RESET ROLE; PERFORM tests.act_as(f);
  PERFORM tests.fails_with('null follow flag', format('SELECT public.set_story_follow(%L, NULL)', st), '22023');
  PERFORM tests.fails_with('null save flag', format('SELECT public.set_story_save(%L, NULL)', st), '22023');
  PERFORM tests.fails_with('cannot follow a private story', format('SELECT public.set_story_follow(%L, true)', priv), '42501');
  PERFORM tests.fails_with('cannot save a private story', format('SELECT public.set_story_save(%L, true)', priv), '42501');
  PERFORM tests.fails_with('cannot follow an unknown story', format('SELECT public.set_story_follow(%L, true)', gen_random_uuid()), '42501');

  -- 2. follow: idempotent, counted once -------------------------------------------------------------------------------------------
  PERFORM tests.ok('follow returns 1', public.set_story_follow(st, true) = 1);
  PERFORM tests.ok('following again still 1', public.set_story_follow(st, true) = 1);
  RESET ROLE;
  PERFORM tests.ok('followers counter 1, saves untouched', (SELECT followers = 1 AND saves = 0 FROM story_stats WHERE story_id = st));
  PERFORM tests.ok('one follow row, no save row', (SELECT count(*) = 1 FROM story_follows WHERE user_id = f) AND NOT EXISTS (SELECT 1 FROM story_saves WHERE user_id = f));

  -- 3. save is independent of follow ---------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(v);
  PERFORM tests.ok('save returns 1', public.set_story_save(st, true) = 1);
  PERFORM tests.ok('saving again still 1', public.set_story_save(st, true) = 1);
  RESET ROLE;
  PERFORM tests.ok('saves counter 1, followers unchanged', (SELECT followers = 1 AND saves = 1 FROM story_stats WHERE story_id = st));
  PERFORM tests.ok('the saver does not follow', NOT EXISTS (SELECT 1 FROM story_follows WHERE user_id = v));
  PERFORM tests.act_as(f);
  PERFORM tests.ok('the follower can also save', public.set_story_save(st, true) = 2);

  -- 4. private rows ------------------------------------------------------------------------------------------------------------------------------
  PERFORM tests.count_is('a user sees only their own follow', 'SELECT 1 FROM story_follows', 1);
  PERFORM tests.count_is('a user sees only their own saves', 'SELECT 1 FROM story_saves', 1);
  PERFORM tests.denied('cannot write counters', format('UPDATE story_stats SET followers = 99 WHERE story_id = %L', st));
  RESET ROLE; PERFORM tests.act_as(v);
  PERFORM tests.count_is('the saver sees no follow rows', 'SELECT 1 FROM story_follows', 0);

  -- 5. only a follower is told about a new chapter -------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    (ch, 'One', '[{"block_id":"3c000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a);
  PERFORM public.publish_chapter(ch);
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('the follower is notified', (SELECT count(*) = 1 FROM notifications WHERE recipient_id = f AND chapter_id = ch));
  PERFORM tests.ok('the user who only saved is not', NOT EXISTS (SELECT 1 FROM notifications WHERE recipient_id = v));

  -- 6. unfollow / unsave: idempotent, never negative ----------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(f);
  PERFORM tests.ok('unfollow returns 0', public.set_story_follow(st, false) = 0);
  PERFORM tests.ok('unfollowing again stays 0', public.set_story_follow(st, false) = 0);
  PERFORM tests.ok('unsave returns 1 (the other saver remains)', public.set_story_save(st, false) = 1);
  PERFORM tests.ok('unsaving again stays 1', public.set_story_save(st, false) = 1);
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.ok('someone who never followed can unfollow safely', public.set_story_follow(st, false) = 0);
  RESET ROLE;
  PERFORM tests.ok('counters match the rows',
    (SELECT followers FROM story_stats WHERE story_id = st) = (SELECT count(*) FROM story_follows WHERE story_id = st)
    AND (SELECT saves FROM story_stats WHERE story_id = st) = (SELECT count(*) FROM story_saves WHERE story_id = st));
  PERFORM tests.ok('the unfollowed reader gets no further notices (row gone)', NOT EXISTS (SELECT 1 FROM story_follows WHERE user_id = f));

  -- 7. any path keeps the counters in step ------------------------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(f);
  PERFORM tests.rows('direct follow insert', format('INSERT INTO story_follows (user_id, story_id) VALUES (%L, %L)', f, st), 1);
  PERFORM tests.rows('direct save insert', format('INSERT INTO story_saves (user_id, story_id) VALUES (%L, %L)', f, st), 1);
  RESET ROLE;
  PERFORM tests.ok('counters followed the direct inserts', (SELECT followers = 1 AND saves = 2 FROM story_stats WHERE story_id = st));
  PERFORM tests.act_as(f);
  PERFORM tests.rows('direct follow delete', format('DELETE FROM story_follows WHERE user_id = %L AND story_id = %L', f, st), 1);
  RESET ROLE;
  PERFORM tests.ok('counter followed the direct delete', (SELECT followers = 0 FROM story_stats WHERE story_id = st));

  -- a counter that drifted below its rows must not make an unfollow fail (the CHECK would refuse a negative number)
  PERFORM tests.act_as(f);
  PERFORM public.set_story_follow(st, true);
  RESET ROLE;
  UPDATE story_stats SET followers = 0 WHERE story_id = st;
  PERFORM tests.act_as(f);
  PERFORM tests.ok('unfollowing with a drifted counter stays at zero', public.set_story_follow(st, false) = 0);
  RESET ROLE;

  -- 8. drift repair, service only --------------------------------------------------------------------------------------------------------------------------------------
  UPDATE story_stats SET followers = 7, saves = 9 WHERE story_id = st;
  PERFORM tests.act_as(f);
  PERFORM tests.denied('clients cannot reconcile', 'SELECT public.reconcile_library_counts()');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('reconcile fixes both counters', public.reconcile_library_counts() = 2);
  RESET ROLE;
  PERFORM tests.ok('followers repaired', (SELECT followers = 0 FROM story_stats WHERE story_id = st));
  PERFORM tests.ok('saves repaired', (SELECT saves = 2 FROM story_stats WHERE story_id = st));
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('a second reconcile has nothing to do', public.reconcile_library_counts() = 0);
END $$;

ROLLBACK;
