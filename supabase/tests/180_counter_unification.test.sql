-- Counter unification tests (WP 4.8): comment counter trigger, counter_drift, reconcile_counters. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a9', 'cnt.author@example.com'),
  ('00000000-0000-0000-0000-0000000000b9', 'cnt.reader@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a9', 'cnt-story', 'Counters', 'public', 'ongoing'),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a9', 'cnt-other', 'Other', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('29000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 'one', 1),
  ('29000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000001', 'two', 2),
  ('29000000-0000-0000-0000-000000000003', '19000000-0000-0000-0000-000000000002', 'solo', 1);

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000a9';
  b constant uuid := '00000000-0000-0000-0000-0000000000b9';
  ch1 constant uuid := '29000000-0000-0000-0000-000000000001';
  ch2 constant uuid := '29000000-0000-0000-0000-000000000002';
  ch3 constant uuid := '29000000-0000-0000-0000-000000000003';
  st1 constant uuid := '19000000-0000-0000-0000-000000000001';
  st2 constant uuid := '19000000-0000-0000-0000-000000000002';
  c1 constant uuid := '49000000-0000-0000-0000-000000000001';
  c2 constant uuid := '49000000-0000-0000-0000-000000000002';
  r1 constant uuid := '49000000-0000-0000-0000-000000000003';
  c3 constant uuid := '49000000-0000-0000-0000-000000000004';
  n bigint;
BEGIN
  RESET ROLE;

  -- 1. the comment trigger -------------------------------------------------------------------------------------
  INSERT INTO comments (id, chapter_id, author_id, body) VALUES (c1, ch1, b, 'one'), (c2, ch1, b, 'two');
  INSERT INTO comments (id, chapter_id, parent_comment_id, author_id, body) VALUES (r1, ch1, c1, a, 'a reply');
  INSERT INTO comments (id, chapter_id, author_id, body) VALUES (c3, ch2, b, 'other chapter');
  PERFORM tests.ok('chapter 1 counts three visible comments, replies included', (SELECT comments FROM chapter_stats WHERE chapter_id = ch1) = 3);
  PERFORM tests.ok('chapter 2 counts one', (SELECT comments FROM chapter_stats WHERE chapter_id = ch2) = 1);
  PERFORM tests.ok('the story is the sum of its chapters', (SELECT comments FROM story_stats WHERE story_id = st1) = 4);
  PERFORM tests.ok('another story is not touched', coalesce((SELECT comments FROM story_stats WHERE story_id = st2), 0) = 0);

  UPDATE comments SET body = 'edited' WHERE id = c1;
  PERFORM tests.ok('editing the text moves nothing', (SELECT comments FROM story_stats WHERE story_id = st1) = 4);

  UPDATE comments SET status = 'hidden' WHERE id = c1;
  PERFORM tests.ok('hiding a comment lowers both counters', (SELECT comments FROM chapter_stats WHERE chapter_id = ch1) = 2 AND (SELECT comments FROM story_stats WHERE story_id = st1) = 3);
  UPDATE comments SET status = 'deleted' WHERE id = c1;
  PERFORM tests.ok('hidden -> deleted moves nothing (already not counted)', (SELECT comments FROM chapter_stats WHERE chapter_id = ch1) = 2);
  UPDATE comments SET status = 'visible' WHERE id = c1;
  PERFORM tests.ok('restoring a comment raises both counters', (SELECT comments FROM chapter_stats WHERE chapter_id = ch1) = 3 AND (SELECT comments FROM story_stats WHERE story_id = st1) = 4);

  DELETE FROM comments WHERE id = c1;   -- cascades to its reply r1
  PERFORM tests.ok('deleting a parent removes it and its reply from the counters', (SELECT comments FROM chapter_stats WHERE chapter_id = ch1) = 1 AND (SELECT comments FROM story_stats WHERE story_id = st1) = 2);

  -- a hidden comment inserted directly does not count
  INSERT INTO comments (chapter_id, author_id, body, status) VALUES (ch3, b, 'born hidden', 'hidden');
  PERFORM tests.ok('a comment born hidden is not counted', coalesce((SELECT comments FROM story_stats WHERE story_id = st2), 0) = 0);

  -- add and remove many times: back to the starting value
  FOR i IN 1..5 LOOP
    INSERT INTO comments (id, chapter_id, author_id, body) VALUES ('49000000-0000-0000-0000-0000000000f0'::uuid, ch3, b, 'again');
    DELETE FROM comments WHERE id = '49000000-0000-0000-0000-0000000000f0';
  END LOOP;
  PERFORM tests.ok('repeated add/delete leaves the counter at zero', (SELECT comments FROM story_stats WHERE story_id = st2) = 0);

  -- 2. no drift after normal use --------------------------------------------------------------------------------
  PERFORM tests.ok('counter_drift reports nothing for the test stories',
    NOT EXISTS (SELECT 1 FROM public.counter_drift() WHERE scope_id IN (st1, st2, ch1, ch2, ch3)));

  -- 3. drift is detected and repaired -----------------------------------------------------------------------------
  UPDATE story_stats SET comments = 99, followers = 7, saves = 5, votes = 3 WHERE story_id = st1;
  UPDATE chapter_stats SET comments = 40, votes = 2 WHERE chapter_id = ch1;
  SELECT count(*) INTO n FROM public.counter_drift() WHERE scope_id IN (st1, ch1);
  PERFORM tests.ok('six drifted counters are all reported', n = 6);
  PERFORM tests.ok('the report carries stored and actual',
    EXISTS (SELECT 1 FROM public.counter_drift() WHERE counter = 'comments' AND scope = 'story' AND scope_id = st1 AND stored = 99 AND actual = 2));
  PERFORM tests.ok('a correct counter is not reported',
    NOT EXISTS (SELECT 1 FROM public.counter_drift() WHERE counter = 'comments' AND scope = 'chapter' AND scope_id = ch2));

  PERFORM tests.ok('reconcile_counters returns the rows it corrected', public.reconcile_counters() >= 6);
  PERFORM tests.ok('after reconcile there is no drift', NOT EXISTS (SELECT 1 FROM public.counter_drift() WHERE scope_id IN (st1, st2, ch1, ch2, ch3)));
  PERFORM tests.ok('values are the real ones', (SELECT comments FROM story_stats WHERE story_id = st1) = 2
     AND (SELECT followers FROM story_stats WHERE story_id = st1) = 0 AND (SELECT votes FROM chapter_stats WHERE chapter_id = ch1) = 0);
  PERFORM tests.ok('a second reconcile has nothing to do for these', NOT EXISTS (SELECT 1 FROM public.counter_drift() WHERE scope_id IN (st1, ch1)));

  -- a stats row that is missing while comments exist is created
  DELETE FROM chapter_stats WHERE chapter_id = ch2;
  PERFORM tests.ok('a missing stats row is drift', EXISTS (SELECT 1 FROM public.counter_drift() WHERE scope = 'chapter' AND scope_id = ch2 AND stored = 0 AND actual = 1));
  PERFORM public.reconcile_comment_counts();
  PERFORM tests.ok('reconcile recreates it', (SELECT comments FROM chapter_stats WHERE chapter_id = ch2) = 1);

  -- 4. who may call what ------------------------------------------------------------------------------------------
  PERFORM tests.act_as(b);
  PERFORM tests.denied('a signed-in user cannot read drift', 'SELECT * FROM public.counter_drift()');
  RESET ROLE; PERFORM tests.act_as(b);
  PERFORM tests.denied('a signed-in user cannot reconcile', 'SELECT public.reconcile_counters()');
  RESET ROLE; PERFORM tests.act_as(b);
  PERFORM tests.denied('a signed-in user cannot reconcile comments', 'SELECT public.reconcile_comment_counts()');
  RESET ROLE; PERFORM tests.act_as(b);
  PERFORM tests.denied('the trigger function is not callable', 'SELECT public.apply_comment_delta()');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot read drift', 'SELECT * FROM public.counter_drift()');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('service_role can read drift', (SELECT count(*) FROM public.counter_drift()) >= 0);
  RESET ROLE;
END $$;

ROLLBACK;
