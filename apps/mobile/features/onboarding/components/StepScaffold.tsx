import { useFocusEffect } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Icon, PressableScale, ProgressBar, Text } from '@/components/ui';
import { layout, spacing } from '@/constants/tokens';

type StepScaffoldProps = {
  title: string;
  subtitle?: string;
  /** 1-based position and total; omitted on the summary (bar shows complete). */
  position: { index: number; total: number } | null;
  onBack: () => void;
  /** Top-right action: "Skip for now" (first run) or "Cancel" (personalize). */
  secondaryAction?: { label: string; onPress: () => void; testID?: string };
  footer: ReactNode;
  children: ReactNode;
  testID?: string;
};

/**
 * Shared frame for every onboarding step: Back + progress at the top,
 * one question, and the primary action in the thumb zone.
 * Android's system back goes to the previous step instead of leaving the flow.
 */
export function StepScaffold({
  title,
  subtitle,
  position,
  onBack,
  secondaryAction,
  footer,
  children,
  testID,
}: StepScaffoldProps) {
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => subscription.remove();
    }, [onBack]),
  );

  const progressLabel = position
    ? t('onboarding.progressA11y', { index: position.index, total: position.total })
    : t('onboarding.summary.title');

  return (
    <Screen withBottomInset testID={testID} footer={footer}>
      <View style={styles.topBar}>
        <PressableScale
          onPress={onBack}
          accessibilityLabel={t('onboarding.back')}
          style={styles.topAction}
          testID="onboarding-back"
        >
          <Icon icon={ChevronLeft} size="md" color="secondary" />
          <Text variant="callout" color="secondary">
            {t('onboarding.back')}
          </Text>
        </PressableScale>
        {secondaryAction ? (
          <PressableScale
            onPress={secondaryAction.onPress}
            accessibilityLabel={secondaryAction.label}
            style={[styles.topAction, styles.topActionEnd]}
            testID={secondaryAction.testID}
          >
            <Text variant="callout" color="muted">
              {secondaryAction.label}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.progress}>
        {position ? (
          <Text variant="label" color="accent">
            {t('onboarding.step', { index: position.index, total: position.total })}
          </Text>
        ) : null}
        <ProgressBar
          value={position ? position.index / position.total : 1}
          accessibilityLabel={progressLabel}
          testID="onboarding-progress"
        />
      </View>

      <ScreenHeader title={title} subtitle={subtitle} size="title" />
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },
  topAction: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  topActionEnd: {
    justifyContent: 'flex-end',
  },
  progress: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
});
