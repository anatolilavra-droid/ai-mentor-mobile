import { borderWidths } from './borders';
import { colors } from './colors';
import { shadows } from './shadows';

/**
 * Elevation in this system = surface tone + border, not drop shadows.
 * Glow is added separately and only for state.
 */
export const elevation = {
  flat: {
    backgroundColor: colors.background.primary,
    borderColor: 'transparent',
    borderWidth: 0,
  },
  raised: {
    backgroundColor: colors.surface.default,
    borderColor: colors.border.subtle,
    borderWidth: borderWidths.hairline,
  },
  floating: {
    backgroundColor: colors.surface.elevated,
    borderColor: colors.border.strong,
    borderWidth: borderWidths.hairline,
    boxShadow: shadows.glowAtmosphere,
  },
} as const;

export type ElevationToken = keyof typeof elevation;
