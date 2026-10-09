import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, Stack, TextField } from '@/components/ui';
import { useErrorText } from '@/hooks/useErrorText';
import type { TranslationKey } from '@/lib/i18n';

import { toAuthActionError } from '../auth.errors';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../auth.schemas';
import { requestPasswordReset } from '../auth.service';

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const [formError, setFormError] = useState<TranslationKey | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await requestPasswordReset(email);
      router.push({ pathname: '/reset-password', params: { email } });
    } catch (error) {
      setFormError(toAuthActionError(error).messageKey);
    }
  });

  return (
    <Screen
      withBottomInset
      testID="forgot-password-screen"
      footer={
        <Stack gap="xs">
          <Button
            label={t('auth.forgot.submit')}
            leadingIcon={Send}
            onPress={onSubmit}
            loading={isSubmitting}
            fullWidth
            testID="forgot-submit"
          />
          <Button
            label={t('auth.forgot.back')}
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => router.replace('/sign-in')}
          />
        </Stack>
      }
    >
      <ScreenHeader
        eyebrow={t('auth.eyebrow')}
        title={t('auth.forgot.title')}
        subtitle={t('auth.forgot.subtitle')}
      />
      <Stack gap="md">
        {formError ? (
          <InlineMessage tone="error" message={t(formError)} testID="forgot-error" />
        ) : null}
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={onSubmit}
              testID="forgot-email"
            />
          )}
        />
      </Stack>
    </Screen>
  );
}
