-- A notification stops quoting a comment once the comment is hidden or deleted (FP-013). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000581', 'ne.author@example.com'),
  ('00000000-0000-0000-0000-000000000582', 'ne.reader@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('58000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000581', 'ne-story', 'Story', 'public', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('58100000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'one', 1);
INSERT INTO comments (id, chapter_id, author_id, body) VALUES
  ('58200000-0000-0000-0000-000000000001', '58100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000582', 'first reply'),
  ('58200000-0000-0000-0000-000000000002', '58100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000582', 'second reply'),
  ('58200000-0000-0000-0000-000000000003', '58100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000582', 'third reply');
INSERT INTO notifications (recipient_id, actor_id, event_type, story_id, chapter_id, comment_id, payload, dedupe_key) VALUES
  ('00000000-0000-0000-0000-000000000581', '00000000-0000-0000-0000-000000000582', 'comment_replied', '58000000-0000-0000-0000-000000000001', '58100000-0000-0000-0000-000000000001', '58200000-0000-0000-0000-000000000001', '{"excerpt":"first reply","story_title":"Story"}', 'ne:1'),
  ('00000000-0000-0000-0000-000000000581', '00000000-0000-0000-0000-000000000582', 'comment_replied', '58000000-0000-0000-0000-000000000001', '58100000-0000-0000-0000-000000000001', '58200000-0000-0000-0000-000000000002', '{"excerpt":"second reply","story_title":"Story"}', 'ne:2'),
  ('00000000-0000-0000-0000-000000000581', '00000000-0000-0000-0000-000000000582', 'comment_replied', '58000000-0000-0000-0000-000000000001', '58100000-0000-0000-0000-000000000001', '58200000-0000-0000-0000-000000000003', '{"excerpt":"third reply","story_title":"Story"}', 'ne:3');

DO $$
DECLARE
  k1 constant uuid := '58200000-0000-0000-0000-000000000001';
  k2 constant uuid := '58200000-0000-0000-0000-000000000002';
  k3 constant uuid := '58200000-0000-0000-0000-000000000003';
BEGIN
  RESET ROLE;
  PERFORM tests.ok('every notification starts with its excerpt', (SELECT count(*) = 3 FROM notifications WHERE payload ? 'excerpt'));

  UPDATE comments SET status = 'hidden' WHERE id = k1;
  PERFORM tests.ok('a hidden comment is no longer quoted', (SELECT NOT (payload ? 'excerpt') FROM notifications WHERE comment_id = k1));
  PERFORM tests.ok('the rest of that notification stays', (SELECT payload ->> 'story_title' = 'Story' FROM notifications WHERE comment_id = k1));
  PERFORM tests.ok('other comments are untouched', (SELECT count(*) = 2 FROM notifications WHERE payload ? 'excerpt'));

  UPDATE comments SET status = 'visible' WHERE id = k1;
  PERFORM tests.ok('restoring the comment does not bring the excerpt back', (SELECT NOT (payload ? 'excerpt') FROM notifications WHERE comment_id = k1));

  UPDATE comments SET deleted_at = now(), status = 'deleted' WHERE id = k2;
  PERFORM tests.ok('a deleted comment is no longer quoted', (SELECT NOT (payload ? 'excerpt') FROM notifications WHERE comment_id = k2));

  UPDATE comments SET body = 'edited text' WHERE id = k3;
  PERFORM tests.ok('an edit alone changes nothing here', (SELECT payload ? 'excerpt' FROM notifications WHERE comment_id = k3));

  PERFORM tests.ok('clients cannot call the trigger function',
    NOT has_function_privilege('authenticated', 'public.blank_notification_excerpt()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.blank_notification_excerpt()', 'EXECUTE'));
END $$;

ROLLBACK;
