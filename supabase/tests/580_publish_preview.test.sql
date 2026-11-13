-- publish_preview(): the team sees what publishing will do; outsiders and guests get "not found". Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000591', 'pp.owner@example.com'),
  ('00000000-0000-0000-0000-000000000592', 'pp.follower@example.com'),
  ('00000000-0000-0000-0000-000000000593', 'pp.outsider@example.com'),
  ('00000000-0000-0000-0000-000000000594', 'pp.follower2@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('59000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000591', 'pp-private', 'Private', 'private', 'draft'),
  ('59000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000591', 'pp-public', 'Public', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('59100000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', 'one', 1),
  ('59100000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000002', 'one', 1);
INSERT INTO story_follows (user_id, story_id) VALUES
  ('00000000-0000-0000-0000-000000000592', '59000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000592', '59000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000594', '59000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000591', '59000000-0000-0000-0000-000000000002');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000591';
  x constant uuid := '00000000-0000-0000-0000-000000000593';
  c_private constant uuid := '59100000-0000-0000-0000-000000000001';
  c_public constant uuid := '59100000-0000-0000-0000-000000000002';
BEGIN
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('a private draft story: first publish, nobody is told',
    (SELECT is_first_publish AND NOT notifies AND visibility = 'private' AND story_status = 'draft' AND chapter_status = 'draft'
       FROM public.publish_preview(c_private)));
  PERFORM tests.ok('a public story: the followers are counted, not the caller',
    (SELECT notifies AND follower_count = 2 FROM public.publish_preview(c_public)));

  RESET ROLE; PERFORM tests.act_as(x);
  PERFORM tests.fails_with('an outsider gets not found', format('SELECT * FROM public.publish_preview(%L)', c_public), 'PT404');
  PERFORM tests.fails_with('an unknown chapter is not found', format('SELECT * FROM public.publish_preview(%L)', gen_random_uuid()), 'PT404');

  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot call it', format('SELECT * FROM public.publish_preview(%L)', c_public));

  RESET ROLE;
  PERFORM tests.ok('execute is limited to authenticated',
    has_function_privilege('authenticated', 'public.publish_preview(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.publish_preview(uuid)', 'EXECUTE'));
END $$;

ROLLBACK;
