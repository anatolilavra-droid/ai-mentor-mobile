/*
  Phase 5a: plans and monthly AI usage, enforced on the server.

  - plan_limits: monthly limit per plan and feature. Changed only from the SQL Editor,
    so limits can be tuned without an app release.
  - subscriptions: the learner's plan. No row means Free. Pro is set manually from the
    SQL Editor while payments do not exist (mock Pro mode). Clients cannot write it.
  - usage_counters: AI requests and tokens per learner, feature and calendar month (UTC).
    Clients cannot write it directly; the API records usage through record_my_ai_usage.
  - get_my_ai_quotas: the caller's plan, usage and limit for every feature this month.
  - record_my_ai_usage: adds one successful AI request to the caller's own counter.
    It can only increase the caller's own usage, never reset it.

  Both functions work only on auth.uid(): there is no user id parameter.
*/

create table public.plan_limits (
  plan          text not null check (plan in ('free', 'pro')),
  feature       text not null check (feature in ('chat', 'code_review')),
  monthly_limit integer not null check (monthly_limit between 0 and 1000000),
  primary key (plan, feature)
);

insert into public.plan_limits (plan, feature, monthly_limit) values
  ('free', 'chat',        30),
  ('free', 'code_review', 10),
  ('pro',  'chat',        500),
  ('pro',  'code_review', 200);

create table public.subscriptions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plan       text not null default 'free' check (plan in ('free', 'pro')),
  status     text not null default 'active' check (status in ('active', 'canceled')),
  source     text not null default 'manual' check (source in ('manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.usage_counters (
  user_id       uuid not null references auth.users (id) on delete cascade,
  feature       text not null check (feature in ('chat', 'code_review')),
  period_start  date not null check (extract(day from period_start) = 1),
  request_count integer not null default 0 check (request_count >= 0),
  input_tokens  bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  updated_at    timestamptz not null default now(),
  primary key (user_id, feature, period_start)
);

/* Row Level Security */
alter table public.plan_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;

create policy "plan_limits: read"
  on public.plan_limits
  for select
  to authenticated
  using (true);

create policy "subscriptions: read own"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "usage_counters: read own"
  on public.usage_counters
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

/* Privileges: read only for signed-in users, nothing for anonymous visitors. */
revoke all on public.plan_limits from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.usage_counters from anon, authenticated;
grant select on public.plan_limits to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.usage_counters to authenticated;

/* The caller's plan, usage and limit for every feature in the current month (UTC). */
create function public.get_my_ai_quotas()
returns table (
  feature       text,
  plan          text,
  used          integer,
  monthly_limit integer,
  period_start  date,
  period_end    date
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   uuid := auth.uid();
  v_period date := date_trunc('month', now() at time zone 'utc')::date;
  v_plan   text;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select s.plan into v_plan
  from public.subscriptions s
  where s.user_id = v_user and s.status = 'active';
  v_plan := coalesce(v_plan, 'free');

  return query
  select
    l.feature,
    l.plan,
    coalesce(u.request_count, 0),
    l.monthly_limit,
    v_period,
    (v_period + interval '1 month')::date
  from public.plan_limits l
  left join public.usage_counters u
    on u.user_id = v_user and u.feature = l.feature and u.period_start = v_period
  where l.plan = v_plan
  order by l.feature;
end;
$$;

/*
  Adds one successful AI request to the caller's counter for this month and returns
  the new quota. Runs as its owner because clients cannot write usage_counters.
*/
create function public.record_my_ai_usage(
  p_feature text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns table (
  feature       text,
  plan          text,
  used          integer,
  monthly_limit integer,
  period_start  date,
  period_end    date
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   uuid := auth.uid();
  v_period date := date_trunc('month', now() at time zone 'utc')::date;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_feature is null or p_feature not in ('chat', 'code_review') then
    raise exception 'Unknown feature' using errcode = 'invalid_parameter_value';
  end if;
  if p_input_tokens is null or p_input_tokens not between 0 and 1000000
     or p_output_tokens is null or p_output_tokens not between 0 and 1000000 then
    raise exception 'Invalid token count' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.usage_counters as c
    (user_id, feature, period_start, request_count, input_tokens, output_tokens)
  values (v_user, p_feature, v_period, 1, p_input_tokens, p_output_tokens)
  on conflict (user_id, feature, period_start) do update
    set request_count = c.request_count + 1,
        input_tokens  = c.input_tokens + excluded.input_tokens,
        output_tokens = c.output_tokens + excluded.output_tokens,
        updated_at    = now();

  return query
  select q.feature, q.plan, q.used, q.monthly_limit, q.period_start, q.period_end
  from public.get_my_ai_quotas() q
  where q.feature = p_feature;
end;
$$;

revoke execute on function public.get_my_ai_quotas() from public, anon;
revoke execute on function public.record_my_ai_usage(text, integer, integer) from public, anon;
grant execute on function public.get_my_ai_quotas() to authenticated;
grant execute on function public.record_my_ai_usage(text, integer, integer) to authenticated;
