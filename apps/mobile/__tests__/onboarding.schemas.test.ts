import {
  isStepValid,
  onboardingSchema,
  personalizeSchema,
  stepSchemas,
  type OnboardingFormValues,
} from '@/features/onboarding/onboarding.schemas';

const valid: OnboardingFormValues = {
  display_name: 'Anatoliy',
  experience_level: 'junior',
  primary_goal: 'learn_react',
  custom_goal_details: '',
  daily_minutes: '30',
  technologies: ['react', 'typescript'],
  ui_language: 'ru',
};

const issues = (patch: Partial<OnboardingFormValues>) =>
  onboardingSchema.safeParse({ ...valid, ...patch }).error?.issues.map((issue) => issue.message) ??
  [];

describe('onboarding schema', () => {
  it('produces the values saved to Supabase', () => {
    expect(onboardingSchema.parse({ ...valid, custom_goal_details: '  Portfolio  ' })).toEqual({
      display_name: 'Anatoliy',
      experience_level: 'junior',
      primary_goal: 'learn_react',
      custom_goal_details: 'Portfolio',
      daily_minutes: 30,
      technologies: ['react', 'typescript'],
      ui_language: 'ru',
    });
  });

  it('stores empty goal details as null', () => {
    expect(onboardingSchema.parse(valid).custom_goal_details).toBeNull();
  });

  it('requires exactly one main goal from the list', () => {
    expect(issues({ primary_goal: undefined })).toContain('onboarding.validation.goalRequired');
    expect(issues({ primary_goal: 'learn_rust' as never })).toContain(
      'onboarding.validation.goalRequired',
    );
  });

  it('limits goal details to 500 characters', () => {
    expect(issues({ custom_goal_details: 'x'.repeat(500) })).toEqual([]);
    expect(issues({ custom_goal_details: 'x'.repeat(501) })).toContain(
      'onboarding.validation.detailsTooLong',
    );
  });

  it.each([
    ['4', 'profileForm.validation.minutesRange'],
    ['481', 'profileForm.validation.minutesRange'],
    ['', 'profileForm.validation.minutesRequired'],
  ])('rejects %p daily minutes', (minutes, key) => {
    expect(issues({ daily_minutes: minutes })).toContain(key);
  });

  it.each(['5', '15', '480'])('accepts %p daily minutes', (minutes) => {
    expect(issues({ daily_minutes: minutes })).toEqual([]);
  });

  it('requires 1 to 8 technologies without duplicates', () => {
    expect(issues({ technologies: [] })).toContain('onboarding.validation.technologiesMin');
    expect(issues({ technologies: ['react'] })).toEqual([]);
    expect(issues({ technologies: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] })).toEqual([]);
    expect(issues({ technologies: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] })).toContain(
      'onboarding.validation.technologiesMax',
    );
    expect(issues({ technologies: ['react', 'react'] })).toContain(
      'onboarding.validation.technologiesDuplicate',
    );
  });

  it('personalize mode checks only level, goal, details and technologies', () => {
    expect(personalizeSchema.parse({ ...valid, display_name: '', daily_minutes: '' })).toEqual({
      experience_level: 'junior',
      primary_goal: 'learn_react',
      custom_goal_details: null,
      technologies: ['react', 'typescript'],
    });
  });

  it('validates each step on its own', () => {
    expect(isStepValid('name', { ...valid, display_name: 'A' })).toBe(false);
    expect(isStepValid('technologies', { ...valid, technologies: [] })).toBe(false);
    expect(isStepValid('goal', valid)).toBe(true);
    expect(Object.keys(stepSchemas)).toEqual([
      'name',
      'experience',
      'goal',
      'time',
      'technologies',
      'language',
    ]);
  });
});
