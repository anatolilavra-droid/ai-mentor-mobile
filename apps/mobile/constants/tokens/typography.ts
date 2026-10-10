import type { TextStyle } from 'react-native';

/**
 * Font family names as registered by `useFonts` (see constants/fonts.ts).
 * On Android, custom fonts must be selected by family, not by `fontWeight`,
 * so each weight is its own family.
 */
export const fontFamilies = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const fontSizes = {
  display: 40,
  title1: 32,
  title2: 24,
  headline: 18,
  body: 16,
  callout: 14,
  code: 13,
  caption: 12,
  label: 11,
} as const;

export const lineHeights = {
  display: 48,
  title1: 40,
  title2: 32,
  headline: 24,
  body: 24,
  callout: 20,
  code: 20,
  caption: 16,
  label: 16,
} as const;

/**
 * Code is shown glyph by glyph: JetBrains Mono's programming ligatures (`<=` as ⩽,
 * `i++` as one glyph) live in the contextual alternates (`calt`), so both
 * ligature features are switched off. Android and iOS support both values.
 */
export const codeFontVariant: NonNullable<TextStyle['fontVariant']> = [
  'no-common-ligatures',
  'no-contextual',
];

export const letterSpacings = {
  tight: -0.6,
  snug: -0.3,
  normal: 0,
  wide: 0.2,
  label: 1.2,
} as const;

export type TextVariantStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform' | 'fontVariant'
> & {
  /** Upper bound for system font scaling, keeps large type from breaking layouts. */
  maxFontSizeMultiplier: number;
};

export const textVariants = {
  display: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    letterSpacing: letterSpacings.tight,
    maxFontSizeMultiplier: 1.3,
  },
  displayItalic: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    letterSpacing: letterSpacings.tight,
    maxFontSizeMultiplier: 1.3,
  },
  title1: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.title1,
    lineHeight: lineHeights.title1,
    letterSpacing: letterSpacings.snug,
    maxFontSizeMultiplier: 1.4,
  },
  title2: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: fontSizes.title2,
    lineHeight: lineHeights.title2,
    letterSpacing: letterSpacings.snug,
    maxFontSizeMultiplier: 1.5,
  },
  headline: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: fontSizes.headline,
    lineHeight: lineHeights.headline,
    letterSpacing: letterSpacings.normal,
    maxFontSizeMultiplier: 1.6,
  },
  body: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.normal,
    maxFontSizeMultiplier: 1.8,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.normal,
    maxFontSizeMultiplier: 1.8,
  },
  callout: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.callout,
    lineHeight: lineHeights.callout,
    letterSpacing: letterSpacings.normal,
    maxFontSizeMultiplier: 1.8,
  },
  caption: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    letterSpacing: letterSpacings.wide,
    maxFontSizeMultiplier: 1.6,
  },
  label: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    letterSpacing: letterSpacings.label,
    textTransform: 'uppercase',
    maxFontSizeMultiplier: 1.4,
  },
  code: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: fontSizes.code,
    lineHeight: lineHeights.code,
    letterSpacing: letterSpacings.normal,
    fontVariant: codeFontVariant,
    maxFontSizeMultiplier: 1.6,
  },
} as const satisfies Record<string, TextVariantStyle>;

export type TextVariant = keyof typeof textVariants;
