-- F-STM-09: the owner restores a story they deleted, with the real privileges of `authenticated`; a moderator's
-- removal still cannot be undone by the owner. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000a9', 'sr.owner@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d7', 'sr.mod@example.com', '{"role":"moderator"}');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a9', 'sr-own', 'Own', 'public', 'ongoing'),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a9', 'sr-removed', 'Removed', 'public', 'ongoing');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000a9';
  m constant uuid := '00000000-0000-0000-0000-0000000000d7';
  own constant uuid := '19000000-0000-0000-0000-000000000001';
  removed constant uuid := '19000000-0000-0000-0000-000000000002';
BEGIN
  PERFORM tests.ok('clients may ask whether a story was removed, and may not read the audit table function',
    has_function_privilege('authenticated', 'public.story_removed_by_moderator(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.story_removed_by_moderator(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.last_moderation_action(uuid)', 'EXECUTE'));

  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('the owner deletes their story', format('UPDATE stories SET deleted_at = now() WHERE id = %L', own), 1);
  PERFORM tests.rows('and restores it (no moderator involved)', format('UPDATE stories SET deleted_at = NULL WHERE id = %L', own), 1);

  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator removes the other story', public.moderate('remove_story', removed, 'copyright claim') = 'removed');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('the owner cannot bring a removed story back', format('UPDATE stories SET deleted_at = NULL WHERE id = %L', removed), '42501');
  PERFORM tests.ok('and the refusal is the moderator guard, not a missing privilege',
    (SELECT public.story_removed_by_moderator(removed)));

  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator restores it through the function', public.moderate('restore_story', removed, 'claim withdrawn') = 'visible');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.rows('after that the owner may delete and restore it again', format('UPDATE stories SET deleted_at = now() WHERE id = %L', removed), 1);
  PERFORM tests.rows('restore again', format('UPDATE stories SET deleted_at = NULL WHERE id = %L', removed), 1);
  RESET ROLE;
END $$;

ROLLBACK;
