-- Collaboration by invitation (WBS WP 3.8, decision D9).
--
-- Before: the owner could insert a collaborator row directly, without the other person's consent. Now a collaborator
-- exists only after the invitee ACCEPTS an invitation:
--
--   invite_collaborator(story_id, username, role)   owner only                 -> invitation id
--   respond_invitation(invitation_id, accept)       the invitee only           (accept creates the collaborator)
--   cancel_invitation(invitation_id)                the owner, while pending
--   list_my_invitations()                           the invitee: pending invitations with story title and inviter
--   list_story_invitations(story_id)                the owner: invitations of the story with the invitee's name
--
-- Removing a collaborator, leaving a story and changing a role keep their existing policies on story_collaborators
-- (owner removes anyone, a collaborator may leave, only the owner changes a role); only INSERT is closed.
--
-- Anti-abuse: the invitee consents; at most 20 pending invitations per story; no invitation to yourself, to someone who
-- already works on the story, or while one is pending for that person; a declined or cancelled invitation can be
-- sent again later (it is a new invitation). The invitee and the inviter are notified.
--
-- Error contract (SQLSTATE): 42501 not authenticated / not allowed, PT404 story, user or invitation not found (also for
-- a story or invitation the caller has nothing to do with), PT409 wrong state (already a collaborator, already pending,
-- invitation no longer pending, too many pending), 22023 invalid argument (yourself, unknown role).
--
-- Rollback: restore INSERT on story_collaborators (see the RLS migration), DROP the five functions and story_invitations.
BEGIN;

-- 1. Close the direct door ------------------------------------------------------------------------------
DROP POLICY story_collaborators_insert ON story_collaborators;
REVOKE INSERT ON story_collaborators FROM authenticated;

-- 2. Invitations -------------------------------------------------------------------------------------------
CREATE TABLE story_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    inviter_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    invitee_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    collaborator_role varchar(16) NOT NULL CHECK (collaborator_role IN ('co_author', 'editor')),
    status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz,
    CHECK (inviter_id <> invitee_id)
);
CREATE UNIQUE INDEX uq_story_invitations_pending ON story_invitations (story_id, invitee_id) WHERE status = 'pending';
CREATE INDEX idx_story_invitations_invitee ON story_invitations (invitee_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_story_invitations_story ON story_invitations (story_id, created_at DESC);

-- No client writes at all: every change goes through the functions below. Reads are possible for the two parties.
ALTER TABLE story_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON story_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON story_invitations TO authenticated;
CREATE POLICY story_invitations_parties_read ON story_invitations FOR SELECT
    USING (invitee_id = (SELECT auth.uid()) OR public.story_role(story_id) = 'owner');

-- 3. Functions -----------------------------------------------------------------------------------------------
CREATE FUNCTION public.invite_collaborator(p_story_id uuid, p_username text, p_role text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_story public.stories%ROWTYPE;
    v_invitee public.app_users%ROWTYPE;
    v_id uuid;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_role IS NULL OR p_role NOT IN ('co_author', 'editor') THEN
        RAISE EXCEPTION 'role must be co_author or editor' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_story FROM public.stories WHERE id = p_story_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR public.story_role(p_story_id) IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT * INTO v_invitee FROM public.app_users
     WHERE lower(username::text) = lower(btrim(coalesce(p_username, ''))) AND account_status = 'active' AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'user not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_invitee.id = v_uid THEN
        RAISE EXCEPTION 'you cannot invite yourself' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.story_collaborators WHERE story_id = p_story_id AND user_id = v_invitee.id) THEN
        RAISE EXCEPTION 'already a collaborator' USING ERRCODE = 'PT409';
    END IF;
    IF EXISTS (SELECT 1 FROM public.story_invitations
                WHERE story_id = p_story_id AND invitee_id = v_invitee.id AND status = 'pending') THEN
        RAISE EXCEPTION 'an invitation is already pending' USING ERRCODE = 'PT409';
    END IF;
    IF (SELECT count(*) FROM public.story_invitations WHERE story_id = p_story_id AND status = 'pending') >= 20 THEN
        RAISE EXCEPTION 'too many pending invitations' USING ERRCODE = 'PT409';
    END IF;

    INSERT INTO public.story_invitations (story_id, inviter_id, invitee_id, collaborator_role)
    VALUES (p_story_id, v_uid, v_invitee.id, p_role)
    RETURNING id INTO v_id;

    INSERT INTO public.notifications (recipient_id, actor_id, event_type, story_id, payload, dedupe_key)
    VALUES (v_invitee.id, v_uid, 'collaboration_invited', p_story_id,
            jsonb_build_object('invitation_id', v_id, 'story_title', v_story.title, 'role', p_role),
            'collab-invite:' || v_id);
    RETURN v_id;
END $$;

CREATE FUNCTION public.respond_invitation(p_invitation_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_inv public.story_invitations%ROWTYPE;
    v_story public.stories%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_accept IS NULL THEN
        RAISE EXCEPTION 'accept must be true or false' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_inv FROM public.story_invitations WHERE id = p_invitation_id AND invitee_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'invitation not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_inv.status <> 'pending' THEN
        RAISE EXCEPTION 'invitation is no longer pending (status is %)', v_inv.status USING ERRCODE = 'PT409';
    END IF;

    SELECT * INTO v_story FROM public.stories WHERE id = v_inv.story_id;
    IF v_story.deleted_at IS NOT NULL AND p_accept THEN
        RAISE EXCEPTION 'story is deleted' USING ERRCODE = 'PT409';
    END IF;

    IF p_accept THEN
        INSERT INTO public.story_collaborators (story_id, user_id, collaborator_role)
        VALUES (v_inv.story_id, v_uid, v_inv.collaborator_role)
        ON CONFLICT (story_id, user_id) DO UPDATE SET collaborator_role = EXCLUDED.collaborator_role;
    END IF;
    UPDATE public.story_invitations
       SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END, responded_at = now()
     WHERE id = p_invitation_id;

    INSERT INTO public.notifications (recipient_id, actor_id, event_type, story_id, payload, dedupe_key)
    VALUES (v_inv.inviter_id, v_uid,
            CASE WHEN p_accept THEN 'collaboration_accepted' ELSE 'collaboration_declined' END,
            v_inv.story_id,
            jsonb_build_object('invitation_id', v_inv.id, 'story_title', v_story.title, 'role', v_inv.collaborator_role),
            'collab-reply:' || v_inv.id);
END $$;

CREATE FUNCTION public.cancel_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_inv public.story_invitations%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_inv FROM public.story_invitations WHERE id = p_invitation_id FOR UPDATE;
    IF NOT FOUND OR public.story_role(v_inv.story_id) IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'invitation not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_inv.status <> 'pending' THEN
        RAISE EXCEPTION 'invitation is no longer pending (status is %)', v_inv.status USING ERRCODE = 'PT409';
    END IF;
    UPDATE public.story_invitations SET status = 'cancelled', responded_at = now() WHERE id = p_invitation_id;
END $$;

-- Pending invitations addressed to the caller. A private story is invisible to its invitee, so the title and the
-- inviter's name come from here rather than from the tables.
CREATE FUNCTION public.list_my_invitations()
RETURNS TABLE (id uuid, story_id uuid, story_title text, collaborator_role text, inviter_username text,
               inviter_display_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT i.id, i.story_id, s.title::text, i.collaborator_role::text, u.username::text, u.display_name::text, i.created_at
      FROM public.story_invitations i
      JOIN public.stories s ON s.id = i.story_id AND s.deleted_at IS NULL
      JOIN public.app_users u ON u.id = i.inviter_id
     WHERE i.invitee_id = (SELECT auth.uid()) AND i.status = 'pending'
     ORDER BY i.created_at DESC
$$;

-- The story's invitations (owner only): who was invited, as what, and how it ended.
CREATE FUNCTION public.list_story_invitations(p_story_id uuid)
RETURNS TABLE (id uuid, invitee_username text, invitee_display_name text, collaborator_role text, status text,
               created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT i.id, u.username::text, u.display_name::text, i.collaborator_role::text, i.status::text, i.created_at
      FROM public.story_invitations i
      JOIN public.app_users u ON u.id = i.invitee_id
     WHERE i.story_id = p_story_id AND public.story_role(p_story_id) = 'owner'
     ORDER BY i.created_at DESC
     LIMIT 100
$$;

REVOKE ALL ON FUNCTION public.invite_collaborator(uuid, text, text), public.respond_invitation(uuid, boolean),
    public.cancel_invitation(uuid), public.list_my_invitations(), public.list_story_invitations(uuid)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_collaborator(uuid, text, text), public.respond_invitation(uuid, boolean),
    public.cancel_invitation(uuid), public.list_my_invitations(), public.list_story_invitations(uuid)
    TO authenticated, service_role;

COMMIT;
