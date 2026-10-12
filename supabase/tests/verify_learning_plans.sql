/*
  Phase 7a: read-only inspection queries for the Supabase SQL Editor.
  Run them one at a time (select one block, then Run) after applying
  20261101000000_learning_plans.sql. Nothing here changes data.
  The full behaviour check (own data, foreign data, limits) is rls_learning_plans.sql.
*/

/* 1. Tables. Expected: 5 rows, rls_enabled = true for every one. */
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('learning_plan_limits', 'learning_plans', 'learning_modules',
                    'learning_tasks', 'learning_plan_generations')
order by c.relname;

/* 2. Limits. Expected: free 1 / 3, pro 20 / 30. */
select plan, max_active_plans, monthly_generations
from public.learning_plan_limits
order by plan;

/* 3. Indexes. Expected among them: learning_plans_user_status_created_idx,
   learning_tasks_plan_day_idx, learning_tasks_module_idx, learning_tasks_user_idx,
   learning_plan_generations_user_period_idx, learning_plan_generations_plan_idx. */
select tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('learning_plans', 'learning_modules', 'learning_tasks',
                    'learning_plan_generations')
order by tablename, indexname;

/* 4. Policies. Expected 8: read own on plans, modules, tasks and generations; read on
   limits; "archive own" (update) and "delete own" on plans; "complete own in active
   plans" (update) on tasks. Every one is for the authenticated role only. */
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename like 'learning%'
order by tablename, policyname;

/* 5. Table privileges. Expected: anon has nothing; authenticated has SELECT on all five,
   DELETE on learning_plans only, and no INSERT anywhere. */
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like 'learning%'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

/* 6. Column privileges for updates. Expected exactly two rows:
   learning_plans.status and learning_tasks.completed_at, for authenticated. */
select table_name, column_name, grantee
from information_schema.column_privileges
where table_schema = 'public'
  and table_name like 'learning%'
  and privilege_type = 'UPDATE'
  and grantee in ('anon', 'authenticated')
order by table_name, column_name;

/* 7. Functions. Expected: security_definer = true only for begin/complete/fail
   _learning_plan_generation; config shows search_path="" for all seven;
   anon_can_execute = false and authenticated_can_execute = true for all seven. */
select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as config,
  has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('get_my_learning_plan_limits', 'begin_learning_plan_generation',
                    'complete_learning_plan_generation', 'fail_learning_plan_generation',
                    'set_learning_task_completed', 'archive_learning_plan', 'delete_learning_plan')
order by p.proname;

/* 8. Your own data (as yourself in the app, not here): the SQL Editor runs as the
   database owner and bypasses RLS, so use rls_learning_plans.sql for the access checks.
   Overview of what exists, without any text content: */
select status, count(*) as plans, sum(duration_days) as total_days
from public.learning_plans
group by status;

select status, count(*) as generations, sum(input_tokens) as input_tokens,
       sum(output_tokens) as output_tokens
from public.learning_plan_generations
group by status;
