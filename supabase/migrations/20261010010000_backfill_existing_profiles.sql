/*
  Phase 2 follow-up: profiles for users created before the profiles table.

  The sign-up trigger only creates a profile for users who register after
  20261010000000_create_profiles.sql was applied. This adds the missing
  profiles for earlier accounts. It is safe to run more than once: it only
  inserts rows that do not exist yet and never changes or deletes data.
*/

insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;
