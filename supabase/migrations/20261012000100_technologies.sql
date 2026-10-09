/*
  Phase 3: technologies catalog and the learner's selection (1..8 technologies).

  - technologies: read-only catalog for signed-in users; changed only by migrations.
  - user_technologies: the learner's choices. The primary key (user_id, technology_id)
    makes picking the same technology twice impossible.
  - Clients can read only their own rows. Writes go through the onboarding functions,
    which save the profile and the technologies in one transaction.
*/

create table public.technologies (
  id         text primary key check (id ~ '^[a-z0-9-]{1,32}$'),
  name       text not null check (char_length(name) between 1 and 40),
  category   text not null check (category in ('language', 'frontend', 'backend', 'tools')),
  sort_order smallint not null default 0,
  is_active  boolean not null default true
);

insert into public.technologies (id, name, category, sort_order) values
  ('javascript',   'JavaScript',   'language', 10),
  ('typescript',   'TypeScript',   'language', 20),
  ('python',       'Python',       'language', 30),
  ('html',         'HTML',         'language', 40),
  ('css',          'CSS',          'language', 50),
  ('sql',          'SQL',          'language', 60),
  ('react',        'React',        'frontend', 10),
  ('react-native', 'React Native', 'frontend', 20),
  ('nextjs',       'Next.js',      'frontend', 30),
  ('nodejs',       'Node.js',      'backend',  10),
  ('express',      'Express',      'backend',  20),
  ('git',          'Git',          'tools',    10),
  ('supabase',     'Supabase',     'tools',    20),
  ('docker',       'Docker',       'tools',    30);

create table public.user_technologies (
  user_id       uuid not null references auth.users (id) on delete cascade,
  technology_id text not null references public.technologies (id),
  created_at    timestamptz not null default now(),
  primary key (user_id, technology_id)
);

create index user_technologies_technology_id_idx on public.user_technologies (technology_id);

/* Defence in depth: never more than 8 technologies per learner. */
create function public.enforce_user_technologies_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.user_technologies where user_id = new.user_id) > 8 then
    raise exception 'A learner can pick at most 8 technologies'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_user_technologies_limit() from public, anon, authenticated;

create trigger user_technologies_limit
  after insert on public.user_technologies
  for each row execute function public.enforce_user_technologies_limit();

/* Row Level Security */
alter table public.technologies enable row level security;
alter table public.user_technologies enable row level security;

create policy "technologies: read"
  on public.technologies
  for select
  to authenticated
  using (true);

create policy "user_technologies: read own"
  on public.user_technologies
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

/* Privileges: read only. No client writes; see the onboarding functions. */
revoke all on public.technologies from anon, authenticated;
revoke all on public.user_technologies from anon, authenticated;
grant select on public.technologies to authenticated;
grant select on public.user_technologies to authenticated;
