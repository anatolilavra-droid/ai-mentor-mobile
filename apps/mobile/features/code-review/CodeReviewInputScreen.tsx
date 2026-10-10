import {
  CODE_LANGUAGES,
  CODE_REVIEW_ACTIONS,
  checkCodeInput,
  codeReviewActionSchema,
  findPossibleSecrets,
  type CodeLanguage,
  type CodeReviewAction,
} from '@ai-mentor/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { PlugZap, SearchCode } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/states';
import { Button, ChoiceGroup } from '@/components/ui';
import { spacing } from '@/constants/tokens';
import { LimitReachedCard } from '@/features/chat/components/LimitReachedCard';
import { QuotaBadge } from '@/features/chat/components/QuotaBadge';
import { ThinkingIndicator } from '@/features/chat/components/ThinkingIndicator';
import { apiBaseUrl } from '@/lib/api/config';
import { isApiError, isRetryable } from '@/lib/api/errors';

import { codeReviewErrorKey } from './codeReview.errors';
import { useCodeReviewStore } from './codeReview.store';
import { BackBar } from './components/BackBar';
import { CodeInput } from './components/CodeInput';
import { confirmPossibleSecrets } from './confirmSecrets';
import { useCodeReview } from './useCodeReview';

/** Back to wherever the flow was opened from (Home or Chat). */
export function leaveCodeReview() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Header() {
  const { t } = useTranslation();
  return (
    <>
      <BackBar onBack={leaveCodeReview} testID="code-review-back" />
      <ScreenHeader
        eyebrow={t('codeReview.eyebrow')}
        title={t('codeReview.title')}
        subtitle={t('codeReview.subtitle')}
        size="title"
      />
    </>
  );
}

function NotConnected() {
  const { t } = useTranslation();
  return (
    <Screen withBottomInset testID="code-review-screen">
      <Header />
      <EmptyState
        icon={PlugZap}
        title={t('chat.notConnected.title')}
        description={t('chat.notConnected.description')}
        testID="code-review-not-connected"
      />
    </Screen>
  );
}

/** Applies `?action=` once, and only while no code was typed yet. */
function useActionParam() {
  const params = useLocalSearchParams<{ action?: string }>();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const parsed = codeReviewActionSchema.safeParse(params.action);
    const state = useCodeReviewStore.getState();
    if (parsed.success && state.code.length === 0) state.setAction(parsed.data);
  }, [params.action]);
}

function ReviewForm() {
  const { t } = useTranslation();
  useActionParam();
  const language = useCodeReviewStore((state) => state.language);
  const action = useCodeReviewStore((state) => state.action);
  const code = useCodeReviewStore((state) => state.code);
  const { setLanguage, setAction, setCode } = useCodeReviewStore.getState();
  const check = useMemo(() => checkCodeInput(code), [code]);

  const { submit, retry, cancel, isPending, error } = useCodeReview({
    onSuccess: () => router.push('/code-review/result'),
  });

  const languageOptions = useMemo(
    () => CODE_LANGUAGES.map((value) => ({ value, label: t(`codeReview.languages.${value}`) })),
    [t],
  );
  const actionOptions = useMemo(
    () =>
      CODE_REVIEW_ACTIONS.map((value) => ({
        value,
        label: t(`codeReview.actions.${value}.title`),
        description: t(`codeReview.actions.${value}.description`),
      })),
    [t],
  );

  const send = async () => {
    if (!check.valid || isPending) return;
    // The secret check runs on the device only and reports kinds and lines, never values.
    const findings = findPossibleSecrets(code);
    if (findings.length > 0 && !(await confirmPossibleSecrets(findings, t))) return;
    submit({ language, action, code });
  };

  const limitReached = isApiError(error) && error.code === 'USAGE_LIMIT_REACHED';

  return (
    <Screen
      withBottomInset
      testID="code-review-screen"
      footer={
        isPending ? (
          <View style={styles.pending}>
            <ThinkingIndicator label={t('codeReview.pending')} testID="code-review-thinking" />
            <Button
              label={t('codeReview.cancel')}
              variant="secondary"
              fullWidth
              onPress={cancel}
              testID="code-review-cancel"
            />
          </View>
        ) : (
          <Button
            label={t('codeReview.submit')}
            leadingIcon={SearchCode}
            fullWidth
            disabled={!check.valid}
            onPress={() => void send()}
            testID="code-review-submit"
          />
        )
      }
    >
      <Header />
      <View style={styles.form}>
        <View style={styles.quota}>
          <QuotaBadge feature="code_review" />
        </View>
        <ChoiceGroup<CodeLanguage>
          label={t('codeReview.languageLabel')}
          options={languageOptions}
          value={language}
          onChange={setLanguage}
          testID="code-review-language"
        />
        <ChoiceGroup<CodeReviewAction>
          label={t('codeReview.actionLabel')}
          options={actionOptions}
          value={action}
          onChange={setAction}
          layout="list"
          testID="code-review-action"
        />
        <CodeInput value={code} onChangeText={setCode} check={check} editable={!isPending} />

        {error && limitReached ? (
          <LimitReachedCard quota={error.quota} feature="code_review" testID="code-review-limit" />
        ) : null}
        {error && !limitReached ? (
          <View style={styles.error}>
            <InlineMessage
              tone="error"
              message={t(codeReviewErrorKey(error))}
              testID="code-review-error"
            />
            {isRetryable(error) ? (
              <Button
                label={t('common.retry')}
                variant="secondary"
                onPress={retry}
                testID="code-review-retry"
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

/** Code review input: language, action and code. Without a configured API it explains why. */
export function CodeReviewInputScreen() {
  return apiBaseUrl ? <ReviewForm /> : <NotConnected />;
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  quota: {
    flexDirection: 'row',
  },
  pending: {
    gap: spacing.sm,
  },
  error: {
    gap: spacing.xs,
  },
});
