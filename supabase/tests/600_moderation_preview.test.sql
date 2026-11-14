-- A moderator can re-read removed and hidden content; nobody else can. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000005d1', 'mp.owner@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000005d2', 'mp.reader@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000005d3', 'mp.mod@example.com', '{"role":"moderator"}');
INSERT INTO stories (id, owner_id, slug, title, synopsis, visibility, status) VALUES
  ('5d000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005d1', 'mp-story', 'Removed story', 'The synopsis', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('5d100000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 'one', 1);
INSERT INTO comments (id, chapter_id, author_id, body, status) VALUES
  ('5d200000-0000-0000-0000-000000000001', '5d100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005d2', 'a hidden remark', 'hidden');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000005d1';
  r constant uuid := '00000000-0000-0000-0000-0000000005d2';
  m constant uuid := '00000000-0000-0000-0000-0000000005d3';
  s constant uuid := '5d000000-0000-0000-0000-000000000001';
  c constant uuid := '5d100000-0000-0000-0000-000000000001';
  k constant uuid := '5d200000-0000-0000-0000-000000000001';
BEGIN
  RESET ROLE; PERFORM tests.act_as(o);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    (c, 'Chương một', '[{"block_id":"5d300000-0000-0000-0000-000000000001","type":"paragraph","text":"Đoạn đầu tiên"}]'::jsonb, o);
  PERFORM public.publish_chapter(c);
  UPDATE stories SET deleted_at = now() WHERE id = s;

  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.ok('a moderator reads a deleted story with its chapters',
    (SELECT p ->> 'title' = 'Removed story' AND p ->> 'synopsis' = 'The synopsis' AND p ->> 'owner' IS NOT NULL
        AND p -> 'chapters' -> 0 ->> 'title' = 'Chương một' AND p ->> 'deleted_at' IS NOT NULL
       FROM (SELECT public.moderation_preview('story', s) AS p) q));
  PERFORM tests.ok('and the text of a chapter',
    (SELECT p ->> 'title' = 'Chương một' AND p -> 'blocks' ->> 0 = 'Đoạn đầu tiên' FROM (SELECT public.moderation_preview('chapter', c) AS p) q));
  PERFORM tests.ok('and a hidden comment',
    (SELECT p ->> 'body' = 'a hidden remark' AND p ->> 'status' = 'hidden' FROM (SELECT public.moderation_preview('comment', k) AS p) q));
  PERFORM tests.ok('and an account',
    (SELECT p ->> 'account_status' = 'active' FROM (SELECT public.moderation_preview('user', o) AS p) q));
  PERFORM tests.fails_with('an unknown target is not found', format('SELECT public.moderation_preview(%L, %L)', 'story', gen_random_uuid()), 'PT404');
  PERFORM tests.fails_with('an unknown kind is invalid', format('SELECT public.moderation_preview(%L, %L)', 'report', s), '22023');

  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('the owner cannot use it', format('SELECT public.moderation_preview(%L, %L)', 'story', s), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a reader cannot', format('SELECT public.moderation_preview(%L, %L)', 'comment', k), '42501');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot', format('SELECT public.moderation_preview(%L, %L)', 'story', s));

  RESET ROLE;
  PERFORM tests.ok('execute is limited to authenticated',
    has_function_privilege('authenticated', 'public.moderation_preview(text, uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.moderation_preview(text, uuid)', 'EXECUTE'));
END $$;

ROLLBACK;
