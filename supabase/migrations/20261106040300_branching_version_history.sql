-- Branching version history (Lucian 177, batch 4 "authoring4").
--
--   chapter_versions.parent_version_id   the version the draft was based on when this one was published
--   chapter_drafts.base_version_id       the version the working draft currently descends from (server-owned)
--   restore_chapter_version(version_id, expected_revision) -> new draft revision
--
-- How the graph grows:
--   * Publishing (publish_chapter, publish_due_chapters: both go through private.publish_chapter_core, which is NOT
--     changed) inserts a chapter_versions row. A BEFORE INSERT trigger sets its parent to the draft's base version,
--     or, for a draft that has none yet (drafts from before this migration), to the chapter's latest version; the
--     first version of a chapter has no parent. An AFTER INSERT trigger then moves the draft's base to the new
--     version. The snapshot itself (title, blocks, word count), the published pointer, the outbox event and every
--     check of the publish core are exactly as before: what is published does not change.
--   * restore_chapter_version copies a version into the working draft on the server (the same body contract the
--     publish RPC reads back, see 20261103000200) and makes that version the draft's base. Publishing after a restore
--     therefore starts a branch from the restored version instead of continuing from the latest one. It is the only
--     writer of base_version_id besides the trigger (no column grant), so clients cannot fake the graph.
--   * Versions are immutable once published (chapter_version_immutable), so existing rows are not back-filled: a
--     version without a parent and version_no > 1 is from before this migration and the client reads it as linear.
--
-- restore_chapter_version: owner, co-author or editor (the same people who may write the draft). It is an
-- optimistic write like a draft save: p_expected_revision must equal the draft's revision (PT409 otherwise), and the
-- revision goes up by one, so an editor open elsewhere detects the change on its next save. The chapter's published
-- state is not touched.
-- Error contract: 42501 not signed in / inactive, PT404 unknown version or no role on its story (also a deleted
-- chapter), 22023 expected revision missing or the chapter has no draft, PT409 stale revision.
--
-- Rollback:
--   DROP FUNCTION public.restore_chapter_version(uuid, bigint);
--   DROP TRIGGER chapter_versions_parent ON chapter_versions; DROP TRIGGER chapter_versions_advance_base ON chapter_versions;
--   DROP FUNCTION private.set_version_parent(); DROP FUNCTION private.advance_draft_base();
--   ALTER TABLE chapter_drafts DROP CONSTRAINT fk_chapter_draft_base, DROP COLUMN base_version_id;
--   ALTER TABLE chapter_versions DROP CONSTRAINT fk_chapter_version_parent, DROP COLUMN parent_version_id;
--   (dropping a column of chapter_versions is an ALTER, not an UPDATE, so the immutability trigger does not block it)
BEGIN;

ALTER TABLE chapter_versions ADD COLUMN parent_version_id uuid;
ALTER TABLE chapter_versions ADD CONSTRAINT fk_chapter_version_parent
    FOREIGN KEY (parent_version_id, chapter_id) REFERENCES chapter_versions (id, chapter_id);
CREATE INDEX idx_chapter_versions_parent ON chapter_versions (parent_version_id) WHERE parent_version_id IS NOT NULL;

ALTER TABLE chapter_drafts ADD COLUMN base_version_id uuid;
ALTER TABLE chapter_drafts ADD CONSTRAINT fk_chapter_draft_base
    FOREIGN KEY (base_version_id, chapter_id) REFERENCES chapter_versions (id, chapter_id);
CREATE INDEX idx_chapter_drafts_base ON chapter_drafts (base_version_id) WHERE base_version_id IS NOT NULL;

CREATE FUNCTION private.set_version_parent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.parent_version_id IS NULL THEN
        NEW.parent_version_id := coalesce(
            (SELECT d.base_version_id FROM public.chapter_drafts d WHERE d.chapter_id = NEW.chapter_id),
            (SELECT v.id FROM public.chapter_versions v
              WHERE v.chapter_id = NEW.chapter_id ORDER BY v.version_no DESC LIMIT 1));
    END IF;
    RETURN NEW;
END $$;

CREATE FUNCTION private.advance_draft_base() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE public.chapter_drafts SET base_version_id = NEW.id WHERE chapter_id = NEW.chapter_id;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION private.set_version_parent(), private.advance_draft_base() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chapter_versions_parent BEFORE INSERT ON chapter_versions
    FOR EACH ROW EXECUTE FUNCTION private.set_version_parent();
CREATE TRIGGER chapter_versions_advance_base AFTER INSERT ON chapter_versions
    FOR EACH ROW EXECUTE FUNCTION private.advance_draft_base();

CREATE FUNCTION public.restore_chapter_version(p_version_id uuid, p_expected_revision bigint)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_version public.chapter_versions%ROWTYPE;
    v_story_id uuid;
    v_draft public.chapter_drafts%ROWTYPE;
    v_body jsonb;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_expected_revision IS NULL THEN
        RAISE EXCEPTION 'expected_revision is required' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_version FROM public.chapter_versions WHERE id = p_version_id AND published_at IS NOT NULL;
    SELECT story_id INTO v_story_id FROM public.chapters WHERE id = v_version.chapter_id AND deleted_at IS NULL;
    IF v_version.id IS NULL OR v_story_id IS NULL OR public.story_role(v_story_id) IS NULL THEN
        RAISE EXCEPTION 'version not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT * INTO v_draft FROM public.chapter_drafts WHERE chapter_id = v_version.chapter_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'chapter has no draft' USING ERRCODE = '22023';
    END IF;
    IF v_draft.revision <> p_expected_revision THEN
        RAISE EXCEPTION 'draft revision is % but % was expected', v_draft.revision, p_expected_revision
            USING ERRCODE = 'PT409';
    END IF;

    -- The inverse of the snapshot in publish_chapter_core: one draft block per version block, in reading order.
    SELECT coalesce(jsonb_agg(
               CASE b.block_type
                   WHEN 'image' THEN jsonb_build_object('block_id', b.block_id, 'type', 'image',
                                                        'image_storage_key', b.image_storage_key)
                   WHEN 'divider' THEN jsonb_build_object('block_id', b.block_id, 'type', 'divider')
                   ELSE jsonb_build_object('block_id', b.block_id, 'type', b.block_type, 'text', b.text_content)
                        || CASE WHEN jsonb_typeof(b.rich_text -> 'marks') = 'array'
                                     AND jsonb_array_length(b.rich_text -> 'marks') > 0
                                THEN jsonb_build_object('marks', b.rich_text -> 'marks') ELSE '{}'::jsonb END
               END ORDER BY b.sort_order), '[]'::jsonb)
      INTO v_body
      FROM public.chapter_version_blocks b
     WHERE b.version_id = v_version.id;

    UPDATE public.chapter_drafts
       SET title = v_version.title,
           body = v_body,
           revision = v_draft.revision + 1,
           updated_by = v_uid,
           base_version_id = v_version.id
     WHERE chapter_id = v_version.chapter_id;

    RETURN v_draft.revision + 1;
END $$;

REVOKE ALL ON FUNCTION public.restore_chapter_version(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_chapter_version(uuid, bigint) TO authenticated, service_role;

COMMIT;
