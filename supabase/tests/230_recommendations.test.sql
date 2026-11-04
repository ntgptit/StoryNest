-- Recommendations (WP 5.5): reasons, scores, eligibility, privacy of co-reading, limits, access. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000ae', 'rec.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000be', 'rec.suspended@example.com'),
  ('00000000-0000-0000-0000-0000000000ce', 'rec.reader@example.com'),
  ('00000000-0000-0000-0000-0000000000de', 'rec.followed@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000be';
UPDATE app_users SET display_name = 'Tác giả được theo dõi' WHERE id = '00000000-0000-0000-0000-0000000000de';

INSERT INTO categories (id, slug, name) OVERRIDING SYSTEM VALUE VALUES
  (9201, 'rec-cat-1', 'Thể loại một'), (9202, 'rec-cat-2', 'Thể loại hai'), (9203, 'rec-cat-3', 'Thể loại ba');
INSERT INTO tags (id, slug, display_name) OVERRIDING SYSTEM VALUE VALUES
  (9101, 'rec-t1', 'Thẻ A'), (9102, 'rec-t2', 'Thẻ B'), (9103, 'rec-t3', 'Thẻ C');

-- id suffix: 01 SRC, 02 A, 03 B, 04 C, 05 D, 06 E, 07 X, 08 M (mature), 09 P (private), 10 DR (draft), 11 DEL (deleted),
--            12 SUS (suspended owner), 13 Z (unrelated), 14 F2 (library, tag C), 15 G (tag C), 16 AU1, 17 AU2 (private),
--            18 A2 (read by the reader), 19 OWN (the reader's own story)
INSERT INTO stories (id, owner_id, category_id, slug, title, visibility, status, is_mature, deleted_at, updated_at) VALUES
  ('1e000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000ae', 9201, 'src', 'Truyện nguồn', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000ae', 9201, 'a', 'A hai thẻ', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000ae', 9202, 'b', 'B một thẻ', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000ae', 9201, 'c', 'C cùng thể loại', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000ae', 9202, 'd', 'D đọc chung', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000ae', 9201, 'e', 'E đọc chung và thể loại', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000ae', 9202, 'x', 'X chỉ một người đọc chung', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000ae', 9202, 'm', 'M người lớn', 'public', 'ongoing', true, NULL, '2026-11-02 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000ae', 9202, 'p', 'P riêng tư', 'private', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000ae', 9202, 'dr', 'DR nháp', 'public', 'draft', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000ae', 9202, 'del', 'DEL đã xóa', 'public', 'ongoing', false, now(), '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000be', 9202, 'sus', 'SUS chủ bị khóa', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000ae', 9202, 'z', 'Z không liên quan', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000ae', 9203, 'f2', 'F2 truyện đang theo dõi', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-0000000000ae', 9202, 'g', 'G thẻ C', 'public', 'ongoing', false, NULL, '2026-11-03 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-0000000000de', 9202, 'au1', 'AU1 của tác giả được theo dõi', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-0000000000de', 9202, 'au2', 'AU2 riêng tư', 'private', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-0000000000ae', 9201, 'a2', 'A2 đã đọc', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00'),
  ('1e000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-0000000000ce', 9201, 'own', 'OWN của người đọc', 'public', 'ongoing', false, NULL, '2026-11-01 00:00:00+00');

INSERT INTO story_tags (story_id, tag_id) VALUES
  ('1e000000-0000-0000-0000-000000000001', 9101), ('1e000000-0000-0000-0000-000000000001', 9102),
  ('1e000000-0000-0000-0000-000000000002', 9101), ('1e000000-0000-0000-0000-000000000002', 9102),
  ('1e000000-0000-0000-0000-000000000003', 9101),
  ('1e000000-0000-0000-0000-000000000008', 9101), ('1e000000-0000-0000-0000-000000000009', 9101),
  ('1e000000-0000-0000-0000-000000000010', 9101), ('1e000000-0000-0000-0000-000000000011', 9101),
  ('1e000000-0000-0000-0000-000000000012', 9101),
  ('1e000000-0000-0000-0000-000000000014', 9103), ('1e000000-0000-0000-0000-000000000015', 9103),
  ('1e000000-0000-0000-0000-000000000018', 9101), ('1e000000-0000-0000-0000-000000000018', 9102),
  ('1e000000-0000-0000-0000-000000000019', 9101);

-- chapters of the stories that readers read, and the reads: r1 and r2 read SRC, D and E; r3 reads SRC and X (one co-reader only)
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('2e000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', 'one', 1),
  ('2e000000-0000-0000-0000-000000000005', '1e000000-0000-0000-0000-000000000005', 'one', 1),
  ('2e000000-0000-0000-0000-000000000006', '1e000000-0000-0000-0000-000000000006', 'one', 1),
  ('2e000000-0000-0000-0000-000000000007', '1e000000-0000-0000-0000-000000000007', 'one', 1),
  ('2e000000-0000-0000-0000-000000000018', '1e000000-0000-0000-0000-000000000018', 'one', 1);
INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day)
SELECT c.id, c.story_id, r.reader, true, current_date
  FROM (VALUES ('2e000000-0000-0000-0000-000000000001'::uuid, '1e000000-0000-0000-0000-000000000001'::uuid),
               ('2e000000-0000-0000-0000-000000000005', '1e000000-0000-0000-0000-000000000005'),
               ('2e000000-0000-0000-0000-000000000006', '1e000000-0000-0000-0000-000000000006')) c(id, story_id)
  CROSS JOIN (VALUES ('aaaaaaaa-0000-4000-8000-000000000001'::uuid), ('aaaaaaaa-0000-4000-8000-000000000002')) r(reader);
INSERT INTO chapter_read_events (chapter_id, story_id, reader_id, is_anonymous, read_day) VALUES
  ('2e000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', true, current_date),
  ('2e000000-0000-0000-0000-000000000007', '1e000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000003', true, current_date);

-- the signed-in reader: saved SRC, follows F2 and the author AU, has started A2
INSERT INTO story_saves (user_id, story_id) VALUES ('00000000-0000-0000-0000-0000000000ce', '1e000000-0000-0000-0000-000000000001');
INSERT INTO story_follows (user_id, story_id) VALUES ('00000000-0000-0000-0000-0000000000ce', '1e000000-0000-0000-0000-000000000014');
INSERT INTO user_follows (follower_id, followed_id) VALUES ('00000000-0000-0000-0000-0000000000ce', '00000000-0000-0000-0000-0000000000de');
INSERT INTO user_story_progress (user_id, story_id, current_chapter_id)
  VALUES ('00000000-0000-0000-0000-0000000000ce', '1e000000-0000-0000-0000-000000000018', '2e000000-0000-0000-0000-000000000018');

DO $$
DECLARE
  src constant uuid := '1e000000-0000-0000-0000-000000000001';
  s constant text := '1e000000-0000-0000-0000-0000000000';
  reader constant uuid := '00000000-0000-0000-0000-0000000000ce';
  ids uuid[];
  rec record;
BEGIN
  RESET ROLE;
  PERFORM tests.act_as(NULL, 'anon');

  -- 1. similar stories ---------------------------------------------------------------------------------------------------
  PERFORM tests.ok('similar: A and A2 (7, the lower id first), E (5), D and OWN (4), B (3), C (1), in the order the function gives',
    (SELECT array_agg(q.story_id) FROM (SELECT * FROM public.similar_stories(src)) q)
      = ARRAY[(s || '02')::uuid, (s || '18')::uuid, (s || '06')::uuid, (s || '05')::uuid, (s || '19')::uuid, (s || '03')::uuid, (s || '04')::uuid]);
  SELECT * INTO rec FROM public.similar_stories(src) WHERE story_id = (s || '02')::uuid;
  PERFORM tests.ok('A: shared_tags, with the tag names, score 3 x 2 + 1', rec.reason = 'shared_tags' AND rec.detail = 'Thẻ A, Thẻ B' AND rec.score = 7);
  SELECT * INTO rec FROM public.similar_stories(src) WHERE story_id = (s || '03')::uuid;
  PERFORM tests.ok('B: shared_tags with one tag, score 3', rec.reason = 'shared_tags' AND rec.detail = 'Thẻ A' AND rec.score = 3);
  SELECT * INTO rec FROM public.similar_stories(src) WHERE story_id = (s || '04')::uuid;
  PERFORM tests.ok('C: same_category, with the category name, score 1', rec.reason = 'same_category' AND rec.detail = 'Thể loại một' AND rec.score = 1);
  SELECT * INTO rec FROM public.similar_stories(src) WHERE story_id = (s || '05')::uuid;
  PERFORM tests.ok('D: co_readers (two co-readers x 2), no detail', rec.reason = 'co_readers' AND rec.detail IS NULL AND rec.score = 4);
  SELECT * INTO rec FROM public.similar_stories(src) WHERE story_id = (s || '06')::uuid;
  PERFORM tests.ok('E: the strongest reason is shown (co-readers 4 over category 1) and the score is the sum', rec.reason = 'co_readers' AND rec.score = 5);
  PERFORM tests.ok('one co-reader is not enough to recommend (X is not listed): one person''s reading is never revealed',
    NOT EXISTS (SELECT 1 FROM public.similar_stories(src, true, 50) WHERE story_id = (s || '07')::uuid));
  PERFORM tests.ok('the story itself is not recommended', NOT EXISTS (SELECT 1 FROM public.similar_stories(src, true, 50) WHERE story_id = src));
  PERFORM tests.ok('unrelated stories are not listed', NOT EXISTS (SELECT 1 FROM public.similar_stories(src, true, 50) WHERE story_id = (s || '13')::uuid));
  PERFORM tests.ok('private, draft, deleted and suspended-owner stories are never recommended',
    NOT EXISTS (SELECT 1 FROM public.similar_stories(src, true, 50) WHERE story_id IN ((s || '09')::uuid, (s || '10')::uuid, (s || '11')::uuid, (s || '12')::uuid)));
  PERFORM tests.ok('mature stories are hidden by default', NOT EXISTS (SELECT 1 FROM public.similar_stories(src) WHERE story_id = (s || '08')::uuid));
  PERFORM tests.ok('and shown when asked for: M (3) ties with B and comes first because it was updated later',
    (SELECT array_agg(q.story_id) FROM (SELECT * FROM public.similar_stories(src, true, 50)) q)
      = ARRAY[(s || '02')::uuid, (s || '18')::uuid, (s || '06')::uuid, (s || '05')::uuid, (s || '19')::uuid, (s || '08')::uuid, (s || '03')::uuid, (s || '04')::uuid]);
  PERFORM tests.ok('NULL include_mature means hidden', NOT EXISTS (SELECT 1 FROM public.similar_stories(src, NULL) WHERE story_id = (s || '08')::uuid));
  PERFORM tests.ok('limit is honoured', (SELECT count(*) FROM public.similar_stories(src, false, 2)) = 2);
  PERFORM tests.ok('a source story that is private gets nothing', NOT EXISTS (SELECT 1 FROM public.similar_stories((s || '09')::uuid, true, 50)));
  PERFORM tests.ok('a draft source gets nothing', NOT EXISTS (SELECT 1 FROM public.similar_stories((s || '10')::uuid, true, 50)));
  PERFORM tests.ok('a deleted source gets nothing', NOT EXISTS (SELECT 1 FROM public.similar_stories((s || '11')::uuid, true, 50)));
  PERFORM tests.ok('a source of a suspended owner gets nothing', NOT EXISTS (SELECT 1 FROM public.similar_stories((s || '12')::uuid, true, 50)));
  PERFORM tests.ok('a mature source gets nothing unless mature was asked for',
    NOT EXISTS (SELECT 1 FROM public.similar_stories((s || '08')::uuid, false, 50)) AND EXISTS (SELECT 1 FROM public.similar_stories((s || '08')::uuid, true, 50)));
  PERFORM tests.ok('an unknown source gets nothing', NOT EXISTS (SELECT 1 FROM public.similar_stories(gen_random_uuid())));
  PERFORM tests.fails_with('limit 0', format('SELECT * FROM public.similar_stories(%L, false, 0)', src), '22023');
  PERFORM tests.fails_with('limit 51', format('SELECT * FROM public.similar_stories(%L, false, 51)', src), '22023');
  PERFORM tests.fails_with('NULL limit', format('SELECT * FROM public.similar_stories(%L, false, NULL)', src), '22023');
  RESET ROLE;

  -- 2. recommendations for the signed-in reader ------------------------------------------------------------------------------
  PERFORM tests.act_as(reader);
  PERFORM tests.ok('for me: A (7), the followed author''s story (5), then G and B (3, the newer G first), C and E (1, by the category of the saved story)',
    (SELECT array_agg(q.story_id) FROM (SELECT * FROM public.recommend_for_me(false, 50)) q) = ARRAY[(s || '02')::uuid, (s || '16')::uuid, (s || '15')::uuid, (s || '03')::uuid, (s || '04')::uuid, (s || '06')::uuid]);
  SELECT * INTO rec FROM public.recommend_for_me(false, 50) WHERE story_id = (s || '02')::uuid;
  PERFORM tests.ok('A: library_similar, naming the saved story it resembles, score 3 x 2 + 1', rec.reason = 'library_similar' AND rec.detail = 'Truyện nguồn' AND rec.score = 7);
  SELECT * INTO rec FROM public.recommend_for_me(false, 50) WHERE story_id = (s || '16')::uuid;
  PERFORM tests.ok('AU1: followed_author, naming the author, score 5', rec.reason = 'followed_author' AND rec.detail = 'Tác giả được theo dõi' AND rec.score = 5);
  SELECT * INTO rec FROM public.recommend_for_me(false, 50) WHERE story_id = (s || '15')::uuid;
  PERFORM tests.ok('G: library_similar through a story the reader follows (F2)', rec.reason = 'library_similar' AND rec.detail = 'F2 truyện đang theo dõi' AND rec.score = 3);
  SELECT * INTO rec FROM public.recommend_for_me(false, 50) WHERE story_id = (s || '04')::uuid;
  PERFORM tests.ok('C: library_similar through the category, score 1', rec.reason = 'library_similar' AND rec.detail = 'Truyện nguồn' AND rec.score = 1);
  PERFORM tests.ok('the library, what was started and the reader''s own stories are not recommended',
    NOT EXISTS (SELECT 1 FROM public.recommend_for_me(true, 50) WHERE story_id IN ((s || '01')::uuid, (s || '14')::uuid, (s || '18')::uuid, (s || '19')::uuid)));
  PERFORM tests.ok('private, draft, deleted and suspended-owner stories are never recommended',
    NOT EXISTS (SELECT 1 FROM public.recommend_for_me(true, 50) WHERE story_id IN ((s || '09')::uuid, (s || '10')::uuid, (s || '11')::uuid, (s || '12')::uuid, (s || '17')::uuid)));
  PERFORM tests.ok('mature stories are hidden by default and shown when asked for',
    NOT EXISTS (SELECT 1 FROM public.recommend_for_me(false, 50) WHERE story_id = (s || '08')::uuid)
    AND EXISTS (SELECT 1 FROM public.recommend_for_me(true, 50) WHERE story_id = (s || '08')::uuid));
  PERFORM tests.ok('limit is honoured', (SELECT count(*) FROM public.recommend_for_me(false, 2)) = 2);
  PERFORM tests.fails_with('for me: limit 0', 'SELECT * FROM public.recommend_for_me(false, 0)', '22023');
  PERFORM tests.fails_with('for me: limit 51', 'SELECT * FROM public.recommend_for_me(false, 51)', '22023');
  PERFORM tests.fails_with('for me: NULL limit', 'SELECT * FROM public.recommend_for_me(false, NULL)', '22023');
  RESET ROLE;

  PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('for me: no subject', 'SELECT * FROM public.recommend_for_me()', '42501');
  RESET ROLE;
  PERFORM tests.act_as('00000000-0000-0000-0000-0000000000ae');
  PERFORM tests.ok('someone with an empty library and nothing followed gets nothing', NOT EXISTS (SELECT 1 FROM public.recommend_for_me(true, 50)));
  RESET ROLE;

  -- 3. who may call what ---------------------------------------------------------------------------------------------------------
  PERFORM tests.ok('anon may ask for similar stories', has_function_privilege('anon', 'public.similar_stories(uuid, boolean, integer)', 'EXECUTE'));
  PERFORM tests.ok('anon may not ask for personal recommendations (no privilege, not merely a refusal inside)',
    NOT has_function_privilege('anon', 'public.recommend_for_me(boolean, integer)', 'EXECUTE'));
  PERFORM tests.ok('signed-in users may', has_function_privilege('authenticated', 'public.recommend_for_me(boolean, integer)', 'EXECUTE'));
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('the read events themselves stay private', 'SELECT * FROM public.chapter_read_events');
  RESET ROLE;
END $$;

ROLLBACK;
