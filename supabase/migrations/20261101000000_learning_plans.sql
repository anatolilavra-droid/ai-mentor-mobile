/*
  Phase 7a: personal learning plans.

  Tables
  - learning_plan_limits: active plans and monthly generations per plan
    (Free 1 / 3, Pro 20 / 30). Placeholders, changed in the SQL Editor without a release.
    Kept apart from plan_limits / usage_counters on purpose: get_my_ai_quotas() and the
    deployed API stay exactly as they are.
  - learning_plans, learning_modules, learning_tasks: a generated plan, its modules and
    its daily tasks. Every row carries user_id; composite foreign keys keep a module or
    a task from ever belonging to another learner's plan.
  - learning_plan_generations: one row per generation attempt (pending, succeeded,
    failed, expired) with usage metadata. Counts the monthly generations.

  Who writes what
  - New plans are written only by complete_learning_plan_generation (security definer,
    see the reason there). Clients have no INSERT privilege on any of these tables.
  - Learners change their own data through RLS with narrow column privileges:
    learning_tasks.completed_at, learning_plans.status (active -> archived only) and
    DELETE of their own plans. The wrapper functions set_learning_task_completed,
    archive_learning_plan and delete_learning_plan are security invoker.

  Comments use slash-star only, so the file survives copying from a phone browser.
*/

/* Limits */
create table public.learning_plan_limits (
  plan                text primary key check (plan in ('free', 'pro')),
  max_active_plans    integer not null check (max_active_plans between 0 and 1000),
  monthly_generations integer not null check (monthly_generations between 0 and 100000)
);

insert into public.learning_plan_limits (plan, max_active_plans, monthly_generations) values
  ('free', 1, 3),
  ('pro', 20, 30);

/* Plans */
create table public.learning_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  technology_id    text not null references public.technologies (id),
  goal             text not null check (goal in (
                     'learn_javascript', 'build_web_apps', 'prepare_for_job',
                     'improve_fundamentals', 'learn_react', 'personal_projects')),
  goal_details     text check (goal_details is null or char_length(goal_details) <= 500),
  experience_level text not null
                     check (experience_level in ('beginner', 'junior', 'middle', 'advanced')),
  daily_minutes    integer not null check (daily_minutes between 5 and 480),
  duration_days    smallint not null check (duration_days in (7, 14, 28)),
  title            text not null check (char_length(title) between 1 and 120),
  summary          text not null check (char_length(summary) between 1 and 1000),
  review_questions text[] not null default '{}'
                     check (cardinality(review_questions) <= 8),
  next_step        text not null check (char_length(next_step) between 1 and 500),
  status           text not null default 'active' check (status in ('active', 'archived')),
  prompt_version   text not null check (char_length(prompt_version) between 1 and 64),
  provider         text not null check (char_length(provider) between 1 and 32),
  model            text not null check (char_length(model) between 1 and 128),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz,
  constraint learning_plans_archived_at check ((status = 'archived') = (archived_at is not null)),
  constraint learning_plans_id_user_key unique (id, user_id)
);

/* Learn / Home: the learner's plans by status, oldest first (primary plan = oldest active). */
create index learning_plans_user_status_created_idx
  on public.learning_plans (user_id, status, created_at, id);

create table public.learning_modules (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null,
  user_id     uuid not null,
  position    smallint not null check (position between 1 and 8),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) <= 1000),
  objectives  text[] not null default '{}' check (cardinality(objectives) <= 5),
  constraint learning_modules_plan_fkey foreign key (plan_id, user_id)
    references public.learning_plans (id, user_id) on delete cascade,
  constraint learning_modules_plan_position_key unique (plan_id, position),
  constraint learning_modules_id_plan_user_key unique (id, plan_id, user_id)
);

create table public.learning_tasks (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null,
  module_id         uuid not null,
  user_id           uuid not null,
  day_number        smallint not null check (day_number between 1 and 28),
  position          smallint not null check (position between 1 and 56),
  kind              text not null
                      check (kind in ('learn', 'practice', 'exercise', 'mini_project', 'review')),
  title             text not null check (char_length(title) between 1 and 160),
  description       text not null check (char_length(description) between 1 and 1500),
  estimated_minutes smallint not null check (estimated_minutes between 1 and 480),
  completed_at      timestamptz,
  constraint learning_tasks_plan_fkey foreign key (plan_id, user_id)
    references public.learning_plans (id, user_id) on delete cascade,
  constraint learning_tasks_module_fkey foreign key (module_id, plan_id, user_id)
    references public.learning_modules (id, plan_id, user_id) on delete cascade,
  constraint learning_tasks_plan_position_key unique (plan_id, position)
);

create index learning_tasks_plan_day_idx on public.learning_tasks (plan_id, day_number, position);
create index learning_tasks_module_idx on public.learning_tasks (module_id, plan_id, user_id);
create index learning_tasks_user_idx on public.learning_tasks (user_id);

/* Generation attempts: reservations and usage metadata. Never holds free text. */
create table public.learning_plan_generations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  period_start   date not null check (extract(day from period_start) = 1),
  status         text not null default 'pending'
                   check (status in ('pending', 'succeeded', 'failed', 'expired')),
  plan_id        uuid references public.learning_plans (id) on delete set null,
  technology_id  text not null,
  goal           text not null,
  duration_days  smallint not null check (duration_days in (7, 14, 28)),
  daily_minutes  integer not null check (daily_minutes between 5 and 480),
  prompt_version text check (prompt_version is null or char_length(prompt_version) <= 64),
  provider       text check (provider is null or char_length(provider) <= 32),
  model          text check (model is null or char_length(model) <= 128),
  input_tokens   integer check (input_tokens is null or input_tokens between 0 and 10000000),
  output_tokens  integer check (output_tokens is null or output_tokens between 0 and 10000000),
  latency_ms     integer check (latency_ms is null or latency_ms between 0 and 3600000),
  error_code     text check (error_code is null or error_code ~ '^[A-Z_]{1,64}$'),
  created_at     timestamptz not null default now(),
  finished_at    timestamptz
);

create index learning_plan_generations_user_period_idx
  on public.learning_plan_generations (user_id, period_start, status);
create index learning_plan_generations_plan_idx on public.learning_plan_generations (plan_id);

/* Triggers */
create trigger learning_plans_set_updated_at
  before update on public.learning_plans
  for each row execute function public.set_updated_at();

/* archived_at always comes from the database clock. */
create function public.learning_plans_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'archived' and old.status = 'active' then
    new.archived_at := now();
  end if;
  return new;
end;
$$;

create trigger learning_plans_before_update
  before update on public.learning_plans
  for each row execute function public.learning_plans_before_update();

/*
  completed_at always comes from the database clock: any non-null value the client
  sends means "done now"; marking an already done task again keeps the first time.
*/
create function public.learning_tasks_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.completed_at is not null then
    new.completed_at := coalesce(old.completed_at, now());
  end if;
  return new;
end;
$$;

create trigger learning_tasks_before_update
  before update on public.learning_tasks
  for each row execute function public.learning_tasks_before_update();

revoke execute on function public.learning_plans_before_update() from public, anon, authenticated;
revoke execute on function public.learning_tasks_before_update() from public, anon, authenticated;

/* Row Level Security */
alter table public.learning_plan_limits enable row level security;
alter table public.learning_plans enable row level security;
alter table public.learning_modules enable row level security;
alter table public.learning_tasks enable row level security;
alter table public.learning_plan_generations enable row level security;

create policy "learning_plan_limits: read"
  on public.learning_plan_limits for select to authenticated
  using (true);

create policy "learning_plans: read own"
  on public.learning_plans for select to authenticated
  using ((select auth.uid()) = user_id);

/* The only allowed status change: the learner's own active plan becomes archived. */
create policy "learning_plans: archive own"
  on public.learning_plans for update to authenticated
  using ((select auth.uid()) = user_id and status = 'active')
  with check ((select auth.uid()) = user_id and status = 'archived');

create policy "learning_plans: delete own"
  on public.learning_plans for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "learning_modules: read own"
  on public.learning_modules for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "learning_tasks: read own"
  on public.learning_tasks for select to authenticated
  using ((select auth.uid()) = user_id);

/* Tasks can be ticked only in the learner's own active plans. */
create policy "learning_tasks: complete own in active plans"
  on public.learning_tasks for update to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.learning_plans p
      where p.id = plan_id and p.user_id = (select auth.uid()) and p.status = 'active'
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.learning_plans p
      where p.id = plan_id and p.user_id = (select auth.uid()) and p.status = 'active'
    )
  );

create policy "learning_plan_generations: read own"
  on public.learning_plan_generations for select to authenticated
  using ((select auth.uid()) = user_id);

/* Privileges: read own rows; the narrow writes above; nothing for anonymous visitors. */
revoke all on public.learning_plan_limits from anon, authenticated;
revoke all on public.learning_plans from anon, authenticated;
revoke all on public.learning_modules from anon, authenticated;
revoke all on public.learning_tasks from anon, authenticated;
revoke all on public.learning_plan_generations from anon, authenticated;

grant select on public.learning_plan_limits to authenticated;
grant select, delete on public.learning_plans to authenticated;
grant update (status) on public.learning_plans to authenticated;
grant select on public.learning_modules to authenticated;
grant select on public.learning_tasks to authenticated;
grant update (completed_at) on public.learning_tasks to authenticated;
grant select on public.learning_plan_generations to authenticated;

/*
  The caller's plan limits: plan, active plans and generations this month (UTC).
  Security invoker: everything it reads is the caller's own data under RLS.
  A pending generation younger than 3 minutes counts both as an active plan and as a
  generation, so parallel requests cannot pass the limits.
*/
create function public.get_my_learning_plan_limits()
returns table (
  plan              text,
  active_used       integer,
  active_limit      integer,
  generations_used  integer,
  generations_limit integer,
  period_start      date,
  period_end        date
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user    uuid := auth.uid();
  v_period  date := date_trunc('month', now() at time zone 'utc')::date;
  v_plan    text;
  v_pending integer;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select s.plan into v_plan
  from public.subscriptions s
  where s.user_id = v_user and s.status = 'active';
  v_plan := coalesce(v_plan, 'free');

  select count(*) into v_pending
  from public.learning_plan_generations g
  where g.user_id = v_user
    and g.status = 'pending'
    and g.created_at > now() - interval '3 minutes';

  return query
  select
    v_plan,
    (
      select count(*)::integer
      from public.learning_plans p
      where p.user_id = v_user and p.status = 'active'
    ) + v_pending,
    l.max_active_plans,
    (
      select count(*)::integer
      from public.learning_plan_generations g
      where g.user_id = v_user and g.period_start = v_period and g.status = 'succeeded'
    ) + v_pending,
    l.monthly_generations,
    v_period,
    (v_period + interval '1 month')::date
  from public.learning_plan_limits l
  where l.plan = v_plan;
end;
$$;

/*
  Step 1 of a generation, called by the API as the user before the AI call.

  Security definer, because:
  - it inserts into learning_plan_generations, which clients may not write
    (otherwise a learner could delete or forge reservations and pass the limits);
  - it must see every pending reservation of the caller under one lock.
  Safety: search_path is empty and every name is schema-qualified; it acts only on
  auth.uid() (there is no user id parameter); execute is granted to authenticated only.

  A per-user advisory lock serializes parallel requests, so two of them can never
  both pass the same free slot.
*/
create function public.begin_learning_plan_generation(
  p_technology_id text,
  p_goal          text,
  p_duration_days integer,
  p_daily_minutes integer
)
returns table (
  generation_id     uuid,
  plan              text,
  active_used       integer,
  active_limit      integer,
  generations_used  integer,
  generations_limit integer,
  period_start      date,
  period_end        date
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   uuid := auth.uid();
  v_period date := date_trunc('month', now() at time zone 'utc')::date;
  v_limits record;
  v_id     uuid;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_goal is null or p_goal not in ('learn_javascript', 'build_web_apps', 'prepare_for_job',
       'improve_fundamentals', 'learn_react', 'personal_projects')
     or p_duration_days is null or p_duration_days not in (7, 14, 28)
     or p_daily_minutes is null or p_daily_minutes not between 5 and 480 then
    raise exception 'INVALID_REQUEST' using errcode = 'invalid_parameter_value';
  end if;
  if not exists (
    select 1 from public.technologies t where t.id = p_technology_id and t.is_active
  ) then
    raise exception 'UNKNOWN_TECHNOLOGY' using errcode = 'invalid_parameter_value';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('learning_plan:' || v_user::text, 0));

  /* Reservations older than 3 minutes belong to requests that never finished. */
  update public.learning_plan_generations g
  set status = 'expired', finished_at = now()
  where g.user_id = v_user
    and g.status = 'pending'
    and g.created_at <= now() - interval '3 minutes';

  select * into v_limits from public.get_my_learning_plan_limits();

  if v_limits.active_used >= v_limits.active_limit then
    raise exception 'PLAN_LIMIT_REACHED'
      using errcode = 'P0001',
            detail = json_build_object('used', v_limits.active_used,
                                       'limit', v_limits.active_limit)::text;
  end if;
  if v_limits.generations_used >= v_limits.generations_limit then
    raise exception 'GENERATION_LIMIT_REACHED'
      using errcode = 'P0001',
            detail = json_build_object('used', v_limits.generations_used,
                                       'limit', v_limits.generations_limit,
                                       'resetsAt', v_limits.period_end)::text;
  end if;

  insert into public.learning_plan_generations
    (user_id, period_start, technology_id, goal, duration_days, daily_minutes)
  values (v_user, v_period, p_technology_id, p_goal, p_duration_days, p_daily_minutes)
  returning id into v_id;

  return query
  select v_id, l.plan, l.active_used, l.active_limit, l.generations_used,
         l.generations_limit, l.period_start, l.period_end
  from public.get_my_learning_plan_limits() l;
end;
$$;

/*
  Step 2, called by the API as the user after the AI answer passed validation.
  Saves the plan, its modules and tasks and marks the generation succeeded, in one
  transaction: the plan exists if and only if the generation is counted.

  Security definer for the same reasons as begin_learning_plan_generation: clients
  have no INSERT privilege on the plan tables, so plans cannot be created around the
  limits. The generation must be the caller's own and still pending.

  p_plan (already validated by the API, checked again here):
    { title, summary, nextStep, reviewQuestions: [text],
      modules: [{ position, title, description, objectives: [text] }],
      tasks:   [{ module, position, day, kind, title, description, estimatedMinutes }] }
  p_meta: { provider, model, promptVersion, inputTokens, outputTokens, latencyMs }
*/
create function public.complete_learning_plan_generation(
  p_generation_id    uuid,
  p_experience_level text,
  p_goal_details     text,
  p_plan             jsonb,
  p_meta             jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_generation public.learning_plan_generations%rowtype;
  v_active     integer;
  v_limit      integer;
  v_plan_name  text;
  v_plan_id    uuid;
  v_modules    integer;
  v_tasks      integer;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('learning_plan:' || v_user::text, 0));

  select * into v_generation
  from public.learning_plan_generations g
  where g.id = p_generation_id and g.user_id = v_user
  for update;

  if not found
     or v_generation.status <> 'pending'
     or v_generation.created_at <= now() - interval '3 minutes' then
    raise exception 'GENERATION_NOT_PENDING' using errcode = 'P0001';
  end if;

  /* Defence in depth: the reservation already holds this slot. */
  select coalesce(s.plan, 'free') into v_plan_name
  from (select 1) one
  left join public.subscriptions s on s.user_id = v_user and s.status = 'active';
  select l.max_active_plans into v_limit
  from public.learning_plan_limits l where l.plan = v_plan_name;
  select count(*) into v_active
  from public.learning_plans p where p.user_id = v_user and p.status = 'active';
  if v_active >= v_limit then
    raise exception 'PLAN_LIMIT_REACHED'
      using errcode = 'P0001',
            detail = json_build_object('used', v_active, 'limit', v_limit)::text;
  end if;

  if jsonb_typeof(p_plan) is distinct from 'object'
     or jsonb_typeof(p_plan -> 'modules') is distinct from 'array'
     or jsonb_typeof(p_plan -> 'tasks') is distinct from 'array'
     or jsonb_typeof(p_plan -> 'reviewQuestions') is distinct from 'array'
     or jsonb_typeof(p_meta) is distinct from 'object' then
    raise exception 'INVALID_PLAN' using errcode = 'invalid_parameter_value';
  end if;
  v_modules := jsonb_array_length(p_plan -> 'modules');
  v_tasks := jsonb_array_length(p_plan -> 'tasks');
  if v_modules not between 1 and 8 or v_tasks not between 1 and 56 then
    raise exception 'INVALID_PLAN' using errcode = 'invalid_parameter_value';
  end if;

  begin
    insert into public.learning_plans (
      user_id, technology_id, goal, goal_details, experience_level, daily_minutes,
      duration_days, title, summary, review_questions, next_step,
      prompt_version, provider, model
    ) values (
      v_user, v_generation.technology_id, v_generation.goal, nullif(btrim(p_goal_details), ''),
      p_experience_level, v_generation.daily_minutes, v_generation.duration_days,
      p_plan ->> 'title', p_plan ->> 'summary',
      array(select jsonb_array_elements_text(p_plan -> 'reviewQuestions')),
      p_plan ->> 'nextStep',
      p_meta ->> 'promptVersion', p_meta ->> 'provider', p_meta ->> 'model'
    )
    returning id into v_plan_id;

    insert into public.learning_modules (plan_id, user_id, position, title, description, objectives)
    select v_plan_id, v_user, (m ->> 'position')::smallint, m ->> 'title', m ->> 'description',
           array(select jsonb_array_elements_text(coalesce(m -> 'objectives', '[]'::jsonb)))
    from jsonb_array_elements(p_plan -> 'modules') m;

    insert into public.learning_tasks (
      plan_id, module_id, user_id, day_number, position, kind, title, description,
      estimated_minutes
    )
    select v_plan_id, lm.id, v_user, (t ->> 'day')::smallint, (t ->> 'position')::smallint,
           t ->> 'kind', t ->> 'title', t ->> 'description',
           (t ->> 'estimatedMinutes')::smallint
    from jsonb_array_elements(p_plan -> 'tasks') t
    join public.learning_modules lm
      on lm.plan_id = v_plan_id and lm.position = (t ->> 'module')::smallint;

    if (select count(*) from public.learning_tasks lt where lt.plan_id = v_plan_id) <> v_tasks
       or exists (
         select 1 from public.learning_tasks lt
         where lt.plan_id = v_plan_id and lt.day_number > v_generation.duration_days
       ) then
      raise exception 'INVALID_PLAN' using errcode = 'invalid_parameter_value';
    end if;
  exception
    when check_violation or not_null_violation or unique_violation or foreign_key_violation
         or invalid_text_representation or numeric_value_out_of_range
         or invalid_parameter_value then
      raise exception 'INVALID_PLAN' using errcode = 'invalid_parameter_value';
  end;

  update public.learning_plan_generations g
  set status         = 'succeeded',
      plan_id        = v_plan_id,
      prompt_version = left(p_meta ->> 'promptVersion', 64),
      provider       = left(p_meta ->> 'provider', 32),
      model          = left(p_meta ->> 'model', 128),
      input_tokens   = least(greatest(coalesce((p_meta ->> 'inputTokens')::integer, 0), 0), 10000000),
      output_tokens  = least(greatest(coalesce((p_meta ->> 'outputTokens')::integer, 0), 0), 10000000),
      latency_ms     = least(greatest(coalesce((p_meta ->> 'latencyMs')::integer, 0), 0), 3600000),
      finished_at    = now()
  where g.id = v_generation.id;

  return v_plan_id;
end;
$$;

/*
  Step 2 on failure: releases the caller's own pending reservation without counting it.
  Security definer: clients cannot update learning_plan_generations. Returns false when
  there was nothing to release (already finished, expired or not the caller's).
*/
create function public.fail_learning_plan_generation(
  p_generation_id uuid,
  p_error_code    text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  update public.learning_plan_generations g
  set status      = 'failed',
      error_code  = case when p_error_code ~ '^[A-Z_]{1,64}$' then p_error_code else 'UNKNOWN' end,
      finished_at = now()
  where g.id = p_generation_id and g.user_id = v_user and g.status = 'pending';
  return found;
end;
$$;

/*
  Marks one of the caller's tasks done (or not done) and returns the plan's progress.
  Security invoker: RLS allows it only for the caller's own task in an active plan.
*/
create function public.set_learning_task_completed(p_task_id uuid, p_completed boolean)
returns table (
  task_id      uuid,
  plan_id      uuid,
  completed_at timestamptz,
  done         integer,
  total        integer
)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_task public.learning_tasks%rowtype;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  update public.learning_tasks t
  set completed_at = case when p_completed then now() else null end
  where t.id = p_task_id and t.user_id = v_user
  returning t.* into v_task;

  if not found then
    if exists (select 1 from public.learning_tasks t where t.id = p_task_id and t.user_id = v_user) then
      raise exception 'PLAN_NOT_ACTIVE' using errcode = 'P0001';
    end if;
    raise exception 'TASK_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
  select v_task.id, v_task.plan_id, v_task.completed_at,
         count(*) filter (where t.completed_at is not null)::integer,
         count(*)::integer
  from public.learning_tasks t
  where t.plan_id = v_task.plan_id and t.user_id = v_user;
end;
$$;

/* Archives one of the caller's plans. Security invoker (RLS: own, active -> archived). */
create function public.archive_learning_plan(p_plan_id uuid)
returns table (plan_id uuid, status text, archived_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  update public.learning_plans p
  set status = 'archived'
  where p.id = p_plan_id and p.user_id = v_user and p.status = 'active';

  /* Archiving twice is fine: the plan is returned as it is. */
  return query
  select p.id, p.status, p.archived_at
  from public.learning_plans p
  where p.id = p_plan_id and p.user_id = v_user;

  if not found then
    raise exception 'PLAN_NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

/* Deletes one of the caller's plans with its modules and tasks. Security invoker (RLS). */
create function public.delete_learning_plan(p_plan_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  delete from public.learning_plans p where p.id = p_plan_id and p.user_id = v_user;
  if not found then
    raise exception 'PLAN_NOT_FOUND' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

/* Functions: signed-in learners only, never anonymous visitors. */
revoke execute on function public.get_my_learning_plan_limits() from public, anon;
revoke execute on function public.begin_learning_plan_generation(text, text, integer, integer) from public, anon;
revoke execute on function public.complete_learning_plan_generation(uuid, text, text, jsonb, jsonb) from public, anon;
revoke execute on function public.fail_learning_plan_generation(uuid, text) from public, anon;
revoke execute on function public.set_learning_task_completed(uuid, boolean) from public, anon;
revoke execute on function public.archive_learning_plan(uuid) from public, anon;
revoke execute on function public.delete_learning_plan(uuid) from public, anon;

grant execute on function public.get_my_learning_plan_limits() to authenticated;
grant execute on function public.begin_learning_plan_generation(text, text, integer, integer) to authenticated;
grant execute on function public.complete_learning_plan_generation(uuid, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.fail_learning_plan_generation(uuid, text) to authenticated;
grant execute on function public.set_learning_task_completed(uuid, boolean) to authenticated;
grant execute on function public.archive_learning_plan(uuid) to authenticated;
grant execute on function public.delete_learning_plan(uuid) to authenticated;
