import {
  borderWidths,
  colors,
  elevation,
  fontFamilies,
  fontSizes,
  fontWeights,
  layout,
  letterSpacings,
  lineHeights,
  motion,
  opacity,
  radii,
  safeArea,
  shadows,
  spacing,
  textVariants,
} from './tokens';

export const theme = {
  colors,
  typography: {
    families: fontFamilies,
    sizes: fontSizes,
    weights: fontWeights,
    lineHeights,
    letterSpacings,
    variants: textVariants,
  },
  spacing,
  radii,
  borderWidths,
  shadows,
  opacity,
  motion,
  elevation,
  layout,
  safeArea,
} as const;

export type Theme = typeof theme;
