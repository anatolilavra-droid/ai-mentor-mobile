import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, textVariants, type TextVariant } from '@/constants/tokens';

const textColors = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  muted: colors.text.muted,
  onAccent: colors.text.onAccent,
  accent: colors.accent.primary,
  accentSecondary: colors.accent.secondary,
  success: colors.status.success,
  warning: colors.status.warning,
  error: colors.status.error,
} as const;

export type TextColor = keyof typeof textColors;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
};

export function Text({
  variant = 'body',
  color = 'primary',
  align,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  const { maxFontSizeMultiplier: variantMultiplier, ...variantStyle } = textVariants[variant];

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? variantMultiplier}
      style={[variantStyle, { color: textColors[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
