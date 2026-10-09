-- RLS check for public.profiles.
-- Run the whole file in the Supabase SQL Editor after applying the migrations.
-- It creates two temporary users inside a transaction and rolls everything back.
-- Success: the editor shows "RLS profiles: all checks passed" and no error.

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-00000000000a', 'rls-user-a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-user-b@example.test');

-- The sign-up trigger must have created both profiles.
do $$
begin
  if (select count(*) from public.profiles
      where id in ('00000000-0000-4000-8000-00000000000a',
                   '00000000-0000-4000-8000-00000000000b')) <> 2 then
    raise exception 'FAIL: profiles were not created by the sign-up trigger';
  end if;
end $$;

-- Act as user A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

do $$
declare
  visible integer;
begin
  select count(*) into visible from public.profiles;
  if visible <> 1 then
    raise exception 'FAIL: user A sees % profiles, expected 1', visible;
  end if;

  update public.profiles set display_name = 'Intruder'
  where id = '00000000-0000-4000-8000-00000000000b';
  if found then
    raise exception 'FAIL: user A updated the profile of user B';
  end if;

  update public.profiles set display_name = 'User A', daily_minutes = 30
  where id = '00000000-0000-4000-8000-00000000000a';
  if not found then
    raise exception 'FAIL: user A could not update their own profile';
  end if;

  begin
    update public.profiles set id = '00000000-0000-4000-8000-00000000000c'
    where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: user A changed the profile id';
  exception when insufficient_privilege then
    null; -- expected: id is not an editable column
  end;

  begin
    insert into public.profiles (id) values ('00000000-0000-4000-8000-00000000000c');
    raise exception 'FAIL: user A inserted a profile';
  exception when insufficient_privilege then
    null; -- expected
  end;

  begin
    delete from public.profiles where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: user A deleted a profile';
  exception when insufficient_privilege then
    null; -- expected
  end;

  begin
    update public.profiles set daily_minutes = 1000
    where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: daily_minutes above 480 was accepted';
  exception when check_violation then
    null; -- expected
  end;
end $$;

-- Act as an anonymous visitor.
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: anon can read profiles';
  exception when insufficient_privilege then
    null; -- expected
  end;
end $$;

reset role;
select 'RLS profiles: all checks passed' as result;

rollback;
