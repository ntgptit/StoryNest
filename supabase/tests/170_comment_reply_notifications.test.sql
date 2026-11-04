-- "Someone replied to your comment" through the outbox (WP 4.7). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a4', 'cr.author@example.com'),
  ('00000000-0000-0000-0000-0000000000b4', 'cr.commenter@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'cr.replier@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('1e000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'cr-story', 'Replies', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('2e000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', 'one', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a4';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('2e000000-0000-0000-0000-000000000001', 'Mở đầu', '[{"block_id":"3e000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a);
  PERFORM public.publish_chapter('2e000000-0000-0000-0000-000000000001');
END $$;
-- the publish event is not what this test is about
RESET ROLE;
UPDATE outbox_events SET processed_at = now();

DO $$
DECLARE
  cm constant uuid := '00000000-0000-0000-0000-0000000000b4';   -- wrote the comment
  rp constant uuid := '00000000-0000-0000-0000-0000000000c4';   -- replies to it
  ch constant uuid := '2e000000-0000-0000-0000-000000000001';
  b1 constant uuid := '3e000000-0000-0000-0000-000000000001';
  k1 constant uuid := 'fe000000-0000-4000-8000-000000000001';
  k2 constant uuid := 'fe000000-0000-4000-8000-000000000002';
  r1 constant uuid := 'fe000000-0000-4000-8000-0000000000a1';
  r2 constant uuid := 'fe000000-0000-4000-8000-0000000000a2';
  r3 constant uuid := 'fe000000-0000-4000-8000-0000000000a3';
  r4 constant uuid := 'fe000000-0000-4000-8000-0000000000a4';
  r5 constant uuid := 'fe000000-0000-4000-8000-0000000000a5';
  n integer;
BEGIN
  RESET ROLE; PERFORM tests.act_as(cm);
  PERFORM public.post_comment(k1, ch, NULL, NULL, 'Chương hay quá');
  PERFORM public.post_comment(k2, ch, b1, NULL, 'Đoạn này lạ');
  RESET ROLE;
  PERFORM tests.ok('a top-level comment writes no event', NOT EXISTS (SELECT 1 FROM outbox_events WHERE event_type = 'comment.replied'));

  -- 1. a reply writes one event, in the same transaction, and the worker turns it into one notification ------------
  PERFORM tests.act_as(rp);
  PERFORM public.post_comment(r1, ch, NULL, k1, '  Mình cũng thấy vậy, đoạn cuối rất xúc động  ');
  RESET ROLE;
  PERFORM tests.ok('one event for the reply', (SELECT count(*) = 1 AND min(aggregate_id::text) = r1::text FROM outbox_events WHERE event_type = 'comment.replied'));
  PERFORM tests.ok('nobody is told before the worker runs', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = r1));
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('the worker handled it', public.process_outbox() = 1);
  RESET ROLE;
  PERFORM tests.ok('the parent''s author is told, by the replier, about this reply',
    (SELECT count(*) = 1 AND min(recipient_id::text) = cm::text AND min(actor_id::text) = rp::text
        AND min(event_type) = 'comment_replied' AND min(comment_id::text) = r1::text AND bool_and(read_at IS NULL)
       FROM notifications WHERE comment_id = r1));
  PERFORM tests.ok('the payload says where and what',
    (SELECT payload ->> 'story_title' = 'Replies' AND payload ->> 'story_slug' = 'cr-story' AND payload ->> 'chapter_slug' = 'one'
        AND payload ->> 'chapter_title' = 'Mở đầu' AND (payload ->> 'chapter_sort_order')::int = 1
        AND payload ->> 'excerpt' = 'Mình cũng thấy vậy, đoạn cuối rất xúc động' AND payload ->> 'block_id' IS NULL
        AND payload ->> 'parent_comment_id' = k1::text
       FROM notifications WHERE comment_id = r1));

  -- 2. at-least-once delivery: a replay creates nothing new ------------------------------------------------------------------------
  UPDATE outbox_events SET processed_at = NULL WHERE aggregate_id = r1;
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('the replay is processed', public.process_outbox() = 1);
  RESET ROLE;
  PERFORM tests.ok('and is idempotent', (SELECT count(*) = 1 FROM notifications WHERE comment_id = r1));
  PERFORM tests.ok('emitting the event again is a no-op', (SELECT count(*) = 1 FROM outbox_events WHERE aggregate_id = r1));

  -- 3. a reply inside a paragraph thread carries the paragraph -------------------------------------------------------------------------
  PERFORM tests.act_as(rp);
  PERFORM public.post_comment(r2, ch, NULL, k2, 'Ý bạn là gì?');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('the paragraph is in the payload', (SELECT payload ->> 'block_id' = b1::text FROM notifications WHERE comment_id = r2));

  -- the excerpt is trimmed and cut, even when the reply was inserted by a path that does not trim
  INSERT INTO comments (id, chapter_id, parent_comment_id, author_id, body)
    VALUES ('fe000000-0000-4000-8000-0000000000b1', ch, k1, rp, '   ' || repeat('x', 200) || '   ');
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('the excerpt is trimmed and at most 140 characters',
    (SELECT payload ->> 'excerpt' = repeat('x', 140) FROM notifications WHERE comment_id = 'fe000000-0000-4000-8000-0000000000b1'));

  -- 4. nobody is told about a reply to themselves ---------------------------------------------------------------------------------------------
  PERFORM tests.act_as(cm);
  PERFORM public.post_comment(r3, ch, NULL, k1, 'Cảm ơn bạn');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('the event is consumed', public.process_outbox() = 1);
  RESET ROLE;
  PERFORM tests.ok('but nobody is notified of a self-reply', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = r3));

  -- 5. gone by the time the worker runs: no notification --------------------------------------------------------------------------------------
  PERFORM tests.act_as(rp);
  PERFORM public.post_comment(r4, ch, NULL, k1, 'Sẽ xóa ngay');
  PERFORM public.delete_comment(r4);
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('a reply deleted before processing tells nobody', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = r4));

  UPDATE app_users SET account_status = 'suspended' WHERE id = cm;
  PERFORM tests.act_as(rp);
  PERFORM public.post_comment(r5, ch, NULL, k1, 'Bạn còn đó không');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('a suspended account is not told', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = r5));
  UPDATE app_users SET account_status = 'active' WHERE id = cm;

  -- 6. the chapter was archived meanwhile ---------------------------------------------------------------------------------------------------------
  INSERT INTO comments (id, chapter_id, parent_comment_id, author_id, body)
    VALUES ('fe000000-0000-4000-8000-0000000000a6', ch, k1, rp, 'Trả lời trước khi gỡ');
  PERFORM tests.ok('a direct insert emits the event too', EXISTS (SELECT 1 FROM outbox_events WHERE aggregate_id = 'fe000000-0000-4000-8000-0000000000a6'));
  UPDATE chapters SET status = 'archived' WHERE id = ch;   -- keeps its published version, but readers no longer see it
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('an archived chapter tells nobody', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = 'fe000000-0000-4000-8000-0000000000a6'));

  -- 7. the worker is not reachable from the client ------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(rp);
  PERFORM tests.denied('clients cannot run the handler', format('SELECT private.notify_comment_replied(%L)', r1));
END $$;

ROLLBACK;
