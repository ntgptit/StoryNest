-- next_chapter_at: the only scheduled-chapter fact readers get (batch 4 authoring4, Lucian 265). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000521', 'next.owner@example.com'),
  ('00000000-0000-0000-0000-000000000522', 'next.reader@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('51000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000521', 'next-public', 'Public', 'public', 'ongoing'),
  ('51000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000521', 'next-private', 'Private', 'private', 'ongoing'),
  ('51000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000521', 'next-draft', 'Draft', 'public', 'draft'),
  ('51000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000521', 'next-unlisted', 'Unlisted', 'unlisted', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order, status, scheduled_for, deleted_at) VALUES
  ('51100000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000101', 'soon', 1, 'scheduled', now() + interval '2 hours', NULL),
  ('51100000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000101', 'later', 2, 'scheduled', now() + interval '3 days', NULL),
  ('51100000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000101', 'deleted', 3, 'scheduled', now() + interval '1 hour', now()),
  ('51100000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000101', 'overdue', 4, 'scheduled', now() - interval '1 minute', NULL),
  ('51100000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000102', 'secret', 1, 'scheduled', now() + interval '1 hour', NULL),
  ('51100000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000103', 'drafty', 1, 'scheduled', now() + interval '1 hour', NULL),
  ('51100000-0000-0000-0000-000000000007', '51000000-0000-0000-0000-000000000104', 'link', 1, 'scheduled', now() + interval '5 hours', NULL);

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000521';
  r constant uuid := '00000000-0000-0000-0000-000000000522';
  pub constant uuid := '51000000-0000-0000-0000-000000000101';
  priv constant uuid := '51000000-0000-0000-0000-000000000102';
  drft constant uuid := '51000000-0000-0000-0000-000000000103';
  unl constant uuid := '51000000-0000-0000-0000-000000000104';
  soon timestamptz;
BEGIN
  RESET ROLE;
  SELECT scheduled_for INTO soon FROM chapters WHERE id = '51100000-0000-0000-0000-000000000001';

  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a guest gets the earliest future, non-deleted schedule', public.next_chapter_at(pub) = soon);
  PERFORM tests.ok('a guest cannot see the scheduled chapter itself',
    NOT EXISTS (SELECT 1 FROM chapters WHERE story_id = pub));
  PERFORM tests.ok('private story: null', public.next_chapter_at(priv) IS NULL);
  PERFORM tests.ok('draft story: null', public.next_chapter_at(drft) IS NULL);
  PERFORM tests.ok('unlisted story (open by link): a time', public.next_chapter_at(unl) IS NOT NULL);
  PERFORM tests.ok('unknown story: null', public.next_chapter_at(gen_random_uuid()) IS NULL);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('a signed-in reader gets the same answer', public.next_chapter_at(pub) = soon);
  PERFORM tests.ok('and nothing for the private story', public.next_chapter_at(priv) IS NULL);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('the owner sees their private schedule', public.next_chapter_at(priv) IS NOT NULL);
  RESET ROLE;

  UPDATE chapters SET status = 'draft', scheduled_for = NULL WHERE story_id = pub;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('nothing scheduled: null', public.next_chapter_at(pub) IS NULL);
  RESET ROLE;
END $$;

ROLLBACK;
