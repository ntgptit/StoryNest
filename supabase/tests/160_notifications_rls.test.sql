-- Notification privacy tests (WP 4.6): a reader sees, marks and removes only their own notifications. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a6', 'nt.one@example.com'),
  ('00000000-0000-0000-0000-0000000000b6', 'nt.two@example.com');
INSERT INTO notifications (id, recipient_id, event_type, payload, dedupe_key) VALUES
  ('a6000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a6', 'chapter_published', '{"story_title":"A"}', 'k1'),
  ('a6000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a6', 'chapter_published', '{"story_title":"B"}', 'k2'),
  ('a6000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b6', 'chapter_published', '{"story_title":"C"}', 'k3');

DO $$
DECLARE
  one constant uuid := '00000000-0000-0000-0000-0000000000a6';
  two constant uuid := '00000000-0000-0000-0000-0000000000b6';
BEGIN
  RESET ROLE;

  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot read notifications', 'SELECT 1 FROM notifications');

  RESET ROLE; PERFORM tests.act_as(one);
  PERFORM tests.count_is('a reader sees only their own', 'SELECT 1 FROM notifications', 2);
  PERFORM tests.count_is('and the unread count is theirs', 'SELECT 1 FROM notifications WHERE read_at IS NULL', 2);
  PERFORM tests.count_is('another reader''s notification is invisible by id', $q$SELECT 1 FROM notifications WHERE id = 'a6000000-0000-0000-0000-000000000003'$q$, 0);
  PERFORM tests.denied('nobody writes notifications from the client', format('INSERT INTO notifications (recipient_id, event_type) VALUES (%L, ''x'')', one));
  PERFORM tests.denied('the text cannot be changed', $q$UPDATE notifications SET payload = '{}' WHERE id = 'a6000000-0000-0000-0000-000000000001'$q$);
  PERFORM tests.denied('nor the recipient', format('UPDATE notifications SET recipient_id = %L WHERE id = ''a6000000-0000-0000-0000-000000000001''', two));

  PERFORM tests.rows('mark one as read', $q$UPDATE notifications SET read_at = now() WHERE id = 'a6000000-0000-0000-0000-000000000001'$q$, 1);
  PERFORM tests.count_is('one unread left', 'SELECT 1 FROM notifications WHERE read_at IS NULL', 1);
  PERFORM tests.rows('mark all as read touches only their own rows', 'UPDATE notifications SET read_at = now() WHERE read_at IS NULL', 1);
  PERFORM tests.rows('cannot mark another reader''s notification', $q$UPDATE notifications SET read_at = now() WHERE id = 'a6000000-0000-0000-0000-000000000003'$q$, 0);
  PERFORM tests.rows('cannot delete another reader''s notification', $q$DELETE FROM notifications WHERE id = 'a6000000-0000-0000-0000-000000000003'$q$, 0);
  PERFORM tests.rows('can delete their own', $q$DELETE FROM notifications WHERE id = 'a6000000-0000-0000-0000-000000000002'$q$, 1);

  RESET ROLE;
  PERFORM tests.ok('the other reader''s notification is untouched', (SELECT read_at IS NULL FROM notifications WHERE id = 'a6000000-0000-0000-0000-000000000003'));
  PERFORM tests.act_as(two);
  PERFORM tests.count_is('and still theirs alone', 'SELECT 1 FROM notifications', 1);

  -- the migration publishes INSERTs where the publication exists (Supabase); locally there is none and this holds trivially
  RESET ROLE;
  PERFORM tests.ok('notifications are published to Realtime when the publication exists',
    NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    OR EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'));
END $$;

ROLLBACK;
