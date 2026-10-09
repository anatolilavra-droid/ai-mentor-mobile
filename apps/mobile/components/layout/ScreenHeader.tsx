import { View } from 'react-native';

import { layout, spacing } from '@/constants/tokens';
import { Text } from '@/components/ui';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  size?: 'display' | 'title';
};

/** Editorial header: mono eyebrow, serif headline, quiet supporting line. */
export function ScreenHeader({ eyebrow, title, subtitle, size = 'display' }: ScreenHeaderProps) {
  return (
    <View style={{ gap: spacing.xs, paddingBottom: spacing.lg }}>
      {eyebrow ? (
        <Text variant="label" color="accent">
          {eyebrow}
        </Text>
      ) : null}
      <Text variant={size === 'display' ? 'display' : 'title1'} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="secondary" style={{ maxWidth: layout.readableWidth }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
