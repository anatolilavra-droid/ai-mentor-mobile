import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { borderWidths, colors, layout, radii, spacing } from '@/constants/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type ListItemProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Short value shown on the right, e.g. "English". */
  value?: string;
  /** Custom trailing element (switch, tag). Overrides `value` and chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

export function ListItem({
  title,
  subtitle,
  icon,
  value,
  trailing,
  onPress,
  disabled,
  accessibilityHint,
  testID,
}: ListItemProps) {
  const content = (
    <>
      {icon ? (
        <View style={styles.iconWell}>
          <Icon icon={icon} size="md" color="secondary" />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="callout" color="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <View style={styles.trailing}>
          {value ? (
            <Text variant="callout" color="secondary" numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {onPress ? <Icon icon={ChevronRight} size="sm" color="muted" /> : null}
        </View>
      )}
    </>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        style={styles.row}
        accessible={!trailing}
        accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      >
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      haptic
      accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={styles.row}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.minTouchTarget + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconWell: {
    width: layout.iconWellSize,
    height: layout.iconWellSize,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
});
