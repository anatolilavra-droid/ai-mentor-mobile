import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
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
import { useToastStore } from '@/stores/toast.store';

import { toAuthActionError } from '../auth.errors';
import { resetPasswordSchema, type ResetPasswordValues } from '../auth.schemas';
import { requestPasswordReset, signOut, updatePassword, verifyRecoveryCode } from '../auth.service';
import { useAuth } from '../useAuth';

type Feedback = { tone: 'error' | 'success'; key: TranslationKey } | null;

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { setRecoveringPassword } = useAuth();
  const showToast = useToastStore((state) => state.show);
  const { email } = useLocalSearchParams<{ email?: string }>();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  // Once the code is accepted it cannot be used again: later retries only set the password.
  const [codeVerified, setCodeVerified] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [resending, setResending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  if (!email) return <Redirect href="/forgot-password" />;

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    // Keep protected routes closed: verifying the code signs the user in.
    setRecoveringPassword(true);
    let verified = codeVerified;
    try {
      if (!verified) {
        await verifyRecoveryCode(email, values.code);
        verified = true;
        setCodeVerified(true);
      }
      await updatePassword(values.password);
      showToast(t('auth.reset.success'));
      setRecoveringPassword(false);
    } catch (error) {
      // A wrong code leaves no session; a rejected password keeps the reset open for a retry.
      if (!verified) setRecoveringPassword(false);
      setFeedback({ tone: 'error', key: toAuthActionError(error).messageKey });
    }
  });

  const onResend = async () => {
    setFeedback(null);
    setResending(true);
    try {
      await requestPasswordReset(email);
      setFeedback({ tone: 'success', key: 'auth.forgot.sent' });
    } catch (error) {
      setFeedback({ tone: 'error', key: toAuthActionError(error).messageKey });
    } finally {
      setResending(false);
    }
  };

  const onBack = async () => {
    if (codeVerified) {
      await signOut().catch(() => undefined);
    }
    setRecoveringPassword(false);
    router.replace('/sign-in');
  };

  return (
    <Screen
      withBottomInset
      testID="reset-password-screen"
      footer={
        <Stack gap="xs">
          <Button
            label={t('auth.reset.submit')}
            leadingIcon={KeyRound}
            onPress={onSubmit}
            loading={isSubmitting}
            fullWidth
            testID="reset-submit"
          />
          <Button
            label={t('auth.forgot.back')}
            variant="ghost"
            size="md"
            fullWidth
            onPress={onBack}
          />
        </Stack>
      }
    >
      <ScreenHeader
        eyebrow={t('auth.eyebrow')}
        title={t('auth.reset.title')}
        subtitle={t('auth.reset.subtitle', { email })}
      />
      <Stack gap="md">
        {feedback ? (
          <InlineMessage
            tone={feedback.tone}
            message={t(feedback.key, { email })}
            testID="reset-feedback"
          />
        ) : null}
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label={t('auth.reset.code')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              editable={!codeVerified}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="reset-code"
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
              label={t('auth.newPassword')}
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
              testID="reset-password"
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
              testID="reset-confirm"
            />
          )}
        />
        {!codeVerified ? (
          <Button
            label={t('auth.reset.resend')}
            variant="ghost"
            size="md"
            loading={resending}
            onPress={onResend}
            testID="reset-resend"
          />
        ) : null}
      </Stack>
    </Screen>
  );
}
