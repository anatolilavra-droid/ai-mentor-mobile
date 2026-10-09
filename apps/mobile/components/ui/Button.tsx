import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { borderWidths, colors, layout, radii, spacing } from '@/constants/tokens';

import { Icon, type IconColor } from './Icon';
import { PressableScale } from './PressableScale';
import { Text, type TextColor } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
    text: 'onAccent',
    icon: 'onAccent',
  },
  secondary: {
    container: { backgroundColor: colors.surface.elevated, borderColor: colors.border.strong },
    text: 'primary',
    icon: 'primary',
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderColor: 'transparent' },
    text: 'accent',
    icon: 'accent',
  },
} as const satisfies Record<ButtonVariant, { container: object; text: TextColor; icon: IconColor }>;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  leadingIcon,
  trailingIcon,
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isInactive = disabled || loading;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={isInactive}
      haptic
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        baseStyles.container,
        { minHeight: size === 'lg' ? layout.minTouchTarget + spacing.xs : layout.minTouchTarget },
        styles.container,
        fullWidth && baseStyles.fullWidth,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.text.onAccent : colors.accent.primary}
        />
      ) : (
        <View style={baseStyles.content}>
          {leadingIcon ? <Icon icon={leadingIcon} size="md" color={styles.icon} /> : null}
          <Text variant="bodyMedium" color={styles.text} numberOfLines={1}>
            {label}
          </Text>
          {trailingIcon ? <Icon icon={trailingIcon} size="md" color={styles.icon} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: borderWidths.thin,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
