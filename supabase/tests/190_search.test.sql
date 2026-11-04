-- Search tests (WP 5.1): diacritics, ranking, discovery rules, input limits, index use. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000aa', 'srch.author@example.com'),
  ('00000000-0000-0000-0000-0000000000ba', 'srch.nostory@example.com'),
  ('00000000-0000-0000-0000-0000000000ca', 'srch.suspended@example.com');
UPDATE app_users SET username = 'tac_gia_an', display_name = 'Nguyễn Văn Ân' WHERE id = '00000000-0000-0000-0000-0000000000aa';
UPDATE app_users SET username = 'nguoi_khong_truyen', display_name = 'Người Không Truyện' WHERE id = '00000000-0000-0000-0000-0000000000ba';
UPDATE app_users SET username = 'tac_gia_bi_khoa', display_name = 'Tác Giả Bị Khóa', account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000ca';

INSERT INTO stories (id, owner_id, slug, title, visibility, status, is_mature, deleted_at) VALUES
  ('1a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', 'doc-truyen', 'Đọc truyện mỗi đêm', 'public', 'ongoing', false, NULL),
  ('1a000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000aa', 'dung-bo-cuoc', 'Đừng bỏ cuộc', 'public', 'completed', false, NULL),
  ('1a000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000aa', 'rung-suong', 'Rừng sương mù', 'public', 'ongoing', false, NULL),
  ('1a000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000aa', 'dem-den', 'Đêm đen người lớn', 'public', 'ongoing', true, NULL),
  ('1a000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000aa', 'bi-mat', 'Đọc truyện bí mật', 'private', 'ongoing', false, NULL),
  ('1a000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000aa', 'nhap', 'Đọc truyện nháp', 'public', 'draft', false, NULL),
  ('1a000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000aa', 'da-xoa', 'Đọc truyện đã xóa', 'public', 'ongoing', false, now()),
  ('1a000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000aa', 'yeu', 'Yêu 100% thật lòng', 'public', 'ongoing', false, NULL),
  ('1a000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000ca', 'khoa', 'Truyện của người bị khóa', 'public', 'ongoing', false, NULL);
INSERT INTO tags (id, slug, display_name) OVERRIDING SYSTEM VALUE VALUES
  (9001, 'lang-man-test', 'Lãng mạn thử'), (9002, 'gia-tuong-test', 'Giả tưởng thử'), (9003, 'khong-ai-dung', 'Không ai dùng');
INSERT INTO story_tags (story_id, tag_id) VALUES
  ('1a000000-0000-0000-0000-000000000001', 9001),
  ('1a000000-0000-0000-0000-000000000004', 9001),     -- mature: not counted
  ('1a000000-0000-0000-0000-000000000005', 9002);     -- private only: tag is not discoverable

DO $$
DECLARE
  s1 constant uuid := '1a000000-0000-0000-0000-000000000001';
  s2 constant uuid := '1a000000-0000-0000-0000-000000000002';
  s3 constant uuid := '1a000000-0000-0000-0000-000000000003';
  s4 constant uuid := '1a000000-0000-0000-0000-000000000004';
  s8 constant uuid := '1a000000-0000-0000-0000-000000000008';
  a constant uuid := '00000000-0000-0000-0000-0000000000aa';
  ids uuid[];
  plan text;
  line text;
BEGIN
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');

  -- 1. diacritics and case ----------------------------------------------------------------------------------------
  SELECT array_agg(story_id ORDER BY score DESC) INTO ids FROM public.search_stories('doc truyen');
  PERFORM tests.ok('"doc truyen" finds "Đọc truyện mỗi đêm"', s1 = ANY(ids));
  PERFORM tests.ok('and only the public published one: not the private, draft or deleted story', ids = ARRAY[s1]);
  SELECT array_agg(story_id) INTO ids FROM public.search_stories('ĐỌC TRUYỆN');
  PERFORM tests.ok('upper case with diacritics finds it too', ids = ARRAY[s1]);
  SELECT array_agg(story_id) INTO ids FROM public.search_stories(normalize('Đọc truyện', NFD));
  PERFORM tests.ok('decomposed (NFD) text finds it too', ids = ARRAY[s1]);
  SELECT array_agg(story_id) INTO ids FROM public.search_stories('dung bo cuoc');
  PERFORM tests.ok('"đ" is folded to "d"', ids = ARRAY[s2]);
  SELECT array_agg(story_id) INTO ids FROM public.search_stories('  rung   suong  ');
  PERFORM tests.ok('extra spaces are ignored', ids = ARRAY[s3]);
  SELECT array_agg(story_id) INTO ids FROM public.search_stories('rung suong mo');
  PERFORM tests.ok('a one-letter typo still finds it (trigram similarity)', s3 = ANY(ids));
  PERFORM tests.ok('nothing for a title that does not exist', NOT EXISTS (SELECT 1 FROM public.search_stories('zzz qqq www')));

  -- ranking: an exact phrase scores above 1
  PERFORM tests.ok('the containing title ranks and scores above 1', (SELECT bool_and(score >= 1) FROM public.search_stories('doc truyen')));

  -- 2. LIKE metacharacters are data ---------------------------------------------------------------------------------
  PERFORM tests.ok('"%%%" matches no story rather than every story', NOT EXISTS (SELECT 1 FROM public.search_stories('%%%')));
  PERFORM tests.ok('"___" matches no story rather than every story', NOT EXISTS (SELECT 1 FROM public.search_stories('___')));
  SELECT array_agg(story_id) INTO ids FROM public.search_stories('100%');
  PERFORM tests.ok('"100%" finds the title that has a literal percent sign', ids = ARRAY[s8]);

  -- 3. mature content ----------------------------------------------------------------------------------------------
  PERFORM tests.ok('mature stories are hidden by default', NOT EXISTS (SELECT 1 FROM public.search_stories('dem den')));
  PERFORM tests.ok('and shown when asked for', EXISTS (SELECT 1 FROM public.search_stories('dem den', true) WHERE story_id = s4));
  PERFORM tests.ok('NULL include_mature means hidden', NOT EXISTS (SELECT 1 FROM public.search_stories('dem den', NULL)));
END $$;

DO $$
DECLARE
  s1 constant uuid := '1a000000-0000-0000-0000-000000000001';
  a constant uuid := '00000000-0000-0000-0000-0000000000aa';
  first_id uuid;
  second_id uuid;
  plan text;
  line text;
BEGIN
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');

  -- 4. paging: "ong" is in "Rừng sương mù" and in "Yêu 100% thật lòng"
  SELECT story_id INTO first_id FROM public.search_stories('ong', false, 1, 0);
  SELECT story_id INTO second_id FROM public.search_stories('ong', false, 1, 1);
  PERFORM tests.ok('two pages of one result each are different stories', first_id IS NOT NULL AND second_id IS NOT NULL AND first_id <> second_id);

  -- 5. input limits -------------------------------------------------------------------------------------------------
  PERFORM tests.fails_with('a two-letter query is refused', $q$SELECT * FROM public.search_stories('ab')$q$, '22023');
  PERFORM tests.fails_with('a query that is only spaces is refused', $q$SELECT * FROM public.search_stories('      ')$q$, '22023');
  PERFORM tests.fails_with('a NULL query is refused', $q$SELECT * FROM public.search_stories(NULL)$q$, '22023');
  PERFORM tests.fails_with('a query of 101 characters is refused', format('SELECT * FROM public.search_stories(%L)', repeat('a', 101)), '22023');
  PERFORM tests.ok('a query of exactly 100 characters is accepted', (SELECT count(*) FROM public.search_stories(repeat('a', 100))) >= 0);
  PERFORM tests.ok('a query of exactly 3 characters is accepted', (SELECT count(*) FROM public.search_stories('abc')) >= 0);
  PERFORM tests.fails_with('limit 0 is refused', $q$SELECT * FROM public.search_stories('doc', false, 0, 0)$q$, '22023');
  PERFORM tests.fails_with('limit 51 is refused', $q$SELECT * FROM public.search_stories('doc', false, 51, 0)$q$, '22023');
  PERFORM tests.fails_with('a NULL limit is refused', $q$SELECT * FROM public.search_stories('doc', false, NULL, 0)$q$, '22023');
  PERFORM tests.fails_with('a negative offset is refused', $q$SELECT * FROM public.search_stories('doc', false, 10, -1)$q$, '22023');
  PERFORM tests.fails_with('offset 201 is refused', $q$SELECT * FROM public.search_stories('doc', false, 10, 201)$q$, '22023');
  PERFORM tests.ok('limit 50 and offset 200 are accepted', (SELECT count(*) FROM public.search_stories('doc', false, 50, 200)) >= 0);
  PERFORM tests.fails_with('authors: short query refused', $q$SELECT * FROM public.search_authors('ab')$q$, '22023');
  PERFORM tests.fails_with('tags: short query refused', $q$SELECT * FROM public.search_tags('ab')$q$, '22023');
  PERFORM tests.fails_with('tags: limit 51 refused', $q$SELECT * FROM public.search_tags('abc', 51)$q$, '22023');

  -- 6. authors ----------------------------------------------------------------------------------------------------
  PERFORM tests.ok('"nguyen van an" finds the author by display name', (SELECT user_id FROM public.search_authors('nguyen van an') LIMIT 1) = a);
  PERFORM tests.ok('"tac_gia" finds the author by username', (SELECT user_id FROM public.search_authors('tac_gia') LIMIT 1) = a);
  PERFORM tests.ok('the count is the author''s public non-mature stories', (SELECT stories_count FROM public.search_authors('nguyen van an') LIMIT 1) = 4);
  PERFORM tests.ok('with mature included the count grows', (SELECT stories_count FROM public.search_authors('nguyen van an', true) LIMIT 1) = 5);
  PERFORM tests.ok('an account without public stories is not an author', NOT EXISTS (SELECT 1 FROM public.search_authors('khong truyen')));
  PERFORM tests.ok('a suspended account is not found', NOT EXISTS (SELECT 1 FROM public.search_authors('bi khoa')));
  PERFORM tests.ok('and its stories are not listed in story search either', NOT EXISTS (SELECT 1 FROM public.search_stories('cua nguoi bi khoa')));

  -- 7. tags ---------------------------------------------------------------------------------------------------------
  PERFORM tests.ok('"lang man" finds the tag with the count of visible public stories (mature excluded)',
    (SELECT stories_count FROM public.search_tags('lang man') WHERE tag_id = 9001) = 1);
  PERFORM tests.ok('a tag used only by a private story is not discoverable', NOT EXISTS (SELECT 1 FROM public.search_tags('gia tuong')));
  PERFORM tests.ok('a tag nobody uses is not discoverable', NOT EXISTS (SELECT 1 FROM public.search_tags('khong ai')));

  -- 8. who may call ---------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.ok('a signed-in user searches too, and still never sees their own private story',
    (SELECT array_agg(story_id) FROM public.search_stories('doc truyen')) = ARRAY[s1]);
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('anon may search', (SELECT count(*) FROM public.search_authors('nguyen')) = 1);

  -- a moderator's RLS sees suspended accounts; search must still not list them
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000da', 'authenticated', 'moderator');
  PERFORM tests.ok('moderator: the suspended author is not found', NOT EXISTS (SELECT 1 FROM public.search_authors('bi khoa')));
  PERFORM tests.ok('moderator: the suspended author''s story is not found', NOT EXISTS (SELECT 1 FROM public.search_stories('cua nguoi bi khoa')));
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000ca');
  PERFORM tests.ok('a suspended author does not find themselves', NOT EXISTS (SELECT 1 FROM public.search_authors('bi khoa')));

  -- 9. the indexes are what answers the query -----------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('enable_seqscan', 'off', true);
  plan := '';
  FOR line IN EXECUTE $q$EXPLAIN SELECT id FROM public.stories
      WHERE public.search_normalize(title) LIKE '%doc truyen%' OR public.search_normalize(title) OPERATOR(extensions.%) 'doc truyen'$q$ LOOP
    plan := plan || line || E'\n';
  END LOOP;
  PERFORM tests.ok('story search plan uses idx_stories_title_search', plan LIKE '%idx_stories_title_search%');
  plan := '';
  FOR line IN EXECUTE $q$EXPLAIN SELECT id FROM public.app_users
      WHERE public.search_normalize(username::text) LIKE '%nguyen%' OR public.search_normalize(display_name) LIKE '%nguyen%'$q$ LOOP
    plan := plan || line || E'\n';
  END LOOP;
  PERFORM tests.ok('author search plan uses both user indexes', plan LIKE '%idx_app_users_username_search%' AND plan LIKE '%idx_app_users_display_name_search%');
  plan := '';
  FOR line IN EXECUTE $q$EXPLAIN SELECT id FROM public.tags
      WHERE public.search_normalize(display_name) LIKE '%lang man%' OR public.search_normalize(slug::text) LIKE '%lang man%'$q$ LOOP
    plan := plan || line || E'\n';
  END LOOP;
  PERFORM tests.ok('tag search plan uses both tag indexes', plan LIKE '%idx_tags_display_name_search%' AND plan LIKE '%idx_tags_slug_search%');
  PERFORM set_config('enable_seqscan', 'on', true);
END $$;

ROLLBACK;
