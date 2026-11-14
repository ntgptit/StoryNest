-- F-AUTH-01 (FP-009): sign-up silently changed the requested username. The trigger lower-cased it and cut it to 20
-- characters while the form accepts 3-30 letters, digits and underscores in any case. The username the person typed is
-- now kept as typed (the column is case-insensitive, so "MyName" and "myname" are still the same name). Only when the
-- name is taken, or the sign-up gave none, does the trigger pick one: the taken name gets a short random suffix, and
-- the whole name stays within 30 characters. The form shows the final name (see the availability hint on sign-up).
--
-- Rollback: restore handle_new_user() from 20261103000100_auth_and_rls.sql.
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_base text;
    v_candidate text;
    v_display text;
BEGIN
    v_base := NULLIF(NEW.raw_user_meta_data ->> 'username', '');
    IF v_base IS NULL OR v_base !~ '^[A-Za-z0-9_]{3,30}$' THEN
        -- Not a name the sign-up form accepts (another provider, an old client, no name): derive one, lower-cased.
        v_base := lower(coalesce(v_base, NULLIF(split_part(coalesce(NEW.email, ''), '@', 1), ''), 'user'));
        v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
        IF length(v_base) < 3 THEN
            v_base := 'user' || v_base;
        END IF;
        v_base := left(v_base, 30);
    END IF;

    v_candidate := v_base;
    -- The unique constraint ignores case, so the check does too.
    WHILE EXISTS (SELECT 1 FROM public.app_users u WHERE lower(u.username::text) = lower(v_candidate)) LOOP
        v_candidate := left(v_base, 21) || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    END LOOP;

    v_display := left(coalesce(
        NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
        v_candidate), 100);

    INSERT INTO public.app_users (id, username, display_name)
    VALUES (NEW.id, v_candidate, v_display);
    RETURN NEW;
END;
$$;

COMMIT;
