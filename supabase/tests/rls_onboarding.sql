/*
  Phase 3 check: technologies, user_technologies, onboarding functions and RLS.
  Run the whole file in the Supabase SQL Editor after applying all migrations.
  It creates two temporary users inside a transaction and rolls everything back.
  Success: the editor shows "RLS onboarding: all checks passed" and no error.
*/

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-0000000000a1', 'onboarding-a@example.test'),
  ('00000000-0000-4000-8000-0000000000b1', 'onboarding-b@example.test');

/* Act as user A. */
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

do $$
declare
  v_completed boolean;
  v_count integer;
begin
  if (select count(*) from public.technologies) < 1 then
    raise exception 'FAIL: user A cannot read the technologies catalog';
  end if;

  begin
    insert into public.technologies (id, name, category) values ('cobol', 'COBOL', 'language');
    raise exception 'FAIL: user A changed the technologies catalog';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    insert into public.user_technologies (user_id, technology_id)
    values ('00000000-0000-4000-8000-0000000000a1', 'react');
    raise exception 'FAIL: user A wrote user_technologies directly';
  exception when insufficient_privilege then
    null; /* expected: writes go through the functions */
  end;

  begin
    update public.profiles set onboarding_completed = true
    where id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'FAIL: user A set onboarding_completed directly';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    update public.profiles set primary_goal = 'learn_react'
    where id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'FAIL: user A changed primary_goal directly';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  update public.profiles set daily_minutes = 30
  where id = '00000000-0000-4000-8000-0000000000a1';
  if not found then
    raise exception 'FAIL: user A could not change daily_minutes (Edit profile)';
  end if;

  begin
    perform public.complete_onboarding('User A', 'junior', 'learn_react', null, 30, 'en', array[]::text[]);
    raise exception 'FAIL: onboarding completed with no technologies';
  exception when invalid_parameter_value then
    null; /* expected */
  end;

  begin
    perform public.complete_onboarding('User A', 'junior', 'learn_react', null, 30, 'en',
      array['react', 'react']);
    raise exception 'FAIL: duplicate technologies accepted';
  exception when invalid_parameter_value then
    null; /* expected */
  end;

  begin
    perform public.complete_onboarding('User A', 'junior', 'learn_react', null, 30, 'en',
      array['javascript', 'typescript', 'python', 'html', 'css', 'sql', 'react', 'nodejs', 'git']);
    raise exception 'FAIL: nine technologies accepted';
  exception when invalid_parameter_value then
    null; /* expected */
  end;

  begin
    perform public.complete_onboarding('User A', 'junior', 'learn_rust', null, 30, 'en', array['react']);
    raise exception 'FAIL: unknown primary_goal accepted';
  exception when check_violation then
    null; /* expected */
  end;

  begin
    perform public.complete_onboarding('User A', 'junior', 'learn_react', repeat('x', 501), 30, 'en',
      array['react']);
    raise exception 'FAIL: custom_goal_details over 500 characters accepted';
  exception when check_violation then
    null; /* expected */
  end;

  perform public.complete_onboarding('User A', 'junior', 'learn_react', '  Ship a portfolio  ', 45, 'de',
    array['react', 'typescript']);

  select onboarding_completed into v_completed
  from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
  if not v_completed then
    raise exception 'FAIL: complete_onboarding did not mark onboarding completed';
  end if;

  if (select custom_goal_details from public.profiles
      where id = '00000000-0000-4000-8000-0000000000a1') <> 'Ship a portfolio' then
    raise exception 'FAIL: custom_goal_details was not trimmed';
  end if;

  select count(*) into v_count from public.user_technologies;
  if v_count <> 2 then
    raise exception 'FAIL: expected 2 technologies for user A, found %', v_count;
  end if;

  perform public.save_personalization('middle', 'prepare_for_job', null, array['nodejs']);
  select count(*) into v_count from public.user_technologies;
  if v_count <> 1 then
    raise exception 'FAIL: save_personalization did not replace technologies';
  end if;

  perform public.skip_onboarding();
  if (select onboarding_skipped_at from public.profiles
      where id = '00000000-0000-4000-8000-0000000000a1') is not null then
    raise exception 'FAIL: skip_onboarding changed a completed onboarding';
  end if;
end $$;

/* Act as user B: A's data must stay invisible. */
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';

do $$
begin
  if (select count(*) from public.user_technologies) <> 0 then
    raise exception 'FAIL: user B sees technologies of user A';
  end if;

  perform public.skip_onboarding();
  if (select onboarding_skipped_at from public.profiles
      where id = '00000000-0000-4000-8000-0000000000b1') is null then
    raise exception 'FAIL: skip_onboarding did not record the skip';
  end if;
end $$;

/* Act as an anonymous visitor. */
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.technologies;
    raise exception 'FAIL: anon can read technologies';
  exception when insufficient_privilege then
    null; /* expected */
  end;

  begin
    perform public.skip_onboarding();
    raise exception 'FAIL: anon can call skip_onboarding';
  exception when insufficient_privilege then
    null; /* expected */
  end;
end $$;

reset role;
select 'RLS onboarding: all checks passed' as result;

rollback;
