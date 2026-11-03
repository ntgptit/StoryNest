-- Guards for the advisor findings fixed in *_hardening_and_indexes.sql. Read-only checks plus one behaviour test.
BEGIN;

DO $$
BEGIN
  -- advisor 0011: every function we own in public pins its search_path
  PERFORM tests.ok('every function in public pins search_path',
    (SELECT count(*) = 0 FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
        AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')));

  -- advisor 0006: a single UPDATE policy on comments
  PERFORM tests.ok('comments has exactly one UPDATE policy',
    (SELECT count(*) = 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND cmd = 'UPDATE'));

  -- indexes that RLS and the main screens rely on
  PERFORM tests.ok('hardening indexes exist',
    (SELECT count(*) = 10 FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
      'idx_chapters_published_version','idx_chapter_blocks_chapter','idx_user_chapter_progress_chapter',
      'idx_user_story_progress_story','idx_user_story_progress_chapter','idx_story_collaborators_user',
      'idx_story_saves_story','idx_reading_list_items_story','idx_content_reports_reporter','idx_categories_parent')));
END $$;

-- The planner can use the live-version index (is_live_version runs inside RLS for every version/block read).
DO $$
DECLARE
  r record;
  plan text := '';
BEGIN
  SET LOCAL enable_seqscan = off;
  FOR r IN EXECUTE 'EXPLAIN SELECT 1 FROM public.chapters WHERE published_version_id = ''00000000-0000-0000-0000-000000000001''::uuid' LOOP
    plan := plan || r."QUERY PLAN" || E'\n';
  END LOOP;
  PERFORM tests.ok('chapters lookup by published_version_id uses its index', plan LIKE '%idx_chapters_published_version%');
END $$;

ROLLBACK;
