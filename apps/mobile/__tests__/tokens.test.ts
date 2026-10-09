import { colors, radii, spacing } from '@/constants/tokens';
import { contrastRatio } from '@/lib/contrast';

const WCAG_AA = 4.5;

describe('design tokens', () => {
  const backgrounds = {
    'background.primary': colors.background.primary,
    'background.secondary': colors.background.secondary,
    'surface.default': colors.surface.default,
    'surface.elevated': colors.surface.elevated,
  };
  const texts = {
    'text.primary': colors.text.primary,
    'text.secondary': colors.text.secondary,
    'text.muted': colors.text.muted,
    'accent.primary': colors.accent.primary,
    'status.error': colors.status.error,
  };

  for (const [textName, text] of Object.entries(texts)) {
    for (const [bgName, bg] of Object.entries(backgrounds)) {
      it(`${textName} on ${bgName} meets WCAG AA`, () => {
        expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(WCAG_AA);
      });
    }
  }

  it('text.onAccent on accent.primary meets WCAG AA', () => {
    expect(contrastRatio(colors.text.onAccent, colors.accent.primary)).toBeGreaterThanOrEqual(
      WCAG_AA,
    );
  });

  it('spacing follows the 8-point system (4 is the only half-step)', () => {
    for (const [name, value] of Object.entries(spacing)) {
      if (name === 'xxs') {
        expect(value).toBe(4);
      } else {
        expect(value % 8).toBe(0);
      }
    }
  });

  it('radii are multiples of 8 (except full)', () => {
    for (const [name, value] of Object.entries(radii)) {
      if (name !== 'full') expect(value % 8).toBe(0);
    }
  });
});
