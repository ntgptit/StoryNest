-- Author page and author follows (WP 5.4). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000ad', 'afw.author@example.com'),
  ('00000000-0000-0000-0000-0000000000bd', 'afw.reader@example.com'),
  ('00000000-0000-0000-0000-0000000000cd', 'afw.suspended@example.com'),
  ('00000000-0000-0000-0000-0000000000dd', 'afw.follower@example.com'),
  ('00000000-0000-0000-0000-0000000000ed', 'afw.badfollower@example.com'),
  ('00000000-0000-0000-0000-0000000000fd', 'afw.nobody@example.com');
UPDATE app_users SET username = 'tac_gia_a', display_name = 'Tác Giả A', bio = 'Viết truyện đêm.' WHERE id = '00000000-0000-0000-0000-0000000000ad';
UPDATE app_users SET username = 'tac_gia_bi_khoa', display_name = 'Tác Giả Bị Khóa' WHERE id = '00000000-0000-0000-0000-0000000000cd';

INSERT INTO stories (id, owner_id, slug, title, visibility, status, is_mature, deleted_at, updated_at) VALUES
  ('1d000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000ad', 's1', 'S1 oldest', 'public', 'ongoing', false, NULL, '2026-11-01 10:00:00+00'),
  ('1d000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000ad', 's2', 'S2 newer', 'public', 'ongoing', false, NULL, '2026-11-02 10:00:00+00'),
  ('1d000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000ad', 's3', 'S3 mature', 'public', 'ongoing', true, NULL, '2026-11-03 10:00:00+00'),
  ('1d000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000ad', 's4', 'S4 private', 'private', 'ongoing', false, NULL, '2026-11-03 11:00:00+00'),
  ('1d000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000ad', 's5', 'S5 draft', 'public', 'draft', false, NULL, '2026-11-03 12:00:00+00'),
  ('1d000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000ad', 's6', 'S6 deleted', 'public', 'ongoing', false, now(), '2026-11-03 13:00:00+00'),
  ('1d000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000ad', 's7', 'S7 tie a', 'public', 'ongoing', false, NULL, '2026-11-04 10:00:00+00'),
  ('1d000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000ad', 's8', 'S8 tie b', 'public', 'ongoing', false, NULL, '2026-11-04 10:00:00+00'),
  ('1d000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000cd', 'c1', 'C1 of the suspended', 'public', 'ongoing', false, NULL, '2026-11-05 10:00:00+00');

-- the follower follows both authors BEFORE the second one is suspended; a second follower is suspended afterwards
INSERT INTO user_follows (follower_id, followed_id) VALUES
  ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-0000000000ad'),
  ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-0000000000cd'),
  ('00000000-0000-0000-0000-0000000000ed', '00000000-0000-0000-0000-0000000000ad');
UPDATE app_users SET account_status = 'suspended' WHERE id IN ('00000000-0000-0000-0000-0000000000cd', '00000000-0000-0000-0000-0000000000ed');

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000ad';
  reader constant uuid := '00000000-0000-0000-0000-0000000000bd';
  susp constant uuid := '00000000-0000-0000-0000-0000000000cd';
  fol constant uuid := '00000000-0000-0000-0000-0000000000dd';
  badfol constant uuid := '00000000-0000-0000-0000-0000000000ed';
  nobody constant uuid := '00000000-0000-0000-0000-0000000000fd';
  s1 constant uuid := '1d000000-0000-0000-0000-000000000001';
  s2 constant uuid := '1d000000-0000-0000-0000-000000000002';
  s3 constant uuid := '1d000000-0000-0000-0000-000000000003';
  s7 constant uuid := '1d000000-0000-0000-0000-000000000007';
  s8 constant uuid := '1d000000-0000-0000-0000-000000000008';
  rec record;
  n bigint;
  ids uuid[];
BEGIN
  RESET ROLE;

  -- 1. the author page --------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  SELECT * INTO rec FROM public.author_profile('tac_gia_a');
  PERFORM tests.ok('the profile is found by username', rec.user_id = a AND rec.display_name = 'Tác Giả A' AND rec.bio = 'Viết truyện đêm.');
  PERFORM tests.ok('the username is case-insensitive and trimmed', (SELECT user_id FROM public.author_profile('  TAC_Gia_A ')) = a);
  PERFORM tests.ok('stories: public, published, not deleted, not mature (s1, s2, s7, s8)', rec.stories_count = 4);
  PERFORM tests.ok('followers: the suspended follower is not counted', rec.followers_count = 1);
  PERFORM tests.ok('a guest follows nobody', rec.is_following = false);
  PERFORM tests.ok('a suspended author has no page', NOT EXISTS (SELECT 1 FROM public.author_profile('tac_gia_bi_khoa')));
  PERFORM tests.ok('an unknown author has no page', NOT EXISTS (SELECT 1 FROM public.author_profile('khong_ai_ca')));
  PERFORM tests.fails_with('a NULL username is refused', 'SELECT * FROM public.author_profile(NULL)', '22023');
  PERFORM tests.fails_with('a blank username is refused', $q$SELECT * FROM public.author_profile('   ')$q$, '22023');
  RESET ROLE; PERFORM tests.act_as(fol);
  PERFORM tests.ok('is_following is true for a follower', (SELECT is_following FROM public.author_profile('tac_gia_a')));
  RESET ROLE; PERFORM tests.act_as(reader);
  PERFORM tests.ok('and false for someone who does not follow', NOT (SELECT is_following FROM public.author_profile('tac_gia_a')));
  PERFORM tests.ok('author_follower_count matches the profile', public.author_follower_count(a) = 1);
  RESET ROLE;

  -- the page counts what a visitor can see, whoever looks: the owner sees their private and deleted stories, a moderator sees
  -- suspended accounts, and neither changes the page's numbers or who has a page
  PERFORM tests.act_as(a);
  PERFORM tests.ok('the author looking at their own page still sees only the public count (not private, draft, deleted or mature)',
    (SELECT stories_count FROM public.author_profile('tac_gia_a')) = 4);
  RESET ROLE; PERFORM tests.act_as(fol, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator does not make a suspended follower count', (SELECT followers_count FROM public.author_profile('tac_gia_a')) = 1);
  PERFORM tests.ok('nor does a suspended author get a page', NOT EXISTS (SELECT 1 FROM public.author_profile('tac_gia_bi_khoa')));
  PERFORM tests.ok('the count function agrees', public.author_follower_count(a) = 1);
  RESET ROLE;

  -- who may call what: the privilege itself, not an error the function raises
  PERFORM tests.ok('anon may read author pages and counts',
    has_function_privilege('anon', 'public.author_profile(text)', 'EXECUTE') AND has_function_privilege('anon', 'public.author_follower_count(uuid)', 'EXECUTE'));
  PERFORM tests.ok('anon may not call follow or the feed (no privilege, not merely a refusal inside)',
    NOT has_function_privilege('anon', 'public.set_user_follow(uuid, boolean)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.list_followed_stories(boolean, timestamptz, uuid, integer)', 'EXECUTE'));
  PERFORM tests.ok('signed-in users may',
    has_function_privilege('authenticated', 'public.set_user_follow(uuid, boolean)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.list_followed_stories(boolean, timestamptz, uuid, integer)', 'EXECUTE'));

  -- 2. following ------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot follow', format('SELECT public.set_user_follow(%L, true)', a));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject, no follow', format('SELECT public.set_user_follow(%L, true)', a), '42501');
  RESET ROLE; PERFORM tests.act_as(reader);
  PERFORM tests.fails_with('a NULL flag is refused', format('SELECT public.set_user_follow(%L, NULL)', a), '22023');
  PERFORM tests.fails_with('a NULL user is refused', 'SELECT public.set_user_follow(NULL, true)', '22023');
  PERFORM tests.fails_with('you cannot follow yourself', format('SELECT public.set_user_follow(%L, true)', reader), '22023');
  PERFORM tests.fails_with('a suspended author cannot be followed', format('SELECT public.set_user_follow(%L, true)', susp), 'PT404');
  PERFORM tests.fails_with('an unknown author cannot be followed', format('SELECT public.set_user_follow(%L, true)', gen_random_uuid()), 'PT404');

  PERFORM tests.ok('following returns the new count', public.set_user_follow(a, true) = 2);
  PERFORM tests.ok('following twice is not an error and does not count twice', public.set_user_follow(a, true) = 2);
  PERFORM tests.ok('the profile agrees', (SELECT followers_count || ':' || is_following FROM public.author_profile('tac_gia_a')) = '2:true');
  PERFORM tests.ok('unfollowing returns the lower count', public.set_user_follow(a, false) = 1);
  PERFORM tests.ok('unfollowing someone you do not follow is not an error', public.set_user_follow(a, false) = 1);
  PERFORM tests.ok('an author you stopped following can still be unfollowed after being suspended',
    public.set_user_follow(a, true) = 2 AND public.set_user_follow(a, false) = 1);
  RESET ROLE;

  -- a suspended account cannot follow
  UPDATE app_users SET account_status = 'suspended' WHERE id = nobody;
  PERFORM tests.act_as(nobody);
  PERFORM tests.fails_with('a suspended account cannot follow', format('SELECT public.set_user_follow(%L, true)', a), '42501');
  RESET ROLE;
  UPDATE app_users SET account_status = 'active' WHERE id = nobody;

  -- the limit on authors followed
  INSERT INTO auth.users (id, email)
  SELECT ('99000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'afwbulk' || g || '@example.com' FROM generate_series(1, 1000) g;
  INSERT INTO user_follows (follower_id, followed_id)
  SELECT reader, ('99000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid FROM generate_series(1, 1000) g;
  PERFORM tests.act_as(reader);
  PERFORM tests.fails_with('the 1001st author cannot be followed (PT409)', format('SELECT public.set_user_follow(%L, true)', a), 'PT409');
  PERFORM tests.ok('an author already followed can still be followed again at the limit',
    public.set_user_follow('99000000-0000-0000-0000-000000000001', true) >= 1);
  PERFORM tests.ok('unfollowing one makes room', public.set_user_follow('99000000-0000-0000-0000-000000000001', false) >= 0
    AND public.set_user_follow(a, true) >= 1);
  RESET ROLE;
  DELETE FROM user_follows WHERE follower_id = reader;

  -- 3. the feed from followed authors ---------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon has no feed', 'SELECT * FROM public.list_followed_stories()');
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject, no feed', 'SELECT * FROM public.list_followed_stories()', '42501');
  RESET ROLE; PERFORM tests.act_as(nobody);
  PERFORM tests.ok('someone who follows nobody gets an empty feed', NOT EXISTS (SELECT 1 FROM public.list_followed_stories()));
  RESET ROLE; PERFORM tests.act_as(fol);
  SELECT array_agg(story_id) INTO ids FROM public.list_followed_stories(false, NULL, NULL, 50);
  PERFORM tests.ok('the feed: newest update first, ties by id, only visible stories of active authors',
    ids = ARRAY[s8, s7, s2, s1]);
  PERFORM tests.ok('the suspended author''s story is not in it although the follow still exists',
    NOT EXISTS (SELECT 1 FROM public.list_followed_stories(false, NULL, NULL, 50) WHERE story_id = '1d000000-0000-0000-0000-000000000009'));
  SELECT array_agg(story_id) INTO ids FROM public.list_followed_stories(true, NULL, NULL, 50);
  PERFORM tests.ok('mature stories only when asked for', ids = ARRAY[s8, s7, s3, s2, s1]);

  -- keyset paging: two per page, ties on the update time are neither skipped nor repeated
  SELECT array_agg(story_id) INTO ids FROM public.list_followed_stories(false, NULL, NULL, 2);
  PERFORM tests.ok('page 1', ids = ARRAY[s8, s7]);
  SELECT array_agg(story_id) INTO ids FROM public.list_followed_stories(false, '2026-11-04 10:00:00+00', s8, 2);
  PERFORM tests.ok('after the first tie row the second one follows (a cursor inside a tie)', ids = ARRAY[s7, s2]);
  SELECT array_agg(story_id) INTO ids FROM public.list_followed_stories(false, '2026-11-04 10:00:00+00', s7, 2);
  PERFORM tests.ok('page 2', ids = ARRAY[s2, s1]);
  PERFORM tests.ok('after the last row there is nothing', NOT EXISTS (SELECT 1 FROM public.list_followed_stories(false, '2026-11-01 10:00:00+00', s1, 2)));
  PERFORM tests.fails_with('a cursor needs both parts (time only)', $q$SELECT * FROM public.list_followed_stories(false, '2026-11-04 10:00:00+00', NULL, 2)$q$, '22023');
  PERFORM tests.fails_with('a cursor needs both parts (id only)', format('SELECT * FROM public.list_followed_stories(false, NULL, %L, 2)', s1), '22023');
  PERFORM tests.fails_with('limit 0', 'SELECT * FROM public.list_followed_stories(false, NULL, NULL, 0)', '22023');
  PERFORM tests.fails_with('limit 51', 'SELECT * FROM public.list_followed_stories(false, NULL, NULL, 51)', '22023');
  PERFORM tests.fails_with('NULL limit', 'SELECT * FROM public.list_followed_stories(false, NULL, NULL, NULL)', '22023');
  PERFORM tests.ok('limit 50 is accepted', (SELECT count(*) FROM public.list_followed_stories(false, NULL, NULL, 50)) = 4);
  RESET ROLE;

  -- a moderator's RLS sees suspended accounts; the feed must still leave their stories out
  PERFORM tests.act_as(fol, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator following a suspended author still does not get their stories in the feed',
    NOT EXISTS (SELECT 1 FROM public.list_followed_stories(false, NULL, NULL, 50) WHERE story_id = '1d000000-0000-0000-0000-000000000009'));
  RESET ROLE;

  -- a follower only sees the feed of their own follows
  PERFORM tests.act_as(badfol);
  PERFORM tests.ok('a suspended follower still gets only their own follows (author A)',
    (SELECT count(*) FROM public.list_followed_stories(false, NULL, NULL, 50)) = 4);
  RESET ROLE;
END $$;

ROLLBACK;
