/**
 * Glow is a state signal (active, focused, "mentor is here"), never decoration.
 * Uses the New Architecture `boxShadow` style; if a device renders it
 * differently, the UI must still read correctly without it.
 */
export const shadows = {
  none: undefined,
  glowPrimary: '0px 0px 24px 0px rgba(200, 242, 80, 0.22)',
  glowPrimarySubtle: '0px 0px 14px 0px rgba(200, 242, 80, 0.16)',
  glowAtmosphere: '0px 0px 48px 4px rgba(139, 124, 255, 0.18)',
} as const;

export type ShadowToken = keyof typeof shadows;
