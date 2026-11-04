# shellcheck shell=bash
# Sourced by verify-migrations.sh after start_local_db. Needs two real sessions, so it cannot live in a single-session SQL
# test: it commits fixtures to the throwaway database and runs two psql clients at the same time.
#
#   1. two authors append chapters at once (create_chapter): positions must end up 1..N with no gap, no duplicate, no error;
#   2. two authors reorder at once with opposite orders (reorder_chapters): every call must succeed and the final order
#      must be one of the two requested orders (a clean last-writer-wins), never a mix.
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
  echo "concurrency checks passed"
}
