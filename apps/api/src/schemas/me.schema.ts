import { z } from 'zod';

import { experienceLevelSchema, primaryGoalSchema, uiLanguageSchema } from './common.schema.js';

/** The columns /api/me reads from profiles. Listed explicitly, never `select('*')`. */
export const PROFILE_COLUMNS =
  'id, display_name, experience_level, primary_goal, daily_minutes, ui_language, onboarding_completed';

/** A profiles row as PostgREST returns it. Validated: the database is an external source. */
export const profileRowSchema = z.object({
  id: z.uuid(),
  display_name: z.string().nullable(),
  experience_level: experienceLevelSchema.nullable(),
  primary_goal: primaryGoalSchema.nullable(),
  daily_minutes: z.number().int().nullable(),
  ui_language: uiLanguageSchema,
  onboarding_completed: z.boolean(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;

export const meResponseSchema = z
  .object({
    userId: z.uuid(),
    displayName: z.string().nullable(),
    experienceLevel: experienceLevelSchema.nullable(),
    primaryGoal: primaryGoalSchema.nullable(),
    dailyMinutes: z.number().int().nullable(),
    uiLanguage: uiLanguageSchema,
    onboardingCompleted: z.boolean(),
  })
  .strict();

export type MeResponse = z.infer<typeof meResponseSchema>;
