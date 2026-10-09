import { z } from 'zod';

import {
  EXPERIENCE_LEVELS,
  PRIMARY_GOALS,
  TECHNOLOGY_ID_PATTERN,
  UI_LANGUAGES,
} from './constants.js';
import { userIdSchema } from './user.js';

export const experienceLevelSchema = z.enum(EXPERIENCE_LEVELS);
export const primaryGoalSchema = z.enum(PRIMARY_GOALS);
export const uiLanguageSchema = z.enum(UI_LANGUAGES);
export const technologyIdSchema = z.string().regex(TECHNOLOGY_ID_PATTERN);

/** GET /api/me: the caller's own profile. */
export const meResponseSchema = z
  .object({
    userId: userIdSchema,
    displayName: z.string().nullable(),
    experienceLevel: experienceLevelSchema.nullable(),
    primaryGoal: primaryGoalSchema.nullable(),
    dailyMinutes: z.number().int().nullable(),
    uiLanguage: uiLanguageSchema,
    onboardingCompleted: z.boolean(),
  })
  .strict();
export type MeResponse = z.infer<typeof meResponseSchema>;
