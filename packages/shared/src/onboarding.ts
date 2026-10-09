import { z } from 'zod';

import {
  CUSTOM_GOAL_DETAILS_MAX,
  DAILY_MINUTES_MAX,
  DAILY_MINUTES_MIN,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_PATTERN,
  TECHNOLOGIES_MAX,
  TECHNOLOGIES_MIN,
} from './constants.js';
import {
  experienceLevelSchema,
  primaryGoalSchema,
  technologyIdSchema,
  uiLanguageSchema,
} from './profile.js';

/** Technologies picked in onboarding: 1 to 8 catalog ids, no duplicates. */
export const technologySelectionSchema = z
  .array(technologyIdSchema)
  .min(TECHNOLOGIES_MIN)
  .max(TECHNOLOGIES_MAX)
  .refine((ids) => new Set(ids).size === ids.length, 'Each technology can be picked only once');

/**
 * Complete onboarding answers, as saved by complete_onboarding(). Platform-
 * neutral rules only: the app adds its own translated messages on top.
 */
export const onboardingAnswersSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(DISPLAY_NAME_MIN)
    .max(DISPLAY_NAME_MAX)
    .regex(DISPLAY_NAME_PATTERN),
  experience_level: experienceLevelSchema,
  primary_goal: primaryGoalSchema,
  custom_goal_details: z.string().trim().max(CUSTOM_GOAL_DETAILS_MAX).nullable(),
  daily_minutes: z.number().int().min(DAILY_MINUTES_MIN).max(DAILY_MINUTES_MAX),
  technologies: technologySelectionSchema,
  ui_language: uiLanguageSchema,
});
export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;
