import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, Stack, TextField } from '@/components/ui';
import { useErrorText } from '@/hooks/useErrorText';
import { deviceUiLanguage, type TranslationKey } from '@/lib/i18n';

import { toAuthActionError } from '../auth.errors';
import { signUpSchema, type SignUpValues } from '../auth.schemas';
import { signUp } from '../auth.service';

export function SignUpScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { needsEmailConfirmation } = await signUp(
        values.email,
        values.password,
        deviceUiLanguage(),
      );
      // Without confirmation the user is signed in and the guard opens profile setup.
      if (needsEmailConfirmation) setConfirmationSentTo(values.email);
    } catch (error) {
      setFormError(toAuthActionError(error).messageKey);
    }
  });

  if (confirmationSentTo) {
    return (
      <Screen
        withBottomInset
        testID="sign-up-confirm-screen"
        footer={
          <Button
            label={t('auth.signUp.haveAccount')}
            fullWidth
            onPress={() => router.replace('/sign-in')}
          />
        }
      >
        <ScreenHeader eyebrow={t('auth.eyebrow')} title={t('auth.signUp.checkEmailTitle')} />
        <InlineMessage
          tone="success"
          message={t('auth.signUp.checkEmailMessage', { email: confirmationSentTo })}
          testID="sign-up-check-email"
        />
      </Screen>
    );
  }

  return (
    <Screen
      withBottomInset
      testID="sign-up-screen"
      footer={
        <Stack gap="xs">
          <Button
            label={t('auth.signUp.submit')}
            leadingIcon={UserPlus}
            onPress={onSubmit}
            loading={isSubmitting}
            fullWidth
            testID="sign-up-submit"
          />
          <Button
            label={t('auth.signUp.haveAccount')}
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
        title={t('auth.signUp.title')}
        subtitle={t('auth.signUp.subtitle')}
      />
      <Stack gap="md">
        {formError ? (
          <InlineMessage tone="error" message={t(formError)} testID="sign-up-error" />
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
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="sign-up-email"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              ref={(input) => {
                field.ref(input);
                passwordRef.current = input;
              }}
              label={t('auth.password')}
              hint={t('auth.passwordHint')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              secure
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmRef.current?.focus()}
              testID="sign-up-password"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <TextField
              ref={(input) => {
                field.ref(input);
                confirmRef.current = input;
              }}
              label={t('auth.confirmPassword')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              secure
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              testID="sign-up-confirm"
            />
          )}
        />
      </Stack>
    </Screen>
  );
}
