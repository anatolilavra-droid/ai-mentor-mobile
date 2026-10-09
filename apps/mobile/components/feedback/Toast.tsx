import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ui';
import {
  borderWidths,
  colors,
  layout,
  motion,
  radii,
  safeArea,
  shadows,
  spacing,
} from '@/constants/tokens';
import { useToastStore } from '@/stores/toast.store';

/**
 * Global, non-blocking success feedback. Mounted once in the root layout,
 * floats above the tab bar (thumb zone) and dismisses itself.
 */
export function Toast() {
  const current = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(dismiss, motion.durations.toastVisible);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.host, { bottom: insets.bottom + layout.tabBarHeight + safeArea.toastOffset }]}
    >
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(motion.durations.base)}
        exiting={FadeOutDown.duration(motion.durations.fast)}
        accessibilityLiveRegion="polite"
        style={styles.toast}
        testID="toast"
      >
        {current.tone === 'success' ? <Icon icon={Check} size="sm" color="accent" /> : null}
        <Text variant="callout">{current.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surface.elevated,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.strong,
    boxShadow: shadows.glowPrimarySubtle,
  },
});
