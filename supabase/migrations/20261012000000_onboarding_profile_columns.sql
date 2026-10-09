/*
  Phase 3: onboarding state and the learner's main goal on profiles.

  - primary_goal: exactly one stable slug from the fixed list (required to finish onboarding).
  - custom_goal_details: optional free text, 0..500 characters, stored separately.
  - onboarding_completed / onboarding_completed_at / onboarding_skipped_at: onboarding state.
  - learning_goal (Phase 2) is kept for older app builds, copied into custom_goal_details,
    and closed for client writes. It will be dropped in a later migration.
*/

alter table public.profiles
  add column primary_goal text
    check (primary_goal is null or primary_goal in (
      'learn_javascript',
      'build_web_apps',
      'prepare_for_job',
      'improve_fundamentals',
      'learn_react',
      'personal_projects'
    )),
  add column custom_goal_details text
    check (custom_goal_details is null or char_length(custom_goal_details) <= 500),
  add column onboarding_completed boolean not null default false,
  add column onboarding_completed_at timestamptz,
  add column onboarding_skipped_at timestamptz;

/* Onboarding can be marked completed only when the core answers exist. */
alter table public.profiles
  add constraint profiles_completed_requires_answers check (
    not onboarding_completed
    or (
      display_name is not null
      and experience_level is not null
      and daily_minutes is not null
      and primary_goal is not null
    )
  );

/* Keep what users already wrote as their goal (Phase 2 free text, max 280). */
update public.profiles
set custom_goal_details = learning_goal
where learning_goal is not null
  and custom_goal_details is null;

/*
  Column privileges: the quick "Edit profile" may change only these three fields.
  Experience level, goal and onboarding state change only through the
  functions in 20261012000200_onboarding_functions.sql.
*/
revoke update (display_name, experience_level, learning_goal, daily_minutes, ui_language)
  on public.profiles from authenticated;
grant update (display_name, daily_minutes, ui_language)
  on public.profiles to authenticated;
