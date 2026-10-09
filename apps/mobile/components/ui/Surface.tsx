import { View, type ViewProps } from 'react-native';

import {
  borderWidths,
  colors,
  radii,
  shadows,
  spacing,
  type RadiusToken,
  type SpacingToken,
} from '@/constants/tokens';

export type SurfaceProps = ViewProps & {
  level?: 'default' | 'elevated';
  bordered?: boolean;
  radius?: RadiusToken;
  padding?: SpacingToken;
  glow?: 'primary' | 'atmosphere';
};

const glowShadows = {
  primary: shadows.glowPrimarySubtle,
  atmosphere: shadows.glowAtmosphere,
} as const;

export function Surface({
  level = 'default',
  bordered = true,
  radius = 'md',
  padding = 'md',
  glow,
  style,
  ...rest
}: SurfaceProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface[level],
          borderRadius: radii[radius],
          padding: spacing[padding],
          borderWidth: bordered ? borderWidths.hairline : 0,
          borderColor: level === 'elevated' ? colors.border.strong : colors.border.subtle,
        },
        glow && { boxShadow: glowShadows[glow] },
        style,
      ]}
      {...rest}
    />
  );
}
