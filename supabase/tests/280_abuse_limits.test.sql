-- Abuse limits (WP 6.8): comment and report rates from configurable rows, spam filter, who is exempt. Rolled back.
BEGIN;

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000a4', 'ab.owner@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000b4', 'ab.reader@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c4', 'ab.other@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d4', 'ab.mod@example.com', '{"role":"moderator"}');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('14000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'ab-story', 'Limits', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'one', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a4';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('24000000-0000-0000-0000-000000000001', 'One', '[{"block_id":"34000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a);
  PERFORM public.publish_chapter('24000000-0000-0000-0000-000000000001');
END $$;

DO $$
DECLARE
  r constant uuid := '00000000-0000-0000-0000-0000000000b4';
  x constant uuid := '00000000-0000-0000-0000-0000000000c4';
  m constant uuid := '00000000-0000-0000-0000-0000000000d4';
  o constant uuid := '00000000-0000-0000-0000-0000000000a4';
  ch constant uuid := '24000000-0000-0000-0000-000000000001';
  id1 uuid; n integer; rep uuid;
  hint text;
BEGIN
  RESET ROLE;

  -- 1. the table of limits is the administrator's -------------------------------------------------------------------------
  PERFORM tests.ok('the defaults are in place',
    (SELECT max_value = 10 AND window_seconds = 600 FROM abuse_limits WHERE code = 'comment_rate_burst')
    AND (SELECT max_value = 200 AND window_seconds = 86400 FROM abuse_limits WHERE code = 'comment_rate_day')
    AND (SELECT max_value = 20 AND window_seconds = 86400 FROM abuse_limits WHERE code = 'report_rate_day')
    AND (SELECT max_value = 2 AND window_seconds IS NULL FROM abuse_limits WHERE code = 'comment_max_links')
    AND (SELECT max_value = 20 AND window_seconds IS NULL FROM abuse_limits WHERE code = 'comment_max_char_run'));
  PERFORM tests.act_as(r);
  PERFORM tests.denied('a reader cannot read the limits', 'SELECT 1 FROM abuse_limits');
  PERFORM tests.denied('nor change them', 'UPDATE abuse_limits SET max_value = 1000000');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot call the limit check', 'SELECT public.enforce_rate_limit(''comment'')');
  PERFORM tests.denied('nor the spam check', 'SELECT public.comment_looks_like_spam(''hi'')');
  RESET ROLE;

  -- 2. the burst limit: 10 comments in 10 minutes ------------------------------------------------------------------------------
  PERFORM tests.act_as(r);
  FOR n IN 1..10 LOOP
    PERFORM public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Bình luận số ' || n);
  END LOOP;
  hint := NULL;
  BEGIN
    PERFORM public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Bình luận thứ mười một');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> 'PT429' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  END;
  PERFORM tests.ok('the eleventh is refused with PT429 and says which limit', hint = 'comment_rate_burst');
  RESET ROLE;
  PERFORM tests.ok('nothing was stored for it', (SELECT count(*) = 10 FROM comments WHERE author_id = r));

  PERFORM tests.act_as(x);
  PERFORM tests.ok('another account is not affected', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Tôi là người khác') IS NOT NULL);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a reply counts as a comment', format('SELECT public.post_comment(%L, %L, NULL, %L, ''trả lời'')', gen_random_uuid(), ch, (SELECT id FROM comments WHERE author_id = x LIMIT 1)), 'PT429');
  RESET ROLE;
  -- a retry of a comment that was accepted is not a new comment, even at the limit
  SELECT id INTO id1 FROM comments WHERE author_id = r LIMIT 1;
  PERFORM tests.act_as(r);
  PERFORM tests.ok('retrying an accepted comment at the limit returns it', public.post_comment(id1, ch, NULL, NULL, (SELECT body FROM comments WHERE id = id1)) = id1);
  RESET ROLE;

  -- the same, written straight into the table (a retry that reaches the trigger): at the limit it must not be refused
  PERFORM tests.act_as(r);
  PERFORM tests.rows('a direct retry of an existing comment at the limit is not a new comment',
    format('INSERT INTO comments (id, chapter_id, author_id, body) VALUES (%L, %L, %L, ''Bình luận số 1'') ON CONFLICT (id) DO NOTHING', id1, ch, r), 0);
  RESET ROLE;

  -- deleting does not buy a fresh allowance
  PERFORM tests.act_as(r);
  PERFORM public.delete_comment(id1);
  PERFORM tests.fails_with('a deleted comment still counts', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''sau khi xóa'')', gen_random_uuid(), ch), 'PT429');
  RESET ROLE;

  -- the window moves on
  UPDATE comments SET created_at = now() - interval '11 minutes' WHERE author_id = r AND id IN (SELECT id FROM comments WHERE author_id = r LIMIT 4);
  PERFORM tests.act_as(r);
  PERFORM tests.ok('once some are older than the window there is room again', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Lại được rồi') IS NOT NULL);
  RESET ROLE;

  -- 3. the daily limit, and the thresholds are rows, not code ----------------------------------------------------------------------
  UPDATE comments SET created_at = now() - interval '2 hours' WHERE author_id = r;
  UPDATE abuse_limits SET max_value = 12 WHERE code = 'comment_rate_day';
  PERFORM tests.act_as(r);
  PERFORM tests.ok('under the daily limit and outside the burst window', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Còn chỗ trong ngày') IS NOT NULL);
  hint := NULL;
  BEGIN
    PERFORM public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Quá hạn mức ngày');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> 'PT429' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  END;
  PERFORM tests.ok('the lowered daily limit applies at once', hint = 'comment_rate_day');
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 200 WHERE code = 'comment_rate_day';
  PERFORM tests.act_as(r);
  PERFORM tests.ok('raising it lifts the refusal', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Đã nâng hạn mức') IS NOT NULL);
  RESET ROLE;

  -- 4. who is exempt ----------------------------------------------------------------------------------------------------------------
  UPDATE abuse_limits SET max_value = 0 WHERE code IN ('comment_rate_burst', 'comment_rate_day');
  PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator is not limited', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Điều hành viên bình luận') IS NOT NULL);
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');   -- no signed-in user: what the worker, the seed and the service role look like
  INSERT INTO comments (chapter_id, author_id, body) VALUES (ch, x, 'Ghi bởi máy chủ, không có người dùng đăng nhập');
  RESET ROLE;
  PERFORM tests.ok('nor is something running without a signed-in user (service role, worker, seed): it just wrote one at limit zero',
    (SELECT count(*) = 1 FROM comments WHERE author_id = x AND body LIKE 'Ghi bởi máy chủ%'));
  PERFORM tests.act_as(x);
  PERFORM tests.fails_with('with the limit at zero an ordinary account cannot comment', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''không được'')', gen_random_uuid(), ch), 'PT429');
  PERFORM tests.fails_with('a direct INSERT is held to the same limit',
    format('INSERT INTO comments (chapter_id, author_id, body) VALUES (%L, %L, ''ghi thẳng'')', ch, x), 'PT429');
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 10 WHERE code = 'comment_rate_burst';
  UPDATE abuse_limits SET max_value = 200 WHERE code = 'comment_rate_day';
  DELETE FROM comments WHERE author_id = r;

  -- 5. spam -----------------------------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(r);
  PERFORM tests.ok('two links are fine', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Xem http://a.example và https://b.example nhé') IS NOT NULL);
  hint := NULL;
  BEGIN
    PERFORM public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Mua ngay http://a.example http://b.example www.c.example');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '22023' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  END;
  PERFORM tests.ok('three links are refused as spam, with the hint', hint = 'spam');
  PERFORM tests.fails_with('links in capitals count too', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''HTTP://A.EX HTTPS://B.EX WWW.C.EX'')', gen_random_uuid(), ch), '22023');
  PERFORM tests.ok('twenty identical characters in a row are fine', public.post_comment(gen_random_uuid(), ch, NULL, NULL, repeat('a', 20)) IS NOT NULL);
  PERFORM tests.fails_with('twenty-one are not', format('SELECT public.post_comment(%L, %L, NULL, NULL, %L)', gen_random_uuid(), ch, repeat('a', 21)), '22023');
  PERFORM tests.ok('a long run of spaces is not a run (whitespace is ignored)', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'a' || repeat(' ', 40) || 'b') IS NOT NULL);
  PERFORM tests.ok('an ordinary Vietnamese comment passes', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'Chương này hay quá, cảm ơn tác giả rất nhiều!!!') IS NOT NULL);
  RESET ROLE;
  PERFORM tests.ok('the refused ones left nothing behind', (SELECT count(*) = 4 FROM comments WHERE author_id = r));

  -- an edit may not turn a comment into spam either
  SELECT id INTO id1 FROM comments WHERE author_id = r AND body LIKE 'Chương này%';
  PERFORM tests.act_as(r);
  PERFORM tests.fails_with('editing in links', format('SELECT public.edit_comment(%L, ''http://a.ex http://b.ex http://c.ex'')', id1), '22023');
  PERFORM public.edit_comment(id1, 'Sửa lại cho gọn');
  RESET ROLE;
  PERFORM tests.ok('the edit was kept', (SELECT body = 'Sửa lại cho gọn' FROM comments WHERE id = id1));
  -- changing something other than the text is never judged
  PERFORM tests.act_as(NULL, 'service_role');
  UPDATE comments SET body = 'http://a.ex http://b.ex http://c.ex http://d.ex' WHERE id = id1;
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.rows('an update that leaves the text alone is not judged', format('UPDATE comments SET body = body WHERE id = %L', id1), 1);
  RESET ROLE;

  -- the thresholds are rows too
  UPDATE abuse_limits SET max_value = 0 WHERE code = 'comment_max_links';
  PERFORM tests.act_as(r);
  PERFORM tests.fails_with('with no links allowed even one is refused', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''xem http://a.example'')', gen_random_uuid(), ch), '22023');
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 5 WHERE code = 'comment_max_char_run';
  PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a lower run limit applies', format('SELECT public.post_comment(%L, %L, NULL, NULL, ''haaaaaaaaay'')', gen_random_uuid(), ch), '22023');
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 2 WHERE code = 'comment_max_links';
  UPDATE abuse_limits SET max_value = 20 WHERE code = 'comment_max_char_run';

  -- 6. a moderator's text is not judged ---------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('links beyond the limit are fine for a moderator', public.post_comment(gen_random_uuid(), ch, NULL, NULL, 'http://a.ex http://b.ex http://c.ex http://d.ex') IS NOT NULL);
  RESET ROLE;

  -- 7. reports use the configured ceiling -------------------------------------------------------------------------------------------------------
  UPDATE abuse_limits SET max_value = 1 WHERE code = 'report_rate_day';
  PERFORM tests.act_as(x);
  rep := public.submit_report('story', '14000000-0000-0000-0000-000000000001', 'spam');
  PERFORM tests.ok('the first report is accepted', rep IS NOT NULL);
  PERFORM tests.ok('a repeat on the same open target is the same report, not a new one', public.submit_report('story', '14000000-0000-0000-0000-000000000001', 'other') = rep);
  PERFORM tests.fails_with('the second report on something else hits the configured ceiling', format('SELECT public.submit_report(''user'', %L, ''spam'')', o), 'PT429');
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 2 WHERE code = 'report_rate_day';
  PERFORM tests.act_as(x);
  PERFORM tests.ok('raising the ceiling lets the next one through', public.submit_report('user', o, 'spam') IS NOT NULL);
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 0 WHERE code = 'report_rate_day';   -- nobody ordinary could report now
  PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator is not limited when reporting either', public.submit_report('user', o, 'spam') IS NOT NULL AND public.submit_report('story', '14000000-0000-0000-0000-000000000001', 'spam') IS NOT NULL);
  RESET ROLE;
END $$;

ROLLBACK;
