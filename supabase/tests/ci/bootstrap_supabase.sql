/*
  CI only: a minimal stand-in for what a Supabase project already has, so the
  migrations and the RLS test scripts can run on a plain Postgres
  (GitHub Actions "Database checks", or a local check).

  NEVER run this file in the real Supabase project: there these objects exist already.

  - roles anon, authenticated, service_role (no login);
  - schema auth with a small auth.users table and auth.uid() reading the JWT
    claims the test scripts set with `set local request.jwt.claims`;
  - Supabase's default privileges on the public schema (everything granted to
    anon and authenticated, functions executable by public), so the migrations
    have to revoke what they do not want, exactly as in the real project.
*/

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key,
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

/* Same logic as Supabase: the subject of the request's JWT, or null. */
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
