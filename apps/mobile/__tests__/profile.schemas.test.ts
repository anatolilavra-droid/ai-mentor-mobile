import {
  editProfileSchema,
  getOnboardingState,
  type EditProfileInput,
} from '@/features/profile/profile.schemas';

import { completeProfile, newProfile, phase2Profile, skippedProfile } from './fixtures';

const valid: EditProfileInput = {
  display_name: 'Anatoliy',
  daily_minutes: '45',
  ui_language: 'en',
};

const errorFor = (patch: Partial<EditProfileInput>) =>
  editProfileSchema.safeParse({ ...valid, ...patch }).error?.issues[0]?.message;

describe('edit profile schema', () => {
  it('converts form strings into the allowed profile update', () => {
    expect(editProfileSchema.parse({ ...valid, display_name: '  Anatoliy  ' })).toEqual({
      display_name: 'Anatoliy',
      daily_minutes: 45,
      ui_language: 'en',
    });
  });

  it('contains only display name, daily minutes and language', () => {
    expect(Object.keys(editProfileSchema.shape).sort()).toEqual([
      'daily_minutes',
      'display_name',
      'ui_language',
    ]);
  });

  it.each(['Анатолий', "O'Neil", 'Ana-Maria Li', 'dev_42', 'Jürgen'])(
    'accepts the name %p',
    (name) => {
      expect(errorFor({ display_name: name })).toBeUndefined();
    },
  );

  it.each([
    ['A', 'profileForm.validation.nameTooShort'],
    ['x'.repeat(51), 'profileForm.validation.nameTooLong'],
    ['42dev', 'profileForm.validation.nameInvalid'],
    ['Anatoliy <script>', 'profileForm.validation.nameInvalid'],
  ])('rejects the name %p', (name, key) => {
    expect(errorFor({ display_name: name })).toBe(key);
  });

  it.each([
    ['', 'profileForm.validation.minutesRequired'],
    ['4', 'profileForm.validation.minutesRange'],
    ['481', 'profileForm.validation.minutesRange'],
    ['30.5', 'profileForm.validation.minutesInteger'],
    ['abc', 'profileForm.validation.minutesInteger'],
  ])('rejects daily minutes %p', (minutes, key) => {
    expect(errorFor({ daily_minutes: minutes })).toBe(key);
  });

  it.each(['5', '480'])('accepts the boundary %p minutes', (minutes) => {
    expect(errorFor({ daily_minutes: minutes })).toBeUndefined();
  });

  it('requires a supported language', () => {
    expect(errorFor({ ui_language: 'fr' as never })).toBe(
      'profileForm.validation.languageRequired',
    );
  });
});

describe('getOnboardingState', () => {
  it('derives pending, skipped and completed', () => {
    expect(getOnboardingState(undefined)).toBe('pending');
    expect(getOnboardingState(newProfile)).toBe('pending');
    expect(getOnboardingState(phase2Profile)).toBe('pending');
    expect(getOnboardingState(skippedProfile)).toBe('skipped');
    expect(getOnboardingState(completeProfile)).toBe('completed');
  });
});
