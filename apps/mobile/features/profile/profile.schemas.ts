import type { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import type { TranslationKey } from '@/lib/i18n';
import type { ExperienceLevel, ProfileUpdate, UiLanguage } from '@/types/database';

const msg = (key: TranslationKey) => ({ error: key });

export const EXPERIENCE_LEVELS = [
  'beginner',
  'junior',
  'middle',
  'advanced',
] as const satisfies readonly ExperienceLevel[];
export const UI_LANGUAGES = ['en', 'ru', 'de'] as const satisfies readonly UiLanguage[];

/** Same limits as the database constraints in supabase/migrations. */
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 50;
export const LEARNING_GOAL_MIN = 10;
export const LEARNING_GOAL_MAX = 280;
export const DAILY_MINUTES_MIN = 5;
export const DAILY_MINUTES_MAX = 480;

/** Starts with a letter (any script); then letters, digits, spaces, . - ' _ */
const DISPLAY_NAME_PATTERN = /^\p{L}[\p{L}\p{M}\p{N} .'_-]*$/u;

/** Profile row as returned by Supabase; validated before the app trusts it. */
export const profileRowSchema = z.object({
  id: z.uuid(),
  display_name: z.string().nullable(),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable(),
  learning_goal: z.string().nullable(),
  daily_minutes: z.number().int().nullable(),
  ui_language: z.enum(UI_LANGUAGES),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Profile = z.infer<typeof profileRowSchema>;

/** Form values are strings as typed; the schema output is the database update. */
export const profileFormSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(DISPLAY_NAME_MIN, msg('profileForm.validation.nameTooShort'))
    .max(DISPLAY_NAME_MAX, msg('profileForm.validation.nameTooLong'))
    .regex(DISPLAY_NAME_PATTERN, msg('profileForm.validation.nameInvalid')),
  experience_level: z.enum(EXPERIENCE_LEVELS, msg('profileForm.validation.levelRequired')),
  daily_minutes: z
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
    ),
  learning_goal: z
    .string()
    .trim()
    .max(LEARNING_GOAL_MAX, msg('profileForm.validation.goalTooLong'))
    .refine(
      (value) => value.length === 0 || value.length >= LEARNING_GOAL_MIN,
      msg('profileForm.validation.goalTooShort'),
    )
    .transform((value) => (value.length === 0 ? null : value)),
  ui_language: z.enum(UI_LANGUAGES, msg('profileForm.validation.languageRequired')),
});

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileFormOutput = z.output<typeof profileFormSchema> & ProfileUpdate;

/** Form defaults; fields not filled yet stay empty (experience level unselected). */
export function toProfileFormDefaults(profile: Profile): DefaultValues<ProfileFormInput> {
  return {
    display_name: profile.display_name ?? '',
    experience_level: profile.experience_level ?? undefined,
    daily_minutes: profile.daily_minutes?.toString() ?? '',
    learning_goal: profile.learning_goal ?? '',
    ui_language: profile.ui_language,
  };
}

/** Profile setup is done once the fields the mentor relies on are filled. */
export function isProfileComplete(profile: Profile | undefined): boolean {
  return Boolean(profile?.display_name && profile.experience_level && profile.daily_minutes);
}
