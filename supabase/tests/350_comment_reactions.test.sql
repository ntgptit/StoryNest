-- Comment reactions (batch 4 · community4, Lucian 077): the toggle RPC, its limits, the counts in the cards. Rolled back.
BEGIN;

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-000000000351', 'rx.author@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000352', 'rx.one@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000353', 'rx.two@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000354', 'rx.mod@example.com', '{"role":"moderator"}');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('35000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000351', 'rx-story', 'Reactions', 'public', 'ongoing'),
  ('35000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000351', 'rx-private', 'Private', 'private', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('35100000-0000-0000-0000-000000000001', '35000000-0000-0000-0000-000000000001', 'one', 1),
  ('35100000-0000-0000-0000-000000000002', '35000000-0000-0000-0000-000000000002', 'secret', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-000000000351';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('35100000-0000-0000-0000-000000000001', 'One', '[{"block_id":"35200000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a),
    ('35100000-0000-0000-0000-000000000002', 'Secret', '[{"block_id":"35200000-0000-0000-0000-000000000002","type":"paragraph","text":"b"}]'::jsonb, a);
  PERFORM public.publish_chapter('35100000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('35100000-0000-0000-0000-000000000002');
  PERFORM public.post_comment('35300000-0000-4000-8000-000000000001', '35100000-0000-0000-0000-000000000001', NULL, NULL, 'Hay quá');
  PERFORM public.post_comment('35300000-0000-4000-8000-000000000002', '35100000-0000-0000-0000-000000000002', NULL, NULL, 'Bí mật');
END $$;

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-000000000351';
  r constant uuid := '00000000-0000-0000-0000-000000000352';
  o constant uuid := '00000000-0000-0000-0000-000000000353';
  m constant uuid := '00000000-0000-0000-0000-000000000354';
  ch constant uuid := '35100000-0000-0000-0000-000000000001';
  k constant uuid := '35300000-0000-4000-8000-000000000001';
  secret constant uuid := '35300000-0000-4000-8000-000000000002';
  counts jsonb;
  card record;
  hint text;
  n integer;
BEGIN
  RESET ROLE;

  -- 1. who may react ------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot react', format('SELECT public.set_comment_reaction(%L, ''laugh'', true)', k));
  PERFORM tests.denied('a guest cannot read reactions', 'SELECT 1 FROM comment_reactions');
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject, no reaction', format('SELECT public.set_comment_reaction(%L, ''laugh'', true)', k), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('unknown reaction', format('SELECT public.set_comment_reaction(%L, ''heart'', true)', k), '22023');
  PERFORM tests.fails_with('null flag', format('SELECT public.set_comment_reaction(%L, ''laugh'', NULL)', k), '22023');
  PERFORM tests.fails_with('a comment the reader cannot see', format('SELECT public.set_comment_reaction(%L, ''laugh'', true)', secret), 'PT404');
  PERFORM tests.fails_with('an unknown comment', format('SELECT public.set_comment_reaction(%L, ''laugh'', true)', gen_random_uuid()), 'PT404');
  PERFORM tests.denied('no direct insert', format('INSERT INTO comment_reactions (comment_id, user_id, reaction) VALUES (%L, %L, ''laugh'')', k, r));

  -- 2. idempotent toggle, several reactions per reader -------------------------------------------------------------
  counts := public.set_comment_reaction(k, 'laugh', true);
  PERFORM tests.ok('first laugh counts 1', counts = '{"laugh": 1}'::jsonb);
  counts := public.set_comment_reaction(k, 'laugh', true);
  PERFORM tests.ok('repeating changes nothing', counts = '{"laugh": 1}'::jsonb);
  counts := public.set_comment_reaction(k, 'fire', true);
  PERFORM tests.ok('a second kind from the same reader', counts = '{"laugh": 1, "fire": 1}'::jsonb);
  RESET ROLE; PERFORM tests.act_as(o);
  counts := public.set_comment_reaction(k, 'laugh', true);
  PERFORM tests.ok('another reader adds up', counts = '{"laugh": 2, "fire": 1}'::jsonb);
  PERFORM tests.count_is('a reader sees only their own rows', 'SELECT 1 FROM comment_reactions', 1);
  PERFORM tests.denied('no direct delete either', format('DELETE FROM comment_reactions WHERE user_id = %L', r));

  -- 3. the cards carry counts and the caller's own reactions --------------------------------------------------------
  SELECT * INTO card FROM public.list_comments(ch) WHERE id = k;
  PERFORM tests.ok('card counts', card.reactions = '{"laugh": 2, "fire": 1}'::jsonb);
  PERFORM tests.ok('card mine', card.my_reactions = ARRAY['laugh']);
  PERFORM tests.ok('the like is untouched', card.like_count = 0 AND card.liked_by_me = false);
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  SELECT * INTO card FROM public.list_comments(ch) WHERE id = k;
  PERFORM tests.ok('a guest sees counts but no own reactions', card.reactions ->> 'laugh' = '2' AND card.my_reactions = ARRAY[]::text[]);

  -- 4. taking back -----------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(r);
  counts := public.set_comment_reaction(k, 'fire', false);
  PERFORM tests.ok('fire gone', counts = '{"laugh": 2}'::jsonb);
  counts := public.set_comment_reaction(k, 'fire', false);
  PERFORM tests.ok('taking back twice is harmless', counts = '{"laugh": 2}'::jsonb);

  -- 5. the abuse limit -------------------------------------------------------------------------------------------------
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 2 WHERE code = 'reaction_rate_burst';
  PERFORM tests.act_as(r);
  PERFORM public.set_comment_reaction(k, 'wow', true);       -- laugh + wow = 2 standing reactions in the window
  hint := NULL;
  BEGIN
    PERFORM public.set_comment_reaction(k, 'clap', true);
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> 'PT429' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  END;
  PERFORM tests.ok('the burst limit is hit with its hint', hint = 'reaction_rate_burst');
  PERFORM tests.ok('repeating an existing reaction is not counted', public.set_comment_reaction(k, 'wow', true) ->> 'wow' = '1');
  PERFORM tests.ok('taking one back is allowed at the limit', NOT (public.set_comment_reaction(k, 'wow', false) ? 'wow'));
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM public.set_comment_reaction(k, 'clap', true);
  PERFORM public.set_comment_reaction(k, 'sad', true);
  PERFORM tests.ok('moderators are exempt', (public.set_comment_reaction(k, 'thumbs_up', true) ->> 'thumbs_up') = '1');
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 60 WHERE code = 'reaction_rate_burst';

  -- 6. a suspended account cannot react; a deleted comment shows no reactions --------------------------------------------
  UPDATE app_users SET account_status = 'suspended' WHERE id = o;
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('suspended', format('SELECT public.set_comment_reaction(%L, ''wow'', true)', k), '42501');
  RESET ROLE;
  UPDATE app_users SET account_status = 'active' WHERE id = o;
  PERFORM tests.act_as(a);
  PERFORM public.delete_comment(k);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a deleted comment cannot be reacted to', format('SELECT public.set_comment_reaction(%L, ''wow'', true)', k), 'PT404');
  RESET ROLE;
  SELECT count(*) INTO n FROM comment_reactions WHERE comment_id = k;
  PERFORM tests.ok('rows survive a soft delete (cascade only on a hard delete)', n > 0);
  DELETE FROM comments WHERE id = k;
  PERFORM tests.ok('a hard delete takes the reactions along', NOT EXISTS (SELECT 1 FROM comment_reactions WHERE comment_id = k));
END $$;

ROLLBACK;
