-- Chapter vote RPC and counter tests (WP 4.1). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a8', 'vote.author@example.com'),
  ('00000000-0000-0000-0000-0000000000b8', 'vote.one@example.com'),
  ('00000000-0000-0000-0000-0000000000c8', 'vote.two@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a8', 'vote-story', 'Votes', 'public', 'ongoing'),
  ('18000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a8', 'vote-private', 'Private', 'private', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('28000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 'one', 1),
  ('28000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000001', 'two', 2),
  ('28000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000001', 'unpublished', 3),
  ('28000000-0000-0000-0000-000000000009', '18000000-0000-0000-0000-000000000002', 'secret', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a8';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('28000000-0000-0000-0000-000000000001', 'One', '[{"block_id":"38000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a),
    ('28000000-0000-0000-0000-000000000002', 'Two', '[{"block_id":"38000000-0000-0000-0000-000000000002","type":"paragraph","text":"b"}]'::jsonb, a),
    ('28000000-0000-0000-0000-000000000009', 'Secret', '[{"block_id":"38000000-0000-0000-0000-000000000009","type":"paragraph","text":"c"}]'::jsonb, a);
  PERFORM public.publish_chapter('28000000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('28000000-0000-0000-0000-000000000002');
  PERFORM public.publish_chapter('28000000-0000-0000-0000-000000000009');
END $$;

DO $$
DECLARE
  r constant uuid := '00000000-0000-0000-0000-0000000000b8';
  o constant uuid := '00000000-0000-0000-0000-0000000000c8';
  ch1 constant uuid := '28000000-0000-0000-0000-000000000001';
  ch2 constant uuid := '28000000-0000-0000-0000-000000000002';
  ch3 constant uuid := '28000000-0000-0000-0000-000000000003';
  secret constant uuid := '28000000-0000-0000-0000-000000000009';
  st constant uuid := '18000000-0000-0000-0000-000000000001';
  n bigint;
BEGIN
  RESET ROLE;

  -- 1. who may vote -----------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot vote', format('SELECT public.set_chapter_vote(%L, true)', ch1));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');   -- a token without a subject
  PERFORM tests.fails_with('no subject, no vote', format('SELECT public.set_chapter_vote(%L, true)', ch1), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('null vote flag', format('SELECT public.set_chapter_vote(%L, NULL)', ch1), '22023');
  PERFORM tests.fails_with('cannot vote on a chapter of a private story', format('SELECT public.set_chapter_vote(%L, true)', secret), '42501');
  PERFORM tests.fails_with('cannot vote on an unpublished chapter', format('SELECT public.set_chapter_vote(%L, true)', ch3), '42501');
  PERFORM tests.fails_with('cannot vote on an unknown chapter', format('SELECT public.set_chapter_vote(%L, true)', gen_random_uuid()), '42501');

  -- 2. idempotent vote: a repeat counts once ---------------------------------------------------------------------
  PERFORM tests.ok('first vote returns 1', public.set_chapter_vote(ch1, true) = 1);
  PERFORM tests.ok('repeating the vote still returns 1', public.set_chapter_vote(ch1, true) = 1);
  RESET ROLE;
  PERFORM tests.ok('chapter counter is 1', (SELECT votes = 1 FROM chapter_stats WHERE chapter_id = ch1));
  PERFORM tests.ok('story counter is 1', (SELECT votes = 1 FROM story_stats WHERE story_id = st));
  PERFORM tests.ok('one vote row', (SELECT count(*) = 1 FROM chapter_votes WHERE user_id = r));

  -- 3. several voters and chapters add up ---------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM tests.ok('second voter makes 2', public.set_chapter_vote(ch1, true) = 2);
  PERFORM public.set_chapter_vote(ch2, true);
  RESET ROLE;
  PERFORM tests.ok('story counter sums chapters', (SELECT votes = 3 FROM story_stats WHERE story_id = st));
  PERFORM tests.ok('chapter two has its own counter', (SELECT votes = 1 FROM chapter_stats WHERE chapter_id = ch2));

  -- 4. own votes only ---------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM tests.count_is('a voter sees only their own vote rows', 'SELECT 1 FROM chapter_votes', 1);
  PERFORM tests.denied('cannot write counters', format('UPDATE chapter_stats SET votes = 99 WHERE chapter_id = %L', ch1));

  -- 5. unvote is idempotent and never negative -------------------------------------------------------------------------
  PERFORM tests.ok('unvote returns 1', public.set_chapter_vote(ch1, false) = 1);
  PERFORM tests.ok('repeating the unvote changes nothing', public.set_chapter_vote(ch1, false) = 1);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('a voter who never voted can unvote safely', public.set_chapter_vote(ch2, false) = 0);
  PERFORM tests.ok('and again', public.set_chapter_vote(ch2, false) = 0);
  RESET ROLE;
  PERFORM tests.ok('counters match the rows',
    (SELECT votes FROM chapter_stats WHERE chapter_id = ch1) = (SELECT count(*) FROM chapter_votes WHERE chapter_id = ch1)
    AND (SELECT votes FROM story_stats WHERE story_id = st) = (SELECT count(*) FROM chapter_votes v JOIN chapters c ON c.id = v.chapter_id WHERE c.story_id = st));

  -- 6. any path keeps the counters in step (direct insert and delete) --------------------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM tests.rows('direct insert', format('INSERT INTO chapter_votes (user_id, chapter_id) VALUES (%L, %L)', r, ch2), 1);
  RESET ROLE;
  PERFORM tests.ok('counter followed the direct insert', (SELECT votes = 1 FROM chapter_stats WHERE chapter_id = ch2));
  PERFORM tests.act_as(r);
  PERFORM tests.rows('direct delete', format('DELETE FROM chapter_votes WHERE user_id = %L AND chapter_id = %L', r, ch2), 1);
  RESET ROLE;
  PERFORM tests.ok('counter followed the direct delete', (SELECT votes = 0 FROM chapter_stats WHERE chapter_id = ch2));

  -- 7. a drifted counter is repaired, and only by the service ----------------------------------------------------------------------
  UPDATE chapter_stats SET votes = 99 WHERE chapter_id = ch1;
  UPDATE story_stats SET votes = 42 WHERE story_id = st;
  PERFORM tests.act_as(r);
  PERFORM tests.denied('clients cannot reconcile', 'SELECT public.reconcile_vote_counts()');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('reconcile fixes both counters', public.reconcile_vote_counts() = 2);
  RESET ROLE;
  PERFORM tests.ok('chapter counter repaired', (SELECT votes = 1 FROM chapter_stats WHERE chapter_id = ch1));
  PERFORM tests.ok('story counter repaired', (SELECT votes = 1 FROM story_stats WHERE story_id = st));
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('a second reconcile has nothing to do', public.reconcile_vote_counts() = 0);
  RESET ROLE;

  -- 8. a cascade delete of a chapter with votes does not fail ------------------------------------------------------------------------
  INSERT INTO chapter_votes (user_id, chapter_id) VALUES (r, ch3);
  PERFORM tests.ok('vote on the unpublished chapter was counted', (SELECT votes = 1 FROM chapter_stats WHERE chapter_id = ch3));
  DELETE FROM chapters WHERE id = ch3;
  PERFORM tests.ok('chapter and its counter are gone', NOT EXISTS (SELECT 1 FROM chapter_stats WHERE chapter_id = ch3));
  PERFORM tests.act_as(NULL, 'service_role');
  n := public.reconcile_vote_counts();
  RESET ROLE;
  PERFORM tests.ok('the story counter matches its votes after the cascade',
    (SELECT votes FROM story_stats WHERE story_id = st) = (SELECT count(*) FROM chapter_votes v JOIN chapters c ON c.id = v.chapter_id WHERE c.story_id = st));
END $$;

ROLLBACK;
