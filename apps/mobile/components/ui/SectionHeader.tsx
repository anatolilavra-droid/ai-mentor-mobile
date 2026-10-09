import { StyleSheet, View } from 'react-native';

import { layout, spacing } from '@/constants/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type SectionHeaderProps = {
  label: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHeader({ label, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="label" color="muted" accessibilityRole="header">
        {label}
      </Text>
      {action ? (
        <PressableScale
          onPress={action.onPress}
          accessibilityLabel={action.label}
          style={styles.action}
        >
          <Text variant="caption" color="accent">
            {action.label}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  action: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
