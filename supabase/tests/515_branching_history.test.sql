-- Branching version history: parent_version_id, draft base and restore_chapter_version (batch 4 authoring4,
-- Lucian 177). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000531', 'branch.owner@example.com'),
  ('00000000-0000-0000-0000-000000000532', 'branch.editor@example.com'),
  ('00000000-0000-0000-0000-000000000533', 'branch.stranger@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('51500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000531', 'branch', 'Branch', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('51500000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000532', 'editor');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('51510000-0000-0000-0000-000000000001', '51500000-0000-0000-0000-000000000001', 'one', 1);

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-000000000531';
  e constant uuid := '00000000-0000-0000-0000-000000000532';
  s constant uuid := '00000000-0000-0000-0000-000000000533';
  ch constant uuid := '51510000-0000-0000-0000-000000000001';
  body1 constant jsonb := '[{"block_id":"51520000-0000-0000-0000-000000000001","type":"heading","text":"Start"},
                            {"block_id":"51520000-0000-0000-0000-000000000002","type":"paragraph","text":"Hello world",
                             "marks":[{"type":"bold","from":0,"to":5}]},
                            {"block_id":"51520000-0000-0000-0000-000000000003","type":"divider"}]';
  body2 constant jsonb := '[{"block_id":"51520000-0000-0000-0000-000000000001","type":"heading","text":"Start"},
                            {"block_id":"51520000-0000-0000-0000-000000000004","type":"paragraph","text":"Another way"}]';
  v1 uuid; v2 uuid; v3 uuid; v4 uuid;
  rev bigint;
BEGIN
  RESET ROLE; PERFORM tests.act_as(o);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES (ch, 'One', body1, o);
  v1 := public.publish_chapter(ch);
  RESET ROLE;
  PERFORM tests.ok('the first version has no parent', (SELECT parent_version_id IS NULL FROM chapter_versions WHERE id = v1));
  PERFORM tests.ok('the draft now descends from v1', (SELECT base_version_id = v1 FROM chapter_drafts WHERE chapter_id = ch));

  -- a normal edit + publish continues the line --------------------------------------------------------------------
  PERFORM tests.act_as(o);
  UPDATE chapter_drafts SET body = body2, title = 'One, rewritten', revision = revision + 1, updated_by = o WHERE chapter_id = ch;
  v2 := public.publish_chapter(ch);
  RESET ROLE;
  PERFORM tests.ok('v2 continues from v1', (SELECT parent_version_id = v1 FROM chapter_versions WHERE id = v2));
  PERFORM tests.ok('the draft descends from v2', (SELECT base_version_id = v2 FROM chapter_drafts WHERE chapter_id = ch));

  -- clients cannot write the graph ----------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM tests.denied('base_version_id is server-owned', format('UPDATE chapter_drafts SET base_version_id = %L WHERE chapter_id = %L', v1, ch));
  PERFORM tests.denied('versions are not client-writable', format('UPDATE chapter_versions SET parent_version_id = NULL WHERE id = %L', v2));
  PERFORM tests.ok('the team reads the graph', (SELECT parent_version_id = v1 FROM chapter_versions WHERE id = v2));

  -- restore: who and when --------------------------------------------------------------------------------------------
  SELECT revision INTO rev FROM chapter_drafts WHERE chapter_id = ch;
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot restore', format('SELECT public.restore_chapter_version(%L, %s)', v1, rev));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject', format('SELECT public.restore_chapter_version(%L, %s)', v1, rev), '42501');
  RESET ROLE; PERFORM tests.act_as(s);
  PERFORM tests.fails_with('a stranger gets not-found', format('SELECT public.restore_chapter_version(%L, %s)', v1, rev), 'PT404');
  RESET ROLE; PERFORM tests.act_as(e);
  PERFORM tests.fails_with('unknown version', format('SELECT public.restore_chapter_version(%L, %s)', gen_random_uuid(), rev), 'PT404');
  PERFORM tests.fails_with('missing revision', format('SELECT public.restore_chapter_version(%L, NULL)', v1), '22023');
  PERFORM tests.fails_with('stale revision', format('SELECT public.restore_chapter_version(%L, %s)', v1, rev - 1), 'PT409');

  -- an editor restores v1: the draft becomes v1 again, one revision later, based on v1 ---------------------------------------
  PERFORM tests.ok('restore returns the next revision', public.restore_chapter_version(v1, rev) = rev + 1);
  RESET ROLE;
  PERFORM tests.ok('the draft body is v1 again (marks and all)', (SELECT body = body1 FROM chapter_drafts WHERE chapter_id = ch));
  PERFORM tests.ok('title, revision, author and base follow',
    (SELECT title = 'One' AND revision = rev + 1 AND updated_by = e AND base_version_id = v1 FROM chapter_drafts WHERE chapter_id = ch));
  PERFORM tests.ok('the live chapter did not change', (SELECT published_version_id = v2 AND status = 'published' FROM chapters WHERE id = ch));

  -- publishing now branches from v1, and publishes exactly the restored text -------------------------------------------------
  PERFORM tests.act_as(o);
  v3 := public.publish_chapter(ch, rev + 1);
  RESET ROLE;
  PERFORM tests.ok('v3 branches from v1, not from v2', (SELECT parent_version_id = v1 FROM chapter_versions WHERE id = v3));
  PERFORM tests.ok('v3 is live', (SELECT published_version_id = v3 FROM chapters WHERE id = ch));
  PERFORM tests.ok('v3 has the same blocks as v1',
    (SELECT array_agg(block_id || ':' || block_type || ':' || coalesce(text_content, '') || coalesce(rich_text::text, '') ORDER BY sort_order)
       FROM chapter_version_blocks WHERE version_id = v3)
    = (SELECT array_agg(block_id || ':' || block_type || ':' || coalesce(text_content, '') || coalesce(rich_text::text, '') ORDER BY sort_order)
       FROM chapter_version_blocks WHERE version_id = v1));

  -- a draft without a base (from before the migration) continues from the latest version ----------------------------------------
  UPDATE chapter_drafts SET base_version_id = NULL WHERE chapter_id = ch;
  PERFORM tests.act_as(o);
  UPDATE chapter_drafts SET title = 'Four', revision = revision + 1, updated_by = o WHERE chapter_id = ch;
  v4 := public.publish_chapter(ch);
  RESET ROLE;
  PERFORM tests.ok('without a base the parent is the latest version', (SELECT parent_version_id = v3 FROM chapter_versions WHERE id = v4));

  -- a guest reading the live version sees the parent id but cannot open older versions ---------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('a guest sees only the live version', format('SELECT 1 FROM chapter_versions WHERE chapter_id = %L', ch), 1);
  RESET ROLE;
END $$;

ROLLBACK;
