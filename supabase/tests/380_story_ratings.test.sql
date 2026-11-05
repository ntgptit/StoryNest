-- Story star ratings (batch 4 · community4, Lucian 016): the upsert RPC, the read requirement, the counters. Rolled back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000381', 'rt.author@example.com'),
  ('00000000-0000-0000-0000-000000000382', 'rt.one@example.com'),
  ('00000000-0000-0000-0000-000000000383', 'rt.two@example.com'),
  ('00000000-0000-0000-0000-000000000384', 'rt.editor@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('38000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000381', 'rt-story', 'Ratings', 'public', 'ongoing'),
  ('38000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000381', 'rt-private', 'Private', 'private', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('38100000-0000-0000-0000-000000000001', '38000000-0000-0000-0000-000000000001', 'one', 1),
  ('38100000-0000-0000-0000-000000000002', '38000000-0000-0000-0000-000000000002', 'secret', 1);
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('38000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000384', 'editor');

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-000000000381';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('38100000-0000-0000-0000-000000000001', 'Một', '[{"block_id":"38200000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a),
    ('38100000-0000-0000-0000-000000000002', 'Kín', '[{"block_id":"38200000-0000-0000-0000-000000000002","type":"paragraph","text":"b"}]'::jsonb, a);
  PERFORM public.publish_chapter('38100000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('38100000-0000-0000-0000-000000000002');
END $$;

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-000000000381';
  r constant uuid := '00000000-0000-0000-0000-000000000382';
  o constant uuid := '00000000-0000-0000-0000-000000000383';
  e constant uuid := '00000000-0000-0000-0000-000000000384';
  st constant uuid := '38000000-0000-0000-0000-000000000001';
  secret constant uuid := '38000000-0000-0000-0000-000000000002';
  ch constant uuid := '38100000-0000-0000-0000-000000000001';
  res record;
  hint text;
BEGIN
  RESET ROLE;

  -- 1. who may rate -----------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot rate', format('SELECT * FROM public.set_story_rating(%L, 5)', st));
  SELECT * INTO res FROM public.get_story_rating(st);
  PERFORM tests.ok('a guest reads the summary', res.rating_count = 0 AND res.rating_avg IS NULL AND res.my_stars IS NULL
    AND res.chapters_read = 0 AND res.chapters_needed = 1);
  PERFORM tests.count_is('nothing for a story the guest cannot read', format('SELECT 1 FROM public.get_story_rating(%L)', secret), 0);
  PERFORM tests.denied('a guest cannot read ratings', 'SELECT 1 FROM story_ratings');
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject', format('SELECT * FROM public.set_story_rating(%L, 5)', st), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a story the reader cannot see', format('SELECT * FROM public.set_story_rating(%L, 5)', secret), 'PT404');
  PERFORM tests.fails_with('an unknown story', format('SELECT * FROM public.set_story_rating(%L, 5)', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('stars out of range', format('SELECT * FROM public.set_story_rating(%L, 6)', st), '22023');
  PERFORM tests.fails_with('zero stars', format('SELECT * FROM public.set_story_rating(%L, 0)', st), '22023');
  hint := NULL;
  BEGIN
    PERFORM public.set_story_rating(st, 4);
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  END;
  PERFORM tests.ok('read a chapter first', hint = 'read_first');
  PERFORM tests.denied('no direct insert', format('INSERT INTO story_ratings (story_id, user_id, stars) VALUES (%L, %L, 5)', st, r));
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM public.save_reading_progress(ch, 50);
  hint := NULL;
  BEGIN
    PERFORM public.set_story_rating(st, 5);
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  END;
  PERFORM tests.ok('a collaborator cannot rate the story', hint = 'own_story');
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.fails_with('nor the owner', format('SELECT * FROM public.set_story_rating(%L, 5)', st), '42501');

  -- 2. rate, re-rate (upsert), counters ------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.save_reading_progress(ch, 10);
  SELECT * INTO res FROM public.get_story_rating(st);
  PERFORM tests.ok('one chapter read now', res.chapters_read = 1);
  SELECT * INTO res FROM public.set_story_rating(st, 4);
  PERFORM tests.ok('first rating', res.rating_count = 1 AND res.rating_avg = 4.00 AND res.my_stars = 4);
  SELECT * INTO res FROM public.set_story_rating(st, 4);
  PERFORM tests.ok('the same rating again changes nothing', res.rating_count = 1 AND res.rating_avg = 4.00);
  SELECT * INTO res FROM public.set_story_rating(st, 2);
  PERFORM tests.ok('re-rating replaces it', res.rating_count = 1 AND res.rating_avg = 2.00 AND res.my_stars = 2);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM public.save_reading_progress(ch, 100);
  SELECT * INTO res FROM public.set_story_rating(st, 5);
  PERFORM tests.ok('two readers average', res.rating_count = 2 AND res.rating_avg = 3.50 AND res.my_stars = 5);
  PERFORM tests.count_is('a reader sees only their own rating', 'SELECT 1 FROM story_ratings', 1);
  PERFORM tests.denied('counters are not client-writable', format('UPDATE story_stats SET rating_sum = 99 WHERE story_id = %L', st));
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('story_stats shows average and count to everyone',
    (SELECT rating_count = 2 AND rating_avg = 3.50 AND rating_sum = 7 FROM story_stats WHERE story_id = st));

  -- 3. taking back, suspension -------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(r);
  SELECT * INTO res FROM public.set_story_rating(st, NULL);
  PERFORM tests.ok('taken back', res.rating_count = 1 AND res.rating_avg = 5.00 AND res.my_stars IS NULL);
  SELECT * INTO res FROM public.set_story_rating(st, NULL);
  PERFORM tests.ok('taking back twice is harmless', res.rating_count = 1);
  RESET ROLE;
  UPDATE app_users SET account_status = 'suspended' WHERE id = r;
  PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a suspended account cannot rate', format('SELECT * FROM public.set_story_rating(%L, 3)', st), '42501');
  RESET ROLE;
  UPDATE app_users SET account_status = 'active' WHERE id = r;

  -- 4. the requirement is a setting; any path keeps the counters right -------------------------------------------------------------------
  UPDATE abuse_limits SET max_value = 0 WHERE code = 'rating_min_chapters_read';
  DELETE FROM user_chapter_progress WHERE user_id = r;
  PERFORM tests.act_as(r);
  SELECT * INTO res FROM public.set_story_rating(st, 1);
  PERFORM tests.ok('with N = 0 no reading is needed', res.rating_count = 2 AND res.rating_avg = 3.00);
  RESET ROLE;
  DELETE FROM story_ratings WHERE user_id = o;
  PERFORM tests.ok('a direct delete moves the counters',
    (SELECT rating_count = 1 AND rating_sum = 1 AND rating_avg = 1.00 FROM story_stats WHERE story_id = st));
  DELETE FROM story_ratings WHERE user_id = r;
  PERFORM tests.ok('no ratings: no average', (SELECT rating_count = 0 AND rating_avg IS NULL FROM story_stats WHERE story_id = st));
END $$;

ROLLBACK;
