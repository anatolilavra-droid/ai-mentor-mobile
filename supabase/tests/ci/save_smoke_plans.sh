#!/usr/bin/env bash
# CI only ("AI smoke test"): saves the plans the smoke test wrote (fixed sample
# content, no user data) through begin/complete_learning_plan_generation as a test
# user, exactly as the API does, and prints one Markdown table row per plan.
# Usage: save_smoke_plans.sh <directory with plan-*.json>
set -euo pipefail

dir="$1"
user='00000000-0000-4000-8000-00000000c0de'
psql_run() { psql -X -v ON_ERROR_STOP=1 -q "$@"; }

# A Pro test user, so the three plans fit the active-plan limit.
psql_run <<SQL
insert into auth.users (id, email) values ('$user', 'smoke@example.test') on conflict do nothing;
insert into public.subscriptions (user_id, plan) values ('$user', 'pro') on conflict do nothing;
SQL

echo '| Days | Saved | Plan id | Modules | Tasks | Generation |'
echo '| --- | --- | --- | --- | --- | --- |'
status=0
for file in $(ls "$dir"/plan-*.json 2>/dev/null | sort -V); do
  [ -e "$file" ] || continue
  days="$(jq -r .durationDays "$file")"
  if row="$(psql_run -At -F ' | ' \
      -v user="$user" -v days="$days" \
      -v draft="$(jq -c .draft "$file")" -v meta="$(jq -c .meta "$file")" <<'SQL' 2>&1
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'user', 'role', 'authenticated')::text, true) \gset claims_
select generation_id from public.begin_learning_plan_generation(
  'javascript', 'learn_javascript', :days, 30) \gset
select public.complete_learning_plan_generation(
  :'generation_id', 'beginner', 'I want to build a small quiz game in the browser.',
  :'draft'::jsonb, :'meta'::jsonb) as plan_id \gset
select :'plan_id',
       (select count(*) from public.learning_modules where plan_id = :'plan_id'),
       (select count(*) from public.learning_tasks where plan_id = :'plan_id'),
       (select status from public.learning_plan_generations where id = :'generation_id');
commit;
SQL
  )"; then
    echo "| $days | ✅ | $(echo "$row" | tail -n 1) |"
  else
    status=1
    echo "| $days | ❌ | $(echo "$row" | tr '\n' ' ' | cut -c1-200) | | | |"
  fi
done
exit "$status"
