-- Draft edit lock with hand-over (Lucian 196 "shared control handoff", lock part only; batch 4 "authoring4").
--
--   chapter_edit_locks(chapter_id, holder_id, acquired_at, expires_at, requested_by, requested_at)
--   claim_edit_lock(chapter_id)        take a free or expired lock, or renew your own (heartbeat); otherwise
--                                      changes nothing. Returns the lock as it is after the call.
--   request_edit_lock(chapter_id)      ask the holder for the lock (takes it at once when it is free or expired)
--   hand_over_edit_lock(chapter_id)    the holder gives the lock to whoever asked
--   decline_edit_request(chapter_id)   the holder keeps the lock and clears the request
--   release_edit_lock(chapter_id)      the holder lets go (idempotent; no-op for anyone else)
--
-- The lock is ADVISORY. It tells the team who is writing and lets them pass control; it does not decide who may save.
-- Saving still goes through the existing optimistic revision check on chapter_drafts (a save based on an older
-- revision is refused and the editor offers reload / merge), and nothing here reads or writes chapter_drafts, so
-- that check is exactly as strong as before. A lock lasts 90 seconds and is renewed by the open editor; a closed tab
-- or a lost connection frees it by expiry. A holder who is no longer on the team does not keep it.
--
-- Access: the team (can_edit_chapter) reads the rows, nobody writes them directly (no grants), only the RPCs, which
-- check: signed in and active (42501), chapter exists, is not deleted and the caller has a role on its story (PT404).
-- hand_over_edit_lock: PT409 when the caller does not hold the lock or nobody (still on the team) asked.
-- Realtime: the table joins the supabase_realtime publication when it exists (it does on Supabase, for
-- notifications); the open editor listens for changes on its chapter and also polls, so it works without it.
--
-- Rollback:
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.chapter_edit_locks;   -- when it was added
--   DROP FUNCTION public.claim_edit_lock(uuid), public.request_edit_lock(uuid), public.hand_over_edit_lock(uuid),
--                 public.decline_edit_request(uuid), public.release_edit_lock(uuid);
--   DROP FUNCTION private.edit_lock_story(uuid), private.is_story_member(uuid, uuid);
--   DROP TABLE chapter_edit_locks;
BEGIN;

CREATE TABLE chapter_edit_locks (
    chapter_id uuid PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
    holder_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    acquired_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    requested_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
    requested_at timestamptz,
    CHECK (requested_by IS NULL OR requested_by <> holder_id)
);
CREATE INDEX idx_chapter_edit_locks_holder ON chapter_edit_locks (holder_id);
CREATE INDEX idx_chapter_edit_locks_requested_by ON chapter_edit_locks (requested_by) WHERE requested_by IS NOT NULL;

ALTER TABLE chapter_edit_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON chapter_edit_locks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON chapter_edit_locks TO authenticated;
CREATE POLICY chapter_edit_locks_team_read ON chapter_edit_locks FOR SELECT USING (public.can_edit_chapter(chapter_id));

-- Is p_user on the story's team (owner, co-author or editor)? For a user other than the caller, so not story_role.
CREATE FUNCTION private.is_story_member(p_story_id uuid, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.stories s WHERE s.id = p_story_id AND s.owner_id = p_user)
        OR EXISTS (SELECT 1 FROM public.story_collaborators c WHERE c.story_id = p_story_id AND c.user_id = p_user)
$$;

-- The common checks of every lock RPC; returns the chapter's story.
CREATE FUNCTION private.edit_lock_story(p_chapter_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_story uuid;
BEGIN
    IF (SELECT auth.uid()) IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT story_id INTO v_story FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL;
    IF v_story IS NULL OR public.story_role(v_story) IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    RETURN v_story;
END $$;

REVOKE ALL ON FUNCTION private.is_story_member(uuid, uuid), private.edit_lock_story(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.claim_edit_lock(p_chapter_id uuid)
RETURNS public.chapter_edit_locks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_story uuid := private.edit_lock_story(p_chapter_id);
    v_lock public.chapter_edit_locks%ROWTYPE;
BEGIN
    INSERT INTO public.chapter_edit_locks AS l (chapter_id, holder_id, acquired_at, expires_at)
    VALUES (p_chapter_id, v_uid, now(), now() + interval '90 seconds')
    ON CONFLICT (chapter_id) DO UPDATE
       SET holder_id = EXCLUDED.holder_id,
           acquired_at = CASE WHEN l.holder_id = EXCLUDED.holder_id THEN l.acquired_at ELSE now() END,
           expires_at = EXCLUDED.expires_at,
           requested_by = CASE WHEN l.holder_id = EXCLUDED.holder_id THEN l.requested_by END,
           requested_at = CASE WHEN l.holder_id = EXCLUDED.holder_id THEN l.requested_at END
     WHERE l.holder_id = EXCLUDED.holder_id
        OR l.expires_at <= now()
        OR NOT private.is_story_member(v_story, l.holder_id);
    SELECT * INTO v_lock FROM public.chapter_edit_locks WHERE chapter_id = p_chapter_id;
    RETURN v_lock;
END $$;

CREATE FUNCTION public.request_edit_lock(p_chapter_id uuid)
RETURNS public.chapter_edit_locks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_lock public.chapter_edit_locks%ROWTYPE;
BEGIN
    v_lock := public.claim_edit_lock(p_chapter_id);   -- free, expired or already yours: it is yours now
    IF v_lock.holder_id = v_uid THEN
        RETURN v_lock;
    END IF;
    UPDATE public.chapter_edit_locks SET requested_by = v_uid, requested_at = now()
     WHERE chapter_id = p_chapter_id
    RETURNING * INTO v_lock;
    RETURN v_lock;
END $$;

CREATE FUNCTION public.hand_over_edit_lock(p_chapter_id uuid)
RETURNS public.chapter_edit_locks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_story uuid := private.edit_lock_story(p_chapter_id);
    v_lock public.chapter_edit_locks%ROWTYPE;
BEGIN
    SELECT * INTO v_lock FROM public.chapter_edit_locks WHERE chapter_id = p_chapter_id FOR UPDATE;
    IF NOT FOUND OR v_lock.holder_id <> v_uid OR v_lock.expires_at <= now() THEN
        RAISE EXCEPTION 'you do not hold the edit lock' USING ERRCODE = 'PT409';
    END IF;
    IF v_lock.requested_by IS NULL OR NOT private.is_story_member(v_story, v_lock.requested_by)
       OR NOT EXISTS (SELECT 1 FROM public.app_users u
                       WHERE u.id = v_lock.requested_by AND u.account_status = 'active' AND u.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'nobody on the team asked for the edit lock' USING ERRCODE = 'PT409';
    END IF;
    UPDATE public.chapter_edit_locks
       SET holder_id = v_lock.requested_by, acquired_at = now(), expires_at = now() + interval '90 seconds',
           requested_by = NULL, requested_at = NULL
     WHERE chapter_id = p_chapter_id
    RETURNING * INTO v_lock;
    RETURN v_lock;
END $$;

CREATE FUNCTION public.decline_edit_request(p_chapter_id uuid)
RETURNS public.chapter_edit_locks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_story uuid := private.edit_lock_story(p_chapter_id);
    v_lock public.chapter_edit_locks%ROWTYPE;
BEGIN
    UPDATE public.chapter_edit_locks SET requested_by = NULL, requested_at = NULL
     WHERE chapter_id = p_chapter_id AND holder_id = v_uid;
    SELECT * INTO v_lock FROM public.chapter_edit_locks WHERE chapter_id = p_chapter_id;
    RETURN v_lock;
END $$;

CREATE FUNCTION public.release_edit_lock(p_chapter_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_story uuid := private.edit_lock_story(p_chapter_id);
BEGIN
    DELETE FROM public.chapter_edit_locks WHERE chapter_id = p_chapter_id AND holder_id = (SELECT auth.uid());
END $$;

REVOKE ALL ON FUNCTION public.claim_edit_lock(uuid), public.request_edit_lock(uuid), public.hand_over_edit_lock(uuid),
    public.decline_edit_request(uuid), public.release_edit_lock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_edit_lock(uuid), public.request_edit_lock(uuid), public.hand_over_edit_lock(uuid),
    public.decline_edit_request(uuid), public.release_edit_lock(uuid) TO authenticated, service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                        WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
                          AND tablename = 'chapter_edit_locks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chapter_edit_locks;
    END IF;
END $$;

COMMIT;
