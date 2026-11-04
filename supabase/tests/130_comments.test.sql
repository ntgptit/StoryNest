-- Comment RPC tests (WP 4.2): posting, replies, edit/delete, moderation, likes, paging. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a9', 'cm.author@example.com'),
  ('00000000-0000-0000-0000-0000000000b9', 'cm.reader@example.com'),
  ('00000000-0000-0000-0000-0000000000c9', 'cm.other@example.com'),
  ('00000000-0000-0000-0000-0000000000e9', 'cm.suspended@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000e9';
UPDATE app_users SET username = 'reader_b', display_name = 'Reader B' WHERE id = '00000000-0000-0000-0000-0000000000b9';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a9', 'cm-story', 'Comments', 'public', 'ongoing'),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a9', 'cm-private', 'Private', 'private', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('29000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 'one', 1),
  ('29000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000001', 'two', 2),
  ('29000000-0000-0000-0000-000000000009', '19000000-0000-0000-0000-000000000002', 'secret', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a9';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('29000000-0000-0000-0000-000000000001', 'One', '[{"block_id":"39000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a),
    ('29000000-0000-0000-0000-000000000002', 'Two', '[{"block_id":"39000000-0000-0000-0000-000000000002","type":"paragraph","text":"b"}]'::jsonb, a),
    ('29000000-0000-0000-0000-000000000009', 'Secret', '[{"block_id":"39000000-0000-0000-0000-000000000009","type":"paragraph","text":"c"}]'::jsonb, a);
  PERFORM public.publish_chapter('29000000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('29000000-0000-0000-0000-000000000002');
  PERFORM public.publish_chapter('29000000-0000-0000-0000-000000000009');
END $$;

DO $$
DECLARE
  r constant uuid := '00000000-0000-0000-0000-0000000000b9';
  o constant uuid := '00000000-0000-0000-0000-0000000000c9';
  s constant uuid := '00000000-0000-0000-0000-0000000000e9';
  m constant uuid := '00000000-0000-0000-0000-0000000000d9';
  ch1 constant uuid := '29000000-0000-0000-0000-000000000001';
  ch2 constant uuid := '29000000-0000-0000-0000-000000000002';
  secret constant uuid := '29000000-0000-0000-0000-000000000009';
  b1 constant uuid := '39000000-0000-0000-0000-000000000001';
  b2 constant uuid := '39000000-0000-0000-0000-000000000002';
  k1 constant uuid := 'f9000000-0000-4000-8000-000000000001';
  k2 constant uuid := 'f9000000-0000-4000-8000-000000000002';
  k3 constant uuid := 'f9000000-0000-4000-8000-000000000003';
  k4 constant uuid := 'f9000000-0000-4000-8000-000000000004';
  rp1 constant uuid := 'f9000000-0000-4000-8000-0000000000a1';
  rp2 constant uuid := 'f9000000-0000-4000-8000-0000000000a2';
  got uuid;
  cursor_at timestamptz; cursor_id uuid;
  i integer;
BEGIN
  RESET ROLE;

  -- 1. who may post ---------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot post', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''hi'')', k1, ch1));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject, no comment', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''hi'')', k1, ch1), '42501');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('suspended account cannot post', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''hi'')', k1, ch1), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('cannot comment on a chapter of a private story', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''hi'')', k1, secret), '42501');
  PERFORM tests.fails_with('empty text', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''   '')', k1, ch1), '22023');
  PERFORM tests.fails_with('too long', format('SELECT public.post_comment(%L, %L, NULL, NULL, %L)', k1, ch1, repeat('x', 10001)), '22023');
  PERFORM tests.fails_with('unknown paragraph', format('SELECT public.post_comment(%L, %L, %L, NULL, ''hi'')', k1, ch1, gen_random_uuid()), '22023');
  PERFORM tests.fails_with('a paragraph of another chapter', format('SELECT public.post_comment(%L, %L, %L, NULL, ''hi'')', k1, ch1, b2), '22023');

  -- 2. a chapter comment, retried and resubmitted ------------------------------------------------------------------------
  PERFORM tests.ok('post returns the id', public.post_comment(k1, ch1, NULL, NULL, '  Chương hay quá  ') = k1);
  PERFORM tests.ok('a retry with the same id returns the same comment', public.post_comment(k1, ch1, NULL, NULL, 'Chương hay quá') = k1);
  PERFORM tests.ok('the same text under a new id within 30 s is the first comment', public.post_comment(k4, ch1, NULL, NULL, 'Chương hay quá') = k1);
  RESET ROLE;
  PERFORM tests.ok('only one row, text trimmed', (SELECT count(*) = 1 AND min(body) = 'Chương hay quá' FROM comments WHERE chapter_id = ch1));
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('an id used by someone else', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''khác'')', k1, ch1), 'PT409');

  -- 3. anyone, even a guest, reads it ----------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('guest lists the comment with its author, no likes, no replies',
    (SELECT count(*) = 1 AND min(author_username) = 'reader_b' AND min(author_display_name) = 'Reader B' AND min(body) = 'Chương hay quá'
        AND min(like_count) = 0 AND bool_and(NOT liked_by_me) AND min(reply_count) = 0 AND min(status) = 'visible'
        FROM public.list_comments(ch1)));
  PERFORM tests.count_is('guest sees nothing of a private story', format('SELECT 1 FROM public.list_comments(%L)', secret), 0);

  -- 4. inline comments live under their paragraph --------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.post_comment(k2, ch1, b1, NULL, 'Đoạn này hay');
  PERFORM tests.ok('chapter scope has only the chapter comment', (SELECT count(*) = 1 FROM public.list_comments(ch1, NULL)));
  PERFORM tests.ok('paragraph scope has only the inline comment', (SELECT count(*) = 1 AND min(body) = 'Đoạn này hay' FROM public.list_comments(ch1, b1)));
  PERFORM tests.ok('margin counts', (SELECT count(*) = 1 AND min(comment_count) = 1 AND min(block_id::text) = b1::text FROM public.comment_counts_by_block(ch1)));

  -- 5. replies: one level, same paragraph --------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('reply returns the id', public.post_comment(rp1, ch1, NULL, k2, 'Đồng ý') = rp1);
  RESET ROLE;
  PERFORM tests.ok('a reply sits where its parent sits, whatever was passed', (SELECT block_id = b1 FROM comments WHERE id = rp1));
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('reply to a reply', format('SELECT public.post_comment(%L, %L, NULL, %L, ''x'')', rp2, ch1, rp1), '22023');
  PERFORM tests.fails_with('parent of another chapter', format('SELECT public.post_comment(%L, %L, NULL, %L, ''x'')', rp2, ch2, k2), 'PT404');
  PERFORM tests.fails_with('unknown parent', format('SELECT public.post_comment(%L, %L, NULL, %L, ''x'')', rp2, ch1, gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('a direct insert cannot nest either',
    format('INSERT INTO comments (id, chapter_id, block_id, parent_comment_id, author_id, body) VALUES (%L, %L, %L, %L, %L, ''x'')', rp2, ch1, b1, rp1, o), '22023');
  PERFORM tests.fails_with('a direct insert cannot leave the parent''s paragraph',
    format('INSERT INTO comments (id, chapter_id, block_id, parent_comment_id, author_id, body) VALUES (%L, %L, NULL, %L, %L, ''x'')', rp2, ch1, k2, o), '22023');
  PERFORM tests.ok('replies list', (SELECT count(*) = 1 AND min(body) = 'Đồng ý' AND min(parent_comment_id::text) = k2::text FROM public.list_replies(k2)));
  PERFORM tests.ok('the parent counts its replies', (SELECT reply_count = 1 FROM public.list_comments(ch1, b1)));
  PERFORM tests.ok('margin counts include replies', (SELECT comment_count = 2 FROM public.comment_counts_by_block(ch1)));

  -- 6. edit ---------------------------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.edit_comment(k1, '  Sửa lại  ');
  PERFORM tests.ok('edited text is trimmed and stored', (SELECT body = 'Sửa lại' FROM public.list_comments(ch1, NULL)));
  PERFORM tests.fails_with('empty edit', format('SELECT public.edit_comment(%L, '' '')', k1), '22023');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('only the author edits', format('SELECT public.edit_comment(%L, ''hack'')', k1), 'PT404');
  RESET ROLE;
  UPDATE comments SET created_at = now() - interval '1 hour' WHERE id = k1;   -- the touch trigger moves updated_at to now
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('an old comment that changed is marked edited', (SELECT edited FROM public.list_comments(ch1, NULL)));
  PERFORM tests.ok('a fresh one is not', (SELECT NOT edited FROM public.list_comments(ch1, b1)));

  -- 7. delete: soft, idempotent, and a thread keeps its place -----------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('only the author deletes', format('SELECT public.delete_comment(%L)', k2), 'PT404');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.delete_comment(k2);
  PERFORM public.delete_comment(k2);   -- again: nothing happens
  PERFORM tests.fails_with('unknown comment', format('SELECT public.delete_comment(%L)', gen_random_uuid()), 'PT404');
  RESET ROLE;
  PERFORM tests.ok('the row is kept, marked deleted', (SELECT status = 'deleted' AND deleted_at IS NOT NULL AND body = 'Đoạn này hay' FROM comments WHERE id = k2));
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a deleted comment with a reply stays as a placeholder without text or author',
    (SELECT count(*) = 1 AND min(status) = 'deleted' AND bool_and(body IS NULL) AND bool_and(author_id IS NULL) AND min(reply_count) = 1 FROM public.list_comments(ch1, b1)));
  PERFORM tests.ok('its reply is still readable', (SELECT count(*) = 1 FROM public.list_replies(k2)));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('no reply to a comment the caller can no longer see', format('SELECT public.post_comment(%L, %L, NULL, %L, ''x'')', rp2, ch1, k2), 'PT404');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('the author sees their deleted comment, and still cannot reply to it', format('SELECT public.post_comment(%L, %L, NULL, %L, ''x'')', rp2, ch1, k2), 'PT409');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('no edit of a deleted comment', format('SELECT public.edit_comment(%L, ''x'')', k2), 'PT404');
  PERFORM public.delete_comment(rp1);
  PERFORM tests.act_as(NULL, 'anon');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('with no listable reply left the deleted comment disappears', format('SELECT 1 FROM public.list_comments(%L, %L)', ch1, b1), 0);

  -- 8. moderation: hidden for others, visible to its author ---------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.rows('moderator hides a comment', format('UPDATE comments SET status = ''hidden'' WHERE id = %L', k1), 1);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.count_is('others no longer see it', format('SELECT 1 FROM public.list_comments(%L, NULL)', ch1), 0);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('its author still sees it, marked hidden, with the text',
    (SELECT count(*) = 1 AND min(status) = 'hidden' AND min(body) = 'Sửa lại' FROM public.list_comments(ch1, NULL)));
  PERFORM tests.fails_with('the author cannot delete a moderated comment', format('SELECT public.delete_comment(%L)', k1), 'PT409');
  PERFORM tests.fails_with('nor edit it', format('SELECT public.edit_comment(%L, ''x'')', k1), 'PT404');
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator sees it', (SELECT count(*) = 1 AND min(body) = 'Sửa lại' FROM public.list_comments(ch1, NULL)));
  PERFORM tests.rows('moderator restores it', format('UPDATE comments SET status = ''visible'' WHERE id = %L', k1), 1);

  -- 9. likes ------------------------------------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('guest cannot like', format('SELECT public.set_comment_like(%L, true)', k1));
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('null flag', format('SELECT public.set_comment_like(%L, NULL)', k1), '22023');
  PERFORM tests.ok('like returns 1', public.set_comment_like(k1, true) = 1);
  PERFORM tests.ok('liking again still 1', public.set_comment_like(k1, true) = 1);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('a second person makes 2', public.set_comment_like(k1, true) = 2);
  PERFORM tests.ok('each viewer sees their own flag and the shared count',
    (SELECT like_count = 2 AND liked_by_me FROM public.list_comments(ch1, NULL)));
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a guest sees the count, no flag', (SELECT like_count = 2 AND NOT liked_by_me FROM public.list_comments(ch1, NULL)));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('unlike returns 1', public.set_comment_like(k1, false) = 1);
  PERFORM tests.ok('unliking again stays 1', public.set_comment_like(k1, false) = 1);
  PERFORM tests.fails_with('no like on an unknown comment', format('SELECT public.set_comment_like(%L, true)', gen_random_uuid()), 'PT404');
  RESET ROLE;
  UPDATE comments SET status = 'hidden' WHERE id = k1;
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('no like on a comment the caller cannot see', format('SELECT public.set_comment_like(%L, true)', k1), 'PT404');
  RESET ROLE;
  UPDATE comments SET status = 'visible' WHERE id = k1;

  -- 10. paging by keyset: newest first and oldest first, ties broken by id ----------------------------------------------------------------------
  DELETE FROM comments WHERE chapter_id = ch1;
  FOR i IN 1..5 LOOP
    INSERT INTO comments (id, chapter_id, author_id, body, created_at)
      VALUES (('f9000000-0000-4000-8000-00000000b00' || i)::uuid, ch1, r, 'c' || i, timestamptz '2026-11-04 10:00:00+00' + (i || ' minutes')::interval);
  END LOOP;
  -- two more that share one timestamp
  INSERT INTO comments (id, chapter_id, author_id, body, created_at) VALUES
    ('f9000000-0000-4000-8000-00000000b0a1', ch1, r, 'tie-a', timestamptz '2026-11-04 10:10:00+00'),
    ('f9000000-0000-4000-8000-00000000b0a2', ch1, r, 'tie-b', timestamptz '2026-11-04 10:10:00+00');
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('newest first: page 1', (SELECT array_agg(body ORDER BY ord) = ARRAY['tie-b','tie-a','c5'] FROM (SELECT body, row_number() OVER () ord FROM public.list_comments(ch1, NULL, true, NULL, NULL, 3)) t));
  SELECT created_at, id INTO cursor_at, cursor_id FROM public.list_comments(ch1, NULL, true, NULL, NULL, 3) OFFSET 2 LIMIT 1;
  PERFORM tests.ok('newest first: page 2 continues after the cursor, no row twice or skipped',
    (SELECT array_agg(body) = ARRAY['c4','c3','c2'] FROM (SELECT body FROM public.list_comments(ch1, NULL, true, cursor_at, cursor_id, 3)) t));
  SELECT created_at, id INTO cursor_at, cursor_id FROM public.list_comments(ch1, NULL, false, NULL, NULL, 3) OFFSET 2 LIMIT 1;
  PERFORM tests.ok('oldest first: page 1 then page 2',
    (SELECT array_agg(body) = ARRAY['c1','c2','c3'] FROM (SELECT body FROM public.list_comments(ch1, NULL, false, NULL, NULL, 3)) t)
    AND (SELECT array_agg(body) = ARRAY['c4','c5','tie-a'] FROM (SELECT body FROM public.list_comments(ch1, NULL, false, cursor_at, cursor_id, 3)) t));
  PERFORM tests.ok('a small limit is honoured', (SELECT count(*) = 7 FROM public.list_comments(ch1, NULL, true, NULL, NULL, 1000)));
  RESET ROLE;
  INSERT INTO comments (id, chapter_id, author_id, body, created_at)
    SELECT gen_random_uuid(), ch1, r, 'bulk ' || n, timestamptz '2026-11-04 09:00:00+00' + (n || ' seconds')::interval
      FROM generate_series(1, 60) n;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a page never holds more than 51 rows (50 and one to see whether there is more)',
    (SELECT count(*) = 51 FROM public.list_comments(ch1, NULL, true, NULL, NULL, 1000)));
  PERFORM tests.ok('limit 0 still returns one row', (SELECT count(*) = 1 FROM public.list_comments(ch1, NULL, true, NULL, NULL, 0)));
  PERFORM tests.ok('replies page too', (SELECT count(*) = 0 FROM public.list_replies(gen_random_uuid())));
END $$;

ROLLBACK;
