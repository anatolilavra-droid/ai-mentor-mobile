import { StyleSheet, View } from 'react-native';

import { Divider, SectionHeader, Text } from '@/components/ui';
import { spacing } from '@/constants/tokens';

type FeaturePreviewProps = {
  label: string;
  items: string[];
};

/** Numbered, editorial list of what a placeholder screen will become. */
export function FeaturePreview({ label, items }: FeaturePreviewProps) {
  return (
    <View>
      <SectionHeader label={label} />
      {items.map((item, index) => (
        <View key={item}>
          {index > 0 ? <Divider /> : null}
          <View style={styles.row} accessible accessibilityLabel={item}>
            <Text variant="label" color="accent" style={styles.number}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text variant="body" color="secondary" style={styles.text}>
              {item}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  number: {
    minWidth: spacing.md,
  },
  text: {
    flex: 1,
  },
});
