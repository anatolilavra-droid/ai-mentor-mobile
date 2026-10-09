import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Surface, Tag, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/tokens';

import type { NextStep } from '../types';

export function NextStepCard({ step }: { step: NextStep }) {
  const { t } = useTranslation();
  const percent = Math.round(step.progress * 100);

  return (
    <Surface level="elevated" radius="lg" padding="md" glow="atmosphere" testID="next-step-card">
      <View style={styles.header}>
        <Tag label={t('home.nextStep.label')} tone="accent" />
        <Text variant="caption" color="muted">
          {t('home.nextStep.lessonsLeft', { count: step.lessonsLeft })}
        </Text>
      </View>

      <Text variant="title1" style={styles.topic}>
        {step.topic}
      </Text>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('home.nextStep.progressA11y', { percent })}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.progressBlock}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text variant="label" color="secondary">
          {t('home.nextStep.progress', { percent, track: step.track })}
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topic: {
    marginTop: spacing.sm,
  },
  progressBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  track: {
    height: spacing.xxs,
    borderRadius: radii.full,
    backgroundColor: colors.border.subtle,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.accent.primary,
  },
});
