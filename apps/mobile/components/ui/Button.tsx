import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { borderWidths, colors, layout, opacity, radii, spacing } from '@/constants/tokens';

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
  /**
   * Called when a disabled (not loading) button is pressed, e.g. to point the
   * user to what is missing. The button still looks and reads as disabled.
   */
  onPressWhenDisabled?: () => void;
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
  onPressWhenDisabled,
  loading = false,
  fullWidth = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isInactive = disabled || loading;
  // A disabled button with onPressWhenDisabled stays pressable but keeps the disabled look and state.
  const pressWhenDisabled = disabled && !loading && onPressWhenDisabled !== undefined;

  return (
    <PressableScale
      testID={testID}
      onPress={pressWhenDisabled ? onPressWhenDisabled : onPress}
      // undefined (not false) so Pressable keeps accessibilityState.disabled below.
      disabled={pressWhenDisabled ? undefined : isInactive}
      haptic={!isInactive}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        baseStyles.container,
        { minHeight: size === 'lg' ? layout.minTouchTarget + spacing.xs : layout.minTouchTarget },
        styles.container,
        fullWidth && baseStyles.fullWidth,
        pressWhenDisabled && baseStyles.disabled,
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
  disabled: {
    opacity: opacity.disabled,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
