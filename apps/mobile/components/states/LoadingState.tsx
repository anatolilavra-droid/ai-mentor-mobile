import { View } from 'react-native';

import { spacing } from '@/constants/tokens';

import { Skeleton } from './Skeleton';

type LoadingStateProps = {
  /** Announced to screen readers, e.g. "Loading your day". */
  label: string;
  /** Number of content blocks to sketch. */
  blocks?: number;
  testID?: string;
};

/** Skeleton layout that mirrors the shape of real content instead of a lone spinner. */
export function LoadingState({ label, blocks = 2, testID }: LoadingStateProps) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ gap: spacing.md }}
    >
      {Array.from({ length: blocks }, (_, index) => (
        <View key={index} style={{ gap: spacing.xs }}>
          <Skeleton height={spacing.xs + spacing.xxs} width="32%" />
          <Skeleton height={spacing.huge + spacing.lg} radius="md" />
        </View>
      ))}
    </View>
  );
}
