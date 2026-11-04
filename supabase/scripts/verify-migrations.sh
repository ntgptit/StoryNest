#!/usr/bin/env bash
# Applies every migration to a throwaway local PostgreSQL cluster, then runs supabase/tests/*.sql.
set -euo pipefail
# shellcheck source=local-db.sh
source "$(dirname "$0")/local-db.sh"
# shellcheck source=concurrency-checks.sh
source "$(dirname "$0")/concurrency-checks.sh"

start_local_db
for t in "$WORK"/tests/*.sql; do
  echo "running $(basename "$t")"
  lpsql "-v seed_file=$WORK/seed/dev_seed.sql -f '$t'"
done
# The seed must refuse to run on a database that is not marked as dev, and must leave nothing behind when it refuses.
echo "checking the seed environment guard"
if run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -v ON_ERROR_STOP=1 -q -c \"SET storynest.environment = 'production'\" -f '$WORK/seed/dev_seed.sql'" >/dev/null 2>&1; then
  echo "FAIL: the seed ran on a database not marked as development" >&2
  exit 1
fi
[ "$(run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -Atc \"select count(*) from public.stories\"")" = "0" ] \
  || { echo "FAIL: the refused seed left data behind" >&2; exit 1; }
# Real concurrency (two sessions at once) needs committed data, so it runs last: it commits fixtures that the checks above must not see.
check_chapter_concurrency
check_tag_quota_concurrency
echo "concurrency checks passed"
echo "tables: $(run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -Atc \"select count(*) from information_schema.tables where table_schema='public'\"")"
echo "OK"
