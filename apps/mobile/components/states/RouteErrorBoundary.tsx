import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, layout, spacing } from '@/constants/tokens';

import { ErrorState } from './ErrorState';

/**
 * Expo Router error boundary. Export it from a route file as `ErrorBoundary`
 * to catch render errors there without crashing the whole app.
 * Avoids safe-area hooks on purpose: it may render outside providers.
 */
export function RouteErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.root}>
      <ErrorState onRetry={() => void retry()} testID="route-error" />
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
});
