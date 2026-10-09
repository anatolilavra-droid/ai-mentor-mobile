import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, opacity, radii, type RadiusToken } from '@/constants/tokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';

type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  radius?: RadiusToken;
};

/** Placeholder block with a slow, calm pulse (static when reduce motion is on). */
export function Skeleton({ width = '100%', height, radius = 'sm' }: SkeletonProps) {
  const { reduceMotion } = useMotionPreference();
  const pulse = useSharedValue<number>(opacity.skeletonMax);

  useEffect(() => {
    if (reduceMotion) {
      pulse.set(opacity.skeletonMax);
      return;
    }
    pulse.set(
      withRepeat(
        withTiming(opacity.skeletonMin, {
          duration: motion.durations.skeletonPulse,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      accessible={false}
      style={[
        { width, height, borderRadius: radii[radius], backgroundColor: colors.surface.elevated },
        animatedStyle,
      ]}
    />
  );
}
