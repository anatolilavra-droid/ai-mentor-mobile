import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, layout, spacing } from '@/constants/tokens';

/**
 * Full-screen container for app-level states (configuration error, profile
 * loading/error) rendered outside the navigator. No safe-area hooks on purpose.
 */
export function FullScreenState({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.huge,
    backgroundColor: colors.background.primary,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.md,
  },
});
