-- A reporter withdraws a pending report; nobody else can, and not once it is being looked at. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000005c1', 'wr.owner@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000005c2', 'wr.reporter@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000005c3', 'wr.other@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000005c4', 'wr.mod@example.com', '{"role":"moderator"}');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('5c000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005c1', 'wr-story', 'Reported', 'public', 'ongoing'),
  ('5c000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000005c1', 'wr-story-2', 'Reported too', 'public', 'ongoing');
INSERT INTO content_reports (id, reporter_id, story_id, reason) VALUES
  ('5c100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005c2', '5c000000-0000-0000-0000-000000000001', 'spam'),
  ('5c100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000005c2', '5c000000-0000-0000-0000-000000000002', 'other');

DO $$
DECLARE
  rp constant uuid := '00000000-0000-0000-0000-0000000005c2';
  ot constant uuid := '00000000-0000-0000-0000-0000000005c3';
  md constant uuid := '00000000-0000-0000-0000-0000000005c4';
  r1 constant uuid := '5c100000-0000-0000-0000-000000000001';
  r2 constant uuid := '5c100000-0000-0000-0000-000000000002';
BEGIN
  RESET ROLE; PERFORM tests.act_as(ot);
  PERFORM tests.fails_with('someone else cannot withdraw it', format('SELECT public.withdraw_report(%L)', r1), 'PT404');

  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot call it', format('SELECT public.withdraw_report(%L)', r1));

  RESET ROLE; PERFORM tests.act_as(rp);
  PERFORM tests.ok('the reporter withdraws a pending report', public.withdraw_report(r1) = 'dismissed');
  RESET ROLE;
  PERFORM tests.ok('it is closed as dismissed and marked withdrawn, with no moderator on it',
    (SELECT status = 'dismissed' AND withdrawn_at IS NOT NULL AND reviewed_by IS NULL FROM content_reports WHERE id = r1));
  PERFORM tests.ok('the audit row names the reporter as the actor',
    (SELECT count(*) = 1 AND min(actor_id::text) = rp::text AND min(action) = 'dismiss_report'
       FROM moderation_actions WHERE report_id = r1));

  PERFORM tests.act_as(rp);
  PERFORM tests.fails_with('withdrawing twice is refused', format('SELECT public.withdraw_report(%L)', r1), 'PT409');

  -- once a moderator started on it, it is no longer the reporter's to take back
  RESET ROLE; PERFORM tests.act_as(md, 'authenticated', 'moderator');
  PERFORM public.resolve_report(r2, 'reviewing', 'looking at it');
  RESET ROLE; PERFORM tests.act_as(rp);
  PERFORM tests.fails_with('a report under review cannot be withdrawn', format('SELECT public.withdraw_report(%L)', r2), 'PT409');

  RESET ROLE;
  PERFORM tests.ok('execute is limited to authenticated',
    has_function_privilege('authenticated', 'public.withdraw_report(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.withdraw_report(uuid)', 'EXECUTE'));
END $$;

ROLLBACK;
