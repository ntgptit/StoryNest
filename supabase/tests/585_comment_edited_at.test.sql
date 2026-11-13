-- "(edited)" follows a change of the text, not a touch of the row (F-CMT-01). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000005a1', 'ed.owner@example.com'),
  ('00000000-0000-0000-0000-0000000005a2', 'ed.reader@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('5a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005a1', 'ed-story', 'Edits', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('5a100000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'one', 1);
INSERT INTO comments (id, chapter_id, author_id, body, created_at) VALUES
  ('5a200000-0000-0000-0000-000000000001', '5a100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005a2', 'first', now() - interval '1 hour');

DO $$
DECLARE
  k constant uuid := '5a200000-0000-0000-0000-000000000001';
  o constant uuid := '00000000-0000-0000-0000-0000000005a1';
  edited boolean;
BEGIN
  RESET ROLE; PERFORM tests.act_as(o);
  SELECT l.edited INTO edited FROM public.list_comments('5a100000-0000-0000-0000-000000000001') l WHERE l.id = k;
  PERFORM tests.ok('a new comment is not edited', edited IS NOT NULL AND NOT edited);

  RESET ROLE;
  UPDATE comments SET status = 'hidden' WHERE id = k;
  UPDATE comments SET status = 'visible' WHERE id = k;
  PERFORM tests.act_as(o);
  SELECT l.edited INTO edited FROM public.list_comments('5a100000-0000-0000-0000-000000000001') l WHERE l.id = k;
  PERFORM tests.ok('hiding and showing it again does not mark it edited', edited IS NOT NULL AND NOT edited);

  RESET ROLE;
  UPDATE comments SET body = 'first' WHERE id = k;
  PERFORM tests.ok('saving the same text leaves edited_at empty', (SELECT edited_at IS NULL FROM comments WHERE id = k));

  UPDATE comments SET body = 'first, corrected' WHERE id = k;
  PERFORM tests.act_as(o);
  SELECT l.edited INTO edited FROM public.list_comments('5a100000-0000-0000-0000-000000000001') l WHERE l.id = k;
  PERFORM tests.ok('changing the text marks it edited', edited IS NOT NULL AND edited);

  RESET ROLE;
  UPDATE comments SET status = 'hidden' WHERE id = k;
  PERFORM tests.act_as(o);
  SELECT l.edited INTO edited FROM public.list_comments('5a100000-0000-0000-0000-000000000001') l WHERE l.id = k;
  PERFORM tests.ok('a hidden comment shows no edited mark', edited IS NOT NULL AND NOT edited);

  RESET ROLE;
  PERFORM tests.ok('clients cannot call the trigger function',
    NOT has_function_privilege('authenticated', 'public.set_comment_edited_at()', 'EXECUTE'));
END $$;

ROLLBACK;
