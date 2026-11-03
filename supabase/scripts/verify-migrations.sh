#!/usr/bin/env bash
# Applies every migration to a throwaway local PostgreSQL cluster, then runs supabase/tests/*.sql.
set -euo pipefail
# shellcheck source=local-db.sh
source "$(dirname "$0")/local-db.sh"

start_local_db
for t in "$WORK"/tests/*.sql; do
  echo "running $(basename "$t")"
  lpsql "-f '$t'"
done
echo "tables: $(run "$PG_BIN/psql -h $WORK -p $PORT -d $LOCAL_DB_NAME -Atc \"select count(*) from information_schema.tables where table_schema='public'\"")"
echo "OK"
