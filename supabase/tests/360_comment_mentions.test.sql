-- @mentions in comments (batch 4 · community4, Lucian 268): parsing, the outbox event and who is told. Rolled back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000361', 'mn.author@example.com'),
  ('00000000-0000-0000-0000-000000000362', 'mn.writer@example.com'),
  ('00000000-0000-0000-0000-000000000363', 'mn.friend@example.com'),
  ('00000000-0000-0000-0000-000000000364', 'mn.quiet@example.com'),
  ('00000000-0000-0000-0000-000000000365', 'mn.gone@example.com'),
  ('00000000-0000-0000-0000-000000000366', 'mn.outsider@example.com');
UPDATE app_users SET username = CASE id
    WHEN '00000000-0000-0000-0000-000000000361' THEN 'mn_author'
    WHEN '00000000-0000-0000-0000-000000000362' THEN 'mn_writer'
    WHEN '00000000-0000-0000-0000-000000000363' THEN 'mn_friend'
    WHEN '00000000-0000-0000-0000-000000000364' THEN 'mn_quiet'
    WHEN '00000000-0000-0000-0000-000000000365' THEN 'mn_gone'
    WHEN '00000000-0000-0000-0000-000000000366' THEN 'mn_outsider' END
 WHERE id::text LIKE '00000000-0000-0000-0000-00000000036_';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('36000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000361', 'mn-story', 'Mentions', 'public', 'ongoing'),
  ('36000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000361', 'mn-private', 'Private', 'private', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('36100000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000001', 'one', 1),
  ('36100000-0000-0000-0000-000000000002', '36000000-0000-0000-0000-000000000002', 'secret', 1);
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('36000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000362', 'co_author');

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-000000000361';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('36100000-0000-0000-0000-000000000001', 'Một', '[{"block_id":"36200000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a),
    ('36100000-0000-0000-0000-000000000002', 'Kín', '[{"block_id":"36200000-0000-0000-0000-000000000002","type":"paragraph","text":"b"}]'::jsonb, a);
  PERFORM public.publish_chapter('36100000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('36100000-0000-0000-0000-000000000002');
END $$;
RESET ROLE;
UPDATE outbox_events SET processed_at = now();

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-000000000361';
  w constant uuid := '00000000-0000-0000-0000-000000000362';
  f constant uuid := '00000000-0000-0000-0000-000000000363';
  q constant uuid := '00000000-0000-0000-0000-000000000364';
  g constant uuid := '00000000-0000-0000-0000-000000000365';
  x constant uuid := '00000000-0000-0000-0000-000000000366';
  ch constant uuid := '36100000-0000-0000-0000-000000000001';
  secret constant uuid := '36100000-0000-0000-0000-000000000002';
  k1 constant uuid := '36300000-0000-4000-8000-000000000001';
  k2 constant uuid := '36300000-0000-4000-8000-000000000002';
  k3 constant uuid := '36300000-0000-4000-8000-000000000003';
  k4 constant uuid := '36300000-0000-4000-8000-000000000004';
  k5 constant uuid := '36300000-0000-4000-8000-000000000005';
  k6 constant uuid := '36300000-0000-4000-8000-000000000006';
BEGIN
  RESET ROLE;

  -- 1. parsing -------------------------------------------------------------------------------------------------------
  PERFORM tests.ok('names in order, distinct, case folded',
    public.comment_mentioned_usernames('@Mn_Friend hi @mn_writer and @MN_FRIEND again') = ARRAY['mn_friend', 'mn_writer']);
  PERFORM tests.ok('an e-mail address is not a mention', public.comment_mentioned_usernames('mail me at me@mn_friend.com') = ARRAY[]::text[]);
  PERFORM tests.ok('too short or glued names are not mentions',
    public.comment_mentioned_usernames('@ab x@@mn_friend @mn_friend_') = ARRAY['mn_friend_']);
  UPDATE abuse_limits SET max_value = 2 WHERE code = 'comment_max_mentions';
  PERFORM tests.ok('the cap keeps the first names', public.comment_mentioned_usernames('@aaa @bbb @ccc') = ARRAY['aaa', 'bbb']);
  UPDATE abuse_limits SET max_value = 10 WHERE code = 'comment_max_mentions';
  PERFORM tests.act_as(f);
  PERFORM tests.denied('clients cannot call the parser', 'SELECT public.comment_mentioned_usernames(''@x'')');
  RESET ROLE;

  -- 2. a comment without a mention writes no event ---------------------------------------------------------------------
  PERFORM tests.act_as(f);
  PERFORM public.post_comment(k1, ch, NULL, NULL, 'Không nhắc ai cả, chỉ có a@b');
  RESET ROLE;
  PERFORM tests.ok('no event without a mention', NOT EXISTS (SELECT 1 FROM outbox_events WHERE event_type = 'comment.mentioned'));

  -- 3. a mention is told through the worker, with the author as actor ----------------------------------------------------
  INSERT INTO user_settings (user_id, notify_comment_replied) VALUES (q, false);
  UPDATE app_users SET account_status = 'suspended' WHERE id = g;
  PERFORM tests.act_as(w);
  PERFORM public.post_comment(k2, ch, NULL, NULL,
    '@mn_friend xem này, cả @MN_QUIET, @mn_gone, @mn_writer và @nobody_here nữa');
  RESET ROLE;
  PERFORM tests.ok('one event', (SELECT count(*) = 1 FROM outbox_events WHERE event_type = 'comment.mentioned' AND aggregate_id = k2));
  PERFORM tests.ok('nobody told before the worker', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = k2));
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('the worker handled it', public.process_outbox() = 1);
  RESET ROLE;
  PERFORM tests.ok('only the active, opted-in, other person is told',
    (SELECT count(*) = 1 AND min(recipient_id::text) = f::text AND min(actor_id::text) = w::text
            AND min(event_type) = 'comment_mentioned'
       FROM notifications WHERE comment_id = k2));
  PERFORM tests.ok('the payload links to the thread',
    (SELECT payload ->> 'story_slug' = 'mn-story' AND payload ->> 'chapter_slug' = 'one' AND payload ->> 'block_id' IS NULL
            AND payload ->> 'excerpt' LIKE '@mn_friend xem này%'
       FROM notifications WHERE comment_id = k2));
  UPDATE outbox_events SET processed_at = NULL WHERE aggregate_id = k2;
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('a replay creates nothing new', (SELECT count(*) = 1 FROM notifications WHERE comment_id = k2));
  UPDATE app_users SET account_status = 'active' WHERE id = g;

  -- 4. a reply does not tell the parent's author twice ------------------------------------------------------------------------
  PERFORM tests.act_as(x);
  PERFORM public.post_comment(k3, ch, NULL, k2, '@mn_writer @mn_friend đồng ý');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('the parent''s author gets the reply notification only',
    (SELECT array_agg(event_type ORDER BY event_type) = ARRAY['comment_replied']::varchar[] FROM notifications WHERE comment_id = k3 AND recipient_id = w));
  PERFORM tests.ok('the other mentioned person gets the mention',
    EXISTS (SELECT 1 FROM notifications WHERE comment_id = k3 AND recipient_id = f AND event_type = 'comment_mentioned'));

  -- 5. edits never notify; a comment deleted before the worker runs tells nobody --------------------------------------------------
  PERFORM tests.act_as(f);
  PERFORM public.edit_comment(k1, 'giờ mới nhắc @mn_quiet');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM public.post_comment(k4, ch, NULL, NULL, '@mn_friend sẽ xóa');
  PERFORM public.delete_comment(k4);
  RESET ROLE;
  PERFORM tests.ok('an edit writes no event', NOT EXISTS (SELECT 1 FROM outbox_events WHERE aggregate_id = k1));
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('a deleted comment tells nobody', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = k4));

  -- 6. a private story: only those who can read it are told ------------------------------------------------------------------------
  PERFORM tests.act_as(a);
  PERFORM public.post_comment(k5, secret, NULL, NULL, '@mn_writer @mn_friend bản kín');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('the collaborator is told, the outsider is not',
    (SELECT array_agg(recipient_id::text) = ARRAY[w::text] FROM notifications WHERE comment_id = k5));

  -- 7. the author mentioning themselves; clients cannot write notifications or run the handler -----------------------------------------
  PERFORM tests.act_as(f);
  PERFORM public.post_comment(k6, ch, NULL, NULL, 'tự nhắc @mn_friend');
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('no self-mention notification', NOT EXISTS (SELECT 1 FROM notifications WHERE comment_id = k6));
  PERFORM tests.act_as(f);
  PERFORM tests.denied('no client-written notification',
    format('INSERT INTO notifications (recipient_id, event_type) VALUES (%L, ''comment_mentioned'')', w));
  PERFORM tests.denied('clients cannot run the handler', format('SELECT private.notify_comment_mentioned(%L)', k2));
END $$;

ROLLBACK;
