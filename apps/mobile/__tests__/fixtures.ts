import type { Session, User } from '@supabase/supabase-js';

import type { ProfileRow } from '@/types/database';

export const USER_ID = '7b1c6c2e-1d9a-4c55-9a59-3f0d1c8e2a10';

export const testUser = {
  id: USER_ID,
  email: 'anatoliy@example.com',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-10T08:00:00.000Z',
} as User;

export const testSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4_102_444_800,
  user: testUser,
} as Session;

export const completeProfile: ProfileRow = {
  id: USER_ID,
  display_name: 'Anatoliy',
  experience_level: 'junior',
  primary_goal: 'learn_react',
  custom_goal_details: 'Build my first React Native app',
  daily_minutes: 45,
  ui_language: 'en',
  onboarding_completed: true,
  onboarding_completed_at: '2026-10-12T08:00:00.000Z',
  onboarding_skipped_at: null,
  created_at: '2026-10-10T08:00:00.000Z',
  updated_at: '2026-10-10T08:00:00.000Z',
};

export const completeTechnologies = ['react', 'typescript'];

/** Just signed up: onboarding pending, nothing answered. */
export const newProfile: ProfileRow = {
  ...completeProfile,
  display_name: null,
  experience_level: null,
  primary_goal: null,
  custom_goal_details: null,
  daily_minutes: null,
  onboarding_completed: false,
  onboarding_completed_at: null,
};

/** Chose "Skip for now". */
export const skippedProfile: ProfileRow = {
  ...newProfile,
  onboarding_skipped_at: '2026-10-12T09:00:00.000Z',
};

/** Phase 2 account after the migration: basics answered, goal and technologies missing. */
export const phase2Profile: ProfileRow = {
  ...completeProfile,
  primary_goal: null,
  onboarding_completed: false,
  onboarding_completed_at: null,
};

/** A saved 3-day learning plan as Supabase returns it (detail select). */
export function planDetail(overrides: Record<string, unknown> = {}) {
  const planId = '00000000-0000-4000-8000-0000000000a1';
  const moduleId = '00000000-0000-4000-8000-0000000000b1';
  return {
    id: planId,
    user_id: testUser.id,
    technology_id: 'javascript',
    goal: 'learn_javascript',
    goal_details: 'My private goal words',
    experience_level: 'beginner',
    daily_minutes: 30,
    duration_days: 7,
    title: 'JavaScript week',
    summary: 'Small steps.',
    review_questions: ['What is a variable?'],
    next_step: 'Start with day 1.',
    status: 'active',
    prompt_version: 'learning-plan/v1',
    provider: 'mock',
    model: 'mock-mentor-1',
    created_at: '2026-10-12T10:00:00.000000+00:00',
    updated_at: '2026-10-12T10:00:00.000000+00:00',
    archived_at: null,
    learning_modules: [
      {
        id: moduleId,
        plan_id: planId,
        user_id: testUser.id,
        position: 1,
        title: 'Basics',
        description: 'Values.',
        objectives: [],
      },
    ],
    learning_tasks: [1, 2, 3].map((day) => ({
      id: `00000000-0000-4000-8000-00000000000${day}`,
      plan_id: planId,
      module_id: moduleId,
      user_id: testUser.id,
      day_number: day,
      position: day,
      kind: 'learn',
      title: `Day ${day}`,
      description: 'Do it.',
      estimated_minutes: 20,
      completed_at: day === 1 ? '2026-10-12T11:00:00+00:00' : null,
    })),
    ...overrides,
  };
}
