/**
 * 8-point spacing scale. `xxs` (4) is the only half-step and is reserved
 * for tight optical adjustments (icon-to-label gaps, tag padding).
 */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  xxxl: 64,
  huge: 80,
} as const;

export type SpacingToken = keyof typeof spacing;
