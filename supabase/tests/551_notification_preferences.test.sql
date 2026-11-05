-- Per-type notification preferences: own rows only, the type list, and a muted type is never created (group switch AND
-- type switch), through the real functions too. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000005b0', 'np.owner@example.com'),
  ('00000000-0000-0000-0000-0000000005b1', 'np.invitee@example.com'),
  ('00000000-0000-0000-0000-0000000005b2', 'np.other@example.com'),
  ('00000000-0000-0000-0000-0000000005b3', 'np.second@example.com');
UPDATE app_users SET username = 'np_invitee' WHERE id = '00000000-0000-0000-0000-0000000005b1';
UPDATE app_users SET username = 'np_second' WHERE id = '00000000-0000-0000-0000-0000000005b3';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('55100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005b0', 'np-story', 'Prefs', 'public', 'ongoing');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000005b0';
  i constant uuid := '00000000-0000-0000-0000-0000000005b1';
  x constant uuid := '00000000-0000-0000-0000-0000000005b2';
  j constant uuid := '00000000-0000-0000-0000-0000000005b3';
  st constant uuid := '55100000-0000-0000-0000-000000000001';
  inv uuid;
BEGIN
  RESET ROLE;

  -- 1. access --------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest has no preferences', 'SELECT 1 FROM notification_preferences');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.count_is('no rows: every type is on', 'SELECT 1 FROM notification_preferences', 0);
  PERFORM tests.rows('mute one type of my own', format($q$INSERT INTO notification_preferences (user_id, event_type, in_app) VALUES (%L, 'collaboration_declined', false)$q$, x), 1);
  PERFORM tests.rows('upsert (the way PostgREST saves: every inserted column is set again)',
    format($q$INSERT INTO notification_preferences (user_id, event_type, in_app) VALUES (%L, 'collaboration_declined', true)
              ON CONFLICT (user_id, event_type) DO UPDATE
              SET user_id = excluded.user_id, event_type = excluded.event_type, in_app = excluded.in_app$q$, x), 1);
  PERFORM tests.ok('the upsert kept one row, switched back on', (SELECT count(*) = 1 AND bool_and(in_app) FROM notification_preferences));
  PERFORM tests.denied('not for someone else', format($q$INSERT INTO notification_preferences (user_id, event_type, in_app) VALUES (%L, 'comment_replied', false)$q$, o));
  PERFORM tests.denied('a row cannot be moved to another account', format('UPDATE notification_preferences SET user_id = %L WHERE user_id = %L', o, x));
  PERFORM tests.denied('updated_at is server-owned', format('UPDATE notification_preferences SET updated_at = now() WHERE user_id = %L', x));
  PERFORM tests.fails_with('the invitation to me cannot be muted', format($q$INSERT INTO notification_preferences (user_id, event_type, in_app) VALUES (%L, 'collaboration_invited', false)$q$, x), '23514');
  PERFORM tests.fails_with('an unknown type', format($q$INSERT INTO notification_preferences (user_id, event_type, in_app) VALUES (%L, 'email_digest', false)$q$, x), '23514');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.count_is('another reader''s rows are invisible', 'SELECT 1 FROM notification_preferences', 0);
  PERFORM tests.rows('and cannot be changed', format('UPDATE notification_preferences SET in_app = false WHERE user_id = %L', x), 0);
  PERFORM tests.rows('nor deleted', format('DELETE FROM notification_preferences WHERE user_id = %L', x), 0);

  -- 2. the helper: group AND type ----------------------------------------------------------------------------------------
  RESET ROLE;
  PERFORM tests.ok('the helper is still internal',
    NOT has_function_privilege('authenticated', 'public.notification_enabled(uuid, text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.notification_enabled(uuid, text)', 'EXECUTE'));
  INSERT INTO notification_preferences (user_id, event_type, in_app) VALUES (o, 'collaboration_declined', false);
  PERFORM tests.ok('the muted type is off with the group on', NOT public.notification_enabled(o, 'collaboration_declined'));
  PERFORM tests.ok('its sibling type stays on', public.notification_enabled(o, 'collaboration_accepted'));
  PERFORM tests.ok('invitations stay on', public.notification_enabled(o, 'collaboration_invited'));
  INSERT INTO user_settings (user_id, notify_comment_replied) VALUES (o, false);
  INSERT INTO notification_preferences (user_id, event_type, in_app) VALUES (o, 'comment_replied', true);
  PERFORM tests.ok('the group switch off still wins over a type switched on', NOT public.notification_enabled(o, 'comment_replied'));

  INSERT INTO notifications (recipient_id, event_type, dedupe_key) VALUES
    (o, 'collaboration_declined', 'np1'), (o, 'collaboration_accepted', 'np2'), (o, 'comment_replied', 'np3'),
    (o, 'chapter_published', 'np4'), (x, 'collaboration_declined', 'np5');
  PERFORM tests.ok('only the switched-on types were stored for the owner',
    (SELECT array_agg(event_type::text ORDER BY event_type) = ARRAY['chapter_published', 'collaboration_accepted']
       FROM notifications WHERE recipient_id = o));
  PERFORM tests.ok('another reader''s preferences touch nobody else', (SELECT count(*) = 1 FROM notifications WHERE recipient_id = x));

  -- 3. through the real functions: a decline is muted, an accept is not ----------------------------------------------------
  DELETE FROM notifications WHERE recipient_id IN (o, i, j);
  PERFORM tests.act_as(o);
  inv := public.invite_collaborator(st, 'np_invitee', 'editor');
  RESET ROLE; PERFORM tests.act_as(i);
  PERFORM public.respond_invitation(inv, false);
  RESET ROLE; PERFORM tests.act_as(o);
  inv := public.invite_collaborator(st, 'np_second', 'co_author');
  RESET ROLE; PERFORM tests.act_as(j);
  PERFORM public.respond_invitation(inv, true);
  RESET ROLE;
  PERFORM tests.ok('the owner got the acceptance but not the muted decline',
    (SELECT count(*) FILTER (WHERE event_type = 'collaboration_accepted') = 1
        AND count(*) FILTER (WHERE event_type = 'collaboration_declined') = 0 FROM notifications WHERE recipient_id = o));
  PERFORM tests.ok('the decline itself still happened', EXISTS (SELECT 1 FROM story_invitations WHERE invitee_id = i AND status = 'declined'));
  PERFORM tests.ok('the invitees were told about their invitations', (SELECT count(*) = 2 FROM notifications WHERE recipient_id IN (i, j) AND event_type = 'collaboration_invited'));

  -- 4. switching the type back on takes effect for the next event ------------------------------------------------------------
  UPDATE notification_preferences SET in_app = true WHERE user_id = o AND event_type = 'collaboration_declined';
  INSERT INTO notifications (recipient_id, event_type, dedupe_key) VALUES (o, 'collaboration_declined', 'np6');
  PERFORM tests.ok('declines come again', (SELECT count(*) = 1 FROM notifications WHERE recipient_id = o AND event_type = 'collaboration_declined'));
END $$;

ROLLBACK;
