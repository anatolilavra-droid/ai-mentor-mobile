export const layout = {
  /** Horizontal screen padding. */
  gutter: 24,
  /** Horizontal screen padding on narrow devices (< compactWidth). */
  gutterCompact: 16,
  compactWidth: 360,
  maxContentWidth: 560,
  /** Comfortable measure for supporting text. */
  readableWidth: 440,
  /** Minimum interactive size (Android Material guideline: 48dp). */
  minTouchTarget: 48,
  tabBarHeight: 64,
  iconSize: { sm: 16, md: 20, lg: 24, xl: 32 },
  iconStrokeWidth: 1.75,
  iconWellSize: 40,
} as const;

/** Extra spacing applied on top of device safe-area insets. */
export const safeArea = {
  topExtra: 16,
  bottomExtra: 8,
  /** Space reserved above the tab bar for floating feedback (toasts). */
  toastOffset: 16,
} as const;
