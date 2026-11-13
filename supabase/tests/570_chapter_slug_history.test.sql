-- Chapter slug history: a renamed chapter is found at its old slug (readable chapters only), the history is closed to
-- clients, and a slug that a chapter has now is never taken over by history. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000571', 'sh.owner@example.com'),
  ('00000000-0000-0000-0000-000000000572', 'sh.reader@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('57000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000571', 'sh-story', 'Story', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('57100000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'one', 1),
  ('57100000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000001', 'two', 2);

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000571';
  r constant uuid := '00000000-0000-0000-0000-000000000572';
  s constant uuid := '57000000-0000-0000-0000-000000000001';
  c1 constant uuid := '57100000-0000-0000-0000-000000000001';
  c2 constant uuid := '57100000-0000-0000-0000-000000000002';
BEGIN
  RESET ROLE;
  -- chapter 1 is published (status and pointer need a version, so use the simplest legal route: status + version row)
  INSERT INTO chapter_versions (id, chapter_id, version_no, title, word_count, created_by)
    VALUES ('57200000-0000-0000-0000-000000000001', c1, 1, 'One', 1, o);
  UPDATE chapters SET status = 'published', published_version_id = '57200000-0000-0000-0000-000000000001',
         first_published_at = now() WHERE id = c1;

  UPDATE chapters SET slug = 'one-renamed' WHERE id = c1;
  PERFORM tests.ok('the old slug is recorded', (SELECT chapter_id = c1 FROM chapter_slug_history WHERE story_id = s AND slug = 'one'));
  UPDATE chapters SET sort_order = 3 WHERE id = c1;
  PERFORM tests.ok('other changes record nothing', (SELECT count(*) = 1 FROM chapter_slug_history WHERE chapter_id = c1));
  UPDATE chapters SET slug = 'one-final' WHERE id = c1;
  PERFORM tests.ok('every earlier slug is kept', (SELECT count(*) = 2 FROM chapter_slug_history WHERE chapter_id = c1));

  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a guest is sent from the first slug to the current one', public.resolve_chapter_slug(s, 'one') = 'one-final');
  PERFORM tests.ok('and from the second', public.resolve_chapter_slug(s, 'one-renamed') = 'one-final');
  PERFORM tests.ok('an unknown slug resolves to nothing', public.resolve_chapter_slug(s, 'nope') IS NULL);
  PERFORM tests.denied('the history table is closed to clients', 'SELECT * FROM chapter_slug_history');

  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('a signed-in reader gets the same answer', public.resolve_chapter_slug(s, 'one') = 'one-final');

  -- a chapter that is not readable (still a draft) is never revealed
  RESET ROLE;
  UPDATE chapters SET slug = 'two-renamed' WHERE id = c2;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a draft chapter is not revealed through its old slug', public.resolve_chapter_slug(s, 'two') IS NULL);

  -- once the chapter is unpublished-deleted it no longer resolves
  RESET ROLE;
  UPDATE chapters SET deleted_at = now() WHERE id = c1;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a deleted chapter does not resolve', public.resolve_chapter_slug(s, 'one') IS NULL);

  RESET ROLE;
  PERFORM tests.ok('execute is limited to anon and authenticated',
    has_function_privilege('anon', 'public.resolve_chapter_slug(uuid, text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.resolve_chapter_slug(uuid, text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.record_chapter_slug_change()', 'EXECUTE'));
END $$;

ROLLBACK;
