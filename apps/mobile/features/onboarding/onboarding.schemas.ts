import { z } from 'zod';

import {
  CUSTOM_GOAL_DETAILS_MAX,
  PRIMARY_GOALS,
  dailyMinutesField,
  displayNameField,
  experienceLevelField,
  uiLanguageField,
} from '@/features/profile/profile.schemas';
import type { TranslationKey } from '@/lib/i18n';

import type { OnboardingMode, OnboardingStep } from './steps';

const msg = (key: TranslationKey) => ({ error: key });

export const TECHNOLOGIES_MIN = 1;
export const TECHNOLOGIES_MAX = 8;
export const MINUTE_PRESETS = [15, 30, 45, 60] as const;

const primaryGoalField = z.enum(PRIMARY_GOALS, msg('onboarding.validation.goalRequired'));

/** Optional. Empty text is stored as null. */
const customGoalDetailsField = z
  .string()
  .trim()
  .max(CUSTOM_GOAL_DETAILS_MAX, msg('onboarding.validation.detailsTooLong'))
  .transform((value) => (value.length === 0 ? null : value));

const technologiesField = z
  .array(z.string().regex(/^[a-z0-9-]{1,32}$/))
  .min(TECHNOLOGIES_MIN, msg('onboarding.validation.technologiesMin'))
  .max(TECHNOLOGIES_MAX, msg('onboarding.validation.technologiesMax'))
  .refine(
    (ids) => new Set(ids).size === ids.length,
    msg('onboarding.validation.technologiesDuplicate'),
  );

/** One schema per step, so each step validates only its own answers. */
export const stepSchemas = {
  name: z.object({ display_name: displayNameField }),
  experience: z.object({ experience_level: experienceLevelField }),
  goal: z.object({ primary_goal: primaryGoalField, custom_goal_details: customGoalDetailsField }),
  time: z.object({ daily_minutes: dailyMinutesField }),
  technologies: z.object({ technologies: technologiesField }),
  language: z.object({ ui_language: uiLanguageField }),
} as const;

export type QuestionStep = keyof typeof stepSchemas;

/** Full first-run onboarding, validated before saving on the summary. */
export const onboardingSchema = stepSchemas.name
  .extend(stepSchemas.experience.shape)
  .extend(stepSchemas.goal.shape)
  .extend(stepSchemas.time.shape)
  .extend(stepSchemas.technologies.shape)
  .extend(stepSchemas.language.shape);

/** "Personalize your mentor": level, goal, goal details and technologies. */
export const personalizeSchema = stepSchemas.experience
  .extend(stepSchemas.goal.shape)
  .extend(stepSchemas.technologies.shape);

export type OnboardingOutput = z.output<typeof onboardingSchema>;
export type PersonalizeOutput = z.output<typeof personalizeSchema>;

/**
 * Form values as typed on the screens. Every field exists in both modes so one
 * form shape serves the whole flow; the mode's schema decides what is checked.
 */
export type OnboardingFormValues = {
  display_name: string;
  experience_level: z.input<typeof experienceLevelField> | undefined;
  primary_goal: z.input<typeof primaryGoalField> | undefined;
  custom_goal_details: string;
  daily_minutes: string;
  technologies: string[];
  ui_language: z.input<typeof uiLanguageField>;
};

export const STEP_FIELDS: Record<QuestionStep, readonly (keyof OnboardingFormValues)[]> = {
  name: ['display_name'],
  experience: ['experience_level'],
  goal: ['primary_goal', 'custom_goal_details'],
  time: ['daily_minutes'],
  technologies: ['technologies'],
  language: ['ui_language'],
};

export function isQuestionStep(step: OnboardingStep): step is QuestionStep {
  return step !== 'summary';
}

export function isStepValid(step: QuestionStep, values: OnboardingFormValues): boolean {
  return stepSchemas[step].safeParse(values).success;
}

/** Draft saved on the device after each step. Validated when read back. */
export const draftSchema = z.object({
  version: z.literal(1),
  userId: z.string().min(1),
  mode: z.enum(['onboarding', 'personalize']),
  currentStep: z.enum([
    'name',
    'experience',
    'goal',
    'time',
    'technologies',
    'language',
    'summary',
  ]),
  values: z.object({
    display_name: z.string().max(200).optional(),
    experience_level: z.string().optional(),
    primary_goal: z.string().optional(),
    custom_goal_details: z.string().max(2000).optional(),
    daily_minutes: z.string().max(10).optional(),
    technologies: z.array(z.string()).max(20).optional(),
    ui_language: z.string().optional(),
  }),
  updatedAt: z.string(),
});

export type OnboardingDraft = z.infer<typeof draftSchema>;

export function schemaFor(mode: OnboardingMode) {
  return mode === 'onboarding' ? onboardingSchema : personalizeSchema;
}
