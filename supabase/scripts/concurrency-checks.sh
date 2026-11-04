# shellcheck shell=bash
# Sourced by verify-migrations.sh after start_local_db. Needs two real sessions, so it cannot live in a single-session SQL
# test: it commits fixtures to the throwaway database and runs two psql clients at the same time.
#
#   1. two authors append chapters at once (create_chapter): positions must end up 1..N with no gap, no duplicate, no error;
#   2. two authors reorder at once with opposite orders (reorder_chapters): every call must succeed and the final order
#      must be one of the two requested orders (a clean last-writer-wins), never a mix;
#   3. two sessions of the same author create new tags at once on two different stories (set_story_tags): the daily
#      quota of 10 must hold, so six new tags from each of two sessions can never both succeed.
check_chapter_concurrency() {
  local author='00000000-0000-0000-0000-0000000000f1' editor='00000000-0000-0000-0000-0000000000f2'
  local story='1f000000-0000-0000-0000-000000000001' rounds=25

  lpsql "-c \"INSERT INTO auth.users (id, email) VALUES ('$author', 'conc.author@example.com'), ('$editor', 'conc.editor@example.com')\""
  lpsql "-c \"INSERT INTO public.stories (id, owner_id, slug, title, visibility, status) VALUES ('$story', '$author', 'conc', 'Conc', 'public', 'draft')\""
  lpsql "-c \"INSERT INTO public.story_collaborators (story_id, user_id, collaborator_role) VALUES ('$story', '$editor', 'editor')\""

  worker_sql() { # $1 user, $2 prefix, $3 statement template run $rounds times
    cat <<SQL
SELECT set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', false);
SET ROLE authenticated;
SELECT format($3) FROM generate_series(1, $rounds) AS g(n) \gexec
SQL
  }

  echo "concurrency: two authors append chapters at the same time"
  worker_sql "$author" a "'SELECT public.create_chapter(%L, %L, %L)', '$story', 'A ' || g.n, 'a-' || g.n" > "$WORK/conc-a.sql"
  worker_sql "$editor" b "'SELECT public.create_chapter(%L, %L, %L)', '$story', 'B ' || g.n, 'b-' || g.n" > "$WORK/conc-b.sql"
  [ "$(id -u)" = 0 ] && chmod a+r "$WORK"/conc-*.sql
  lpsql "-f '$WORK/conc-a.sql' -o /dev/null" & local pid_a=$!
  lpsql "-f '$WORK/conc-b.sql' -o /dev/null" & local pid_b=$!
  wait "$pid_a" || { echo "FAIL: concurrent create_chapter failed (author)" >&2; exit 1; }
  wait "$pid_b" || { echo "FAIL: concurrent create_chapter failed (editor)" >&2; exit 1; }
  local result
  result="$(run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -Atc \"SELECT count(*) || ' ' || count(DISTINCT sort_order) || ' ' || min(sort_order) || ' ' || max(sort_order) FROM public.chapters WHERE story_id = '$story'\"")"
  [ "$result" = "$((rounds * 2)) $((rounds * 2)) 1 $((rounds * 2))" ] \
    || { echo "FAIL: appended positions are not 1..N without gaps (got: $result)" >&2; exit 1; }

  echo "concurrency: two authors reorder at the same time, in opposite orders"
  local asc desc
  asc="(SELECT array_agg(id ORDER BY slug) FROM public.chapters WHERE story_id = '$story')"
  desc="(SELECT array_agg(id ORDER BY slug DESC) FROM public.chapters WHERE story_id = '$story')"
  worker_sql "$author" a "'SELECT public.reorder_chapters(%L, %L::uuid[])', '$story', $asc" > "$WORK/conc-a.sql"
  worker_sql "$editor" b "'SELECT public.reorder_chapters(%L, %L::uuid[])', '$story', $desc" > "$WORK/conc-b.sql"
  [ "$(id -u)" = 0 ] && chmod a+r "$WORK"/conc-*.sql
  lpsql "-f '$WORK/conc-a.sql' -o /dev/null" & pid_a=$!
  lpsql "-f '$WORK/conc-b.sql' -o /dev/null" & pid_b=$!
  wait "$pid_a" || { echo "FAIL: concurrent reorder_chapters failed (author)" >&2; exit 1; }
  wait "$pid_b" || { echo "FAIL: concurrent reorder_chapters failed (editor)" >&2; exit 1; }
  result="$(run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -Atc \"SELECT count(*) || ' ' || count(DISTINCT sort_order) || ' ' || min(sort_order) || ' ' || max(sort_order) FROM public.chapters WHERE story_id = '$story'\"")"
  [ "$result" = "$((rounds * 2)) $((rounds * 2)) 1 $((rounds * 2))" ] \
    || { echo "FAIL: positions are not 1..N after concurrent reorders (got: $result)" >&2; exit 1; }
  local ordered
  ordered="$(run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -Atc \"SELECT (SELECT array_agg(id ORDER BY sort_order) FROM public.chapters WHERE story_id = '$story') = $asc OR (SELECT array_agg(id ORDER BY sort_order) FROM public.chapters WHERE story_id = '$story') = $desc\"")"
  [ "$ordered" = "t" ] || { echo "FAIL: the final order is a mix of the two concurrent requests" >&2; exit 1; }
}

check_tag_quota_concurrency() {
  local rounds=10 prefix='00000000-0000-0000-0000-0000000002'
  echo "concurrency: two sessions of one author create new tags at the same time"
  cat > "$WORK/conc-tags-fixture.sql" <<SQL
INSERT INTO auth.users (id, email)
SELECT ('$prefix' || lpad(g::text, 2, '0'))::uuid, 'conc.tag' || g || '@example.com' FROM generate_series(1, $rounds) g;
INSERT INTO public.stories (id, owner_id, slug, title, visibility, status)
SELECT (s.prefix || lpad(g::text, 2, '0'))::uuid, ('$prefix' || lpad(g::text, 2, '0'))::uuid,
       'conc-tag-' || s.label || g, 'Conc tag ' || s.label || g, 'public', 'draft'
  FROM generate_series(1, $rounds) g, (VALUES ('a', '2f000000-0000-0000-0000-0000000000'), ('b', '3f000000-0000-0000-0000-0000000000')) s(label, prefix);
SQL
  [ "$(id -u)" = 0 ] && chmod a+r "$WORK/conc-tags-fixture.sql"
  lpsql "-f '$WORK/conc-tags-fixture.sql' -o /dev/null"

  tag_worker_sql() { # $1 label, $2 story id prefix: both workers go through the same authors in the same order, each on its own story
    cat <<SQL
SET ROLE authenticated;
DO \$do\$
BEGIN
  FOR r IN 1..$rounds LOOP
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', '$prefix' || lpad(r::text, 2, '0'), 'role', 'authenticated')::text, true);
    BEGIN
      PERFORM public.set_story_tags(('$2' || lpad(r::text, 2, '0'))::uuid,
        ARRAY['$1 r' || r || ' t1', '$1 r' || r || ' t2', '$1 r' || r || ' t3', '$1 r' || r || ' t4', '$1 r' || r || ' t5', '$1 r' || r || ' t6']);
    EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;
    END;
  END LOOP;
END \$do\$;
SQL
  }
  tag_worker_sql wa 2f000000-0000-0000-0000-0000000000 > "$WORK/conc-a.sql"
  tag_worker_sql wb 3f000000-0000-0000-0000-0000000000 > "$WORK/conc-b.sql"
  [ "$(id -u)" = 0 ] && chmod a+r "$WORK"/conc-*.sql
  lpsql "-f '$WORK/conc-a.sql' -o /dev/null" & local pid_a=$!
  lpsql "-f '$WORK/conc-b.sql' -o /dev/null" & local pid_b=$!
  wait "$pid_a" || { echo "FAIL: concurrent set_story_tags failed (session a)" >&2; exit 1; }
  wait "$pid_b" || { echo "FAIL: concurrent set_story_tags failed (session b)" >&2; exit 1; }
  local result
  result="$(run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -Atc \"SELECT max(n) || ' ' || min(n) FROM (SELECT count(*) AS n FROM public.tags WHERE created_by::text LIKE '$prefix%' GROUP BY created_by) x\"")"
  [ "$result" = "6 6" ] \
    || { echo "FAIL: the daily tag quota was exceeded or not used under concurrency (per author max/min: $result)" >&2; exit 1; }
}

# The ranking refresh must not wait for readers (and so never block them): a plain REFRESH takes an exclusive lock and
# would sit behind a reader's open transaction until the statement timeout; REFRESH ... CONCURRENTLY does not.
check_ranking_refresh_nonblocking() {
  echo "concurrency: the ranking refresh does not wait for a reader that holds the view open"
  cat > "$WORK/conc-reader.sql" <<'SQL'
BEGIN;
SELECT count(*) FROM public.story_rankings;
SELECT pg_sleep(4);
COMMIT;
SQL
  cat > "$WORK/conc-refresh.sql" <<'SQL'
SET statement_timeout = '3s';
SELECT public.refresh_rankings();
SQL
  [ "$(id -u)" = 0 ] && chmod a+r "$WORK"/conc-reader.sql "$WORK"/conc-refresh.sql
  lpsql "-f '$WORK/conc-reader.sql' -o /dev/null" & local pid_reader=$!
  sleep 1
  lpsql "-f '$WORK/conc-refresh.sql' -o /dev/null" \
    || { echo "FAIL: refresh_rankings waited on a reader (is it still REFRESH ... CONCURRENTLY?)" >&2; wait "$pid_reader" || true; exit 1; }
  wait "$pid_reader" || { echo "FAIL: the reader failed" >&2; exit 1; }
}
