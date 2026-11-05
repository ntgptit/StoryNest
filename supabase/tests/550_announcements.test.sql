-- Announcements: guests see only what is active, moderators alone write, content rules. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000005a0', 'an.mod@example.com'),
  ('00000000-0000-0000-0000-0000000005a1', 'an.reader@example.com'),
  ('00000000-0000-0000-0000-0000000005a2', 'an.suspended.mod@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000005a2';

INSERT INTO announcements (id, kind, title, body, link_url, locale, starts_at, ends_at) VALUES
  ('55000000-0000-0000-0000-000000000001', 'banner', 'Live banner', NULL, '/ranking', NULL, now() - interval '1 hour', now() + interval '1 day'),
  ('55000000-0000-0000-0000-000000000002', 'popup', 'Live popup (en)', 'Write a story', 'https://example.com/contest', 'en', now() - interval '1 hour', now() + interval '1 day'),
  ('55000000-0000-0000-0000-000000000003', 'banner', 'Scheduled', NULL, NULL, NULL, now() + interval '1 day', now() + interval '2 days'),
  ('55000000-0000-0000-0000-000000000004', 'banner', 'Ended', NULL, NULL, NULL, now() - interval '2 days', now() - interval '1 day'),
  ('55000000-0000-0000-0000-000000000005', 'banner', 'Live banner (vi)', NULL, NULL, 'vi', now() - interval '1 hour', now() + interval '1 day');

DO $$
DECLARE
  m constant uuid := '00000000-0000-0000-0000-0000000005a0';
  r constant uuid := '00000000-0000-0000-0000-0000000005a1';
  s constant uuid := '00000000-0000-0000-0000-0000000005a2';
  new_id uuid;
BEGIN
  RESET ROLE;

  -- 1. reading ----------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('a guest sees only active announcements', 'SELECT 1 FROM announcements', 3);
  PERFORM tests.count_is('the scheduled one is not visible early', $q$SELECT 1 FROM announcements WHERE title = 'Scheduled'$q$, 0);
  PERFORM tests.count_is('active_announcements: all live ones', 'SELECT 1 FROM public.active_announcements()', 3);
  PERFORM tests.count_is('banners only', $q$SELECT 1 FROM public.active_announcements('banner')$q$, 2);
  PERFORM tests.count_is('english: language-free + english ones', $q$SELECT 1 FROM public.active_announcements(NULL, 'en')$q$, 2);
  PERFORM tests.count_is('vietnamese banners', $q$SELECT 1 FROM public.active_announcements('banner', 'vi')$q$, 2);
  PERFORM tests.count_is('english popups', $q$SELECT 1 FROM public.active_announcements('popup', 'en')$q$, 1);
  PERFORM tests.count_is('vietnamese popups: none', $q$SELECT 1 FROM public.active_announcements('popup', 'vi')$q$, 0);
  PERFORM tests.denied('who wrote it is not readable', 'SELECT created_by FROM announcements');
  PERFORM tests.denied('a guest cannot write', $q$INSERT INTO announcements (kind, title, ends_at) VALUES ('banner', 'x', now() + interval '1 day')$q$);

  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.count_is('a reader sees the same', 'SELECT 1 FROM announcements', 3);
  PERFORM tests.denied('a reader cannot create', $q$INSERT INTO announcements (kind, title, ends_at) VALUES ('banner', 'x', now() + interval '1 day')$q$);
  PERFORM tests.rows('a reader cannot change', $q$UPDATE announcements SET title = 'pwn'$q$, 0);
  PERFORM tests.rows('a reader cannot delete', 'DELETE FROM announcements', 0);

  -- 2. moderators ----------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.count_is('a moderator sees every announcement', 'SELECT 1 FROM announcements', 5);
  PERFORM tests.count_is('active_announcements stays "what is showing" for moderators too', 'SELECT 1 FROM public.active_announcements()', 3);
  INSERT INTO announcements (kind, title, ends_at) VALUES ('popup', 'Contest', now() + interval '3 days') RETURNING id INTO new_id;
  PERFORM tests.rows('a moderator changes one', format($q$UPDATE announcements SET ends_at = now() + interval '1 hour' WHERE id = %L$q$, new_id), 1);
  PERFORM tests.denied('created_by is not client-writable', $q$INSERT INTO announcements (kind, title, ends_at, created_by) VALUES ('banner', 'x', now() + interval '1 day', gen_random_uuid())$q$);
  PERFORM tests.denied('updated_at is not client-writable', format($q$UPDATE announcements SET updated_at = now() WHERE id = %L$q$, new_id));
  PERFORM tests.fails_with('kind must be banner or popup', $q$INSERT INTO announcements (kind, title, ends_at) VALUES ('toast', 'x', now() + interval '1 day')$q$, '23514');
  PERFORM tests.fails_with('a blank title', $q$INSERT INTO announcements (kind, title, ends_at) VALUES ('banner', '   ', now() + interval '1 day')$q$, '23514');
  PERFORM tests.fails_with('a title over 80 characters', format($q$INSERT INTO announcements (kind, title, ends_at) VALUES ('banner', %L, now() + interval '1 day')$q$, repeat('a', 81)), '22001');
  PERFORM tests.fails_with('the end must be after the start', $q$INSERT INTO announcements (kind, title, starts_at, ends_at) VALUES ('banner', 'x', now(), now() - interval '1 minute')$q$, '23514');
  PERFORM tests.fails_with('a protocol-relative link', $q$INSERT INTO announcements (kind, title, link_url, ends_at) VALUES ('banner', 'x', '//evil.example', now() + interval '1 day')$q$, '23514');
  PERFORM tests.fails_with('a javascript: link', $q$INSERT INTO announcements (kind, title, link_url, ends_at) VALUES ('banner', 'x', 'javascript:alert(1)', now() + interval '1 day')$q$, '23514');
  PERFORM tests.fails_with('a plain http link', $q$INSERT INTO announcements (kind, title, link_url, ends_at) VALUES ('banner', 'x', 'http://example.com', now() + interval '1 day')$q$, '23514');
  PERFORM tests.fails_with('an unknown locale', $q$INSERT INTO announcements (kind, title, locale, ends_at) VALUES ('banner', 'x', 'fr', now() + interval '1 day')$q$, '23514');
  PERFORM tests.rows('a moderator deletes one', format('DELETE FROM announcements WHERE id = %L', new_id), 1);
  RESET ROLE;
  PERFORM tests.ok('the deleted announcement is gone', NOT EXISTS (SELECT 1 FROM announcements WHERE id = new_id));
  PERFORM tests.act_as(m, 'authenticated', 'moderator');
  INSERT INTO announcements (kind, title, ends_at) VALUES ('banner', 'Signed', now() + interval '1 day') RETURNING id INTO new_id;
  RESET ROLE;
  PERFORM tests.ok('created_by comes from the session', (SELECT created_by = m FROM announcements WHERE id = new_id));

  -- 3. a suspended moderator writes nothing -----------------------------------------------------------------------------
  PERFORM tests.act_as(s, 'authenticated', 'moderator');
  PERFORM tests.denied('a suspended moderator cannot create', $q$INSERT INTO announcements (kind, title, ends_at) VALUES ('banner', 'x', now() + interval '1 day')$q$);
  PERFORM tests.rows('nor change', $q$UPDATE announcements SET title = 'pwn'$q$, 0);
  PERFORM tests.rows('nor delete', 'DELETE FROM announcements', 0);
END $$;

ROLLBACK;
