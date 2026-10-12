/*
  Phase 7a check: learning plans, limits, generation functions and RLS.
  Run the whole file in the Supabase SQL Editor after applying all migrations.
  It creates two temporary users inside a transaction and rolls everything back.
  Success: the editor shows "RLS learning plans: all checks passed" and no error.

  User A: Free. User B: Pro. Every "FAIL: ..." error names the broken rule.
*/

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-0000000000a7', 'plans-a@example.test'),
  ('00000000-0000-4000-8000-0000000000b7', 'plans-b@example.test');

insert into public.subscriptions (user_id, plan) values ('00000000-0000-4000-8000-0000000000b7', 'pro');

/* A small valid plan (7 days, 2 modules, 7 tasks), shaped like the API sends it. */
create temp table lp_sample (plan jsonb, meta jsonb) on commit drop;
insert into lp_sample values (
  '{
    "title": "JavaScript basics in a week",
    "summary": "Variables, functions and arrays, one small step a day.",
    "nextStep": "Start with day 1.",
    "reviewQuestions": ["What is a variable?", "When do you use const?"],
    "modules": [
      {"position": 1, "title": "Values", "description": "Variables and types.", "objectives": ["Use let and const"]},
      {"position": 2, "title": "Functions", "description": "Small functions.", "objectives": []}
    ],
    "tasks": [
      {"module": 1, "position": 1, "day": 1, "kind": "learn", "title": "Variables", "description": "Read about let and const.", "estimatedMinutes": 20},
      {"module": 1, "position": 2, "day": 2, "kind": "practice", "title": "Types", "description": "Try typeof on five values.", "estimatedMinutes": 25},
      {"module": 1, "position": 3, "day": 3, "kind": "review", "title": "Review values", "description": "Answer the review questions.", "estimatedMinutes": 15},
      {"module": 2, "position": 4, "day": 4, "kind": "learn", "title": "Functions", "description": "Write a function that adds.", "estimatedMinutes": 25},
      {"module": 2, "position": 5, "day": 5, "kind": "exercise", "title": "Arrays", "description": "Sum an array with a loop.", "estimatedMinutes": 30},
      {"module": 2, "position": 6, "day": 6, "kind": "mini_project", "title": "Tip calculator", "description": "Build a tiny tip calculator.", "estimatedMinutes": 30},
      {"module": 2, "position": 7, "day": 7, "kind": "review", "title": "Week review", "description": "Explain your code aloud.", "estimatedMinutes": 15}
    ]
  }'::jsonb,
  '{"provider": "mock", "model": "mock-mentor-1", "promptVersion": "learning-plan/v1",
    "inputTokens": 100, "outputTokens": 200, "latencyMs": 1234}'::jsonb
);
grant select on lp_sample to authenticated, anon;

create temp table lp_ids (name text primary key, id uuid) on commit drop;
grant select, insert, update on lp_ids to authenticated;

/* 0. Privileges as granted: anon nothing; authenticated read plus narrow writes only. */
do $$
declare
  v_fn  text;
  v_tbl text;
begin
  if not (select bool_and(c.relrowsecurity) from pg_class c
          where c.oid in ('public.learning_plan_limits'::regclass, 'public.learning_plans'::regclass,
                          'public.learning_modules'::regclass, 'public.learning_tasks'::regclass,
                          'public.learning_plan_generations'::regclass)) then
    raise exception 'FAIL: RLS is off on a learning plan table';
  end if;

  foreach v_fn in array array[
    'public.get_my_learning_plan_limits()',
    'public.begin_learning_plan_generation(text, text, integer, integer)',
    'public.complete_learning_plan_generation(uuid, text, text, jsonb, jsonb)',
    'public.fail_learning_plan_generation(uuid, text)',
    'public.set_learning_task_completed(uuid, boolean)',
    'public.archive_learning_plan(uuid)',
    'public.delete_learning_plan(uuid)'
  ] loop
    if has_function_privilege('anon', v_fn, 'execute') then
      raise exception 'FAIL: anon may execute %', v_fn;
    end if;
    if not has_function_privilege('authenticated', v_fn, 'execute') then
      raise exception 'FAIL: authenticated may not execute %', v_fn;
    end if;
  end loop;

  foreach v_tbl in array array['public.learning_plan_limits', 'public.learning_plans',
    'public.learning_modules', 'public.learning_tasks', 'public.learning_plan_generations'] loop
    if has_table_privilege('anon', v_tbl, 'select, insert, update, delete') then
      raise exception 'FAIL: anon has privileges on %', v_tbl;
    end if;
    if has_table_privilege('authenticated', v_tbl, 'insert') then
      raise exception 'FAIL: authenticated may insert into %', v_tbl;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.learning_tasks', 'update')
     or has_column_privilege('authenticated', 'public.learning_tasks', 'title', 'update')
     or not has_column_privilege('authenticated', 'public.learning_tasks', 'completed_at', 'update')
     or has_column_privilege('authenticated', 'public.learning_plans', 'title', 'update')
     or has_column_privilege('authenticated', 'public.learning_plans', 'archived_at', 'update')
     or not has_column_privilege('authenticated', 'public.learning_plans', 'status', 'update')
     or has_table_privilege('authenticated', 'public.learning_modules', 'update, delete')
     or has_table_privilege('authenticated', 'public.learning_tasks', 'delete')
     or has_table_privilege('authenticated', 'public.learning_plan_generations', 'update, delete') then
    raise exception 'FAIL: authenticated has a write privilege it must not have';
  end if;

  if (select prosecdef from pg_proc where oid = 'public.set_learning_task_completed(uuid, boolean)'::regprocedure)
     or (select prosecdef from pg_proc where oid = 'public.archive_learning_plan(uuid)'::regprocedure)
     or (select prosecdef from pg_proc where oid = 'public.delete_learning_plan(uuid)'::regprocedure)
     or (select prosecdef from pg_proc where oid = 'public.get_my_learning_plan_limits()'::regprocedure) then
    raise exception 'FAIL: a learner-facing function runs as security definer';
  end if;
  if exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('get_my_learning_plan_limits', 'begin_learning_plan_generation',
                      'complete_learning_plan_generation', 'fail_learning_plan_generation',
                      'set_learning_task_completed', 'archive_learning_plan', 'delete_learning_plan')
      and not (coalesce(proconfig, '{}') @> array['search_path=""'])
  ) then
    raise exception 'FAIL: a learning plan function has no empty search_path';
  end if;
end $$;

/* 1. Anonymous visitors and a missing session get nothing. */
set local role anon;

do $$
begin
  begin
    perform count(*) from public.learning_plans;
    raise exception 'FAIL: anon can read learning_plans';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_my_learning_plan_limits();
    raise exception 'FAIL: anon can call get_my_learning_plan_limits';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.begin_learning_plan_generation('javascript', 'learn_javascript', 7, 30);
    raise exception 'FAIL: anon can call begin_learning_plan_generation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.complete_learning_plan_generation(gen_random_uuid(), 'beginner', null, '{}', '{}');
    raise exception 'FAIL: anon can call complete_learning_plan_generation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_learning_task_completed(gen_random_uuid(), true);
    raise exception 'FAIL: anon can call set_learning_task_completed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_learning_plan(gen_random_uuid());
    raise exception 'FAIL: anon can call delete_learning_plan';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated"}';

do $$
begin
  begin
    perform public.begin_learning_plan_generation('javascript', 'learn_javascript', 7, 30);
    raise exception 'FAIL: begin_learning_plan_generation works without a session';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_my_learning_plan_limits();
    raise exception 'FAIL: get_my_learning_plan_limits works without a session';
  exception when insufficient_privilege then null;
  end;
end $$;

/* 2. User A (Free): limits, reservations, a saved plan. */
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a7", "role": "authenticated"}';

do $$
declare
  v_limits record;
  v_gen    uuid;
  v_plan   uuid;
  v_count  integer;
  v_sample record;
begin
  select * into v_sample from lp_sample;

  select * into v_limits from public.get_my_learning_plan_limits();
  if v_limits.plan <> 'free' or v_limits.active_used <> 0 or v_limits.active_limit <> 1
     or v_limits.generations_used <> 0 or v_limits.generations_limit <> 3 then
    raise exception 'FAIL: new Free limits are %', row_to_json(v_limits);
  end if;

  begin
    insert into public.learning_plans (user_id, technology_id, goal, experience_level,
      daily_minutes, duration_days, title, summary, next_step, prompt_version, provider, model)
    values ('00000000-0000-4000-8000-0000000000a7', 'javascript', 'learn_javascript', 'beginner',
      30, 7, 't', 's', 'n', 'v', 'p', 'm');
    raise exception 'FAIL: user A inserted a plan directly, around the limits';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.learning_plan_generations (user_id, period_start, technology_id, goal,
      duration_days, daily_minutes)
    values ('00000000-0000-4000-8000-0000000000a7', date_trunc('month', now())::date,
      'javascript', 'learn_javascript', 7, 30);
    raise exception 'FAIL: user A wrote learning_plan_generations directly';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.begin_learning_plan_generation('cobol', 'learn_javascript', 7, 30);
    raise exception 'FAIL: an unknown technology was accepted';
  exception when others then
    if sqlerrm <> 'UNKNOWN_TECHNOLOGY' then raise; end if;
  end;

  begin
    perform public.begin_learning_plan_generation('javascript', 'learn_javascript', 30, 30);
    raise exception 'FAIL: a 30-day plan was accepted';
  exception when others then
    if sqlerrm <> 'INVALID_REQUEST' then raise; end if;
  end;

  /* A pending reservation holds the only Free slot: a parallel request is refused. */
  select generation_id into v_gen
  from public.begin_learning_plan_generation('javascript', 'learn_javascript', 7, 30);
  select * into v_limits from public.get_my_learning_plan_limits();
  if v_limits.active_used <> 1 or v_limits.generations_used <> 1 then
    raise exception 'FAIL: a pending generation is not counted: %', row_to_json(v_limits);
  end if;
  begin
    perform public.begin_learning_plan_generation('javascript', 'learn_javascript', 7, 30);
    raise exception 'FAIL: a second parallel generation passed the Free limit';
  exception when others then
    if sqlerrm <> 'PLAN_LIMIT_REACHED' then raise; end if;
  end;

  /* A failed generation releases the slot and is not counted. */
  if not public.fail_learning_plan_generation(v_gen, 'AI_PROVIDER_BUSY') then
    raise exception 'FAIL: fail_learning_plan_generation did not release the reservation';
  end if;
  if public.fail_learning_plan_generation(v_gen, 'AI_PROVIDER_BUSY') then
    raise exception 'FAIL: a finished generation was released twice';
  end if;
  begin
    perform public.complete_learning_plan_generation(v_gen, 'beginner', null, v_sample.plan, v_sample.meta);
    raise exception 'FAIL: a failed generation was completed';
  exception when others then
    if sqlerrm <> 'GENERATION_NOT_PENDING' then raise; end if;
  end;
  select * into v_limits from public.get_my_learning_plan_limits();
  if v_limits.active_used <> 0 or v_limits.generations_used <> 0 then
    raise exception 'FAIL: a failed generation still counts: %', row_to_json(v_limits);
  end if;

  /* An invalid plan (a task after the last day) saves nothing. */
  select generation_id into v_gen
  from public.begin_learning_plan_generation('javascript', 'learn_javascript', 7, 30);
  begin
    perform public.complete_learning_plan_generation(v_gen, 'beginner', null,
      jsonb_set(v_sample.plan, '{tasks,0,day}', '9'), v_sample.meta);
    raise exception 'FAIL: a task after the last day was saved';
  exception when others then
    if sqlerrm <> 'INVALID_PLAN' then raise; end if;
  end;
  begin
    perform public.complete_learning_plan_generation(v_gen, 'beginner', null,
      jsonb_set(v_sample.plan, '{tasks,0,kind}', '"party"'), v_sample.meta);
    raise exception 'FAIL: an unknown task kind was saved';
  exception when others then
    if sqlerrm <> 'INVALID_PLAN' then raise; end if;
  end;
  if exists (select 1 from public.learning_plans) then
    raise exception 'FAIL: an invalid plan left rows behind';
  end if;

  /* The valid plan is saved with its modules and tasks, and counted once. */
  v_plan := public.complete_learning_plan_generation(v_gen, 'beginner', '  My own goal  ',
    v_sample.plan, v_sample.meta);
  insert into lp_ids values ('plan_a', v_plan), ('gen_a', v_gen);

  select count(*) into v_count from public.learning_modules where plan_id = v_plan;
  if v_count <> 2 then raise exception 'FAIL: % modules saved, expected 2', v_count; end if;
  select count(*) into v_count from public.learning_tasks where plan_id = v_plan;
  if v_count <> 7 then raise exception 'FAIL: % tasks saved, expected 7', v_count; end if;
  if (select goal_details from public.learning_plans where id = v_plan) <> 'My own goal' then
    raise exception 'FAIL: goal details were not trimmed';
  end if;
  if (select status from public.learning_plan_generations where id = v_gen) <> 'succeeded'
     or (select plan_id from public.learning_plan_generations where id = v_gen) <> v_plan
     or (select output_tokens from public.learning_plan_generations where id = v_gen) <> 200 then
    raise exception 'FAIL: the generation metadata is wrong';
  end if;

  begin
    perform public.complete_learning_plan_generation(v_gen, 'beginner', null, v_sample.plan, v_sample.meta);
    raise exception 'FAIL: one generation saved two plans';
  exception when others then
    if sqlerrm <> 'GENERATION_NOT_PENDING' then raise; end if;
  end;

  select * into v_limits from public.get_my_learning_plan_limits();
  if v_limits.active_used <> 1 or v_limits.generations_used <> 1 then
    raise exception 'FAIL: limits after one plan: %', row_to_json(v_limits);
  end if;
  begin
    perform public.begin_learning_plan_generation('python', 'improve_fundamentals', 14, 45);
    raise exception 'FAIL: a second active plan passed the Free limit';
  exception when others then
    if sqlerrm <> 'PLAN_LIMIT_REACHED' then raise; end if;
  end;
end $$;

/* 3. User A ticks tasks: only completed_at, server time, only in active plans. */
do $$
declare
  v_plan uuid := (select id from lp_ids where name = 'plan_a');
  v_task uuid := (select id from public.learning_tasks where plan_id = v_plan and position = 1);
  v_row  record;
  v_first timestamptz;
begin
  select * into v_row from public.set_learning_task_completed(v_task, true);
  if v_row.completed_at is null or v_row.done <> 1 or v_row.total <> 7 then
    raise exception 'FAIL: completing a task returned %', row_to_json(v_row);
  end if;
  v_first := v_row.completed_at;
  select * into v_row from public.set_learning_task_completed(v_task, true);
  if v_row.completed_at <> v_first or v_row.done <> 1 then
    raise exception 'FAIL: completing a task twice changed it';
  end if;
  select * into v_row from public.set_learning_task_completed(v_task, false);
  if v_row.completed_at is not null or v_row.done <> 0 then
    raise exception 'FAIL: un-completing a task failed';
  end if;

  /* A client-chosen time is replaced by the database clock. */
  update public.learning_tasks set completed_at = '2000-01-01T00:00:00Z' where id = v_task;
  if (select completed_at from public.learning_tasks where id = v_task) < now() - interval '1 minute' then
    raise exception 'FAIL: a client-chosen completed_at was stored';
  end if;

  begin
    update public.learning_tasks set title = 'hacked' where id = v_task;
    raise exception 'FAIL: user A changed a task title';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.learning_plans set title = 'hacked' where id = v_plan;
    raise exception 'FAIL: user A changed a plan title';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.learning_tasks (plan_id, module_id, user_id, day_number, position, kind,
      title, description, estimated_minutes)
    select plan_id, module_id, user_id, 1, 50, 'learn', 'x', 'y', 5
    from public.learning_tasks where id = v_task;
    raise exception 'FAIL: user A inserted a task';
  exception when insufficient_privilege then null;
  end;
end $$;

/* 4. User B (Pro) sees and changes nothing of user A. */
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b7", "role": "authenticated"}';

do $$
declare
  v_plan uuid := (select id from lp_ids where name = 'plan_a');
  v_gen  uuid := (select id from lp_ids where name = 'gen_a');
  v_task uuid;
  v_limits record;
  v_sample record;
  v_count integer;
begin
  select * into v_sample from lp_sample;

  if exists (select 1 from public.learning_plans)
     or exists (select 1 from public.learning_modules)
     or exists (select 1 from public.learning_tasks)
     or exists (select 1 from public.learning_plan_generations) then
    raise exception 'FAIL: user B sees user A''s plans, modules, tasks or generations';
  end if;

  select * into v_limits from public.get_my_learning_plan_limits();
  if v_limits.plan <> 'pro' or v_limits.active_limit <> 20 or v_limits.generations_limit <> 30
     or v_limits.active_used <> 0 then
    raise exception 'FAIL: Pro limits are %', row_to_json(v_limits);
  end if;

  /* Ids of user A's rows, as an attacker might guess them. */
  reset role;
  select id into v_task from public.learning_tasks where plan_id = v_plan limit 1;
  set local role authenticated;

  begin
    perform public.set_learning_task_completed(v_task, true);
    raise exception 'FAIL: user B ticked user A''s task';
  exception when others then
    if sqlerrm <> 'TASK_NOT_FOUND' then raise; end if;
  end;
  begin
    perform public.archive_learning_plan(v_plan);
    raise exception 'FAIL: user B archived user A''s plan';
  exception when others then
    if sqlerrm <> 'PLAN_NOT_FOUND' then raise; end if;
  end;
  begin
    perform public.delete_learning_plan(v_plan);
    raise exception 'FAIL: user B deleted user A''s plan';
  exception when others then
    if sqlerrm <> 'PLAN_NOT_FOUND' then raise; end if;
  end;
  begin
    perform public.complete_learning_plan_generation(v_gen, 'beginner', null, v_sample.plan, v_sample.meta);
    raise exception 'FAIL: user B completed user A''s generation';
  exception when others then
    if sqlerrm <> 'GENERATION_NOT_PENDING' then raise; end if;
  end;
  if public.fail_learning_plan_generation(v_gen, 'TIMEOUT') then
    raise exception 'FAIL: user B released user A''s generation';
  end if;

  update public.learning_tasks set completed_at = now() where id = v_task;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL: user B updated user A''s task directly'; end if;
  update public.learning_plans set status = 'archived' where id = v_plan;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL: user B archived user A''s plan directly'; end if;
  delete from public.learning_plans where id = v_plan;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL: user B deleted user A''s plan directly'; end if;
end $$;

/* 5. User A archives, cannot tick tasks there or reactivate, then reaches the monthly limit. */
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a7", "role": "authenticated"}';

do $$
declare
  v_plan uuid := (select id from lp_ids where name = 'plan_a');
  v_task uuid := (select id from public.learning_tasks where plan_id = v_plan and position = 2);
  v_row  record;
  v_gen  uuid;
  v_new  uuid;
  v_count integer;
  v_sample record;
begin
  select * into v_sample from lp_sample;

  select * into v_row from public.archive_learning_plan(v_plan);
  if v_row.status <> 'archived' or v_row.archived_at is null then
    raise exception 'FAIL: archiving returned %', row_to_json(v_row);
  end if;
  select * into v_row from public.archive_learning_plan(v_plan);
  if v_row.status <> 'archived' then raise exception 'FAIL: archiving twice failed'; end if;

  begin
    perform public.set_learning_task_completed(v_task, true);
    raise exception 'FAIL: a task in an archived plan was ticked';
  exception when others then
    if sqlerrm <> 'PLAN_NOT_ACTIVE' then raise; end if;
  end;

  update public.learning_plans set status = 'active' where id = v_plan;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL: an archived plan was made active again'; end if;

  /* Archiving freed the active slot: two more plans reach the Free monthly limit (3). */
  for i in 1..2 loop
    select generation_id into v_gen
    from public.begin_learning_plan_generation('javascript', 'learn_javascript', 7, 30);
    v_new := public.complete_learning_plan_generation(v_gen, 'beginner', null, v_sample.plan, v_sample.meta);
    perform public.archive_learning_plan(v_new);
  end loop;

  begin
    perform public.begin_learning_plan_generation('javascript', 'learn_javascript', 7, 30);
    raise exception 'FAIL: a fourth generation passed the Free monthly limit';
  exception when others then
    if sqlerrm <> 'GENERATION_LIMIT_REACHED' then raise; end if;
  end;

  /* Deleting a plan removes its modules and tasks; the generation still counts. */
  if not public.delete_learning_plan(v_plan) then raise exception 'FAIL: delete returned false'; end if;
  if exists (select 1 from public.learning_modules where plan_id = v_plan)
     or exists (select 1 from public.learning_tasks where plan_id = v_plan) then
    raise exception 'FAIL: deleting a plan left modules or tasks';
  end if;
  if (select generations_used from public.get_my_learning_plan_limits()) <> 3 then
    raise exception 'FAIL: deleting a plan gave a generation back';
  end if;
  begin
    perform public.delete_learning_plan(v_plan);
    raise exception 'FAIL: a deleted plan was deleted again';
  exception when others then
    if sqlerrm <> 'PLAN_NOT_FOUND' then raise; end if;
  end;
end $$;

/* 6. A reservation that never finished expires after 3 minutes and frees its slot. */
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b7", "role": "authenticated"}';

do $$
declare
  v_gen uuid;
begin
  select generation_id into v_gen
  from public.begin_learning_plan_generation('python', 'improve_fundamentals', 28, 60);
  insert into lp_ids values ('gen_b', v_gen);
end $$;

reset role;
update public.learning_plan_generations
set created_at = now() - interval '4 minutes'
where id = (select id from lp_ids where name = 'gen_b');
set local role authenticated;

do $$
declare
  v_gen uuid := (select id from lp_ids where name = 'gen_b');
  v_sample record;
begin
  select * into v_sample from lp_sample;
  if (select generations_used from public.get_my_learning_plan_limits()) <> 0 then
    raise exception 'FAIL: an expired reservation still counts';
  end if;
  begin
    perform public.complete_learning_plan_generation(v_gen, 'beginner', null, v_sample.plan, v_sample.meta);
    raise exception 'FAIL: an expired reservation was completed';
  exception when others then
    if sqlerrm <> 'GENERATION_NOT_PENDING' then raise; end if;
  end;
  perform public.begin_learning_plan_generation('python', 'improve_fundamentals', 28, 60);
  if (select status from public.learning_plan_generations where id = v_gen) <> 'expired' then
    raise exception 'FAIL: the old reservation was not marked expired';
  end if;
end $$;

reset role;
select 'RLS learning plans: all checks passed' as result;

rollback;
