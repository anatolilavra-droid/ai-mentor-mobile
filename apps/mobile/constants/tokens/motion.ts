export const durations = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
  skeletonPulse: 900,
  toastVisible: 2400,
} as const;

/** Cubic-bezier control points, consumed with Reanimated `Easing.bezier`. */
export const easings = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.3, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const springs = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  indicator: { damping: 20, stiffness: 220, mass: 0.8 },
} as const;

export const pressScale = 0.97;

export const motion = { durations, easings, springs, pressScale } as const;
