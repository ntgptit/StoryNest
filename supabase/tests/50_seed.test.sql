-- The development seed: contents, visibility, idempotency. Runs inside a transaction that is rolled back, so the
-- other suites keep seeing an empty database. (:seed_file is passed by verify-migrations.sh.)
BEGIN;

\i :seed_file

DO $$
BEGIN
  PERFORM tests.ok('categories (6 roots + 2 children) and tags', (SELECT count(*) = 8 FROM categories) AND (SELECT count(*) = 7 FROM tags));
  PERFORM tests.ok('child categories point at their parent',
    (SELECT count(*) = 2 FROM categories c JOIN categories p ON p.id = c.parent_id WHERE p.slug IN ('lang-man', 'gia-tuong')));
  PERFORM tests.ok('three demo authors with profiles created by the signup trigger',
    (SELECT array_agg(username::text ORDER BY username::text) = ARRAY['demo_an','demo_binh','demo_chi'] FROM app_users));
  PERFORM tests.ok('six stories, one mature, one private draft',
    (SELECT count(*) = 6 FROM stories) AND (SELECT count(*) = 1 FROM stories WHERE is_mature)
    AND (SELECT count(*) = 1 FROM stories WHERE visibility = 'private' AND status = 'draft'));
  PERFORM tests.ok('16 chapters: 14 published through the RPC, 2 drafts',
    (SELECT count(*) = 16 FROM chapters) AND (SELECT count(*) = 14 FROM chapters WHERE status = 'published')
    AND (SELECT count(*) = 2 FROM chapters WHERE status = 'draft'));
  PERFORM tests.ok('every published chapter points at an immutable version 1 with words counted',
    (SELECT count(*) = 14 FROM chapters c JOIN chapter_versions v ON v.id = c.published_version_id
      WHERE v.version_no = 1 AND v.published_at IS NOT NULL AND v.word_count > 0));
  PERFORM tests.ok('45 snapshot blocks (14 headings + 31 paragraphs) in reading order',
    (SELECT count(*) = 45 FROM chapter_version_blocks)
    AND (SELECT count(*) = 14 FROM chapter_version_blocks WHERE sort_order = 1 AND block_type = 'heading'));
  PERFORM tests.ok('stories left draft status when their first chapter was published',
    (SELECT count(*) = 5 FROM stories WHERE first_published_at IS NOT NULL AND status <> 'draft'));
  PERFORM tests.ok('one chapter.published event per published chapter, none processed yet',
    (SELECT count(*) = 14 FROM outbox_events WHERE event_type = 'chapter.published' AND processed_at IS NULL));
END $$;

-- What a logged-out reader can see
DO $$ BEGIN
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('anon sees the 5 public stories, not the private draft', 'SELECT 1 FROM stories', 5);
  PERFORM tests.count_is('anon sees the 14 published chapters only', 'SELECT 1 FROM chapters', 14);
  PERFORM tests.count_is('anon reads the 45 live blocks', 'SELECT 1 FROM chapter_version_blocks', 45);
  PERFORM tests.count_is('anon sees tags of public stories only', 'SELECT 1 FROM story_tags', 9);
  PERFORM tests.count_is('anon cannot read drafts', $q$SELECT 1 FROM chapters WHERE slug = 'chuong-4' AND status = 'draft'$q$, 0);
END $$;

-- Running it again changes nothing
CREATE FUNCTION pg_temp.seed_signature() RETURNS text LANGUAGE sql AS $$
  SELECT concat_ws(',',
    (SELECT count(*) FROM stories), (SELECT count(*) FROM chapters), (SELECT count(*) FROM chapter_drafts),
    (SELECT count(*) FROM chapter_versions), (SELECT count(*) FROM chapter_version_blocks),
    (SELECT count(*) FROM outbox_events), (SELECT count(*) FROM app_users), (SELECT count(*) FROM categories),
    (SELECT count(*) FROM tags), (SELECT count(*) FROM story_tags), (SELECT count(*) FROM auth.users))
$$;
RESET ROLE;
SELECT set_config('seed.signature_before', pg_temp.seed_signature(), false);

RESET ROLE;
\i :seed_file

DO $$ BEGIN
  RESET ROLE;
  PERFORM tests.ok('a second run creates nothing: no new rows, versions, blocks, events or users',
    pg_temp.seed_signature() = current_setting('seed.signature_before'));
  PERFORM tests.ok('still only version 1 everywhere', (SELECT max(version_no) = 1 FROM chapter_versions));
END $$;

ROLLBACK;
