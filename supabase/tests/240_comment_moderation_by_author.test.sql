-- Story authors moderate comments on their own story (WP 6.2): who may hide, the moderator's hide stays out of the
-- author's reach, what each reader sees, counters and idempotence. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a6', 'mo.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b6', 'mo.commenter@example.com'),
  ('00000000-0000-0000-0000-0000000000c6', 'mo.coauthor@example.com'),
  ('00000000-0000-0000-0000-0000000000d6', 'mo.editor@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'mo.stranger@example.com'),
  ('00000000-0000-0000-0000-0000000000f6', 'mo.suspended@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000f6';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a6', 'mo-story', 'Moderation', 'public', 'ongoing'),
  ('16000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e6', 'mo-other', 'Someone else''s', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c6', 'co_author'),
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d6', 'editor'),
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f6', 'co_author');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'one', 1),
  ('26000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000002', 'other', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-0000000000a6'; x constant uuid := '00000000-0000-0000-0000-0000000000e6';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('26000000-0000-0000-0000-000000000001', 'One', '[{"block_id":"36000000-0000-0000-0000-000000000001","type":"paragraph","text":"a"}]'::jsonb, a);
  PERFORM public.publish_chapter('26000000-0000-0000-0000-000000000001');
  RESET ROLE; PERFORM tests.act_as(x);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('26000000-0000-0000-0000-000000000002', 'Other', '[{"block_id":"36000000-0000-0000-0000-000000000002","type":"paragraph","text":"b"}]'::jsonb, x);
  PERFORM public.publish_chapter('26000000-0000-0000-0000-000000000002');
END $$;

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000a6';   -- story owner
  r constant uuid := '00000000-0000-0000-0000-0000000000b6';   -- commenter
  c constant uuid := '00000000-0000-0000-0000-0000000000c6';   -- co-author
  e constant uuid := '00000000-0000-0000-0000-0000000000d6';   -- editor
  x constant uuid := '00000000-0000-0000-0000-0000000000e6';   -- owner of another story
  s constant uuid := '00000000-0000-0000-0000-0000000000f6';   -- suspended co-author
  m constant uuid := '00000000-0000-0000-0000-0000000000d1';   -- moderator
  ch constant uuid := '26000000-0000-0000-0000-000000000001';
  chx constant uuid := '26000000-0000-0000-0000-000000000002';
  k1 constant uuid := 'f6000000-0000-4000-8000-000000000001';   -- hidden by the author
  k2 constant uuid := 'f6000000-0000-4000-8000-000000000002';   -- hidden by a moderator
  k3 constant uuid := 'f6000000-0000-4000-8000-000000000003';   -- stays visible
  kx constant uuid := 'f6000000-0000-4000-8000-0000000000a1';   -- on someone else's story
  rp constant uuid := 'f6000000-0000-4000-8000-0000000000b1';   -- reply under k1
BEGIN
  RESET ROLE;
  PERFORM tests.act_as(r);
  PERFORM public.post_comment(k1, ch, NULL, NULL, 'Bình luận một');
  PERFORM public.post_comment(k2, ch, NULL, NULL, 'Bình luận hai');
  PERFORM public.post_comment(k3, ch, NULL, NULL, 'Bình luận ba');
  PERFORM public.post_comment(rp, ch, NULL, k1, 'Trả lời một');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM public.post_comment(kx, chx, NULL, NULL, 'Trên truyện khác');
  RESET ROLE;
  PERFORM tests.ok('four visible comments counted on the story', (SELECT comments = 4 FROM story_stats WHERE story_id = '16000000-0000-0000-0000-000000000001'));

  -- 1. who may hide ------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('anon has no privilege to hide', NOT has_function_privilege('anon', 'public.set_comment_hidden(uuid, boolean)', 'EXECUTE'));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject', format('SELECT public.set_comment_hidden(%L, true)', k1), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('the commenter cannot hide their own comment this way', format('SELECT public.set_comment_hidden(%L, true)', k1), '42501');
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.fails_with('an editor does not moderate readers', format('SELECT public.set_comment_hidden(%L, true)', k1), '42501');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('the owner of another story cannot', format('SELECT public.set_comment_hidden(%L, true)', k1), '42501');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('a suspended co-author cannot', format('SELECT public.set_comment_hidden(%L, true)', k1), '42501');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('unknown comment', format('SELECT public.set_comment_hidden(%L, true)', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('null flag', format('SELECT public.set_comment_hidden(%L, NULL)', k1), '42501');
  PERFORM tests.rows('no direct hiding by the owner either (row not updatable)',
    format('UPDATE comments SET status = ''hidden'' WHERE id = %L', k1), 0);

  -- 2. the owner hides; idempotent; counters follow -----------------------------------------------------------------
  PERFORM tests.ok('hide returns the author state', public.set_comment_hidden(k1, true) = 'author_hidden');
  PERFORM tests.ok('hiding again is harmless', public.set_comment_hidden(k1, true) = 'author_hidden');
  RESET ROLE;
  PERFORM tests.ok('the row is hidden and recorded as the author''s',
    (SELECT c.status = 'hidden' AND h.source = 'author' AND h.hidden_by = o
       FROM comments c JOIN comment_hides h ON h.comment_id = c.id WHERE c.id = k1));
  PERFORM tests.ok('the counter dropped by one', (SELECT comments = 3 FROM story_stats WHERE story_id = '16000000-0000-0000-0000-000000000001'));

  -- 3. what each reader sees ------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a guest gets a placeholder with no text or person (it keeps its reply)',
    (SELECT status = 'deleted' AND body IS NULL AND author_id IS NULL AND reply_count = 1 FROM public.list_comments(ch) WHERE id = k1));
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.ok('another reader gets the placeholder too', (SELECT status = 'deleted' AND body IS NULL FROM public.list_comments(ch) WHERE id = k1));
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('the commenter sees their text with the author state', (SELECT status = 'author_hidden' AND body = 'Bình luận một' FROM public.list_comments(ch) WHERE id = k1));
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.ok('a co-author sees it too, to be able to show it again', (SELECT status = 'author_hidden' AND body = 'Bình luận một' FROM public.list_comments(ch) WHERE id = k1));
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.ok('an editor sees only the placeholder', (SELECT status = 'deleted' AND body IS NULL FROM public.list_comments(ch) WHERE id = k1));
  -- the margin (per-paragraph) counts: a comment anchored to a paragraph that the author hid is not counted for others
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.post_comment('f6000000-0000-4000-8000-0000000000c1', ch, '36000000-0000-0000-0000-000000000001', NULL, 'Ở đoạn một');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.ok('the margin count shows the paragraph comment while it is visible',
    (SELECT comment_count = 1 FROM public.comment_counts_by_block(ch) WHERE block_id = '36000000-0000-0000-0000-000000000001'));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('the author hides it', public.set_comment_hidden('f6000000-0000-4000-8000-0000000000c1', true) = 'author_hidden');
  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.ok('the margin counts do not include it for others',
    NOT EXISTS (SELECT 1 FROM public.comment_counts_by_block(ch) WHERE block_id = '36000000-0000-0000-0000-000000000001'));

  -- 4. a co-author shows it again ------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.ok('show returns visible', public.set_comment_hidden(k1, false) = 'visible');
  PERFORM tests.ok('showing again is harmless', public.set_comment_hidden(k1, false) = 'visible');
  RESET ROLE;
  PERFORM tests.ok('visible again, nothing recorded', (SELECT c.status = 'visible' AND NOT EXISTS (SELECT 1 FROM comment_hides WHERE comment_id = k1) FROM comments c WHERE c.id = k1));
  PERFORM tests.ok('the counter is back', (SELECT comments = 4 FROM story_stats WHERE story_id = '16000000-0000-0000-0000-000000000001'));
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a guest reads it again', (SELECT status = 'visible' AND body = 'Bình luận một' FROM public.list_comments(ch) WHERE id = k1));

  -- 5. a moderator's hide is out of the author's reach ---------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM public.moderate('hide_comment', k2, 'test reason');
  RESET ROLE;
  PERFORM tests.ok('recorded as the moderator''s', (SELECT source = 'moderator' AND hidden_by = m FROM comment_hides WHERE comment_id = k2));
  PERFORM tests.act_as(o);
  PERFORM tests.ok('the owner sees the card as hidden by a moderator', (SELECT status = 'hidden' AND body = 'Bình luận hai' FROM public.list_comments(ch) WHERE id = k2));
  PERFORM tests.fails_with('the owner cannot show a moderator-hidden comment', format('SELECT public.set_comment_hidden(%L, false)', k2), 'PT409');
  PERFORM tests.ok('hiding it again changes nothing and keeps it the moderator''s', public.set_comment_hidden(k2, true) = 'hidden');
  RESET ROLE;
  PERFORM tests.ok('still hidden, still the moderator''s', (SELECT c.status = 'hidden' AND h.source = 'moderator' FROM comments c JOIN comment_hides h ON h.comment_id = c.id WHERE c.id = k2));
  -- a hidden comment with no record at all (hidden before this feature) is a moderator's too
  DELETE FROM comment_hides WHERE comment_id = k2;
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('no record counts as the moderator''s', format('SELECT public.set_comment_hidden(%L, false)', k2), 'PT409');
  PERFORM tests.ok('and its card says hidden, not author_hidden', (SELECT status = 'hidden' FROM public.list_comments(ch) WHERE id = k2));
  RESET ROLE;
  -- the moderator shows it, then the author hides it: now it is the author's and the author can show it again
  PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM public.moderate('restore_comment', k2, 'test reason');
  RESET ROLE;
  PERFORM tests.ok('showing it removes the record', NOT EXISTS (SELECT 1 FROM comment_hides WHERE comment_id = k2));
  PERFORM tests.act_as(o);
  PERFORM public.set_comment_hidden(k2, true);
  RESET ROLE;
  PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM public.moderate('restore_comment', k2, 'test reason');
  PERFORM public.moderate('hide_comment', k2, 'test reason');      -- the moderator hides what the author had shown again
  RESET ROLE;
  PERFORM tests.ok('a later moderator hide overwrites the author''s record', (SELECT source = 'moderator' FROM comment_hides WHERE comment_id = k2));
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('so the author cannot undo it', format('SELECT public.set_comment_hidden(%L, false)', k2), 'PT409');
  RESET ROLE;

  -- 6. other stories and states ----------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('the owner has no say on another story''s comment', format('SELECT public.set_comment_hidden(%L, true)', kx), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM public.delete_comment(k3);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('a deleted comment cannot be hidden', format('SELECT public.set_comment_hidden(%L, true)', k3), 'PT409');
  PERFORM tests.fails_with('nor shown', format('SELECT public.set_comment_hidden(%L, false)', k3), 'PT409');
  RESET ROLE;

  -- 7. the commenter, a hidden comment and the old rules --------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM public.set_comment_hidden(k1, true);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('the commenter cannot edit a hidden comment', format('SELECT public.edit_comment(%L, ''sửa'')', k1), 'PT404');
  PERFORM tests.fails_with('nor delete it', format('SELECT public.delete_comment(%L)', k1), 'PT409');
  PERFORM tests.rows('nor show it by writing the row', format('UPDATE comments SET status = ''visible'' WHERE id = %L', k1), 0);
  RESET ROLE;
  PERFORM tests.ok('it is still hidden after those attempts', (SELECT status = 'hidden' FROM comments WHERE id = k1));
  PERFORM tests.ok('the table with the records is closed to clients',
    NOT has_table_privilege('authenticated', 'public.comment_hides', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.comment_hides', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.comment_hides', 'INSERT'));
  PERFORM tests.ok('the trigger function is not callable by clients',
    NOT has_function_privilege('authenticated', 'public.record_comment_hide()', 'EXECUTE'));
  PERFORM tests.ok('the helper is for signed-in users only',
    has_function_privilege('authenticated', 'public.can_moderate_comments(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.can_moderate_comments(uuid)', 'EXECUTE'));
  PERFORM tests.act_as(o);
  PERFORM tests.ok('can_moderate_comments: owner yes', public.can_moderate_comments(ch));
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.ok('co-author yes', public.can_moderate_comments(ch));
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.ok('editor no', NOT public.can_moderate_comments(ch));
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('reader no', NOT public.can_moderate_comments(ch));
  PERFORM tests.ok('unknown chapter: no', NOT coalesce(public.can_moderate_comments(gen_random_uuid()), false));
  RESET ROLE;

  -- 8. the reconcile job agrees with the triggers --------------------------------------------------------------------------------------
  PERFORM tests.ok('no counter drift after all of this', NOT EXISTS (SELECT 1 FROM public.counter_drift()));
END $$;

ROLLBACK;
