#!/usr/bin/env bash
# CI only (GitHub Actions "Database checks" and "AI smoke test"), never the real project.
# Applies the Supabase stand-in, every migration in name order and, unless
# --migrations-only is given, runs every test script in supabase/tests.
# Connection settings come from the standard PG* environment variables.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
psql_run() { psql -X -v ON_ERROR_STOP=1 -q "$@"; }

psql_run -f "$root/tests/ci/bootstrap_supabase.sql"
for file in "$root"/migrations/*.sql; do
  psql_run -f "$file"
  echo "migration ok: $(basename "$file")"
done

if [ "${1:-}" = "--migrations-only" ]; then
  exit 0
fi

for file in "$root"/tests/*.sql; do
  result="$(psql_run -At -f "$file" | tail -n 1)"
  echo "test ok: $(basename "$file") ${result}"
done
