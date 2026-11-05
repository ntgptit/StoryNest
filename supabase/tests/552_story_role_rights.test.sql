-- story_role_rights() is the documented source of truth for the team screen's matrix. Every row is checked here
-- against the policies and functions that really enforce it, as an owner, a co-author, an editor and (as a control,
-- every answer "no") a signed-in stranger. Each attempt runs in a subtransaction that is always rolled back, so the
-- attempts do not change what the next one sees. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000005c0', 'rr.owner@example.com'),
  ('00000000-0000-0000-0000-0000000005c1', 'rr.coauthor@example.com'),
  ('00000000-0000-0000-0000-0000000005c2', 'rr.editor@example.com'),
  ('00000000-0000-0000-0000-0000000005c3', 'rr.stranger@example.com'),
  ('00000000-0000-0000-0000-0000000005c4', 'rr.outsider@example.com'),
  ('00000000-0000-0000-0000-0000000005c5', 'rr.reader@example.com');
UPDATE app_users SET username = 'rr_outsider' WHERE id = '00000000-0000-0000-0000-0000000005c4';
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('55200000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005c0', 'rr-story', 'Rights', 'public', 'ongoing');
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('55200000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005c1', 'co_author'),
  ('55200000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005c2', 'editor');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('55200000-0000-0000-0000-0000000000c1', '55200000-0000-0000-0000-000000000001', 'live', 1),
  ('55200000-0000-0000-0000-0000000000c2', '55200000-0000-0000-0000-000000000001', 'draft', 2);
INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
  ('55200000-0000-0000-0000-0000000000c1', 'Live',
   '[{"block_id":"55200000-0000-0000-0000-0000000000b1","type":"paragraph","text":"A published chapter."}]'::jsonb,
   '00000000-0000-0000-0000-0000000005c0'),
  ('55200000-0000-0000-0000-0000000000c2', 'Draft',
   '[{"block_id":"55200000-0000-0000-0000-0000000000b2","type":"paragraph","text":"A chapter not published yet."}]'::jsonb,
   '00000000-0000-0000-0000-0000000005c0');

-- true when the statement runs without a permission error and touches at least one row; false on 42501 / PT404 or
-- zero rows (RLS filters silently); any other error is a broken check and fails the test. Always rolled back.
CREATE FUNCTION tests.rr_allowed(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
    BEGIN
        EXECUTE p_sql;
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE EXCEPTION 'rr-undo:%', n;
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE 'rr-undo:%' THEN RETURN substr(SQLERRM, 9)::bigint > 0; END IF;
        IF SQLSTATE IN ('42501', 'PT404') THEN RETURN false; END IF;
        RAISE EXCEPTION 'broken check (%: %): %', SQLSTATE, SQLERRM, p_sql;
    END;
END $$;

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000005c0';
  ca constant uuid := '00000000-0000-0000-0000-0000000005c1';
  ed constant uuid := '00000000-0000-0000-0000-0000000005c2';
  xs constant uuid := '00000000-0000-0000-0000-0000000005c3';
  rd constant uuid := '00000000-0000-0000-0000-0000000005c5';
  st constant uuid := '55200000-0000-0000-0000-000000000001';
  live constant uuid := '55200000-0000-0000-0000-0000000000c1';
  draft constant uuid := '55200000-0000-0000-0000-0000000000c2';
  cm uuid;
  checks jsonb;
  cap record;
  who record;
  expected boolean;
  actual boolean;
BEGIN
  RESET ROLE;
  PERFORM tests.act_as(o);
  PERFORM public.publish_chapter(live);
  RESET ROLE;
  INSERT INTO comments (chapter_id, author_id, body) VALUES (live, rd, 'Nice chapter') RETURNING id INTO cm;

  -- One real operation per capability (the function or policy the migration comment names).
  checks := jsonb_build_object(
    'view_drafts',        format('SELECT 1 FROM chapters WHERE id = %L', draft),
    'edit_story',         format($q$UPDATE stories SET synopsis = 'Changed' WHERE id = %L$q$, st),
    'set_tags',           format($q$SELECT * FROM public.set_story_tags(%L, ARRAY['rr-tag'])$q$, st),
    'change_cover',       format($q$SELECT 1 WHERE public.can_write_story_image('covers', %L)$q$, st || '/cover.webp'),
    'create_chapters',    format($q$SELECT public.create_chapter(%L, 'New one', 'new-one')$q$, st),
    'edit_drafts',        format($q$UPDATE chapter_drafts SET title = 'Edited', updated_by = (SELECT auth.uid()) WHERE chapter_id = %L$q$, draft),
    'reorder_chapters',   format('SELECT public.reorder_chapters(%L, ARRAY[%L, %L]::uuid[])', st, draft, live),
    'publish_chapters',   format('SELECT public.publish_chapter(%L)', draft),
    'unpublish_chapters', format('SELECT public.unpublish_chapter(%L)', live),
    'archive_chapters',   format('SELECT public.archive_chapter(%L)', live),
    'moderate_comments',  format('SELECT public.set_comment_hidden(%L, true)', cm),
    'view_stats',         format('SELECT * FROM public.author_chapter_stats(%L)', st),
    'manage_team',        format($q$SELECT public.invite_collaborator(%L, 'rr_outsider', 'editor')$q$, st));

  PERFORM tests.ok('every capability has a check and every check a capability',
    (SELECT array_agg(capability ORDER BY capability) FROM public.story_role_rights())
      = (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(checks) k));
  PERFORM tests.ok('capabilities are unique', (SELECT count(DISTINCT capability) = count(*) FROM public.story_role_rights()));
  PERFORM tests.ok('the owner may do everything listed', (SELECT bool_and(owner) FROM public.story_role_rights()));

  FOR who IN SELECT * FROM (VALUES ('owner', o), ('co_author', ca), ('editor', ed), ('stranger', xs)) AS w(role, uid) LOOP
    FOR cap IN SELECT * FROM public.story_role_rights() LOOP
      expected := CASE who.role WHEN 'owner' THEN cap.owner WHEN 'co_author' THEN cap.co_author
                                WHEN 'editor' THEN cap.editor ELSE false END;
      PERFORM tests.act_as(who.uid);
      actual := tests.rr_allowed(checks ->> cap.capability);
      RESET ROLE;
      IF actual IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'FAIL: story_role_rights says % may % = %, but the database answers %',
          who.role, cap.capability, expected, actual;
      END IF;
    END LOOP;
  END LOOP;

  PERFORM tests.ok('nothing above changed the story', (SELECT synopsis IS DISTINCT FROM 'Changed' FROM stories WHERE id = st)
    AND (SELECT status = 'draft' FROM chapters WHERE id = draft) AND (SELECT status = 'published' FROM chapters WHERE id = live)
    AND (SELECT status = 'visible' FROM comments WHERE id = cm));

  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('guests can read the matrix too (it is documentation)', 'SELECT 1 FROM public.story_role_rights()', 13);
END $$;

ROLLBACK;
