import { RotateCcw, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { borderWidths, colors, layout, radii, spacing } from '@/constants/tokens';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  testID?: string;
};

/** Calm, user-safe error: no technical details, always a way forward. */
export function ErrorState({ title, message, onRetry, testID }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      <View style={styles.iconWell}>
        <Icon icon={TriangleAlert} size="lg" color="error" />
      </View>
      <View style={styles.texts}>
        <Text variant="headline" accessibilityRole="header">
          {title ?? t('common.error.title')}
        </Text>
        <Text variant="callout" color="secondary" style={styles.message}>
          {message ?? t('common.error.message')}
        </Text>
      </View>
      {onRetry ? (
        <Button
          label={t('common.retry')}
          onPress={onRetry}
          variant="secondary"
          size="md"
          leadingIcon={RotateCcw}
          testID={testID ? `${testID}-retry` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  iconWell: {
    width: layout.minTouchTarget + spacing.xs,
    height: layout.minTouchTarget + spacing.xs,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.status.errorSoft,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
  },
  texts: {
    gap: spacing.xxs,
  },
  message: {
    maxWidth: layout.readableWidth,
  },
});
