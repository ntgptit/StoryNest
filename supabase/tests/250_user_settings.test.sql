-- Account settings (WP 6.3): own-row access, the adult-content rule, and notifications that are switched off are
-- never created, whichever function would create them. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a7', 'st.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b7', 'st.invitee@example.com'),
  ('00000000-0000-0000-0000-0000000000c7', 'st.other@example.com');
UPDATE app_users SET username = 'st_invitee' WHERE id = '00000000-0000-0000-0000-0000000000b7';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('17000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a7', 'st-story', 'Settings', 'public', 'ongoing');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000a7';
  i constant uuid := '00000000-0000-0000-0000-0000000000b7';
  x constant uuid := '00000000-0000-0000-0000-0000000000c7';
  st constant uuid := '17000000-0000-0000-0000-000000000001';
  inv uuid;
BEGIN
  RESET ROLE;

  -- 1. who touches which row ----------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest has no settings', 'SELECT 1 FROM user_settings');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.count_is('no row means defaults, nothing is invented', 'SELECT 1 FROM user_settings', 0);
  PERFORM tests.rows('save my settings', format('INSERT INTO user_settings (user_id, language_code) VALUES (%L, ''en'')', x), 1);
  PERFORM tests.denied('not for someone else', format('INSERT INTO user_settings (user_id) VALUES (%L)', o));
  PERFORM tests.denied('updated_at is not client-writable', format('UPDATE user_settings SET updated_at = now() WHERE user_id = %L', x));
  PERFORM tests.rows('upsert (the way the app saves)',
    format('INSERT INTO user_settings (user_id, language_code) VALUES (%L, ''vi'') ON CONFLICT (user_id) DO UPDATE SET language_code = excluded.language_code', x), 1);
  PERFORM tests.ok('defaults hold for what was not given',
    (SELECT language_code = 'vi' AND NOT age_confirmed AND NOT show_mature AND notify_chapter_published
        AND notify_comment_replied AND notify_collaboration_answers FROM user_settings WHERE user_id = x));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.count_is('another account''s row is invisible', 'SELECT 1 FROM user_settings', 0);
  PERFORM tests.rows('and cannot be changed', format('UPDATE user_settings SET language_code = ''en'' WHERE user_id = %L', x), 0);
  PERFORM tests.rows('nor deleted', format('DELETE FROM user_settings WHERE user_id = %L', x), 0);

  -- 2. values --------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('unknown language', format('UPDATE user_settings SET language_code = ''xx'' WHERE user_id = %L', x), '23514');
  PERFORM tests.fails_with('adult content cannot be shown without the age confirmation',
    format('UPDATE user_settings SET show_mature = true WHERE user_id = %L', x), '23514');
  PERFORM tests.rows('with the confirmation it can', format('UPDATE user_settings SET age_confirmed = true, show_mature = true WHERE user_id = %L', x), 1);
  PERFORM tests.fails_with('and the confirmation cannot be withdrawn while shown',
    format('UPDATE user_settings SET age_confirmed = false WHERE user_id = %L', x), '23514');
  PERFORM tests.rows('hiding again is fine', format('UPDATE user_settings SET show_mature = false WHERE user_id = %L', x), 1);

  -- 3. the helper is internal ------------------------------------------------------------------------------------------
  RESET ROLE;
  PERFORM tests.ok('clients cannot call the helper or the trigger function',
    NOT has_function_privilege('authenticated', 'public.notification_enabled(uuid, text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.notification_enabled(uuid, text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.drop_switched_off_notification()', 'EXECUTE'));
  PERFORM tests.ok('everything is on for someone with no row', public.notification_enabled(i, 'comment_replied'));
  PERFORM tests.ok('an event type nobody can switch off is on', public.notification_enabled(x, 'collaboration_invited'));
  PERFORM tests.ok('an unknown event type is on too', public.notification_enabled(x, 'something_new'));

  -- 4. a switched-off event is never stored -----------------------------------------------------------------------------
  INSERT INTO user_settings (user_id, notify_chapter_published, notify_comment_replied, notify_collaboration_answers)
  VALUES (o, false, false, false);
  INSERT INTO notifications (recipient_id, event_type, dedupe_key) VALUES
    (o, 'chapter_published', 'p1'), (o, 'comment_replied', 'p2'),
    (o, 'collaboration_accepted', 'p3'), (o, 'collaboration_declined', 'p4'), (o, 'collaboration_invited', 'p5');
  PERFORM tests.ok('only the invitation (not switchable) was stored',
    (SELECT count(*) = 1 AND min(event_type) = 'collaboration_invited' FROM notifications WHERE recipient_id = o));
  INSERT INTO notifications (recipient_id, event_type, dedupe_key) VALUES (x, 'chapter_published', 'p6'), (x, 'comment_replied', 'p7');
  PERFORM tests.ok('someone else''s switches do not touch other accounts', (SELECT count(*) = 2 FROM notifications WHERE recipient_id = x));
  PERFORM tests.ok('a dropped event also leaves no trace on a repeat',
    (SELECT count(*) = 0 FROM notifications WHERE recipient_id = o AND dedupe_key = 'p1'));

  -- 5. switching one back on takes effect for the next event only ------------------------------------------------------------
  UPDATE user_settings SET notify_comment_replied = true WHERE user_id = o;
  INSERT INTO notifications (recipient_id, event_type, dedupe_key) VALUES (o, 'comment_replied', 'p8'), (o, 'chapter_published', 'p9');
  PERFORM tests.ok('replies come again, new chapters still do not',
    (SELECT count(*) FILTER (WHERE event_type = 'comment_replied') = 1
        AND count(*) FILTER (WHERE event_type = 'chapter_published') = 0 FROM notifications WHERE recipient_id = o));
  UPDATE user_settings SET notify_comment_replied = false WHERE user_id = o;

  -- 6. through the real functions: the answer to my invitation, not the invitation itself ---------------------------------------
  UPDATE user_settings SET notify_collaboration_answers = false WHERE user_id = o;
  DELETE FROM notifications WHERE recipient_id IN (o, i);
  PERFORM tests.act_as(o);
  inv := public.invite_collaborator(st, 'st_invitee', 'editor');
  RESET ROLE;
  PERFORM tests.ok('the invitee is told even if the owner mutes answers', (SELECT count(*) = 1 FROM notifications WHERE recipient_id = i AND event_type = 'collaboration_invited'));
  PERFORM tests.act_as(i);
  PERFORM public.respond_invitation(inv, true);
  RESET ROLE;
  PERFORM tests.ok('the owner who muted answers gets none, and the answer itself still worked',
    (SELECT count(*) = 0 FROM notifications WHERE recipient_id = o AND event_type = 'collaboration_accepted')
    AND EXISTS (SELECT 1 FROM story_invitations WHERE id = inv AND status = 'accepted')
    AND EXISTS (SELECT 1 FROM story_collaborators WHERE story_id = st AND user_id = i));
END $$;

ROLLBACK;
