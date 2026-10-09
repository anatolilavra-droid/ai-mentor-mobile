/*
  Phase 3: onboarding writes, each in a single transaction.

  The functions run as their owner (security definer) because clients cannot
  write these columns or user_technologies directly. Every function acts only
  on the caller's own row (auth.uid()), validates its input, and either saves
  everything or nothing.

  - complete_onboarding: saves all answers and technologies, marks onboarding completed.
  - save_personalization: changes level, goal, goal details and technologies.
  - skip_onboarding: remembers that the learner skipped; does nothing once completed.
*/

/* Shared input checks for the technology list: 1..8, no duplicates, active catalog entries. */
create function public.assert_valid_technologies(p_technologies text[])
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_count integer := coalesce(cardinality(p_technologies), 0);
begin
  if v_count < 1 or v_count > 8 then
    raise exception 'Pick between 1 and 8 technologies' using errcode = 'invalid_parameter_value';
  end if;

  if (select count(distinct t) from unnest(p_technologies) as t) <> v_count then
    raise exception 'Each technology can be picked only once' using errcode = 'invalid_parameter_value';
  end if;

  if (
    select count(*)
    from public.technologies
    where id = any (p_technologies) and is_active
  ) <> v_count then
    raise exception 'Unknown technology' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

/* Replace the caller's technologies with the given set. */
create function public.replace_my_technologies(p_technologies text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  delete from public.user_technologies where user_id = v_user;
  insert into public.user_technologies (user_id, technology_id)
  select v_user, t from unnest(p_technologies) as t;
end;
$$;

create function public.complete_onboarding(
  p_display_name text,
  p_experience_level text,
  p_primary_goal text,
  p_custom_goal_details text,
  p_daily_minutes integer,
  p_ui_language text,
  p_technologies text[]
)
returns void
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

  perform public.assert_valid_technologies(p_technologies);

  update public.profiles
  set display_name            = btrim(p_display_name),
      experience_level        = p_experience_level,
      primary_goal            = p_primary_goal,
      custom_goal_details     = nullif(btrim(coalesce(p_custom_goal_details, '')), ''),
      daily_minutes           = p_daily_minutes,
      ui_language             = p_ui_language,
      onboarding_completed    = true,
      onboarding_completed_at = coalesce(onboarding_completed_at, now()),
      onboarding_skipped_at   = null
  where id = v_user;

  if not found then
    raise exception 'Profile not found' using errcode = 'no_data_found';
  end if;

  perform public.replace_my_technologies(p_technologies);
end;
$$;

create function public.save_personalization(
  p_experience_level text,
  p_primary_goal text,
  p_custom_goal_details text,
  p_technologies text[]
)
returns void
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

  perform public.assert_valid_technologies(p_technologies);

  update public.profiles
  set experience_level    = p_experience_level,
      primary_goal        = p_primary_goal,
      custom_goal_details = nullif(btrim(coalesce(p_custom_goal_details, '')), '')
  where id = v_user;

  if not found then
    raise exception 'Profile not found' using errcode = 'no_data_found';
  end if;

  perform public.replace_my_technologies(p_technologies);
end;
$$;

create function public.skip_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  update public.profiles
  set onboarding_skipped_at = now()
  where id = auth.uid()
    and not onboarding_completed;
end;
$$;

/* Only signed-in users may call the public functions; helpers are internal. */
revoke execute on function public.assert_valid_technologies(text[]) from public, anon, authenticated;
revoke execute on function public.replace_my_technologies(text[]) from public, anon, authenticated;
revoke execute on function public.complete_onboarding(text, text, text, text, integer, text, text[]) from public, anon;
revoke execute on function public.save_personalization(text, text, text, text[]) from public, anon;
revoke execute on function public.skip_onboarding() from public, anon;
grant execute on function public.complete_onboarding(text, text, text, text, integer, text, text[]) to authenticated;
grant execute on function public.save_personalization(text, text, text, text[]) to authenticated;
grant execute on function public.skip_onboarding() to authenticated;
