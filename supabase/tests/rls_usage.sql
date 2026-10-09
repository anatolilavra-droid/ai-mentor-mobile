/*
  Phase 5a check: plan_limits, subscriptions, usage_counters and the usage functions.
  Run the whole file in the Supabase SQL Editor after applying all migrations.
  It creates two temporary users inside a transaction and rolls everything back.
  Success: no error. The editor may show "RLS usage: all checks passed" or only
  "Success. No rows returned", because the last command is the rollback.
*/

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-0000000000a2', 'usage-a@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'usage-b@example.test');

/* User B is on Pro and already used the chat once this month. */
insert into public.subscriptions (user_id, plan) values ('00000000-0000-4000-8000-0000000000b2', 'pro');
insert into public.usage_counters (user_id, feature, period_start, request_count)
values ('00000000-0000-4000-8000-0000000000b2', 'chat',
        date_trunc('month', now() at time zone 'utc')::date, 1);

/* Act as user A (Free, no subscription row). */
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a2", "role": "authenticated"}';

do $$
declare
  v_plan  text;
  v_used  integer;
  v_limit integer;
  v_count integer;
begin
  select q.plan, q.used, q.monthly_limit into v_plan, v_used, v_limit
  from public.get_my_ai_quotas() q where q.feature = 'chat';
  if v_plan <> 'free' or v_used <> 0 or v_limit <> 30 then
    raise exception 'FAIL: new user quota is %/% on %, expected 0/30 on free', v_used, v_limit, v_plan;
  end if;

  select q.used into v_used from public.record_my_ai_usage('chat', 120, 40) q;
  select q.used, q.plan, q.monthly_limit into v_used, v_plan, v_limit
  from public.record_my_ai_usage('chat', 100, 50) q;
  if v_used <> 2 then
    raise exception 'FAIL: chat usage is %, expected 2', v_used;
  end if;
  /* record_my_ai_usage runs as its owner: it must still use only the caller's plan. */
  if v_plan <> 'free' or v_limit <> 30 then
    raise exception 'FAIL: record_my_ai_usage reports plan % with limit %, expected free/30', v_plan, v_limit;
  end if;

  select q.used into v_used from public.get_my_ai_quotas() q where q.feature = 'code_review';
  if v_used <> 0 then
    raise exception 'FAIL: code review usage changed with chat usage';
  end if;

  select count(*) into v_count from public.usage_counters;
  if v_count <> 1 then
    raise exception 'FAIL: user A sees % usage rows, expected only their own 1', v_count;
  end if;

  select count(*) into v_count from public.subscriptions;
  if v_count <> 0 then
    raise exception 'FAIL: user A sees the subscription of another user';
  end if;

  if (select count(*) from public.plan_limits) <> 4 then
    raise exception 'FAIL: user A cannot read plan_limits';
  end if;

  begin
    insert into public.subscriptions (user_id, plan) values ('00000000-0000-4000-8000-0000000000a2', 'pro');
    raise exception 'FAIL: user A gave themselves Pro';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    update public.usage_counters set request_count = 0;
    raise exception 'FAIL: user A reset their usage';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    delete from public.usage_counters;
    raise exception 'FAIL: user A deleted usage rows';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    update public.plan_limits set monthly_limit = 1000000;
    raise exception 'FAIL: user A changed plan limits';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    perform public.record_my_ai_usage('learning_plan', 1, 1);
    raise exception 'FAIL: unknown feature was accepted';
  exception when invalid_parameter_value then
    null; /* expected */
  end;

  begin
    perform public.record_my_ai_usage('chat', -5, 1);
    raise exception 'FAIL: negative token count was accepted';
  exception when invalid_parameter_value then
    null; /* expected */
  end;
end $$;

/* Act as user B (Pro). */
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}';

do $$
declare
  v_plan  text;
  v_used  integer;
  v_limit integer;
begin
  select q.plan, q.used, q.monthly_limit into v_plan, v_used, v_limit
  from public.get_my_ai_quotas() q where q.feature = 'chat';
  if v_plan <> 'pro' or v_used <> 1 or v_limit <> 500 then
    raise exception 'FAIL: Pro quota is %/% on %, expected 1/500 on pro', v_used, v_limit, v_plan;
  end if;
end $$;

/* Act as an anonymous visitor. */
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.usage_counters;
    raise exception 'FAIL: anon can read usage_counters';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    perform public.get_my_ai_quotas();
    raise exception 'FAIL: anon can call get_my_ai_quotas';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    perform public.record_my_ai_usage('chat', 1, 1);
    raise exception 'FAIL: anon can call record_my_ai_usage';
  exception when insufficient_privilege then
    null; /* expected */
  end;
end $$;

reset role;

/* User A's counter really holds both requests and their tokens. */
do $$
begin
  if not exists (
    select 1 from public.usage_counters
    where user_id = '00000000-0000-4000-8000-0000000000a2'
      and feature = 'chat' and request_count = 2
      and input_tokens = 220 and output_tokens = 90
  ) then
    raise exception 'FAIL: user A counter is wrong';
  end if;
end $$;

select 'RLS usage: all checks passed' as result;

rollback;
