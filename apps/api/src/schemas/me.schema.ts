import {
  experienceLevelSchema,
  primaryGoalSchema,
  uiLanguageSchema,
  userIdSchema,
} from '@ai-mentor/shared';
import { z } from 'zod';

/** The columns the API reads from profiles. Listed explicitly, never `select('*')`. */
export const PROFILE_COLUMNS =
  'id, display_name, experience_level, primary_goal, daily_minutes, ui_language, onboarding_completed';

/** A profiles row as PostgREST returns it (server-only). Validated: the database is external. */
export const profileRowSchema = z.object({
  id: userIdSchema,
  display_name: z.string().nullable(),
  experience_level: experienceLevelSchema.nullable(),
  primary_goal: primaryGoalSchema.nullable(),
  daily_minutes: z.number().int().nullable(),
  ui_language: uiLanguageSchema,
  onboarding_completed: z.boolean(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;
