import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Text, type ButtonProps } from '@/components/ui';
import { borderWidths, colors, layout, radii, shadows, spacing } from '@/constants/tokens';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ButtonProps;
  /** Compact variant for inline sections (no halo, smaller spacing). */
  compact?: boolean;
  testID?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  testID,
}: EmptyStateProps) {
  return (
    <View testID={testID} style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconWell, !compact && styles.halo]}>
        <Icon icon={icon} size={compact ? 'md' : 'lg'} color={compact ? 'muted' : 'accent'} />
      </View>
      <View style={styles.texts}>
        <Text variant={compact ? 'bodyMedium' : 'headline'} accessibilityRole="header">
          {title}
        </Text>
        <Text variant="callout" color="secondary" style={styles.description}>
          {description}
        </Text>
      </View>
      {action ? <Button variant="secondary" size="md" {...action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  compact: {
    paddingVertical: spacing.xs,
  },
  iconWell: {
    width: layout.minTouchTarget + spacing.xs,
    height: layout.minTouchTarget + spacing.xs,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.default,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
  },
  halo: {
    borderColor: colors.border.strong,
    boxShadow: shadows.glowAtmosphere,
  },
  texts: {
    gap: spacing.xxs,
  },
  description: {
    maxWidth: layout.readableWidth,
  },
});
