import type { CodeReviewResponse } from '@ai-mentor/shared';
import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pencil, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, CodeBlock, SectionHeader, Tag, Text } from '@/components/ui';
import { spacing } from '@/constants/tokens';

import { useCodeReviewStore } from './codeReview.store';
import { BackBar } from './components/BackBar';
import { IssueList } from './components/IssueList';

/** Back to the input screen, where the code is kept. */
function backToInput() {
  if (router.canGoBack()) router.back();
  else router.replace('/code-review');
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <SectionHeader label={label} />
      {children}
    </View>
  );
}

function ReviewResult({ response }: { response: CodeReviewResponse }) {
  const { t } = useTranslation();
  const { review, input, provider } = response;
  const codeTitle =
    input.action === 'improve'
      ? t('codeReview.result.improvedCode')
      : t('codeReview.result.fixedCode');
  const wantsCode = input.action === 'fix' || input.action === 'improve';

  return (
    <View style={styles.body}>
      <View style={styles.tags}>
        <Tag label={t(`codeReview.languages.${input.language}`)} />
        <Tag label={t(`codeReview.actions.${input.action}.title`)} tone="accent" />
        <Tag label={t(`codeReview.result.confidence.${review.confidence}`)} />
        {provider === 'mock' ? <Tag label={t('chat.demoAnswer')} tone="violet" /> : null}
      </View>
      <Text variant="caption" color="muted">
        {t('codeReview.result.notRun')}
      </Text>

      <Section label={t('codeReview.result.summary')}>
        <Text variant="body" selectable testID="code-review-summary">
          {review.summary}
        </Text>
      </Section>

      {review.steps?.length ? (
        <Section label={t('codeReview.result.steps')}>
          <View style={styles.list}>
            {review.steps.map((step, index) => (
              <Text key={index} variant="callout" color="secondary" selectable>
                {`${index + 1}. ${step}`}
              </Text>
            ))}
          </View>
        </Section>
      ) : null}

      <Section label={t('codeReview.result.issues')}>
        <IssueList issues={review.issues} />
      </Section>

      {wantsCode ? (
        <Section label={codeTitle}>
          {review.fixedCode ? (
            <View style={styles.list}>
              {/* Plain text in a code block: nothing is rendered or run, whatever the language. */}
              <CodeBlock code={review.fixedCode} language={input.language} copyable />
              {review.changes?.length ? (
                <View style={styles.list}>
                  <Text variant="label" color="muted">
                    {t('codeReview.result.changes')}
                  </Text>
                  {review.changes.map((change, index) => (
                    <Text key={index} variant="callout" color="secondary" selectable>
                      {`• ${change}`}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <Text variant="callout" color="secondary" testID="code-review-no-changes">
              {t('codeReview.result.noChanges')}
            </Text>
          )}
        </Section>
      ) : null}

      <Section label={t('codeReview.result.nextStep')}>
        <Text variant="callout" color="secondary" selectable>
          {review.nextStep}
        </Text>
      </Section>
    </View>
  );
}

/** The last review. Without one (for example after a restart) the flow starts at the input. */
export function CodeReviewResultScreen() {
  const { t } = useTranslation();
  const result = useCodeReviewStore((state) => state.result);
  if (!result) return <Redirect href="/code-review" />;

  const startOver = () => {
    useCodeReviewStore.getState().startOver();
    backToInput();
  };

  return (
    <Screen
      withBottomInset
      testID="code-review-result-screen"
      footer={
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label={t('codeReview.result.editCode')}
              leadingIcon={Pencil}
              variant="secondary"
              fullWidth
              onPress={backToInput}
              testID="code-review-edit"
            />
          </View>
          <View style={styles.action}>
            <Button
              label={t('codeReview.result.newReview')}
              leadingIcon={RotateCcw}
              fullWidth
              onPress={startOver}
              testID="code-review-new"
            />
          </View>
        </View>
      }
    >
      <BackBar onBack={backToInput} testID="code-review-result-back" />
      <ScreenHeader
        eyebrow={t('codeReview.result.eyebrow')}
        title={t('codeReview.result.title')}
        size="title"
      />
      <ReviewResult response={result} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
