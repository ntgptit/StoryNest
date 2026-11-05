-- Personal highlights (batch 4 · community4, Lucian 392): owner-only access, range checks, the re-publish rule. Rolled back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000371', 'hl.author@example.com'),
  ('00000000-0000-0000-0000-000000000372', 'hl.reader@example.com'),
  ('00000000-0000-0000-0000-000000000373', 'hl.other@example.com');
INSERT INTO stories (id, owner_id, slug, title, visibility, status) VALUES
  ('37000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000371', 'hl-story', 'Highlights', 'public', 'ongoing'),
  ('37000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000371', 'hl-private', 'Private', 'private', 'ongoing');
INSERT INTO chapters (id, story_id, slug, sort_order) VALUES
  ('37100000-0000-0000-0000-000000000001', '37000000-0000-0000-0000-000000000001', 'one', 1),
  ('37100000-0000-0000-0000-000000000002', '37000000-0000-0000-0000-000000000002', 'secret', 1);

DO $$
DECLARE a constant uuid := '00000000-0000-0000-0000-000000000371';
BEGIN
  RESET ROLE; PERFORM tests.act_as(a);
  INSERT INTO chapter_drafts (chapter_id, title, body, updated_by) VALUES
    ('37100000-0000-0000-0000-000000000001', 'Một',
     '[{"block_id":"37200000-0000-0000-0000-000000000001","type":"paragraph","text":"Trời hôm nay rất đẹp 🌸 và xanh"},
       {"block_id":"37200000-0000-0000-0000-000000000002","type":"paragraph","text":"Đoạn thứ hai sẽ đổi"},
       {"block_id":"37200000-0000-0000-0000-000000000003","type":"divider"}]'::jsonb, a),
    ('37100000-0000-0000-0000-000000000002', 'Kín', '[{"block_id":"37200000-0000-0000-0000-000000000009","type":"paragraph","text":"bí mật"}]'::jsonb, a);
  PERFORM public.publish_chapter('37100000-0000-0000-0000-000000000001');
  PERFORM public.publish_chapter('37100000-0000-0000-0000-000000000002');
END $$;

DO $$
DECLARE
  a constant uuid := '00000000-0000-0000-0000-000000000371';
  r constant uuid := '00000000-0000-0000-0000-000000000372';
  o constant uuid := '00000000-0000-0000-0000-000000000373';
  ch constant uuid := '37100000-0000-0000-0000-000000000001';
  secret constant uuid := '37100000-0000-0000-0000-000000000002';
  b1 constant uuid := '37200000-0000-0000-0000-000000000001';
  b2 constant uuid := '37200000-0000-0000-0000-000000000002';
  b3 constant uuid := '37200000-0000-0000-0000-000000000003';
  h1 uuid; h2 uuid; h3 uuid; again uuid;
  hint text;
BEGIN
  RESET ROLE;
  PERFORM tests.ok('utf16 length counts astral characters twice',
    public.utf16_length('ab🌸') = 4 AND public.utf16_length('Trời') = 4);

  -- 1. who may highlight -----------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('a guest cannot highlight', format('SELECT public.add_chapter_highlight(%L, %L, 0, 4, ''underline'')', ch, b1));
  PERFORM tests.denied('a guest cannot list', format('SELECT * FROM public.list_my_highlights(%L)', ch));
  PERFORM tests.denied('a guest cannot read the table', 'SELECT 1 FROM chapter_highlights');
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject', format('SELECT public.add_chapter_highlight(%L, %L, 0, 4, ''underline'')', ch, b1), '42501');
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a chapter the reader cannot see', format('SELECT public.add_chapter_highlight(%L, %L, 0, 2, ''box'')', secret, '37200000-0000-0000-0000-000000000009'), 'PT404');
  PERFORM tests.fails_with('unknown style', format('SELECT public.add_chapter_highlight(%L, %L, 0, 4, ''glitter'')', ch, b1), '22023');
  PERFORM tests.fails_with('a divider has no text', format('SELECT public.add_chapter_highlight(%L, %L, 0, 1, ''box'')', ch, b3), '22023');
  PERFORM tests.fails_with('a block of another chapter', format('SELECT public.add_chapter_highlight(%L, %L, 0, 1, ''box'')', ch, '37200000-0000-0000-0000-000000000009'), '22023');
  PERFORM tests.fails_with('empty range', format('SELECT public.add_chapter_highlight(%L, %L, 3, 3, ''box'')', ch, b1), '22023');
  PERFORM tests.fails_with('past the end (UTF-16 length is 31)', format('SELECT public.add_chapter_highlight(%L, %L, 0, 32, ''box'')', ch, b1), '22023');
  PERFORM tests.denied('no direct insert',
    format('INSERT INTO chapter_highlights (user_id, chapter_id, block_id, start_offset, end_offset, style, block_text_md5) VALUES (%L, %L, %L, 0, 1, ''box'', %L)', r, ch, b1, md5('x')));

  -- 2. adding, idempotent on the same range ------------------------------------------------------------------------------
  h1 := public.add_chapter_highlight(ch, b1, 0, 31, 'underline');   -- the whole text, emoji included
  h2 := public.add_chapter_highlight(ch, b2, 4, 12, 'circle');
  again := public.add_chapter_highlight(ch, b1, 0, 31, 'box');
  PERFORM tests.ok('the same range keeps its id and takes the new style',
    again = h1 AND (SELECT style = 'box' FROM chapter_highlights WHERE id = h1));
  PERFORM tests.count_is('two live highlights', format('SELECT 1 FROM public.list_my_highlights(%L) WHERE NOT stale', ch), 2);
  PERFORM tests.denied('no direct update', format('UPDATE chapter_highlights SET block_text_md5 = %L', md5('y')));

  -- 3. nobody else sees them -------------------------------------------------------------------------------------------------------
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.count_is('another reader sees no rows', 'SELECT 1 FROM chapter_highlights', 0);
  PERFORM tests.count_is('and lists none', format('SELECT 1 FROM public.list_my_highlights(%L)', ch), 0);
  PERFORM tests.rows('and cannot delete them', format('DELETE FROM chapter_highlights WHERE id = %L', h1), 0);
  RESET ROLE; PERFORM tests.act_as(a);
  PERFORM tests.count_is('the story''s author does not see them either', 'SELECT 1 FROM chapter_highlights', 0);

  -- 4. re-publish: an unchanged paragraph keeps its highlight, a changed one goes stale -------------------------------------------
  UPDATE chapter_drafts SET
    body = '[{"block_id":"37200000-0000-0000-0000-000000000002","type":"paragraph","text":"Đoạn thứ hai đã đổi"},
             {"block_id":"37200000-0000-0000-0000-000000000001","type":"paragraph","text":"Trời hôm nay rất đẹp 🌸 và xanh","marks":[{"type":"bold","from":0,"to":4}]}]'::jsonb
   WHERE chapter_id = ch;
  PERFORM public.publish_chapter(ch);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('moved and re-formatted but same text: live',
    (SELECT NOT stale FROM public.list_my_highlights(ch) WHERE id = h1));
  PERFORM tests.ok('changed text: stale', (SELECT stale FROM public.list_my_highlights(ch) WHERE id = h2));
  -- the paragraph comes back word for word: the highlight is live again
  RESET ROLE; PERFORM tests.act_as(a);
  UPDATE chapter_drafts SET
    body = '[{"block_id":"37200000-0000-0000-0000-000000000002","type":"paragraph","text":"Đoạn thứ hai sẽ đổi"}]'::jsonb
   WHERE chapter_id = ch;
  PERFORM public.publish_chapter(ch);
  RESET ROLE; PERFORM tests.act_as(r);
  PERFORM tests.ok('restored text: live again', (SELECT NOT stale FROM public.list_my_highlights(ch) WHERE id = h2));
  PERFORM tests.ok('a removed paragraph: stale', (SELECT stale FROM public.list_my_highlights(ch) WHERE id = h1));
  PERFORM tests.fails_with('a removed paragraph cannot get a new highlight', format('SELECT public.add_chapter_highlight(%L, %L, 0, 2, ''box'')', ch, b1), '22023');

  -- 5. limits, deleting, suspension ---------------------------------------------------------------------------------------------------
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 2 WHERE code = 'highlights_per_chapter';
  PERFORM tests.act_as(r);
  hint := NULL;
  BEGIN
    PERFORM public.add_chapter_highlight(ch, b2, 0, 2, 'strike');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '22023' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  END;
  PERFORM tests.ok('the per-chapter limit', hint = 'highlight_limit');
  PERFORM tests.rows('the owner deletes their own', format('DELETE FROM chapter_highlights WHERE id = %L', h2), 1);
  h3 := public.add_chapter_highlight(ch, b2, 0, 2, 'strike');
  PERFORM tests.ok('room again after a delete', h3 IS NOT NULL);
  RESET ROLE;
  UPDATE abuse_limits SET max_value = 500 WHERE code = 'highlights_per_chapter';
  UPDATE app_users SET account_status = 'suspended' WHERE id = r;
  PERFORM tests.act_as(r);
  PERFORM tests.fails_with('a suspended account cannot highlight', format('SELECT public.add_chapter_highlight(%L, %L, 0, 3, ''box'')', ch, b2), '42501');
  RESET ROLE;
  UPDATE app_users SET account_status = 'active' WHERE id = r;

  -- 6. an unpublished chapter hides the list ------------------------------------------------------------------------------------------
  UPDATE chapters SET status = 'archived' WHERE id = ch;
  PERFORM tests.act_as(r);
  PERFORM tests.count_is('nothing listed for a chapter the reader cannot read', format('SELECT 1 FROM public.list_my_highlights(%L)', ch), 0);
END $$;

ROLLBACK;
