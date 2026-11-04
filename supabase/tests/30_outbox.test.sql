-- Outbox worker + cron registration tests. Rolled back at the end.
BEGIN;

-- ---------- fixtures ----------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a2', 'ob.author@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'ob.editor@example.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'ob.follower1@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'ob.follower2@example.com'),
  ('00000000-0000-0000-0000-0000000000f3', 'ob.suspended@example.com'),
  ('00000000-0000-0000-0000-0000000000f4', 'ob.nofollow@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000f3';

INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'ob-story', 'Outbox Tale', 'public', 'ongoing');
INSERT INTO story_collaborators VALUES
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'editor', now());
INSERT INTO story_follows (user_id, story_id) VALUES
  ('00000000-0000-0000-0000-0000000000a2', '12000000-0000-0000-0000-000000000001'),  -- the author follows own story
  ('00000000-0000-0000-0000-0000000000c2', '12000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000f1', '12000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000f2', '12000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000f3', '12000000-0000-0000-0000-000000000001');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'one', 1),
  ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', 'two', 2);
INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
  ('22000000-0000-0000-0000-000000000001', 'First', '[{"block_id":"32000000-0000-0000-0000-000000000001","type":"paragraph","text":"Hello"}]', '00000000-0000-0000-0000-0000000000a2'),
  ('22000000-0000-0000-0000-000000000002', 'Second', '[{"block_id":"32000000-0000-0000-0000-000000000002","type":"paragraph","text":"World"}]', '00000000-0000-0000-0000-0000000000a2');

-- 1. cron registration ---------------------------------------------------------------------------------
DO $$ BEGIN
  PERFORM tests.ok('the three outbox jobs are scheduled', (SELECT count(*) = 3 FROM cron.job WHERE jobname IN ('storynest-publish-due-chapters', 'storynest-process-outbox', 'storynest-purge-outbox')));
  PERFORM tests.ok('every-minute jobs call the worker functions',
    (SELECT count(*) = 2 FROM cron.job WHERE schedule = '* * * * *'
        AND command IN ('SELECT public.publish_due_chapters()', 'SELECT public.process_outbox()')));
END $$;

-- 2. a publish is turned into notifications ---------------------------------------------------------------
DO $$
DECLARE
  ch constant uuid := '22000000-0000-0000-0000-000000000001';
BEGIN
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000a2');
  PERFORM public.publish_chapter(ch);
  PERFORM tests.fails_with('clients cannot run the worker', 'SELECT public.process_outbox()', '42501');
  PERFORM tests.fails_with('clients cannot purge', 'SELECT public.purge_outbox()', '42501');

  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('one event processed', public.process_outbox() = 1);
  RESET ROLE;
  PERFORM tests.ok('event marked processed', (SELECT processed_at IS NOT NULL AND last_error IS NULL FROM outbox_events WHERE aggregate_id = ch));
  PERFORM tests.ok('only active followers other than the publisher are notified',
    (SELECT array_agg(recipient_id ORDER BY recipient_id) = ARRAY['00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f2']::uuid[]
       FROM notifications WHERE chapter_id = ch));
  PERFORM tests.ok('notification payload', (SELECT payload ->> 'story_title' = 'Outbox Tale' AND payload ->> 'chapter_title' = 'First'
       AND actor_id = '00000000-0000-0000-0000-0000000000a2' AND event_type = 'chapter_published' AND read_at IS NULL
       FROM notifications WHERE recipient_id = '00000000-0000-0000-0000-0000000000f1'));

  -- a processed event is not picked up again; a forced replay creates no duplicates
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('second run has nothing to do', public.process_outbox() = 0);
  RESET ROLE;
  UPDATE outbox_events SET processed_at = NULL WHERE aggregate_id = ch;
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('replay is processed', public.process_outbox() = 1);
  RESET ROLE;
  PERFORM tests.ok('replay is idempotent', (SELECT count(*) = 3 FROM notifications WHERE chapter_id = ch));

  -- recipients see their own notification only
  PERFORM tests.act_as('00000000-0000-0000-0000-0000000000f1');
  PERFORM tests.count_is('follower sees own notification', 'SELECT 1 FROM notifications', 1);
  PERFORM tests.rows('follower marks it read', 'UPDATE notifications SET read_at = now()', 1);
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-0000000000f4');
  PERFORM tests.count_is('non-follower sees none', 'SELECT 1 FROM notifications', 0);
END $$;

-- 3. a chapter unpublished before processing sends nothing -------------------------------------------------
DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-0000000000a2';
  ch constant uuid := '22000000-0000-0000-0000-000000000002';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM public.publish_chapter(ch);
  PERFORM public.unpublish_chapter(ch);
  RESET ROLE; PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('event consumed', public.process_outbox() = 1);
  RESET ROLE;
  PERFORM tests.ok('but nobody was notified', (SELECT count(*) = 0 FROM notifications WHERE chapter_id = ch));
END $$;

-- 4. failures: backoff, then dead-letter -------------------------------------------------------------------
DO $$
DECLARE
  ev uuid;
  i int;
BEGIN
  RESET ROLE;
  INSERT INTO outbox_events (event_type, aggregate_id, dedupe_key)
    VALUES ('does.not.exist', gen_random_uuid(), 'bad-event') RETURNING id INTO ev;
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('failing event is not counted', public.process_outbox() = 0);
  RESET ROLE;
  PERFORM tests.ok('attempt recorded with backoff', (SELECT attempts = 1 AND failed_at IS NULL AND processed_at IS NULL
        AND available_at > now() AND last_error LIKE '%unknown outbox event type%' FROM outbox_events WHERE id = ev));

  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('not retried before available_at', (SELECT attempts = 1 FROM outbox_events WHERE id = ev));

  FOR i IN 2..5 LOOP
    UPDATE outbox_events SET available_at = now() WHERE id = ev;
    PERFORM tests.act_as(NULL, 'service_role');
    PERFORM public.process_outbox();
    RESET ROLE;
  END LOOP;
  PERFORM tests.ok('dead-lettered after 5 attempts', (SELECT attempts = 5 AND failed_at IS NOT NULL FROM outbox_events WHERE id = ev));
  UPDATE outbox_events SET available_at = now() WHERE id = ev;
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM public.process_outbox();
  RESET ROLE;
  PERFORM tests.ok('dead letters are not retried', (SELECT attempts = 5 FROM outbox_events WHERE id = ev));
END $$;

-- 5. one bad event does not block the queue ------------------------------------------------------------------
DO $$
BEGIN
  RESET ROLE;
  UPDATE outbox_events SET processed_at = NULL WHERE event_type = 'chapter.published' AND aggregate_id = '22000000-0000-0000-0000-000000000001';
  INSERT INTO outbox_events (event_type, aggregate_id, created_at) VALUES ('does.not.exist', gen_random_uuid(), now() - interval '1 hour');
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('good event processed behind a bad one', public.process_outbox() = 1);
  RESET ROLE;
END $$;

-- 6. purge --------------------------------------------------------------------------------------------------
DO $$
BEGIN
  RESET ROLE;
  UPDATE outbox_events SET processed_at = now() - interval '30 days' WHERE processed_at IS NOT NULL;
  PERFORM tests.act_as(NULL, 'service_role');
  PERFORM tests.ok('old processed events are purged', public.purge_outbox() >= 1);
  RESET ROLE;
  PERFORM tests.ok('processed events are gone', (SELECT count(*) = 0 FROM outbox_events WHERE processed_at IS NOT NULL));
  PERFORM tests.ok('dead letters are kept', (SELECT count(*) = 1 FROM outbox_events WHERE failed_at IS NOT NULL));
END $$;

ROLLBACK;
