import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Clock, Compass, Target } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, Icon, Stack, Surface, Tag, Text } from '@/components/ui';
import { spacing } from '@/constants/tokens';
import { useToastStore } from '@/stores/toast.store';

import { useOnboardingFlow } from '../OnboardingFlow';
import { stepHref } from '../steps';
import { useSkipOnboarding } from '../useOnboarding';

const POINTS: readonly { icon: LucideIcon; key: 'level' | 'goal' | 'time' }[] = [
  { icon: Compass, key: 'level' },
  { icon: Target, key: 'goal' },
  { icon: Clock, key: 'time' },
];

/**
 * Entry of the flow. Resumes a saved draft at its step; personalize mode
 * goes straight to its first question. Otherwise introduces onboarding.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const flow = useOnboardingFlow();
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  const skip = useSkipOnboarding();
  const showToast = useToastStore((state) => state.show);

  if (intro !== '1') {
    if (flow.resumeStep) return <Redirect href={stepHref(flow.resumeStep)} />;
    if (flow.mode === 'personalize') return <Redirect href={stepHref('experience')} />;
  }

  const onSkip = () => {
    Alert.alert(t('onboarding.skipConfirm.title'), t('onboarding.skipConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('onboarding.skipConfirm.confirm'),
        onPress: () =>
          skip.mutate(undefined, {
            onSuccess: () => flow.exit(),
            onError: () => showToast(t('onboarding.skipError'), 'neutral'),
          }),
      },
    ]);
  };

  return (
    <Screen
      withBottomInset
      testID="onboarding-welcome"
      footer={
        <Stack gap="xs">
          <Button
            label={t('onboarding.welcome.start')}
            trailingIcon={ArrowRight}
            fullWidth
            onPress={() => router.push(stepHref(flow.firstIncompleteStep()))}
            testID="onboarding-start"
          />
          <Button
            label={t('onboarding.skip')}
            variant="ghost"
            size="md"
            fullWidth
            loading={skip.isPending}
            onPress={onSkip}
            testID="onboarding-welcome-skip"
          />
        </Stack>
      }
    >
      <ScreenHeader
        eyebrow={t('onboarding.welcome.eyebrow')}
        title={t('onboarding.welcome.title')}
        subtitle={t('onboarding.welcome.subtitle')}
      />
      <Surface level="elevated" radius="lg" glow="atmosphere">
        <Stack gap="md">
          <Tag label={t('onboarding.welcome.duration')} tone="accent" />
          {POINTS.map((point) => (
            <View key={point.key} style={styles.point}>
              <Icon icon={point.icon} size="md" color="accent" />
              <Text variant="body" color="secondary" style={styles.pointText}>
                {t(`onboarding.welcome.points.${point.key}`)}
              </Text>
            </View>
          ))}
        </Stack>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointText: {
    flex: 1,
  },
});
