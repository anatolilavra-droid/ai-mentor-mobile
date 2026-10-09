import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, type DefaultValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, ChoiceGroup, Stack, TextField } from '@/components/ui';
import { MinutesField } from '@/features/onboarding/components/MinutesField';
import { useErrorText } from '@/hooks/useErrorText';

import {
  DISPLAY_NAME_MAX,
  UI_LANGUAGES,
  editProfileSchema,
  type EditProfileInput,
  type EditProfileOutput,
} from '../profile.schemas';

type ProfileFormScreenProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  submitLabel: string;
  submitIcon: LucideIcon;
  defaultValues: DefaultValues<EditProfileInput>;
  onSubmit: (values: EditProfileOutput) => Promise<void>;
  /** Extra footer action under the primary button (e.g. Cancel). */
  secondaryAction?: ReactNode;
  testID?: string;
};

/**
 * Quick profile edit: display name, daily minutes and interface language.
 * Level, goal and technologies are changed in "Personalize your mentor".
 */
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
  } = useForm<EditProfileInput, unknown, EditProfileOutput>({
    resolver: zodResolver(editProfileSchema),
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
          name="daily_minutes"
          render={({ field, fieldState }) => (
            <MinutesField
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              testID="profile-minutes"
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
