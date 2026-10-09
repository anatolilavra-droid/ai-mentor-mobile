import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, spacing } from '@/constants/tokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';

type ProgressBarProps = {
  /** 0..1 */
  value: number;
  accessibilityLabel: string;
  testID?: string;
};

/** Thin accent track; grows smoothly between steps (instant with reduce motion). */
export function ProgressBar({ value, accessibilityLabel, testID }: ProgressBarProps) {
  const { reduceMotion } = useMotionPreference();
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  const clamped = Math.min(Math.max(value, 0), 1);

  useEffect(() => {
    const target = width * clamped;
    fill.set(
      reduceMotion
        ? target
        : withTiming(target, {
            duration: motion.durations.slow,
            easing: Easing.bezier(...motion.easings.standard),
          }),
    );
  }, [clamped, fill, reduceMotion, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.get() }));

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={styles.track}
    >
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: spacing.xxs,
    borderRadius: radii.full,
    backgroundColor: colors.border.subtle,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.accent.primary,
  },
});
