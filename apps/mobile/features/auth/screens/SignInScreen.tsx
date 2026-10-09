import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, Stack, TextField } from '@/components/ui';
import { useErrorText } from '@/hooks/useErrorText';
import type { TranslationKey } from '@/lib/i18n';

import { toAuthActionError } from '../auth.errors';
import { signInSchema, type SignInValues } from '../auth.schemas';
import { signIn } from '../auth.service';

export function SignInScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const passwordRef = useRef<TextInput>(null);
  const [formError, setFormError] = useState<TranslationKey | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      // On success the auth guard moves the user into the app.
    } catch (error) {
      setFormError(toAuthActionError(error).messageKey);
    }
  });

  return (
    <Screen
      withBottomInset
      testID="sign-in-screen"
      footer={
        <Stack gap="xs">
          <Button
            label={t('auth.signIn.submit')}
            leadingIcon={LogIn}
            onPress={onSubmit}
            loading={isSubmitting}
            fullWidth
            testID="sign-in-submit"
          />
          <Button
            label={t('auth.signIn.noAccount')}
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => router.replace('/sign-up')}
            testID="go-to-sign-up"
          />
        </Stack>
      }
    >
      <ScreenHeader
        eyebrow={t('auth.eyebrow')}
        title={t('auth.signIn.title')}
        subtitle={t('auth.signIn.subtitle')}
      />
      <Stack gap="md">
        {formError ? (
          <InlineMessage tone="error" message={t(formError)} testID="sign-in-error" />
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
              testID="sign-in-email"
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
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              secure
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              testID="sign-in-password"
            />
          )}
        />
        <Button
          label={t('auth.signIn.forgot')}
          variant="ghost"
          size="md"
          onPress={() => router.push('/forgot-password')}
          testID="go-to-forgot"
        />
      </Stack>
    </Screen>
  );
}
