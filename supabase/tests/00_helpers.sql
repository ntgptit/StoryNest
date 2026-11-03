-- Shared assertion helpers (committed; the schema `tests` exists only in the throwaway verify database).
CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO PUBLIC;  -- helpers are called after switching role

-- Switch the session to a Supabase-like caller. Always call from the superuser state (RESET ROLE first).
CREATE FUNCTION tests.act_as(p_uid uuid, p_role text DEFAULT 'authenticated', p_app_role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('request.jwt.claims',
        CASE WHEN p_uid IS NULL THEN '{}'
             ELSE jsonb_build_object('sub', p_uid, 'role', p_role,
                  'app_metadata', jsonb_build_object('role', p_app_role))::text END, true);
    EXECUTE format('SET LOCAL ROLE %I', p_role);
END $$;

-- Statement must fail with insufficient_privilege (grant or RLS WITH CHECK violation).
CREATE FUNCTION tests.denied(p_label text, p_sql text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN insufficient_privilege THEN
        RETURN;
    END;
    RAISE EXCEPTION 'FAIL (expected denial): %', p_label;
END $$;

-- Statement must succeed and touch exactly p_expected rows.
CREATE FUNCTION tests.rows(p_label text, p_sql text, p_expected bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> p_expected THEN RAISE EXCEPTION 'FAIL %: expected % rows, got %', p_label, p_expected, n; END IF;
END $$;

CREATE FUNCTION tests.count_is(p_label text, p_sql text, p_expected bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
    EXECUTE 'SELECT count(*) FROM (' || p_sql || ') q' INTO n;
    IF n <> p_expected THEN RAISE EXCEPTION 'FAIL %: expected % rows, got %', p_label, p_expected, n; END IF;
END $$;

-- Statement must fail with exactly the given SQLSTATE.
CREATE FUNCTION tests.fails_with(p_label text, p_sql text, p_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = p_state THEN RETURN; END IF;
        RAISE EXCEPTION 'FAIL %: expected SQLSTATE %, got % (%)', p_label, p_state, SQLSTATE, SQLERRM;
    END;
    RAISE EXCEPTION 'FAIL (expected SQLSTATE %): %', p_state, p_label;
END $$;

-- Plain boolean assertion.
CREATE FUNCTION tests.ok(p_label text, p_cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF p_cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF;
END $$;
