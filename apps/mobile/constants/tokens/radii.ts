export const radii = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
