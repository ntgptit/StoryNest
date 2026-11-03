#!/usr/bin/env bash
# Applies every migration to a throwaway local PostgreSQL cluster to catch SQL errors.
# Requires PostgreSQL server binaries (initdb/pg_ctl) and the pgcrypto, citext, pg_trgm extensions.
set -euo pipefail

PG_BIN="${PG_BIN:-$(dirname "$(find /usr/lib/postgresql -name pg_ctl 2>/dev/null | sort -V | tail -1)")}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"
PORT="${PGPORT_VERIFY:-54399}"
trap '"$PG_BIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true; [ -n "${KEEP:-}" ] || rm -rf "$WORK"' EXIT

# Postgres refuses to run as root; fall back to the postgres OS user when needed.
RUN=()
if [ "$(id -u)" = 0 ]; then chown -R postgres "$WORK"; RUN=(su postgres -c); fi
run() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$*"; else bash -c "$*"; fi; }

run "$PG_BIN/initdb -D $WORK/data -A trust >/dev/null"
run "$PG_BIN/pg_ctl -D $WORK/data -o '-p $PORT -k $WORK -c listen_addresses='"''"'' -l $WORK/log -w start >/dev/null" || { cat "$WORK/log" >&2; exit 1; }
run "$PG_BIN/createdb -h $WORK -p $PORT verify"
# Copy migrations into the work dir so the postgres OS user can read them.
mkdir "$WORK/migrations" && cp "$ROOT"/supabase/migrations/*.sql "$WORK/migrations/" && chmod -R a+rX "$WORK/migrations"
# Shim for Supabase-managed pieces (auth schema, API roles); the tests directory holds SQL assertions.
cp "$ROOT/supabase/scripts/supabase-shim.sql" "$ROOT/supabase/tests/"*.sql "$WORK/migrations/" && chmod -R a+rX "$WORK/migrations"
mkdir "$WORK/tests" && mv "$WORK/migrations/rls.test.sql" "$WORK/tests/" && mv "$WORK/migrations/supabase-shim.sql" "$WORK/"
chmod -R a+rX "$WORK/tests" "$WORK/supabase-shim.sql"
echo "applying supabase-shim.sql"
run "$PG_BIN/psql -h $WORK -p $PORT -d verify -v ON_ERROR_STOP=1 -q -f '$WORK/supabase-shim.sql'"
for f in "$WORK"/migrations/*.sql; do
  echo "applying $(basename "$f")"
  run "$PG_BIN/psql -h $WORK -p $PORT -d verify -v ON_ERROR_STOP=1 -q -f '$f'"
done
for t in "$WORK"/tests/*.sql; do
  echo "running $(basename "$t")"
  run "$PG_BIN/psql -h $WORK -p $PORT -d verify -v ON_ERROR_STOP=1 -q -f '$t'"
done
echo "tables: $(run "$PG_BIN/psql -h $WORK -p $PORT -d verify -Atc \"select count(*) from information_schema.tables where table_schema='public'\"")"
echo "OK"
