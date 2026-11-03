-- Chapter publishing RPCs.
--
-- Clients cannot write chapters.status / published_version_id / chapter_versions / chapter_version_blocks
-- (see the RLS migration). They call these functions instead; each call is one transaction:
--
--   publish_chapter(chapter_id, expected_revision?)  -> new version id
--   schedule_chapter(chapter_id, scheduled_for, expected_revision?)
--   unpublish_chapter(chapter_id)                     (also cancels a schedule)
--   publish_due_chapters(limit?)                      service_role only; run from cron / Edge Function
--
-- Authorization: publish and schedule = owner, co_author or editor. unpublish = owner or co_author.
-- A caller with no role on the story gets PT404 (existence is not revealed).
--
-- Error contract (SQLSTATE): 42501 forbidden / not authenticated, PT404 not found, PT409 conflict
-- (stale draft revision, wrong chapter state), 22023 invalid draft or argument. PostgREST maps the PTxxx
-- codes to HTTP 404/409.
--
-- Draft body contract (chapter_drafts.body, jsonb array, order = reading order):
--   {"block_id": uuid, "type": "paragraph"|"heading"|"image"|"divider",
--    "text": string            -- required for paragraph / heading
--    "image_storage_key": string -- required for image
--    "marks": [...]}           -- optional, stored as chapter_version_blocks.rich_text = {"marks": [...]}
-- Missing chapter_blocks rows are created here (block ids are permanent comment anchors); a block id
-- that already belongs to another chapter is rejected.
--
-- Rollback: DROP the four public functions, the two private functions, schema private and outbox_events.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Transactional outbox. Written by publish, drained by a worker (notifications, stats, search indexing).
-- Never exposed to API roles: RLS on, no policies, no grants.
CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type varchar(60) NOT NULL,
    aggregate_id uuid NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);
CREATE INDEX idx_outbox_pending ON outbox_events (created_at) WHERE processed_at IS NULL;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON outbox_events FROM anon, authenticated;

-- 0. Harden the immutability trigger ---------------------------------------------------------------
-- The original body referenced chapter_versions unqualified, so it only worked while search_path
-- contained `public`. The RPCs below run with search_path = '' (SECURITY DEFINER best practice).
CREATE OR REPLACE FUNCTION public.deny_published_block_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
    v_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.version_id ELSE OLD.version_id END;
    IF EXISTS (SELECT 1 FROM public.chapter_versions WHERE id = v_id AND published_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Blocks of published chapter version % are immutable', v_id;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.version_id <> OLD.version_id THEN
        RAISE EXCEPTION 'Moving snapshot blocks between versions is not allowed';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.deny_published_block_mutation() FROM PUBLIC, anon, authenticated;

-- 1. Draft validation -------------------------------------------------------------------------
CREATE FUNCTION private.validate_chapter_body(p_body jsonb) RETURNS void
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
    r record;
    v_id uuid;
    v_type text;
    v_seen uuid[] := '{}';
BEGIN
    IF p_body IS NULL OR jsonb_typeof(p_body) <> 'array' OR jsonb_array_length(p_body) = 0 THEN
        RAISE EXCEPTION 'chapter body must be a non-empty array' USING ERRCODE = '22023';
    END IF;

    FOR r IN SELECT e, ord FROM jsonb_array_elements(p_body) WITH ORDINALITY AS t(e, ord) LOOP
        IF jsonb_typeof(r.e) <> 'object' THEN
            RAISE EXCEPTION 'block %: must be an object', r.ord USING ERRCODE = '22023';
        END IF;

        BEGIN
            v_id := (r.e ->> 'block_id')::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'block %: block_id is not a uuid', r.ord USING ERRCODE = '22023';
        END;
        IF v_id IS NULL THEN
            RAISE EXCEPTION 'block %: block_id is required', r.ord USING ERRCODE = '22023';
        END IF;
        IF v_id = ANY (v_seen) THEN
            RAISE EXCEPTION 'block %: duplicate block_id %', r.ord, v_id USING ERRCODE = '22023';
        END IF;
        v_seen := v_seen || v_id;

        v_type := coalesce(r.e ->> 'type', 'paragraph');
        IF v_type NOT IN ('paragraph','heading','image','divider') THEN
            RAISE EXCEPTION 'block %: unsupported type "%"', r.ord, v_type USING ERRCODE = '22023';
        END IF;
        IF v_type IN ('paragraph','heading') AND jsonb_typeof(r.e -> 'text') IS DISTINCT FROM 'string' THEN
            RAISE EXCEPTION 'block %: "text" must be a string for type %', r.ord, v_type USING ERRCODE = '22023';
        END IF;
        IF v_type = 'image' AND nullif(btrim(r.e ->> 'image_storage_key'), '') IS NULL THEN
            RAISE EXCEPTION 'block %: image_storage_key is required for images', r.ord USING ERRCODE = '22023';
        END IF;
        IF r.e ? 'marks' AND jsonb_typeof(r.e -> 'marks') NOT IN ('array', 'null') THEN
            RAISE EXCEPTION 'block %: "marks" must be an array', r.ord USING ERRCODE = '22023';
        END IF;
    END LOOP;
END;
$$;

-- 2. Core: snapshot the draft and flip the chapter to published ----------------------------------
-- Not callable through the API (schema private). The caller must already have authorised p_actor.
CREATE FUNCTION private.publish_chapter_core(p_chapter_id uuid, p_actor uuid, p_expected_revision bigint)
RETURNS uuid LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_chapter public.chapters%ROWTYPE;
    v_story   public.stories%ROWTYPE;
    v_draft   public.chapter_drafts%ROWTYPE;
    v_version_id uuid;
    v_version_no integer;
    v_words integer;
    v_first boolean;
BEGIN
    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id FOR UPDATE;
    IF NOT FOUND OR v_chapter.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    SELECT * INTO v_story FROM public.stories WHERE id = v_chapter.story_id FOR UPDATE;
    IF v_story.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'story is deleted' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_draft FROM public.chapter_drafts WHERE chapter_id = p_chapter_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'chapter has no draft' USING ERRCODE = '22023';
    END IF;
    IF p_expected_revision IS NOT NULL AND p_expected_revision <> v_draft.revision THEN
        RAISE EXCEPTION 'draft revision is % but % was expected', v_draft.revision, p_expected_revision
            USING ERRCODE = 'PT409';
    END IF;
    IF btrim(v_draft.title) = '' THEN
        RAISE EXCEPTION 'chapter title is required' USING ERRCODE = '22023';
    END IF;
    PERFORM private.validate_chapter_body(v_draft.body);

    IF EXISTS (SELECT 1 FROM public.chapter_blocks b
               WHERE b.chapter_id <> p_chapter_id
                 AND b.id IN (SELECT (e ->> 'block_id')::uuid FROM jsonb_array_elements(v_draft.body) e)) THEN
        RAISE EXCEPTION 'a block_id belongs to another chapter' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(sum(CASE WHEN btrim(e ->> 'text') = '' THEN 0
                             ELSE cardinality(regexp_split_to_array(btrim(e ->> 'text'), '\s+')) END), 0)::int
      INTO v_words
      FROM jsonb_array_elements(v_draft.body) e
     WHERE coalesce(e ->> 'type', 'paragraph') IN ('paragraph','heading');

    SELECT coalesce(max(version_no), 0) + 1 INTO v_version_no
      FROM public.chapter_versions WHERE chapter_id = p_chapter_id;
    v_first := v_chapter.first_published_at IS NULL;

    -- Snapshot: version (unpublished) -> blocks -> mark published (immutable from then on).
    INSERT INTO public.chapter_versions (chapter_id, version_no, title, word_count, created_by)
    VALUES (p_chapter_id, v_version_no, btrim(v_draft.title), v_words, p_actor)
    RETURNING id INTO v_version_id;

    INSERT INTO public.chapter_blocks (id, chapter_id)
    SELECT (e ->> 'block_id')::uuid, p_chapter_id FROM jsonb_array_elements(v_draft.body) e
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.chapter_version_blocks
        (version_id, chapter_id, block_id, sort_order, block_type, text_content, rich_text, image_storage_key)
    SELECT v_version_id, p_chapter_id, (t.e ->> 'block_id')::uuid, t.ord::int,
           coalesce(t.e ->> 'type', 'paragraph'),
           CASE WHEN coalesce(t.e ->> 'type', 'paragraph') IN ('paragraph','heading') THEN t.e ->> 'text' END,
           CASE WHEN jsonb_typeof(t.e -> 'marks') = 'array' AND jsonb_array_length(t.e -> 'marks') > 0
                THEN jsonb_build_object('marks', t.e -> 'marks') END,
           CASE WHEN t.e ->> 'type' = 'image' THEN btrim(t.e ->> 'image_storage_key') END
      FROM jsonb_array_elements(v_draft.body) WITH ORDINALITY AS t(e, ord);

    UPDATE public.chapter_versions SET published_at = now() WHERE id = v_version_id;

    UPDATE public.chapters
       SET status = 'published',
           published_version_id = v_version_id,
           first_published_at = coalesce(first_published_at, now()),
           scheduled_for = NULL
     WHERE id = p_chapter_id;

    -- Publishing the first chapter takes a draft story out of 'draft'. Visibility stays the owner's choice.
    UPDATE public.stories
       SET first_published_at = coalesce(first_published_at, now()),
           status = CASE WHEN status = 'draft' THEN 'ongoing' ELSE status END
     WHERE id = v_story.id;

    INSERT INTO public.chapter_stats (chapter_id) VALUES (p_chapter_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.story_stats (story_id) VALUES (v_story.id) ON CONFLICT DO NOTHING;

    -- Followers are notified once per chapter; re-publishing an edit is silent.
    IF v_first THEN
        INSERT INTO public.outbox_events (event_type, aggregate_id, payload, dedupe_key)
        VALUES ('chapter.published', p_chapter_id,
                jsonb_build_object('story_id', v_story.id, 'chapter_id', p_chapter_id,
                                   'version_id', v_version_id, 'published_by', p_actor),
                'chapter.published:' || p_chapter_id)
        ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;

    RETURN v_version_id;
END;
$$;

-- 3. Public RPCs ---------------------------------------------------------------------------------
CREATE FUNCTION public.publish_chapter(p_chapter_id uuid, p_expected_revision bigint DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_story_id uuid;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT story_id INTO v_story_id FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL;
    IF v_story_id IS NULL OR public.story_role(v_story_id) IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    RETURN private.publish_chapter_core(p_chapter_id, v_uid, p_expected_revision);
END;
$$;

-- Validates the current draft now; the snapshot is taken from the draft as it is at p_scheduled_for.
CREATE FUNCTION public.schedule_chapter(p_chapter_id uuid, p_scheduled_for timestamptz,
                                        p_expected_revision bigint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_chapter public.chapters%ROWTYPE;
    v_draft public.chapter_drafts%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_scheduled_for IS NULL OR p_scheduled_for <= now() THEN
        RAISE EXCEPTION 'scheduled_for must be in the future' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR public.story_role(v_chapter.story_id) IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_chapter.status NOT IN ('draft','scheduled') THEN
        RAISE EXCEPTION 'only draft or scheduled chapters can be scheduled (status is %)', v_chapter.status
            USING ERRCODE = 'PT409';
    END IF;

    SELECT * INTO v_draft FROM public.chapter_drafts WHERE chapter_id = p_chapter_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'chapter has no draft' USING ERRCODE = '22023';
    END IF;
    IF p_expected_revision IS NOT NULL AND p_expected_revision <> v_draft.revision THEN
        RAISE EXCEPTION 'draft revision is % but % was expected', v_draft.revision, p_expected_revision
            USING ERRCODE = 'PT409';
    END IF;
    IF btrim(v_draft.title) = '' THEN
        RAISE EXCEPTION 'chapter title is required' USING ERRCODE = '22023';
    END IF;
    PERFORM private.validate_chapter_body(v_draft.body);

    UPDATE public.chapters SET status = 'scheduled', scheduled_for = p_scheduled_for WHERE id = p_chapter_id;
END;
$$;

-- Takes a chapter offline (or cancels its schedule). Versions are kept; first_published_at is kept,
-- so publishing again does not re-notify followers.
CREATE FUNCTION public.unpublish_chapter(p_chapter_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_chapter public.chapters%ROWTYPE;
    v_role text;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    v_role := public.story_role(v_chapter.story_id);
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_role NOT IN ('owner','co_author') THEN
        RAISE EXCEPTION 'only the owner or a co-author can unpublish' USING ERRCODE = '42501';
    END IF;
    IF v_chapter.status NOT IN ('published','scheduled') THEN
        RAISE EXCEPTION 'chapter is not published or scheduled (status is %)', v_chapter.status
            USING ERRCODE = 'PT409';
    END IF;

    UPDATE public.chapters
       SET status = 'draft', published_version_id = NULL, scheduled_for = NULL
     WHERE id = p_chapter_id;
END;
$$;

-- Publishes scheduled chapters whose time has come, attributed to whoever last saved the draft.
-- One failing chapter is logged and skipped so it cannot block the rest; it is retried on the next run.
CREATE FUNCTION public.publish_due_chapters(p_limit integer DEFAULT 50)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    r record;
    v_count integer := 0;
BEGIN
    FOR r IN
        SELECT c.id, d.updated_by
          FROM public.chapters c JOIN public.chapter_drafts d ON d.chapter_id = c.id
         WHERE c.status = 'scheduled' AND c.scheduled_for <= now() AND c.deleted_at IS NULL
         ORDER BY c.scheduled_for
         LIMIT greatest(p_limit, 1)
         FOR UPDATE OF c SKIP LOCKED
    LOOP
        BEGIN
            PERFORM private.publish_chapter_core(r.id, r.updated_by, NULL);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'scheduled publish of chapter % failed: % (%)', r.id, SQLERRM, SQLSTATE;
        END;
    END LOOP;
    RETURN v_count;
END;
$$;

-- 4. Privileges --------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION private.validate_chapter_body(jsonb), private.publish_chapter_core(uuid, uuid, bigint)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_chapter(uuid, bigint), public.schedule_chapter(uuid, timestamptz, bigint),
    public.unpublish_chapter(uuid), public.publish_due_chapters(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_chapter(uuid, bigint), public.schedule_chapter(uuid, timestamptz, bigint),
    public.unpublish_chapter(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_due_chapters(integer) TO service_role;

COMMIT;
