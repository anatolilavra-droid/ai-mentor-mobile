import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { layout, spacing } from '@/constants/tokens';

type SummaryRowProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  onChange?: () => void;
  testID?: string;
};

/** One answer on the summary, with a "Change" shortcut back to its step. */
export function SummaryRow({ label, value, children, onChange, testID }: SummaryRowProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.texts}>
        <Text variant="label" color="muted">
          {label}
        </Text>
        {value !== undefined ? <Text variant="bodyMedium">{value}</Text> : null}
        {children}
      </View>
      {onChange ? (
        <PressableScale
          onPress={onChange}
          accessibilityLabel={`${t('onboarding.change')} ${label}`}
          style={styles.change}
          testID={testID ? `${testID}-change` : undefined}
        >
          <Text variant="callout" color="accent">
            {t('onboarding.change')}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
  change: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
});
