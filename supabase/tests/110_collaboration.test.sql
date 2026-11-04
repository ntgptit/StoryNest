-- Collaboration invitation tests (WP 3.8, D9). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'co.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'co.invitee@example.com'),
  ('00000000-0000-0000-0000-0000000000b3', 'co.stranger@example.com'),
  ('00000000-0000-0000-0000-0000000000b4', 'co.suspended@example.com');
UPDATE app_users SET username = 'co_owner' WHERE id = '00000000-0000-0000-0000-0000000000b1';
UPDATE app_users SET username = 'co_invitee' WHERE id = '00000000-0000-0000-0000-0000000000b2';
UPDATE app_users SET username = 'co_stranger' WHERE id = '00000000-0000-0000-0000-0000000000b3';
UPDATE app_users SET username = 'co_suspended', account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000b4';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('1b000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'co-story', 'Secret Tale', 'private', 'draft');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000b1';
  i constant uuid := '00000000-0000-0000-0000-0000000000b2';
  s constant uuid := '00000000-0000-0000-0000-0000000000b3';
  st constant uuid := '1b000000-0000-0000-0000-000000000001';
  inv uuid; inv2 uuid; k int;
BEGIN
  RESET ROLE;

  -- 1. who may invite -----------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot invite', format('SELECT public.invite_collaborator(%L, ''co_invitee'', ''editor'')', st));
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('stranger cannot invite', format('SELECT public.invite_collaborator(%L, ''co_invitee'', ''editor'')', st), 'PT404');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('unknown role', format('SELECT public.invite_collaborator(%L, ''co_invitee'', ''owner'')', st), '22023');
  PERFORM tests.fails_with('unknown user', format('SELECT public.invite_collaborator(%L, ''nobody_here'', ''editor'')', st), 'PT404');
  PERFORM tests.fails_with('suspended user is not invitable', format('SELECT public.invite_collaborator(%L, ''co_suspended'', ''editor'')', st), 'PT404');
  PERFORM tests.fails_with('cannot invite yourself', format('SELECT public.invite_collaborator(%L, ''co_owner'', ''editor'')', st), '22023');
  PERFORM tests.denied('owner cannot insert a collaborator directly', format('INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES (%L, %L, ''editor'')', st, i));
  PERFORM tests.denied('nobody writes invitations directly', format('INSERT INTO story_invitations (story_id, inviter_id, invitee_id, collaborator_role) VALUES (%L, %L, %L, ''editor'')', st, o, i));

  -- 2. invite -> pending, notification, no collaborator yet ----------------------------------------------------
  inv := public.invite_collaborator(st, 'co_invitee', 'editor');
  PERFORM tests.fails_with('duplicate pending invitation', format('SELECT public.invite_collaborator(%L, ''co_invitee'', ''co_author'')', st), 'PT409');
  RESET ROLE;
  PERFORM tests.ok('notification sent to invitee', (SELECT count(*) = 1 FROM notifications
      WHERE recipient_id = i AND event_type = 'collaboration_invited' AND payload ->> 'story_title' = 'Secret Tale'));
  PERFORM tests.ok('not a collaborator before accepting', NOT EXISTS (SELECT 1 FROM story_collaborators WHERE user_id = i));

  PERFORM tests.act_as(o);
  PERFORM tests.ok('owner lists the invitation', (SELECT count(*) = 1 AND min(status) = 'pending' AND min(invitee_username) = 'co_invitee'
      FROM public.list_story_invitations(st)));
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.count_is('stranger lists no invitations of the story', format('SELECT 1 FROM public.list_story_invitations(%L)', st), 0);
  PERFORM tests.count_is('stranger sees no invitation rows', 'SELECT 1 FROM story_invitations', 0);
  PERFORM tests.count_is('stranger has no invitations of their own', 'SELECT 1 FROM public.list_my_invitations()', 0);
  PERFORM tests.fails_with('stranger cannot answer it', format('SELECT public.respond_invitation(%L, true)', inv), 'PT404');
  PERFORM tests.fails_with('stranger cannot cancel it', format('SELECT public.cancel_invitation(%L)', inv), 'PT404');

  -- 3. the invitee sees it even though the story is private -------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(i);
  PERFORM tests.ok('invitee sees story title and inviter', (SELECT count(*) = 1 AND min(story_title) = 'Secret Tale'
      AND min(inviter_username) = 'co_owner' AND min(collaborator_role) = 'editor' FROM public.list_my_invitations()));
  PERFORM tests.fails_with('the owner is not the invitee', format('SELECT public.respond_invitation(%L, true)', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('invitee cannot cancel', format('SELECT public.cancel_invitation(%L)', inv), 'PT404');

  -- 4. accept -> collaborator with the invited role, owner notified ----------------------------------------------------
  PERFORM public.respond_invitation(inv, true);
  PERFORM tests.fails_with('answering twice', format('SELECT public.respond_invitation(%L, false)', inv), 'PT409');
  PERFORM tests.count_is('invitation leaves the inbox', 'SELECT 1 FROM public.list_my_invitations()', 0);
  PERFORM tests.count_is('invitee now sees the private story', format('SELECT 1 FROM stories WHERE id = %L', st), 1);
  RESET ROLE;
  PERFORM tests.ok('collaborator row has the invited role', (SELECT collaborator_role = 'editor' FROM story_collaborators WHERE story_id = st AND user_id = i));
  PERFORM tests.ok('owner notified of acceptance', (SELECT count(*) = 1 FROM notifications WHERE recipient_id = o AND event_type = 'collaboration_accepted'));
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('already a collaborator', format('SELECT public.invite_collaborator(%L, ''co_invitee'', ''editor'')', st), 'PT409');

  -- 5. decline, then invite again -----------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('owner removes the collaborator', format('DELETE FROM story_collaborators WHERE story_id = %L AND user_id = %L', st, i), 1);
  inv2 := public.invite_collaborator(st, 'co_invitee', 'co_author');
  RESET ROLE; PERFORM tests.act_as(i);
  PERFORM public.respond_invitation(inv2, false);
  RESET ROLE;
  PERFORM tests.ok('declined creates no collaborator', NOT EXISTS (SELECT 1 FROM story_collaborators WHERE user_id = i));
  PERFORM tests.ok('owner notified of decline', (SELECT count(*) = 1 FROM notifications WHERE recipient_id = o AND event_type = 'collaboration_declined'));
  PERFORM tests.act_as(o);
  inv := public.invite_collaborator(st, 'co_invitee', 'co_author');

  -- 6. cancel ------------------------------------------------------------------------------------------------------
  PERFORM public.cancel_invitation(inv);
  PERFORM tests.fails_with('cancelled cannot be cancelled again', format('SELECT public.cancel_invitation(%L)', inv), 'PT409');
  RESET ROLE; PERFORM tests.act_as(i);
  PERFORM tests.fails_with('cancelled cannot be accepted', format('SELECT public.respond_invitation(%L, true)', inv), 'PT409');

  -- 7. at most 20 pending invitations per story -------------------------------------------------------------------------
  RESET ROLE;
  FOR k IN 1..20 LOOP
    INSERT INTO auth.users (id, email) VALUES (('00000000-0000-0000-0000-00000000c0' || lpad(k::text, 2, '0'))::uuid, 'co.bulk' || k || '@example.com');
    UPDATE app_users SET username = 'co_bulk_' || k WHERE id = ('00000000-0000-0000-0000-00000000c0' || lpad(k::text, 2, '0'))::uuid;
    INSERT INTO story_invitations (story_id, inviter_id, invitee_id, collaborator_role)
      VALUES (st, o, ('00000000-0000-0000-0000-00000000c0' || lpad(k::text, 2, '0'))::uuid, 'editor');
  END LOOP;
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('pending invitations are capped', format('SELECT public.invite_collaborator(%L, ''co_invitee'', ''editor'')', st), 'PT409');
END $$;

ROLLBACK;
