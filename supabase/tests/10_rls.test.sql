-- RLS regression tests. Run by supabase/scripts/verify-migrations.sh as a superuser, after all
-- migrations. Everything happens in one transaction that is rolled back. Any failed assertion raises.
BEGIN;
-- ---------- fixtures (superuser) ----------
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'Author.One@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'reader@example.com', '{"username":"Reader Two!","full_name":"Reader Two"}'),
  ('00000000-0000-0000-0000-00000000000c', 'editor@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'x@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'x@other.com', '{}');

-- 1. sign-up trigger
DO $$ BEGIN
  IF (SELECT username::text FROM app_users WHERE id = '00000000-0000-0000-0000-00000000000a') <> 'authorone' THEN
    RAISE EXCEPTION 'FAIL username from email'; END IF;
  IF (SELECT username::text FROM app_users WHERE id = '00000000-0000-0000-0000-00000000000b') <> 'readertwo' THEN
    RAISE EXCEPTION 'FAIL username sanitising'; END IF;
  IF (SELECT display_name FROM app_users WHERE id = '00000000-0000-0000-0000-00000000000b') <> 'Reader Two' THEN
    RAISE EXCEPTION 'FAIL display name'; END IF;
  IF (SELECT count(DISTINCT username) FROM app_users WHERE id IN
      ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e')) <> 2 THEN
    RAISE EXCEPTION 'FAIL username collision handling'; END IF;
END $$;

-- 2. author A: creates story + chapter as a normal client
DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-00000000000a'; b constant uuid := '00000000-0000-0000-0000-00000000000b';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.rows('A creates story',
    format($q$INSERT INTO stories (id, owner_id, slug, title, visibility, status)
              VALUES ('10000000-0000-0000-0000-000000000001', %L, 'tale', 'Tale', 'public', 'ongoing')$q$, a), 1);
  PERFORM tests.denied('A cannot create story for B',
    format($q$INSERT INTO stories (owner_id, slug, title) VALUES (%L, 'x', 'X')$q$, b));
  PERFORM tests.rows('A creates chapter',
    $q$INSERT INTO chapters (id, story_id, slug, sort_order)
       VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'c1', 1)$q$, 1);
  PERFORM tests.denied('A cannot self-publish chapter',
    $q$UPDATE chapters SET status = 'published' WHERE id = '20000000-0000-0000-0000-000000000001'$q$);
  PERFORM tests.denied('A cannot write versions directly',
    $q$INSERT INTO chapter_versions (chapter_id, version_no, title, created_by)
       VALUES ('20000000-0000-0000-0000-000000000001', 1, 't', '00000000-0000-0000-0000-00000000000a')$q$);
  PERFORM tests.rows('A creates block',
    $q$INSERT INTO chapter_blocks (id, chapter_id) VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001')$q$, 1);
  PERFORM tests.rows('A saves draft',
    format($q$INSERT INTO chapter_drafts (chapter_id, title, updated_by) VALUES ('20000000-0000-0000-0000-000000000001','Ch 1', %L)$q$, a), 1);
  PERFORM tests.denied('A cannot change account_status',
    format($q$UPDATE app_users SET account_status = 'active' WHERE id = %L$q$, a));
  PERFORM tests.denied('A cannot reassign story owner',
    format($q$UPDATE stories SET owner_id = %L WHERE id = '10000000-0000-0000-0000-000000000001'$q$, b));
END $$;

-- 3. Simulate the publish RPC (superuser / service role)
DO $$ BEGIN
  RESET ROLE;
  INSERT INTO chapter_versions (id, chapter_id, version_no, title, created_by, published_at)
    VALUES ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 'Ch 1', '00000000-0000-0000-0000-00000000000a', NULL);
  INSERT INTO chapter_version_blocks (version_id, chapter_id, block_id, sort_order, text_content)
    VALUES ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1, 'Hello');
  UPDATE chapter_versions SET published_at = now() WHERE id = '40000000-0000-0000-0000-000000000001';
  UPDATE chapters SET status = 'published', published_version_id = '40000000-0000-0000-0000-000000000001'
    WHERE id = '20000000-0000-0000-0000-000000000001';
  -- second chapter stays draft; private story for visibility checks
  INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'c2', 2);
  INSERT INTO stories (id, owner_id, slug, title) VALUES
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'secret', 'Secret');
  INSERT INTO story_stats (story_id) VALUES ('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002');
END $$;

-- 4. anonymous reader
DO $$ BEGIN
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.count_is('anon sees public story', 'SELECT 1 FROM stories', 1);
  PERFORM tests.count_is('anon sees only published chapter', 'SELECT 1 FROM chapters', 1);
  PERFORM tests.count_is('anon sees live version blocks', 'SELECT 1 FROM chapter_version_blocks', 1);
END $$;
DO $$ BEGIN
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot read drafts', 'SELECT 1 FROM chapter_drafts');
  PERFORM tests.denied('anon cannot vote', $q$INSERT INTO chapter_votes (user_id, chapter_id) VALUES (gen_random_uuid(), '20000000-0000-0000-0000-000000000001')$q$);
  PERFORM tests.denied('anon cannot read notifications', 'SELECT 1 FROM notifications');
  PERFORM tests.count_is('anon sees stats of public story only', 'SELECT 1 FROM story_stats', 1);
END $$;

-- 5. reader B
DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-00000000000a'; b constant uuid := '00000000-0000-0000-0000-00000000000b';
BEGIN
  RESET ROLE; PERFORM tests.act_as(b);
  PERFORM tests.count_is('B cannot see private story', $q$SELECT 1 FROM stories WHERE slug = 'secret'$q$, 0);
  PERFORM tests.count_is('B cannot see draft chapter', $q$SELECT 1 FROM chapters WHERE slug = 'c2'$q$, 0);
  PERFORM tests.rows('B cannot update A story', $q$UPDATE stories SET title = 'pwn' WHERE id = '10000000-0000-0000-0000-000000000001'$q$, 0);
  PERFORM tests.rows('B cannot delete A chapter', $q$UPDATE chapters SET deleted_at = now() WHERE id = '20000000-0000-0000-0000-000000000001'$q$, 0);
  PERFORM tests.denied('B cannot write drafts', format($q$INSERT INTO chapter_drafts (chapter_id, title, updated_by) VALUES ('20000000-0000-0000-0000-000000000002','x', %L)$q$, b));
  PERFORM tests.denied('B cannot add self as collaborator', format($q$INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES ('10000000-0000-0000-0000-000000000001', %L, 'editor')$q$, b));
  PERFORM tests.rows('B votes', $q$INSERT INTO chapter_votes (user_id, chapter_id) VALUES ('00000000-0000-0000-0000-00000000000b','20000000-0000-0000-0000-000000000001')$q$, 1);
  PERFORM tests.denied('B cannot vote as A', format($q$INSERT INTO chapter_votes (user_id, chapter_id) VALUES (%L,'20000000-0000-0000-0000-000000000001')$q$, a));
  PERFORM tests.denied('B cannot vote on draft chapter', format($q$INSERT INTO chapter_votes (user_id, chapter_id) VALUES (%L,'20000000-0000-0000-0000-000000000002')$q$, b));
  PERFORM tests.rows('B comments', format($q$INSERT INTO comments (id, chapter_id, block_id, author_id, body)
        VALUES ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001', %L, 'nice')$q$, b), 1);
  PERFORM tests.denied('B cannot forge comment author', format($q$INSERT INTO comments (chapter_id, author_id, body) VALUES ('20000000-0000-0000-0000-000000000001', %L, 'x')$q$, a));
  PERFORM tests.denied('B cannot comment on draft chapter', format($q$INSERT INTO comments (chapter_id, author_id, body) VALUES ('20000000-0000-0000-0000-000000000002', %L, 'x')$q$, b));
  PERFORM tests.rows('B follows + saves story', format($q$INSERT INTO story_follows (user_id, story_id) VALUES (%L,'10000000-0000-0000-0000-000000000001')$q$, b), 1);
  PERFORM tests.denied('B cannot follow private story', format($q$INSERT INTO story_follows (user_id, story_id) VALUES (%L,'10000000-0000-0000-0000-000000000002')$q$, b));
  PERFORM tests.rows('B saves progress', format($q$INSERT INTO user_chapter_progress (user_id, chapter_id, last_version_id, percent_complete) VALUES (%L,'20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001', 50)$q$, b), 1);
  PERFORM tests.denied('B cannot insert notification', format($q$INSERT INTO notifications (recipient_id, event_type) VALUES (%L,'x')$q$, b));
  PERFORM tests.denied('B cannot touch stats', $q$UPDATE story_stats SET reads = 99$q$);
  PERFORM tests.rows('B reports comment', format($q$INSERT INTO content_reports (reporter_id, comment_id, reason) VALUES (%L,'50000000-0000-0000-0000-000000000001','spam')$q$, b), 1);
  PERFORM tests.rows('B cannot self-review report', $q$UPDATE content_reports SET status = 'resolved'$q$, 0);
  -- private reading list
  PERFORM tests.rows('B creates private list', format($q$INSERT INTO reading_lists (id, owner_id, title) VALUES ('60000000-0000-0000-0000-000000000001', %L, 'mine')$q$, b), 1);
END $$;

-- 6. cross-user privacy
DO $$ BEGIN
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-00000000000a');
  PERFORM tests.count_is('A cannot see B votes', 'SELECT 1 FROM chapter_votes', 0);
  PERFORM tests.count_is('A cannot see B follows', 'SELECT 1 FROM story_follows', 0);
  PERFORM tests.count_is('A cannot see B progress', 'SELECT 1 FROM user_chapter_progress', 0);
  PERFORM tests.count_is('A cannot see B reports', 'SELECT 1 FROM content_reports', 0);
  PERFORM tests.count_is('A cannot see B private list', 'SELECT 1 FROM reading_lists', 0);
  PERFORM tests.count_is('A sees B comment', 'SELECT 1 FROM comments', 1);
  PERFORM tests.count_is('A sees own draft chapter', $q$SELECT 1 FROM chapters WHERE slug = 'c2'$q$, 1);
  PERFORM tests.count_is('A sees own private story', $q$SELECT 1 FROM stories WHERE slug = 'secret'$q$, 1);
  PERFORM tests.rows('A cannot edit B comment text', $q$UPDATE comments SET body = 'x'$q$, 0);
END $$;

-- 7. collaborator editor (C)
DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-00000000000a'; c constant uuid := '00000000-0000-0000-0000-00000000000c';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.rows('A adds editor', format($q$INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES ('10000000-0000-0000-0000-000000000001', %L, 'editor')$q$, c), 1);
  RESET ROLE; PERFORM tests.act_as(c);
  PERFORM tests.count_is('editor sees draft chapter', $q$SELECT 1 FROM chapters WHERE slug = 'c2'$q$, 1);
  PERFORM tests.rows('editor saves draft', format($q$INSERT INTO chapter_drafts (chapter_id, title, updated_by) VALUES ('20000000-0000-0000-0000-000000000002','Ch 2', %L)$q$, c), 1);
  PERFORM tests.rows('editor cannot change story', $q$UPDATE stories SET title = 'pwn' WHERE id = '10000000-0000-0000-0000-000000000001'$q$, 0);
  PERFORM tests.rows('editor cannot manage collaborators', $q$DELETE FROM story_collaborators WHERE collaborator_role = 'editor' AND user_id <> '00000000-0000-0000-0000-00000000000c'$q$, 0);
  PERFORM tests.count_is('editor does not see private story', $q$SELECT 1 FROM stories WHERE slug = 'secret'$q$, 0);
END $$;

-- 8. moderator
DO $$
DECLARE m constant uuid := '00000000-0000-0000-0000-00000000000d';
BEGIN
  RESET ROLE; PERFORM tests.act_as(m, 'authenticated', 'moderator');
  PERFORM tests.count_is('moderator sees reports', 'SELECT 1 FROM content_reports', 1);
  PERFORM tests.rows('moderator hides comment', $q$UPDATE comments SET status = 'hidden'$q$, 1);
  PERFORM tests.rows('moderator reviews report', format($q$UPDATE content_reports SET status = 'resolved', reviewed_by = %L, reviewed_at = now()$q$, m), 1);
  PERFORM tests.count_is('moderator sees private story', $q$SELECT 1 FROM stories WHERE slug = 'secret'$q$, 1);
  -- A forged client-side claim is not enough: app_metadata comes from the signed JWT only; a user without it has no access.
  RESET ROLE; PERFORM tests.act_as('00000000-0000-0000-0000-00000000000b');
  PERFORM tests.count_is('B sees no hidden comment of others', $q$SELECT 1 FROM comments WHERE author_id <> '00000000-0000-0000-0000-00000000000b'$q$, 0);
  -- B can still see own hidden comment but cannot un-hide it
  PERFORM tests.count_is('B sees own hidden comment', 'SELECT 1 FROM comments', 1);
  PERFORM tests.rows('B cannot unhide', $q$UPDATE comments SET status = 'visible'$q$, 0);
END $$;

ROLLBACK;
