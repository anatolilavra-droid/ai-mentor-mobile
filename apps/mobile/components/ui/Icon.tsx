import type { LucideIcon } from 'lucide-react-native';

import { colors, layout } from '@/constants/tokens';

const iconColors = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  muted: colors.text.muted,
  onAccent: colors.text.onAccent,
  accent: colors.accent.primary,
  accentSecondary: colors.accent.secondary,
  error: colors.status.error,
} as const;

export type IconColor = keyof typeof iconColors;

type IconProps = {
  icon: LucideIcon;
  size?: keyof typeof layout.iconSize;
  color?: IconColor;
};

/** Single icon style for the whole app: Lucide, one stroke width. Decorative by default. */
export function Icon({ icon: IconComponent, size = 'md', color = 'primary' }: IconProps) {
  return (
    <IconComponent
      size={layout.iconSize[size]}
      color={iconColors[color]}
      strokeWidth={layout.iconStrokeWidth}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
