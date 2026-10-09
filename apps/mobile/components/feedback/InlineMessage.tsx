import { CircleCheck, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { borderWidths, colors, radii, spacing } from '@/constants/tokens';

type InlineMessageProps = {
  tone: 'error' | 'success';
  message: string;
  testID?: string;
};

/** Form-level feedback: what happened and what to do next. Announced to screen readers. */
export function InlineMessage({ tone, message, testID }: InlineMessageProps) {
  const isError = tone === 'error';
  return (
    <View
      testID={testID}
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: isError ? colors.status.errorSoft : colors.accent.primarySoft,
          borderColor: isError ? colors.status.error : colors.accent.primary,
        },
      ]}
    >
      <Icon
        icon={isError ? TriangleAlert : CircleCheck}
        size="md"
        color={isError ? 'error' : 'accent'}
      />
      <Text variant="callout" style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borderWidths.hairline,
  },
  text: {
    flex: 1,
  },
});
