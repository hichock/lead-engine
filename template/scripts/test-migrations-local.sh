#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres database and runs the RLS + ledger checks.
# Needs a local Postgres (psql + a server you can create databases on). No Supabase credentials are used.
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres bash scripts/test-migrations-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="le_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/00_stub_supabase.sql
for f in supabase/migrations/*.sql; do echo "apply $f"; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/10_rls_and_ledger.sql
