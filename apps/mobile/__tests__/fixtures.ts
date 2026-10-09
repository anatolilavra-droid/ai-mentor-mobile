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
