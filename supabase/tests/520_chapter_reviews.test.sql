-- Approval sign-off: chapter_reviews and its RPCs (batch 4 authoring4, Lucian 180). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000541', 'review.owner@example.com'),
  ('00000000-0000-0000-0000-000000000542', 'review.editor@example.com'),
  ('00000000-0000-0000-0000-000000000543', 'review.coauthor@example.com'),
  ('00000000-0000-0000-0000-000000000544', 'review.stranger@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('52000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000541', 'review', 'Reviewed story', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('52000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000542', 'editor'),
  ('52000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000543', 'co_author');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('52010000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000101', 'one', 1),
  ('52010000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000101', 'shelved', 2);

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000541';
  e constant uuid := '00000000-0000-0000-0000-000000000542';
  c constant uuid := '00000000-0000-0000-0000-000000000543';
  s constant uuid := '00000000-0000-0000-0000-000000000544';
  ch constant uuid := '52010000-0000-0000-0000-000000000001';
  shelved constant uuid := '52010000-0000-0000-0000-000000000002';
  rev bigint;
BEGIN
  RESET ROLE; PERFORM tests.act_as(e);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    (ch, 'Chapter one', '[{"block_id":"52020000-0000-0000-0000-000000000001","type":"paragraph","text":"x"}]', e);
  RESET ROLE;
  INSERT INTO chapter_drafts (chapter_id, title, updated_by) VALUES (shelved, 'Shelved', o);
  UPDATE chapters SET status = 'archived' WHERE id = shelved;
  SELECT revision INTO rev FROM chapter_drafts WHERE chapter_id = ch;

  -- 1. asking ----------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot ask', format('SELECT public.request_chapter_review(%L, %s)', ch, rev));
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('a stranger gets not-found', format('SELECT public.request_chapter_review(%L, %s)', ch, rev), 'PT404');
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.fails_with('missing revision', format('SELECT public.request_chapter_review(%L, NULL)', ch), '22023');
  PERFORM tests.fails_with('stale revision', format('SELECT public.request_chapter_review(%L, %s)', ch, rev + 1), 'PT409');
  PERFORM tests.fails_with('note too long', format('SELECT public.request_chapter_review(%L, %s, %L)', ch, rev, repeat('n', 501)), '22023');
  PERFORM tests.fails_with('archived chapter', format('SELECT public.request_chapter_review(%L, 1)', shelved), 'PT409');
  PERFORM tests.fails_with('unknown chapter', format('SELECT public.request_chapter_review(%L, 1)', gen_random_uuid()), 'PT404');
  PERFORM public.request_chapter_review(ch, rev, '  Please check the ending  ');
  PERFORM public.request_chapter_review(ch, rev, 'Please check the ending');   -- asking twice notifies once
  PERFORM tests.ok('the editor sees the pending review',
    (SELECT status = 'pending' AND requested_by = e AND requested_revision = rev AND request_note = 'Please check the ending'
       FROM chapter_reviews WHERE chapter_id = ch));
  PERFORM tests.denied('nobody writes reviews directly', format('UPDATE chapter_reviews SET status = ''approved'' WHERE chapter_id = %L', ch));
  PERFORM tests.denied('or inserts them', format('INSERT INTO chapter_reviews (chapter_id, requested_by, requested_revision) VALUES (%L, %L, 1)', shelved, e));
  RESET ROLE;
  PERFORM tests.ok('owner and co-author were notified once each, the editor not at all',
    (SELECT count(*) = 2 AND count(*) FILTER (WHERE recipient_id IN (o, c)) = 2
       FROM notifications WHERE event_type = 'chapter_review_requested' AND chapter_id = ch));
  PERFORM tests.ok('the notification carries the story and chapter titles',
    (SELECT payload ->> 'story_title' = 'Reviewed story' AND payload ->> 'chapter_title' = 'Chapter one'
       FROM notifications WHERE event_type = 'chapter_review_requested' AND recipient_id = o));
  PERFORM tests.act_as(s);
  PERFORM tests.count_is('a stranger cannot read reviews', 'SELECT 1 FROM chapter_reviews', 0);
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot read reviews', 'SELECT 1 FROM chapter_reviews');

  -- 2. deciding -------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.fails_with('an editor cannot sign off', format('SELECT public.decide_chapter_review(%L, true)', ch), '42501');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('a stranger gets not-found', format('SELECT public.decide_chapter_review(%L, true)', ch), 'PT404');
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.fails_with('a missing decision', format('SELECT public.decide_chapter_review(%L, NULL)', ch), '22023');
  PERFORM tests.fails_with('no review on this chapter', format('SELECT public.decide_chapter_review(%L, true)', shelved), 'PT404');
  PERFORM public.decide_chapter_review(ch, false, 'The ending is rushed');
  PERFORM tests.fails_with('a decided review is not pending', format('SELECT public.decide_chapter_review(%L, true)', ch), 'PT409');
  RESET ROLE;
  PERFORM tests.ok('sent back with the note',
    (SELECT status = 'changes_requested' AND decided_by = c AND decision_note = 'The ending is rushed' AND decided_at IS NOT NULL
       FROM chapter_reviews WHERE chapter_id = ch));
  PERFORM tests.ok('the editor was told',
    (SELECT count(*) = 1 FROM notifications WHERE event_type = 'chapter_review_changes_requested' AND recipient_id = e));

  -- 3. ask again on a newer revision, then approve -----------------------------------------------------------------------
  PERFORM tests.act_as(e);
  UPDATE chapter_drafts SET body = '[{"block_id":"52020000-0000-0000-0000-000000000001","type":"paragraph","text":"y"}]',
         revision = revision + 1, updated_by = e WHERE chapter_id = ch;
  PERFORM public.request_chapter_review(ch, rev + 1);
  RESET ROLE;
  PERFORM tests.ok('the review is pending again for the new revision, the old decision is cleared',
    (SELECT status = 'pending' AND requested_revision = rev + 1 AND decided_by IS NULL AND decision_note = ''
       FROM chapter_reviews WHERE chapter_id = ch));
  PERFORM tests.ok('the new revision notified again', (SELECT count(*) = 4 FROM notifications WHERE event_type = 'chapter_review_requested'));
  PERFORM tests.act_as(o);
  PERFORM public.decide_chapter_review(ch, true);
  RESET ROLE;
  PERFORM tests.ok('approved', (SELECT status = 'approved' AND decided_by = o FROM chapter_reviews WHERE chapter_id = ch));
  PERFORM tests.ok('the editor was told it is approved',
    (SELECT count(*) = 1 FROM notifications WHERE event_type = 'chapter_review_approved' AND recipient_id = e));

  -- 4. nobody signs off their own request; publishing ignores reviews --------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM public.request_chapter_review(ch, rev + 1);
  PERFORM tests.fails_with('the owner cannot approve their own request', format('SELECT public.decide_chapter_review(%L, true)', ch), '42501');
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.ok('an editor can still publish while a review is pending', public.publish_chapter(ch) IS NOT NULL);
  RESET ROLE;
END $$;

ROLLBACK;
