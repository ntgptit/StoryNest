-- Advisory draft edit lock with hand-over (batch 4 authoring4, Lucian 196). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000561', 'lock.owner@example.com'),
  ('00000000-0000-0000-0000-000000000562', 'lock.editor@example.com'),
  ('00000000-0000-0000-0000-000000000563', 'lock.coauthor@example.com'),
  ('00000000-0000-0000-0000-000000000564', 'lock.stranger@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('53000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000561', 'lock', 'Lock', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('53000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000562', 'editor'),
  ('53000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000563', 'co_author');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('53010000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000101', 'one', 1);
INSERT INTO chapter_drafts (chapter_id, title, updated_by) VALUES
  ('53010000-0000-0000-0000-000000000001', 'One', '00000000-0000-0000-0000-000000000561');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000561';
  e constant uuid := '00000000-0000-0000-0000-000000000562';
  c constant uuid := '00000000-0000-0000-0000-000000000563';
  s constant uuid := '00000000-0000-0000-0000-000000000564';
  ch constant uuid := '53010000-0000-0000-0000-000000000001';
  l public.chapter_edit_locks;
  first_expiry timestamptz;
BEGIN
  RESET ROLE;

  -- 1. who may use the lock ---------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot claim', format('SELECT public.claim_edit_lock(%L)', ch));
  PERFORM tests.denied('a guest cannot read locks', 'SELECT 1 FROM chapter_edit_locks');
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject', format('SELECT public.claim_edit_lock(%L)', ch), '42501');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('a stranger gets not-found', format('SELECT public.claim_edit_lock(%L)', ch), 'PT404');
  PERFORM tests.fails_with('also when asking', format('SELECT public.request_edit_lock(%L)', ch), 'PT404');
  PERFORM tests.fails_with('unknown chapter', format('SELECT public.claim_edit_lock(%L)', gen_random_uuid()), 'PT404');

  -- 2. the editor takes it; others see who holds it -----------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(e);
  l := public.claim_edit_lock(ch);
  PERFORM tests.ok('the editor holds the lock for 90 seconds',
    l.holder_id = e AND l.expires_at > now() + interval '80 seconds' AND l.expires_at <= now() + interval '90 seconds');
  first_expiry := l.expires_at;
  PERFORM tests.denied('nobody writes locks directly', format('UPDATE chapter_edit_locks SET holder_id = %L WHERE chapter_id = %L', e, ch));
  RESET ROLE; PERFORM tests.act_as(o);
  l := public.claim_edit_lock(ch);
  PERFORM tests.ok('the owner cannot take a live lock: it comes back unchanged', l.holder_id = e AND l.expires_at = first_expiry);
  PERFORM tests.count_is('the team reads the lock', 'SELECT 1 FROM chapter_edit_locks', 1);
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.count_is('a stranger does not', 'SELECT 1 FROM chapter_edit_locks', 0);

  -- 3. ask, decline, ask again, hand over ---------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  l := public.request_edit_lock(ch);
  PERFORM tests.ok('the owner asked', l.holder_id = e AND l.requested_by = o AND l.requested_at IS NOT NULL);
  PERFORM tests.fails_with('only the holder hands over', format('SELECT public.hand_over_edit_lock(%L)', ch), 'PT409');
  l := public.decline_edit_request(ch);
  PERFORM tests.ok('a non-holder cannot clear the request', l.requested_by = o);
  RESET ROLE; PERFORM tests.act_as(e);
  l := public.decline_edit_request(ch);
  PERFORM tests.ok('the holder declined', l.holder_id = e AND l.requested_by IS NULL);
  PERFORM tests.fails_with('nothing to hand over', format('SELECT public.hand_over_edit_lock(%L)', ch), 'PT409');
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM public.request_edit_lock(ch);
  RESET ROLE; PERFORM tests.act_as(e);
  l := public.claim_edit_lock(ch);
  PERFORM tests.ok('a heartbeat keeps the request', l.holder_id = e AND l.requested_by = c);
  l := public.hand_over_edit_lock(ch);
  PERFORM tests.ok('the co-author holds it now', l.holder_id = c AND l.requested_by IS NULL AND l.expires_at > now());

  -- 4. release and expiry -------------------------------------------------------------------------------------------------------
  PERFORM public.release_edit_lock(ch);
  RESET ROLE;
  PERFORM tests.ok('a non-holder release changed nothing', (SELECT holder_id = c FROM chapter_edit_locks WHERE chapter_id = ch));
  PERFORM tests.act_as(c);
  PERFORM public.release_edit_lock(ch);
  PERFORM public.release_edit_lock(ch);   -- idempotent
  RESET ROLE;
  PERFORM tests.ok('released', NOT EXISTS (SELECT 1 FROM chapter_edit_locks WHERE chapter_id = ch));

  PERFORM tests.act_as(o);
  PERFORM public.claim_edit_lock(ch);
  RESET ROLE;
  UPDATE chapter_edit_locks SET expires_at = now() - interval '1 second', requested_by = e WHERE chapter_id = ch;
  PERFORM tests.act_as(e);
  l := public.claim_edit_lock(ch);
  PERFORM tests.ok('an expired lock goes to whoever claims it, and the request is cleared', l.holder_id = e AND l.requested_by IS NULL);

  -- 5. a holder who left the team does not keep it ------------------------------------------------------------------------------
  RESET ROLE;
  DELETE FROM story_collaborators WHERE user_id = e;
  PERFORM tests.act_as(c);
  l := public.claim_edit_lock(ch);
  PERFORM tests.ok('the lock of a removed editor is free', l.holder_id = c);

  -- 6. the lock never touches the draft or its revision check -----------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('the owner can still save while the co-author holds the lock',
    format('UPDATE chapter_drafts SET title = ''Owner'', revision = 2, updated_by = %L WHERE chapter_id = %L AND revision = 1', o, ch), 1);
  PERFORM tests.rows('and a stale save still matches nothing',
    format('UPDATE chapter_drafts SET title = ''Stale'', revision = 2, updated_by = %L WHERE chapter_id = %L AND revision = 1', o, ch), 0);
  RESET ROLE;
END $$;

ROLLBACK;
