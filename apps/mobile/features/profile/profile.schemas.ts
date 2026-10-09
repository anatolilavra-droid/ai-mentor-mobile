import type { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import {
  CUSTOM_GOAL_DETAILS_MAX,
  DAILY_MINUTES_MAX,
  DAILY_MINUTES_MIN,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_PATTERN,
  EXPERIENCE_LEVELS,
  PRIMARY_GOALS,
  UI_LANGUAGES,
} from '@ai-mentor/shared';

import type { TranslationKey } from '@/lib/i18n';
import type { ProfileUpdate } from '@/types/database';

const msg = (key: TranslationKey) => ({ error: key });

/** Enums and limits come from @ai-mentor/shared, the same values the API and database use. */
export {
  CUSTOM_GOAL_DETAILS_MAX,
  DAILY_MINUTES_MAX,
  DAILY_MINUTES_MIN,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  EXPERIENCE_LEVELS,
  PRIMARY_GOALS,
  UI_LANGUAGES,
};

/** Field schemas shared by Edit profile and onboarding, so the rules live in one place. */
export const displayNameField = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN, msg('profileForm.validation.nameTooShort'))
  .max(DISPLAY_NAME_MAX, msg('profileForm.validation.nameTooLong'))
  .regex(DISPLAY_NAME_PATTERN, msg('profileForm.validation.nameInvalid'));

/** Typed as a string, stored as an integer from 5 to 480. */
export const dailyMinutesField = z
  .string()
  .trim()
  .min(1, msg('profileForm.validation.minutesRequired'))
  .regex(/^\d+$/, msg('profileForm.validation.minutesInteger'))
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .min(DAILY_MINUTES_MIN, msg('profileForm.validation.minutesRange'))
      .max(DAILY_MINUTES_MAX, msg('profileForm.validation.minutesRange')),
  );

export const experienceLevelField = z.enum(
  EXPERIENCE_LEVELS,
  msg('profileForm.validation.levelRequired'),
);

export const uiLanguageField = z.enum(UI_LANGUAGES, msg('profileForm.validation.languageRequired'));

/** Profile row as returned by Supabase; validated before the app trusts it. */
export const profileRowSchema = z.object({
  id: z.uuid(),
  display_name: z.string().nullable(),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable(),
  primary_goal: z.enum(PRIMARY_GOALS).nullable(),
  custom_goal_details: z.string().nullable(),
  daily_minutes: z.number().int().nullable(),
  ui_language: z.enum(UI_LANGUAGES),
  onboarding_completed: z.boolean(),
  onboarding_completed_at: z.string().nullable(),
  onboarding_skipped_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Profile = z.infer<typeof profileRowSchema>;

/** Quick "Edit profile": only these three fields. Level, goal and technologies live in onboarding. */
export const editProfileSchema = z.object({
  display_name: displayNameField,
  daily_minutes: dailyMinutesField,
  ui_language: uiLanguageField,
});

export type EditProfileInput = z.input<typeof editProfileSchema>;
export type EditProfileOutput = z.output<typeof editProfileSchema> & ProfileUpdate;

export function toEditProfileDefaults(profile: Profile): DefaultValues<EditProfileInput> {
  return {
    display_name: profile.display_name ?? '',
    daily_minutes: profile.daily_minutes?.toString() ?? '',
    ui_language: profile.ui_language,
  };
}

export type OnboardingState = 'pending' | 'completed' | 'skipped';

/**
 * pending: must go through onboarding before the tabs.
 * skipped: chose "Skip for now"; tabs are open and onboarding can be resumed.
 * completed: all answers saved.
 */
export function getOnboardingState(profile: Profile | undefined): OnboardingState {
  if (!profile) return 'pending';
  if (profile.onboarding_completed) return 'completed';
  return profile.onboarding_skipped_at ? 'skipped' : 'pending';
}
