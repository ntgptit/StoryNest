# shellcheck shell=bash
# Sourced helper: starts a throwaway local PostgreSQL cluster (unix socket only), loads the Supabase shim and
# applies every migration. Cleans up on exit. Requires PostgreSQL server binaries and the pgcrypto, citext and
# pg_trgm extensions.
#
# After `start_local_db`:  $WORK (socket dir), $PORT, $LOCAL_DB_NAME, $LOCAL_DB_USER and `lpsql [psql args]` are available.
#   KEEP=1 keeps the work directory after exit (debugging).
set -euo pipefail

PG_BIN="${PG_BIN:-$(dirname "$(find /usr/lib/postgresql -name pg_ctl 2>/dev/null | sort -V | tail -1)")}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${PGPORT_VERIFY:-54399}"
LOCAL_DB_NAME="verify"
WORK=""

# Postgres refuses to run as root; fall back to the postgres OS user when needed.
RUN=()
[ "$(id -u)" = 0 ] && RUN=(su postgres -c)
# initdb makes the OS user running the server the superuser: "postgres" when we su to it, otherwise ourselves (CI).
if [ ${#RUN[@]} -gt 0 ]; then LOCAL_DB_USER=postgres; else LOCAL_DB_USER="$(id -un)"; fi
run() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$*"; else bash -c "$*"; fi; }
lpsql() { run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -v ON_ERROR_STOP=1 -q $*"; }

stop_local_db() {
  [ -n "$WORK" ] || return 0
  "$PG_BIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true
  [ -n "${KEEP:-}" ] || rm -rf "$WORK"
}

start_local_db() {
  WORK="$(mktemp -d)"
  trap stop_local_db EXIT
  [ ${#RUN[@]} -gt 0 ] && chown -R postgres "$WORK"

  run "$PG_BIN/initdb -D $WORK/data -A trust >/dev/null"
  run "$PG_BIN/pg_ctl -D $WORK/data -o '-p $PORT -k $WORK -c listen_addresses='"''"'' -l $WORK/log -w start >/dev/null" \
    || { cat "$WORK/log" >&2; exit 1; }
  run "$PG_BIN/createdb -h $WORK -p $PORT $LOCAL_DB_NAME"

  # Everything the postgres OS user must read lives inside $WORK.
  mkdir "$WORK/migrations" "$WORK/tests" "$WORK/sql" "$WORK/seed"
  cp "$ROOT"/supabase/migrations/*.sql "$WORK/migrations/"
  cp "$ROOT"/supabase/tests/*.sql "$WORK/tests/"
  cp "$ROOT"/supabase/scripts/sql/*.sql "$WORK/sql/" 2>/dev/null || true
  cp "$ROOT"/supabase/seed/*.sql "$WORK/seed/" 2>/dev/null || true
  cp "$ROOT/supabase/scripts/supabase-shim.sql" "$WORK/"
  chmod -R a+rX "$WORK/migrations" "$WORK/tests" "$WORK/sql" "$WORK/seed" "$WORK/supabase-shim.sql"

  echo "applying supabase-shim.sql" >&2
  lpsql "-f '$WORK/supabase-shim.sql'"
  local f
  for f in "$WORK"/migrations/*.sql; do
    echo "applying $(basename "$f")" >&2
    lpsql "-f '$f'"
  done
}
