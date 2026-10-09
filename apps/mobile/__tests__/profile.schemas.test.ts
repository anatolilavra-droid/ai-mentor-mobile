import {
  isProfileComplete,
  profileFormSchema,
  type ProfileFormInput,
} from '@/features/profile/profile.schemas';

import { completeProfile, newProfile } from './fixtures';

const valid: ProfileFormInput = {
  display_name: 'Anatoliy',
  experience_level: 'junior',
  daily_minutes: '45',
  learning_goal: '',
  ui_language: 'en',
};

const errorFor = (patch: Partial<ProfileFormInput>) =>
  profileFormSchema.safeParse({ ...valid, ...patch }).error?.issues[0]?.message;

describe('profile form schema', () => {
  it('converts form strings into the database update', () => {
    expect(profileFormSchema.parse({ ...valid, display_name: '  Anatoliy  ' })).toEqual({
      display_name: 'Anatoliy',
      experience_level: 'junior',
      daily_minutes: 45,
      learning_goal: null,
      ui_language: 'en',
    });
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

  it('treats the learning goal as optional but meaningful', () => {
    expect(errorFor({ learning_goal: 'React' })).toBe('profileForm.validation.goalTooShort');
    expect(errorFor({ learning_goal: 'x'.repeat(281) })).toBe('profileForm.validation.goalTooLong');
    expect(errorFor({ learning_goal: 'Ship my first React Native app' })).toBeUndefined();
  });

  it('requires an experience level and a supported language', () => {
    expect(errorFor({ experience_level: 'expert' as never })).toBe(
      'profileForm.validation.levelRequired',
    );
    expect(errorFor({ ui_language: 'fr' as never })).toBe(
      'profileForm.validation.languageRequired',
    );
  });
});

describe('isProfileComplete', () => {
  it('is false until name, level and minutes are set', () => {
    expect(isProfileComplete(undefined)).toBe(false);
    expect(isProfileComplete(newProfile)).toBe(false);
    expect(isProfileComplete({ ...completeProfile, learning_goal: null })).toBe(true);
  });
});
