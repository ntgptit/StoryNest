-- Controlled tags (WP 5.2): slug rules, set_story_tags limits and permissions, popular_tags. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000ab', 'tag.owner@example.com'),
  ('00000000-0000-0000-0000-0000000000bb', 'tag.coauthor@example.com'),
  ('00000000-0000-0000-0000-0000000000cb', 'tag.editor@example.com'),
  ('00000000-0000-0000-0000-0000000000db', 'tag.stranger@example.com'),
  ('00000000-0000-0000-0000-0000000000eb', 'tag.suspended@example.com'),
  ('00000000-0000-0000-0000-0000000000fb', 'tag.quota@example.com');
UPDATE app_users SET account_status = 'suspended' WHERE id = '00000000-0000-0000-0000-0000000000eb';
INSERT INTO stories (id, owner_id, slug, title, visibility, status, is_mature) VALUES
  ('1b000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000ab', 'tag-story', 'Tag story', 'public', 'ongoing', false),
  ('1b000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000ab', 'tag-mature', 'Tag mature', 'public', 'ongoing', true),
  ('1b000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000ab', 'tag-private', 'Tag private', 'private', 'ongoing', false),
  ('1b000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000eb', 'tag-suspended', 'Tag suspended', 'public', 'ongoing', false),
  ('1b000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000fb', 'tag-quota', 'Tag quota', 'public', 'ongoing', false),
  ('1b000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000fb', 'tag-quota-2', 'Tag quota 2', 'public', 'ongoing', false);
INSERT INTO story_collaborators (story_id, user_id, collaborator_role) VALUES
  ('1b000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000bb', 'co_author'),
  ('1b000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000cb', 'editor');

DO $$
DECLARE
  o constant uuid := '00000000-0000-0000-0000-0000000000ab';
  co constant uuid := '00000000-0000-0000-0000-0000000000bb';
  ed constant uuid := '00000000-0000-0000-0000-0000000000cb';
  stranger constant uuid := '00000000-0000-0000-0000-0000000000db';
  susp constant uuid := '00000000-0000-0000-0000-0000000000eb';
  q constant uuid := '00000000-0000-0000-0000-0000000000fb';
  s1 constant text := '1b000000-0000-0000-0000-000000000001';
  s2 constant text := '1b000000-0000-0000-0000-000000000002';
  s3 constant text := '1b000000-0000-0000-0000-000000000003';
  s4 constant text := '1b000000-0000-0000-0000-000000000004';
  s5 constant text := '1b000000-0000-0000-0000-000000000005';
  s6 constant text := '1b000000-0000-0000-0000-000000000006';
  n bigint;
  before_tags bigint;
  names text[];
BEGIN
  RESET ROLE;

  -- 1. slug rules -------------------------------------------------------------------------------------------------
  PERFORM tests.ok('slug: diacritics and case', public.tag_slug('Lãng Mạn') = 'lang-man');
  PERFORM tests.ok('slug: spaces and punctuation collapse to one dash', public.tag_slug('  lang   man!! ') = 'lang-man');
  PERFORM tests.ok('slug: đ is d', public.tag_slug('Đời thường') = 'doi-thuong');
  PERFORM tests.ok('slug: digits are kept', public.tag_slug('Top 10') = 'top-10');
  PERFORM tests.ok('slug: only punctuation is empty', public.tag_slug('!!!') = '');
  PERFORM tests.ok('slug: decomposed (NFD) text', public.tag_slug(normalize('Lãng mạn', NFD)) = 'lang-man');
  PERFORM tests.ok('slug: NULL stays NULL', public.tag_slug(NULL) IS NULL);

  -- 2. who may change tags ------------------------------------------------------------------------------------------
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('anon cannot set tags', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''abc''])', s1));
  RESET ROLE; PERFORM tests.act_as(NULL, 'authenticated');
  PERFORM tests.fails_with('no subject, no tags', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''abc''])', s1), '42501');
  RESET ROLE; PERFORM tests.act_as(stranger);
  PERFORM tests.fails_with('a stranger cannot tag the story', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''abc''])', s1), '42501');
  RESET ROLE; PERFORM tests.act_as(ed);
  PERFORM tests.fails_with('an editor cannot change tags', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''abc''])', s1), '42501');
  RESET ROLE; PERFORM tests.act_as(susp);
  PERFORM tests.fails_with('a suspended owner cannot change tags', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''abc''])', s4), '42501');
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.fails_with('an unknown story is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''abc''])', gen_random_uuid()), '42501');
  PERFORM tests.fails_with('a NULL list is refused', format('SELECT * FROM public.set_story_tags(%L, NULL)', s1), '22023');

  -- 3. creating and replacing -----------------------------------------------------------------------------------------
  SELECT count(*) INTO n FROM public.set_story_tags(s1::uuid, ARRAY['Lãng mạn', '  Phiêu   lưu ']);
  PERFORM tests.ok('two tags are created and returned', n = 2);
  PERFORM tests.ok('returned in the order given, names cleaned',
    (SELECT array_agg(slug || ':' || display_name) FROM public.set_story_tags(s1::uuid, ARRAY['Lãng mạn', '  Phiêu   lưu '])) = ARRAY['lang-man:Lãng mạn', 'phieu-luu:Phiêu lưu']);
  RESET ROLE;
  PERFORM tests.ok('the story has both', (SELECT count(*) FROM story_tags WHERE story_id = s1::uuid) = 2);
  PERFORM tests.ok('the creator is recorded', (SELECT bool_and(created_by = o) FROM tags WHERE slug IN ('lang-man', 'phieu-luu')));
  SELECT count(*) INTO before_tags FROM tags;

  PERFORM tests.act_as(o);
  PERFORM tests.ok('duplicates by slug merge into the first spelling',
    (SELECT array_agg(slug || ':' || display_name) FROM public.set_story_tags(s1::uuid, ARRAY['Giả tưởng', 'gia tuong', 'GIA-TUONG!'])) = ARRAY['gia-tuong:Giả tưởng']);
  RESET ROLE;
  PERFORM tests.ok('the old two tags were removed from the story, the tags themselves stay',
    (SELECT array_agg(t.slug::text) FROM story_tags st JOIN tags t ON t.id = st.tag_id WHERE st.story_id = s1::uuid) = ARRAY['gia-tuong']
    AND EXISTS (SELECT 1 FROM tags WHERE slug = 'lang-man'));
  PERFORM tests.ok('only one new tag was created', (SELECT count(*) FROM tags) = before_tags + 1);

  PERFORM tests.act_as(o);
  PERFORM tests.ok('an existing tag is reused and keeps its first spelling',
    (SELECT array_agg(display_name) FROM public.set_story_tags(s1::uuid, ARRAY['LANG MAN'])) = ARRAY['Lãng mạn']);
  RESET ROLE;
  PERFORM tests.ok('reusing creates nothing', (SELECT count(*) FROM tags) = before_tags + 1);

  PERFORM tests.act_as(co);
  PERFORM tests.ok('a co-author may change tags', (SELECT count(*) FROM public.set_story_tags(s1::uuid, ARRAY['Phiêu lưu'])) = 1);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.ok('an empty list clears the story', (SELECT count(*) FROM public.set_story_tags(s1::uuid, ARRAY[]::text[])) = 0);
  RESET ROLE;
  PERFORM tests.ok('and removes no tag row', (SELECT count(*) FROM story_tags WHERE story_id = s1::uuid) = 0 AND (SELECT count(*) FROM tags) = before_tags + 1);

  -- 4. input limits -----------------------------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM tests.fails_with('a NULL name is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[NULL])', s1), '22023');
  PERFORM tests.fails_with('a one-character name is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''a''])', s1), '22023');
  PERFORM tests.fails_with('a blank name is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''   ''])', s1), '22023');
  PERFORM tests.fails_with('a name with no letters or digits is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''!!!''])', s1), '22023');
  PERFORM tests.fails_with('a name whose slug is one character is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''a!''])', s1), '22023');
  PERFORM tests.fails_with('a 41-character name is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[%L])', s1, repeat('a', 41)), '22023');
  PERFORM tests.fails_with('a 41-character name is refused even when its slug is short', format('SELECT * FROM public.set_story_tags(%L, ARRAY[%L])', s1, 'abc' || repeat('!', 38)), '22023');
  PERFORM tests.fails_with('a short name whose slug grows past 40 characters is refused', format('SELECT * FROM public.set_story_tags(%L, ARRAY[%L])', s1, repeat('ß', 20) || 'a'), '22023');
  PERFORM tests.ok('a 40-character name is accepted', (SELECT count(*) FROM public.set_story_tags(s1::uuid, ARRAY[repeat('b', 40)])) = 1);
  SELECT array_agg('tag ' || i) INTO names FROM generate_series(1, 11) i;
  PERFORM tests.fails_with('eleven tags on a story are refused', format('SELECT * FROM public.set_story_tags(%L, %L::text[])', s1, names), '22023');
  RESET ROLE;
  PERFORM tests.ok('a refused call changes nothing',
    (SELECT array_agg(t.slug::text) FROM story_tags st JOIN tags t ON t.id = st.tag_id WHERE st.story_id = s1::uuid) = ARRAY[repeat('b', 40)]
    AND NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'tag-1'));
  UPDATE tags SET created_at = now() - interval '25 hours' WHERE created_by = o;   -- the owner's quota is not what this checks
  PERFORM tests.act_as(o);
  SELECT array_agg('tag ' || i) INTO names FROM generate_series(1, 10) i;
  PERFORM tests.ok('ten tags on a story are accepted', (SELECT count(*) FROM public.set_story_tags(s1::uuid, names)) = 10);
  RESET ROLE;

  -- 5. the daily quota of new tags ----------------------------------------------------------------------------------------
  PERFORM tests.act_as(q);
  SELECT array_agg('quota ' || i) INTO names FROM generate_series(1, 10) i;
  PERFORM tests.ok('ten new tags in a day are accepted', (SELECT count(*) FROM public.set_story_tags(s5::uuid, names)) = 10);
  PERFORM tests.fails_with('the eleventh new tag in a day is refused (PT409)', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''quota extra''])', s6), 'PT409');
  PERFORM tests.ok('reusing existing tags is not limited', (SELECT count(*) FROM public.set_story_tags(s6::uuid, ARRAY['quota 1', 'quota 2', 'tag 1'])) = 3);
  PERFORM tests.fails_with('a call mixing reuse and one too many new tags is refused as a whole',
    format('SELECT * FROM public.set_story_tags(%L, ARRAY[''quota 1'', ''quota extra''])', s6), 'PT409');
  RESET ROLE;
  PERFORM tests.ok('the refused call created nothing and kept the story''s tags',
    NOT EXISTS (SELECT 1 FROM tags WHERE slug = 'quota-extra') AND (SELECT count(*) FROM story_tags WHERE story_id = s6::uuid) = 3);
  UPDATE tags SET created_at = now() - interval '23 hours' WHERE created_by = q;
  PERFORM tests.act_as(q);
  PERFORM tests.fails_with('tags created 23 hours ago still count', format('SELECT * FROM public.set_story_tags(%L, ARRAY[''quota extra''])', s6), 'PT409');
  RESET ROLE;
  UPDATE tags SET created_at = now() - interval '25 hours' WHERE created_by = q;
  PERFORM tests.act_as(q);
  PERFORM tests.ok('after 24 hours new tags can be created again', (SELECT count(*) FROM public.set_story_tags(s6::uuid, ARRAY['quota extra'])) = 1);
  RESET ROLE;
  UPDATE tags SET created_at = now() - interval '25 hours' WHERE created_by = o;
  PERFORM tests.act_as(o);
  SELECT array_agg('other ' || i) INTO names FROM generate_series(1, 10) i;
  PERFORM tests.ok('another author at their own limit does not use up this author''s quota', (SELECT count(*) FROM public.set_story_tags(s1::uuid, names)) = 10);
  RESET ROLE;

  -- 6. clients cannot write around the RPC ------------------------------------------------------------------------------------
  PERFORM tests.act_as(o);
  PERFORM tests.denied('no direct insert into story_tags', format('INSERT INTO story_tags (story_id, tag_id) SELECT %L, id FROM tags LIMIT 1', s1));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.denied('no direct delete from story_tags', format('DELETE FROM story_tags WHERE story_id = %L', s1));
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.denied('no direct insert into tags', $q$INSERT INTO tags (slug, display_name) VALUES ('sneaky', 'Sneaky')$q$);
  RESET ROLE; PERFORM tests.act_as(o);
  PERFORM tests.denied('created_by is not readable', 'SELECT created_by FROM tags');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.denied('created_by is not readable by anon either', 'SELECT created_by FROM tags');
  RESET ROLE; PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('the public columns still are', (SELECT count(*) FROM (SELECT id, slug, display_name, created_at FROM tags) x) > 0);
  RESET ROLE;

  -- 7. popular_tags -----------------------------------------------------------------------------------------------------------
  -- visible stories: s1 (public, ok), s5 and s6 (public); hidden: s2 mature, s3 private, s4 suspended owner
  DELETE FROM story_tags;
  INSERT INTO story_tags (story_id, tag_id)
    SELECT s::uuid, t.id FROM (VALUES (s1), (s5), (s6)) v(s), tags t WHERE t.slug = 'lang-man';
  INSERT INTO story_tags (story_id, tag_id)
    SELECT s::uuid, t.id FROM (VALUES (s1)) v(s), tags t WHERE t.slug = 'phieu-luu';
  INSERT INTO story_tags (story_id, tag_id)
    SELECT s::uuid, t.id FROM (VALUES (s2), (s3), (s4)) v(s), tags t WHERE t.slug = 'gia-tuong';
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('popular: most used first, counts only visible stories',
    (SELECT array_agg(p.slug || ':' || p.stories_count) FROM (SELECT * FROM public.popular_tags(10)) p) = ARRAY['lang-man:3', 'phieu-luu:1']);
  PERFORM tests.ok('popular: mature, private and suspended-owner stories do not count', NOT EXISTS (SELECT 1 FROM public.popular_tags(10) WHERE slug = 'gia-tuong'));
  PERFORM tests.ok('popular: limit is honoured', (SELECT count(*) FROM public.popular_tags(1)) = 1);
  PERFORM tests.fails_with('popular: limit 0 refused', 'SELECT * FROM public.popular_tags(0)', '22023');
  PERFORM tests.fails_with('popular: limit 51 refused', 'SELECT * FROM public.popular_tags(51)', '22023');
  PERFORM tests.fails_with('popular: NULL limit refused', 'SELECT * FROM public.popular_tags(NULL)', '22023');
  RESET ROLE;
END $$;

ROLLBACK;
