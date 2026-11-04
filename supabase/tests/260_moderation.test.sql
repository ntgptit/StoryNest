-- Reports and moderation (WP 6.1): who may report what, the queue, every action with its audit row, the guards that
-- close the old direct-write paths. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000a8', 'md.owner@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000b8', 'md.reader@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c8', 'md.other@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000e8', 'md.suspended@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000f8', 'md.deactivated@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d8', 'md.mod@example.com', '{"role":"moderator"}'),
  ('00000000-0000-0000-0000-0000000000d9', 'md.mod2@example.com', '{"role":"moderator"}');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000e8';
UPDATE app_users SET account_status = 'deactivated' WHERE id = '00000000-0000-0000-0000-0000000000f8';
UPDATE app_users SET username = 'md_other', display_name = 'Other Person' WHERE id = '00000000-0000-0000-0000-0000000000c8';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a8', 'md-story', 'Reported story', 'public', 'ongoing'),
  ('18000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a8', 'md-private', 'Private', 'private', 'ongoing'),
  ('18000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a8', 'md-second', 'Second story', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('28000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 'one', 1),
  ('28000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000001', 'draft', 2),
  ('28000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000003', 'one', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a8';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('28000000-0000-0000-0000-000000000001', 'One', '[{"block_id":"38000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a),
    ('28000000-0000-0000-0000-000000000003', 'Three', '[{"block_id":"38000000-0000-0000-0000-000000000003","type":"paragraph","text":"c"}]'::jsonb, a);
  PERFORM public.publish_chapter('28000000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('28000000-0000-0000-0000-000000000003');
END $$;

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000a8';   -- story owner
  r constant uuid := '00000000-0000-0000-0000-0000000000b8';   -- reader and commenter
  x constant uuid := '00000000-0000-0000-0000-0000000000c8';   -- another reader
  s constant uuid := '00000000-0000-0000-0000-0000000000e8';   -- suspended
  dz constant uuid := '00000000-0000-0000-0000-0000000000f8';  -- deactivated
  m constant uuid := '00000000-0000-0000-0000-0000000000d8';   -- moderator
  m2 constant uuid := '00000000-0000-0000-0000-0000000000d9';  -- another moderator
  st1 constant uuid := '18000000-0000-0000-0000-000000000001';
  stp constant uuid := '18000000-0000-0000-0000-000000000002';
  st3 constant uuid := '18000000-0000-0000-0000-000000000003';
  ch1 constant uuid := '28000000-0000-0000-0000-000000000001';
  chd constant uuid := '28000000-0000-0000-0000-000000000002';
  k1 constant uuid := 'f8000000-0000-4000-8000-000000000001';   -- reader's comment
  k2 constant uuid := 'f8000000-0000-4000-8000-000000000002';   -- owner's comment
  rep1 uuid; rep2 uuid; rep3 uuid; rep4 uuid; rep5 uuid; again uuid;
  n integer;
  page_a timestamptz; page_b uuid;
BEGIN
  RESET ROLE;
  PERFORM tests.act_as(r);
  PERFORM public.post_comment(k1, ch1, NULL, NULL, 'Bình luận cần báo cáo');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM public.post_comment(k2, ch1, NULL, NULL, 'Bình luận của tác giả');
  RESET ROLE;

  -- 1. reporting: who and what ------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('anon has no privilege to report', NOT has_function_privilege('anon', 'public.submit_report(text, uuid, text, text)', 'EXECUTE'));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject', format('SELECT public.submit_report(''story'', %L, ''spam'')', st1), '42501');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('a suspended account cannot report', format('SELECT public.submit_report(''story'', %L, ''spam'')', st1), '42501');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('unknown reason', format('SELECT public.submit_report(''story'', %L, ''boring'')', st1), '22023');
  PERFORM tests.fails_with('null reason', format('SELECT public.submit_report(''story'', %L, NULL)', st1), '22023');
  PERFORM tests.fails_with('unknown kind', format('SELECT public.submit_report(''chapterx'', %L, ''spam'')', st1), '22023');
  PERFORM tests.fails_with('null target', 'SELECT public.submit_report(''story'', NULL, ''spam'')', '22023');
  PERFORM tests.fails_with('description too long', format('SELECT public.submit_report(''story'', %L, ''spam'', %L)', st1, repeat('x', 2001)), '22023');
  PERFORM tests.fails_with('a private story cannot be reported by a stranger', format('SELECT public.submit_report(''story'', %L, ''spam'')', stp), 'PT404');
  PERFORM tests.fails_with('a draft chapter cannot be reported', format('SELECT public.submit_report(''chapter'', %L, ''spam'')', chd), 'PT404');
  PERFORM tests.fails_with('an unknown comment', format('SELECT public.submit_report(''comment'', %L, ''spam'')', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('an unknown account', format('SELECT public.submit_report(''user'', %L, ''spam'')', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('a suspended account is not reportable', format('SELECT public.submit_report(''user'', %L, ''spam'')', s), 'PT404');
  PERFORM tests.fails_with('nobody reports themselves', format('SELECT public.submit_report(''user'', %L, ''spam'')', x), '22023');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('the owner does not report their own story', format('SELECT public.submit_report(''story'', %L, ''spam'')', st1), '22023');
  PERFORM tests.fails_with('nor their own chapter', format('SELECT public.submit_report(''chapter'', %L, ''spam'')', ch1), '22023');
  PERFORM tests.fails_with('nor their own comment', format('SELECT public.submit_report(''comment'', %L, ''spam'')', k2), '22023');

  -- 2. reports of each kind, idempotent ----------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(x);
  rep1 := public.submit_report('story', st1, 'spam', '  Quảng cáo  ');
  rep2 := public.submit_report('chapter', ch1, 'hate');
  rep3 := public.submit_report('comment', k1, 'harassment', repeat('y', 2000));
  rep4 := public.submit_report('user', r, 'other');
  again := public.submit_report('story', st1, 'violence', 'a different reason, same open target');
  PERFORM tests.ok('a repeat on the same open target returns the first report', again = rep1);
  RESET ROLE;
  PERFORM tests.ok('one row per target, the description trimmed, nothing overwritten',
    (SELECT count(*) = 4 AND min(description) FILTER (WHERE id = rep1) = 'Quảng cáo'
        AND min(reason) FILTER (WHERE id = rep1) = 'spam' FROM content_reports WHERE reporter_id = x));
  PERFORM tests.ok('each report names exactly its target',
    (SELECT story_id = st1 AND chapter_id IS NULL AND comment_id IS NULL AND reported_user_id IS NULL FROM content_reports WHERE id = rep1)
    AND (SELECT chapter_id = ch1 AND story_id IS NULL FROM content_reports WHERE id = rep2)
    AND (SELECT comment_id = k1 FROM content_reports WHERE id = rep3)
    AND (SELECT reported_user_id = r FROM content_reports WHERE id = rep4));
  PERFORM tests.act_as(r);
  rep5 := public.submit_report('story', st1, 'spam');
  PERFORM tests.ok('another reader gets a report of their own on the same target', rep5 <> rep1);
  PERFORM tests.count_is('a reader sees only their own reports', 'SELECT 1 FROM content_reports', 1);
  PERFORM tests.fails_with('a reader does not report their own comment', format('SELECT public.submit_report(''comment'', %L, ''spam'')', k1), '22023');
  RESET ROLE;
  -- one transaction has one now(): give the reports distinct, known ages so the order is a fact, not luck
  UPDATE content_reports SET created_at = now() - interval '5 hours' WHERE id = rep1;
  UPDATE content_reports SET created_at = now() - interval '4 hours' WHERE id = rep2;
  UPDATE content_reports SET created_at = now() - interval '3 hours' WHERE id = rep3;
  UPDATE content_reports SET created_at = now() - interval '2 hours' WHERE id = rep4;
  UPDATE content_reports SET created_at = now() - interval '1 hour' WHERE id = rep5;

  -- 3. nobody writes reports directly --------------------------------------------------------------------------------------
  PERFORM tests.act_as(x);
  PERFORM tests.denied('no direct insert', format('INSERT INTO content_reports (reporter_id, story_id, reason) VALUES (%L, %L, ''spam'')', x, st3));
  PERFORM tests.denied('no direct update of my own report', format('UPDATE content_reports SET description = ''edited'' WHERE id = %L', rep1));
  PERFORM tests.denied('no direct delete of my own report', format('DELETE FROM content_reports WHERE id = %L', rep1));
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.denied('a moderator cannot close a report by writing the row', format('UPDATE content_reports SET status = ''resolved'' WHERE id = %L', rep1));
  PERFORM tests.denied('nor hide a comment by writing the row', format('UPDATE comments SET status = ''hidden'' WHERE id = %L', k1));
  RESET ROLE;

  -- 4. the queue -------------------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(x);
  PERFORM tests.fails_with('a reader cannot list reports', 'SELECT * FROM public.list_reports()', '42501');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('nor a story owner', 'SELECT * FROM public.list_reports()', '42501');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('anon has no privilege', NOT has_function_privilege('anon', 'public.list_reports(text, boolean, timestamptz, uuid, integer)', 'EXECUTE'));
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.fails_with('unknown status', 'SELECT * FROM public.list_reports(''weird'')', '22023');
  PERFORM tests.ok('five open reports', (SELECT count(*) = 5 FROM public.list_reports()));
  PERFORM tests.ok('the story card: title, state, slug, reporter and the count of open reports on it',
    (SELECT target_kind = 'story' AND target_title = 'Reported story' AND target_state = 'visible' AND story_slug = 'md-story'
        AND reporter_name = 'Other Person' AND open_reports = 2 AND reason = 'spam' AND status = 'pending'
        FROM public.list_reports() WHERE id = rep1));
  PERFORM tests.ok('the chapter card', (SELECT target_kind = 'chapter' AND target_title = 'One' AND chapter_slug = 'one' AND story_slug = 'md-story'
        AND target_state = 'visible' FROM public.list_reports() WHERE id = rep2));
  PERFORM tests.ok('the comment card: the text, the author, where it is',
    (SELECT target_kind = 'comment' AND target_title = 'Bình luận cần báo cáo' AND target_state = 'visible' AND chapter_slug = 'one'
        AND story_slug = 'md-story' FROM public.list_reports() WHERE id = rep3));
  PERFORM tests.ok('the account card', (SELECT target_kind = 'user' AND target_state = 'active' AND username IS NOT NULL
        FROM public.list_reports() WHERE id = rep4));
  PERFORM tests.ok('oldest first by default, newest first on request',
    (SELECT id FROM public.list_reports() LIMIT 1) = rep1
    AND (SELECT id FROM public.list_reports('open', true) LIMIT 1) = rep5);
  PERFORM tests.ok('a page and its cursor', (SELECT count(*) = 2 FROM public.list_reports('open', false, NULL, NULL, 2)));
  SELECT created_at, id INTO page_a, page_b FROM public.list_reports('open', false, NULL, NULL, 2) ORDER BY created_at DESC, id DESC LIMIT 1;
  PERFORM tests.ok('the next page starts after it', (SELECT count(*) = 3 FROM public.list_reports('open', false, page_a, page_b, 10)));
  PERFORM tests.ok('nothing is closed yet', (SELECT count(*) = 0 FROM public.list_reports('closed')));

  -- 5. acting ---------------------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('a reader cannot moderate', format('SELECT public.moderate(''hide_comment'', %L, ''because'')', k1), '42501');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('nor a story owner', format('SELECT public.moderate(''hide_comment'', %L, ''because'')', k1), '42501');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('anon has no privilege', NOT has_function_privilege('anon', 'public.moderate(text, uuid, text, uuid)', 'EXECUTE'));
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.fails_with('a reason is required', format('SELECT public.moderate(''hide_comment'', %L, '' ab '')', k1), '22023');
  PERFORM tests.fails_with('and not an essay', format('SELECT public.moderate(''hide_comment'', %L, %L)', k1, repeat('x', 1001)), '22023');
  PERFORM tests.fails_with('unknown action', format('SELECT public.moderate(''delete_everything'', %L, ''because'')', k1), '22023');
  PERFORM tests.fails_with('unknown comment', format('SELECT public.moderate(''hide_comment'', %L, ''because'')', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('unknown report', format('SELECT public.moderate(''hide_comment'', %L, ''because'', %L)', k1, gen_random_uuid()), 'PT404');
  PERFORM tests.ok('nothing was written by the refusals', (SELECT count(*) = 0 FROM moderation_actions));

  -- hide a comment: hidden for others, visible to its author, recorded, the reports about it closed
  PERFORM tests.ok('hide returns the new state', public.moderate('hide_comment', k1, '  harassment confirmed ', rep3) = 'hidden');
  PERFORM tests.ok('hiding again changes nothing', public.moderate('hide_comment', k1, 'again') = 'hidden');
  RESET ROLE;
  PERFORM tests.ok('the comment is hidden and recorded as the moderator''s',
    (SELECT c.status = 'hidden' AND h.source = 'moderator' AND h.hidden_by = m FROM comments c JOIN comment_hides h ON h.comment_id = c.id WHERE c.id = k1));
  PERFORM tests.ok('the audit row says who, what, why and for which report',
    (SELECT actor_id = m AND target_kind = 'comment' AND target_id = k1 AND report_id = rep3
       FROM moderation_actions WHERE action = 'hide_comment' AND reason = 'harassment confirmed'));
  PERFORM tests.ok('the report about it is closed by the moderator', (SELECT status = 'resolved' AND reviewed_by = m AND reviewed_at IS NOT NULL FROM content_reports WHERE id = rep3));
  PERFORM tests.ok('other reports are untouched', (SELECT count(*) = 4 FROM content_reports WHERE status = 'pending'));
  PERFORM tests.act_as(x);
  PERFORM tests.count_is('other readers no longer see it', format('SELECT 1 FROM public.list_comments(%L) WHERE body IS NOT NULL AND id = %L', ch1, k1), 0);
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('the queue shows its new state', (SELECT target_state = 'hidden' FROM public.list_reports('resolved') WHERE id = rep3));
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('a hidden comment cannot be reported (nothing for a reader to see)', format('SELECT public.submit_report(''comment'', %L, ''spam'')', k1), 'PT404');
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('restore returns visible', public.moderate('restore_comment', k1, 'appealed') = 'visible');
  PERFORM tests.ok('restoring a visible comment is harmless', public.moderate('restore_comment', k1, 'again') = 'visible');
  RESET ROLE;
  PERFORM tests.ok('restoring leaves the closed report closed', (SELECT status = 'resolved' FROM content_reports WHERE id = rep3));
  PERFORM tests.act_as(r);
  PERFORM public.delete_comment(k1);
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.fails_with('a deleted comment is not moderated', format('SELECT public.moderate(''hide_comment'', %L, ''because'')', k1), 'PT409');
  PERFORM tests.fails_with('nor restored', format('SELECT public.moderate(''restore_comment'', %L, ''because'')', k1), 'PT409');

  -- remove and restore a story
  PERFORM tests.ok('remove returns removed', public.moderate('remove_story', st1, 'copyright claim', rep1) = 'removed');
  PERFORM tests.fails_with('removing twice', format('SELECT public.moderate(''remove_story'', %L, ''again'')', st1), 'PT409');
  RESET ROLE;
  PERFORM tests.ok('the reports on the story and on its chapter are closed',
    (SELECT count(*) = 0 FROM content_reports WHERE status = 'pending' AND (story_id = st1 OR chapter_id = ch1)));
  PERFORM tests.ok('another reader''s report about the same story is closed too', (SELECT status = 'resolved' FROM content_reports WHERE id = rep5));
  PERFORM tests.act_as(x);
  PERFORM tests.count_is('readers no longer find the story', format('SELECT 1 FROM stories WHERE id = %L', st1), 0);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('the owner cannot bring it back by writing the row', format('UPDATE stories SET deleted_at = NULL WHERE id = %L', st1), '42501');
  PERFORM tests.ok('it stays removed', (SELECT deleted_at IS NOT NULL FROM stories WHERE id = st1));
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('the queue shows the story as removed', (SELECT target_state = 'removed' FROM public.list_reports('resolved') WHERE id = rep1));
  PERFORM tests.ok('a moderator restores it', public.moderate('restore_story', st1, 'claim withdrawn') = 'visible');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.count_is('readers find it again', format('SELECT 1 FROM stories WHERE id = %L', st1), 1);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('and the owner may delete it themselves', format('UPDATE stories SET deleted_at = now() WHERE id = %L', st1), 1);
  PERFORM tests.rows('and bring it back themselves (not a moderator''s removal any more)', format('UPDATE stories SET deleted_at = NULL WHERE id = %L', st1), 1);
  PERFORM tests.rows('delete it again for the next step', format('UPDATE stories SET deleted_at = now() WHERE id = %L', st1), 1);
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.fails_with('a story the author deleted is not the moderator''s to restore', format('SELECT public.moderate(''restore_story'', %L, ''because'')', st1), 'PT409');
  PERFORM tests.fails_with('and cannot be removed a second time', format('SELECT public.moderate(''remove_story'', %L, ''because'')', st1), 'PT409');
  PERFORM tests.fails_with('a visible story is not "restored"', format('SELECT public.moderate(''restore_story'', %L, ''because'')', st3), 'PT409');
  PERFORM tests.fails_with('unknown story', format('SELECT public.moderate(''remove_story'', %L, ''because'')', gen_random_uuid()), 'PT404');

  -- suspend and reinstate an account
  PERFORM tests.fails_with('a moderator cannot suspend themselves', format('SELECT public.moderate(''suspend_user'', %L, ''because'')', m), '22023');
  PERFORM tests.fails_with('nor another moderator', format('SELECT public.moderate(''suspend_user'', %L, ''because'')', m2), '22023');
  RESET ROLE; PERFORM tests.act_as(x, 'authenticated', 'moderator');   -- a moderator token for an account whose own record has no such role
  PERFORM tests.fails_with('not even by that token''s own account', format('SELECT public.moderate(''suspend_user'', %L, ''because'')', x), '22023');
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.fails_with('a deactivated account is not touched', format('SELECT public.moderate(''suspend_user'', %L, ''because'')', dz), 'PT409');
  PERFORM tests.fails_with('unknown account', format('SELECT public.moderate(''suspend_user'', %L, ''because'')', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('an account suspended by someone else is not reinstated here', format('SELECT public.moderate(''reinstate_user'', %L, ''because'')', s), 'PT409');
  PERFORM tests.fails_with('an active account is not "reinstated"', format('SELECT public.moderate(''reinstate_user'', %L, ''because'')', x), 'PT409');
  PERFORM tests.ok('suspend returns suspended', public.moderate('suspend_user', r, 'repeated harassment', rep4) = 'suspended');
  RESET ROLE;
  PERFORM tests.ok('the account is suspended and its report closed',
    (SELECT account_status = 'suspended' FROM app_users WHERE id = r) AND (SELECT status = 'resolved' FROM content_reports WHERE id = rep4));
  PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a suspended account can no longer report', format('SELECT public.submit_report(''story'', %L, ''spam'')', st3), '42501');
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.fails_with('suspending twice', format('SELECT public.moderate(''suspend_user'', %L, ''because'')', r), 'PT409');
  PERFORM tests.ok('reinstate returns active', public.moderate('reinstate_user', r, 'suspension served') = 'active');
  RESET ROLE;
  PERFORM tests.ok('active again', (SELECT account_status = 'active' FROM app_users WHERE id = r));

  -- 6. closing a report by hand ------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(x);
  rep1 := public.submit_report('story', st3, 'spam');
  rep2 := public.submit_report('chapter', '28000000-0000-0000-0000-000000000003', 'copyright');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('a story owner cannot resolve', format('SELECT public.resolve_report(%L, ''resolved'', ''because'')', rep1), '42501');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('anon has no privilege', NOT has_function_privilege('anon', 'public.resolve_report(uuid, text, text)', 'EXECUTE'));
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.fails_with('unknown report', format('SELECT public.resolve_report(%L, ''resolved'', ''because'')', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('unknown status', format('SELECT public.resolve_report(%L, ''pending'', ''because'')', rep1), '22023');
  PERFORM tests.fails_with('a reason is needed', format('SELECT public.resolve_report(%L, ''dismissed'', ''x'')', rep1), '22023');
  PERFORM public.resolve_report(rep1, 'reviewing', 'looking into it');
  PERFORM tests.ok('reviewing stays open', (SELECT status = 'reviewing' FROM public.list_reports('open') WHERE id = rep1));
  PERFORM tests.ok('the reviewing filter finds it', (SELECT count(*) = 1 FROM public.list_reports('reviewing')));
  PERFORM public.resolve_report(rep1, 'dismissed', 'no violation found');
  PERFORM public.resolve_report(rep2, 'resolved', 'handled elsewhere');
  PERFORM tests.fails_with('a closed report stays closed', format('SELECT public.resolve_report(%L, ''resolved'', ''because'')', rep1), 'PT409');
  PERFORM tests.ok('dismissed and resolved are separate filters',
    (SELECT count(*) = 1 FROM public.list_reports('dismissed') WHERE id = rep1) AND (SELECT count(*) = 1 FROM public.list_reports('resolved') WHERE id = rep2));
  PERFORM tests.ok('closed means both', (SELECT count(*) >= 2 FROM public.list_reports('closed')));
  PERFORM tests.ok('a dismissal is a dismissal: the content is untouched',
    (SELECT story_id IS NOT NULL AND target_state = 'visible' FROM public.list_reports('dismissed') WHERE id = rep1));
  RESET ROLE;
  PERFORM tests.ok('each step left an audit row',
    (SELECT count(*) FILTER (WHERE action = 'review_report') = 1 AND count(*) FILTER (WHERE action = 'dismiss_report') = 1
        AND count(*) FILTER (WHERE action = 'resolve_report') = 1 FROM moderation_actions WHERE target_kind = 'report'));

  -- 7. the audit log is closed ---------------------------------------------------------------------------------------------------------
  PERFORM tests.ok('every action so far is on record', (SELECT count(*) = 11 FROM moderation_actions));
  PERFORM tests.ok('no row without a reason of a real length', (SELECT bool_and(length(btrim(reason)) >= 3) FROM moderation_actions));
  PERFORM tests.act_as(x);
  PERFORM tests.count_is('a reader sees no audit rows', 'SELECT 1 FROM moderation_actions', 0);
  PERFORM tests.denied('and cannot write one', format('INSERT INTO moderation_actions (actor_id, action, target_kind, target_id, reason) VALUES (%L, ''hide_comment'', ''comment'', %L, ''forged'')', x, k1));
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot read the audit log', 'SELECT 1 FROM moderation_actions');
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator reads it', (SELECT count(*) = 11 FROM moderation_actions));
  PERFORM tests.denied('but cannot edit it', 'UPDATE moderation_actions SET reason = ''rewritten''');
  PERFORM tests.denied('or add to it', format('INSERT INTO moderation_actions (actor_id, action, target_kind, target_id, reason) VALUES (%L, ''hide_comment'', ''comment'', %L, ''forged'')', m, k1));
  RESET ROLE;
  PERFORM tests.ok('the internal helpers are closed to clients',
    NOT has_function_privilege('authenticated', 'public.last_moderation_action(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.close_reports_for(uuid, uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.moderation_report_card(public.content_reports)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.refuse_client_write()', 'EXECUTE'));

  -- 8. the report cap ---------------------------------------------------------------------------------------------------------------------------
  INSERT INTO content_reports (reporter_id, story_id, reason, status, created_at)
  SELECT x, st3, 'spam', 'dismissed', now() - interval '1 hour' FROM generate_series(1, 18);
  PERFORM tests.act_as(x);
  PERFORM tests.fails_with('too many reports', format('SELECT public.submit_report(''user'', %L, ''spam'')', o), 'PT429');
  RESET ROLE;
  UPDATE content_reports SET created_at = now() - interval '25 hours' WHERE reporter_id = x;
  PERFORM tests.act_as(x);
  PERFORM tests.ok('after a day the cap lifts', public.submit_report('user', o, 'spam') IS NOT NULL);
  RESET ROLE;
END $$;

ROLLBACK;
