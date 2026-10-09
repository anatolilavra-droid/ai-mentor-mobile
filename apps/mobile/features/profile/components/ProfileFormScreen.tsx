import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, type DefaultValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, ChoiceGroup, Stack, TextField } from '@/components/ui';
import { useErrorText } from '@/hooks/useErrorText';

import {
  DAILY_MINUTES_MAX,
  DISPLAY_NAME_MAX,
  EXPERIENCE_LEVELS,
  LEARNING_GOAL_MAX,
  UI_LANGUAGES,
  profileFormSchema,
  type ProfileFormInput,
  type ProfileFormOutput,
} from '../profile.schemas';

const MINUTE_PRESETS = [15, 30, 45, 60, 90, 120] as const;

type ProfileFormScreenProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  submitLabel: string;
  submitIcon: LucideIcon;
  defaultValues: DefaultValues<ProfileFormInput>;
  onSubmit: (values: ProfileFormOutput) => Promise<void>;
  /** Extra footer action under the primary button (e.g. Cancel). */
  secondaryAction?: ReactNode;
  testID?: string;
};

/** Profile fields shared by first-time setup and editing. */
export function ProfileFormScreen({
  eyebrow,
  title,
  subtitle,
  submitLabel,
  submitIcon,
  defaultValues,
  onSubmit,
  secondaryAction,
  testID,
}: ProfileFormScreenProps) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const [failed, setFailed] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setFailed(false);
    try {
      await onSubmit(values);
    } catch {
      setFailed(true);
    }
  });

  return (
    <Screen
      withBottomInset
      testID={testID}
      footer={
        <Stack gap="xs">
          <Button
            label={submitLabel}
            leadingIcon={submitIcon}
            onPress={submit}
            loading={isSubmitting}
            fullWidth
            testID="profile-form-submit"
          />
          {secondaryAction}
        </Stack>
      }
    >
      <ScreenHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <Stack gap="lg">
        {failed ? (
          <InlineMessage
            tone="error"
            message={t('common.profileError.message')}
            testID="profile-form-error"
          />
        ) : null}

        <Controller
          control={control}
          name="display_name"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label={t('profileForm.displayName')}
              placeholder={t('profileForm.displayNamePlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              maxLength={DISPLAY_NAME_MAX}
              returnKeyType="done"
              testID="profile-display-name"
            />
          )}
        />

        <Controller
          control={control}
          name="experience_level"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              label={t('profileForm.experienceLevel')}
              layout="list"
              value={field.value}
              onChange={field.onChange}
              error={errorText(fieldState.error?.message)}
              options={EXPERIENCE_LEVELS.map((level) => ({
                value: level,
                label: t(`profileForm.levels.${level}`),
                description: t(`profileForm.levelHints.${level}`),
              }))}
              testID="profile-level"
            />
          )}
        />

        <Controller
          control={control}
          name="daily_minutes"
          render={({ field, fieldState }) => (
            <Stack gap="xs">
              <ChoiceGroup
                label={t('profileForm.dailyMinutes')}
                value={Number(field.value) || null}
                onChange={(minutes) => field.onChange(String(minutes))}
                options={MINUTE_PRESETS.map((minutes) => ({
                  value: minutes,
                  label: t('profileForm.minutesOption', { count: minutes }),
                }))}
                testID="profile-minutes-preset"
              />
              <TextField
                ref={field.ref}
                label={t('profileForm.dailyMinutes')}
                hint={t('profileForm.dailyMinutesHint')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(fieldState.error?.message)}
                keyboardType="number-pad"
                maxLength={String(DAILY_MINUTES_MAX).length}
                returnKeyType="done"
                testID="profile-minutes"
              />
            </Stack>
          )}
        />

        <Controller
          control={control}
          name="learning_goal"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label={`${t('profileForm.learningGoal')} · ${t('common.optional')}`}
              placeholder={t('profileForm.learningGoalPlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              multiline
              maxLength={LEARNING_GOAL_MAX}
              showCounter
              testID="profile-goal"
            />
          )}
        />

        <Controller
          control={control}
          name="ui_language"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              label={t('profileForm.uiLanguage')}
              value={field.value}
              onChange={field.onChange}
              error={errorText(fieldState.error?.message)}
              hint={field.value === 'en' ? undefined : t('profileForm.languageHint')}
              options={UI_LANGUAGES.map((language) => ({
                value: language,
                label: t(`profileForm.languages.${language}`),
              }))}
              testID="profile-language"
            />
          )}
        />
      </Stack>
    </Screen>
  );
}
