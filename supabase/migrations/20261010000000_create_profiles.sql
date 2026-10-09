-- Phase 2: user profiles.
-- One profile per auth user, created automatically on sign up.
-- Users can read and edit only their own profile (Row Level Security).

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text
    check (display_name is null or char_length(btrim(display_name)) between 2 and 50),
  experience_level text
    check (experience_level is null
           or experience_level in ('beginner', 'junior', 'middle', 'advanced')),
  learning_goal    text
    check (learning_goal is null or char_length(learning_goal) <= 280),
  daily_minutes    integer
    check (daily_minutes is null or daily_minutes between 5 and 480),
  ui_language      text not null default 'en'
    check (ui_language in ('ru', 'en', 'de')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.profiles is
  'Learner profile. display_name, experience_level and daily_minutes are filled during profile setup.';

-- Create a profile for every new auth user.
-- ui_language comes from sign-up metadata when it is one of the supported values.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, ui_language)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'ui_language' in ('ru', 'en', 'de')
        then new.raw_user_meta_data ->> 'ui_language'
      else 'en'
    end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at is always set by the database, never by the client.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert policy: rows are created only by the trigger.
-- No delete policy: rows are removed by the cascade from auth.users.

-- Column privileges: clients may change only the editable profile fields.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, experience_level, learning_goal, daily_minutes, ui_language)
  on public.profiles to authenticated;
